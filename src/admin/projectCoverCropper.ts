import Cropper from "cropperjs";
import {
  commitRotatedOriginal,
  discardRotatedOriginal,
  downloadStoredMedia,
  savePortfolioMediaCrops,
  uploadRotatedOriginal,
  type PortfolioMediaCropRow,
  type PortfolioMediaOwnerType,
} from "../services/portfolioMediaCropRepository";
import { downloadCredentialAsset, saveCredentialPreviewSettings } from "../services/credentialRepository";
import type { CredentialAsset, CredentialPreviewProfile } from "../types/credential";
import type { MediaCropProfile } from "../types/portfolio";
import { confirmAdmin } from "./confirmDialog";
import { automaticCrop, clampCrop, cropPreviewStyle, cropSourceRect, type CropState } from "./cropGeometry";
import { bindCropStage, waitForCropImage, type CropStage } from "./cropStage";
import { canvasToBlob, drawRotated, normalizeTurns, rotatedOriginalType, rotationLabel, type QuarterTurns } from "./imageRotation";
import { renderAdminCropZoomControls, renderAdminDialogHeader, renderAdminSegmented, setAdminCropZoomValue, setButtonBusy } from "./ui";

interface CropLayoutConfig {
  id: MediaCropProfile;
  label: string;
  frameWidth: number;
  frameHeight: number;
  outputWidth: number;
  outputHeight: number;
}

export interface PortfolioMediaCropTarget {
  ownerType: PortfolioMediaOwnerType;
  ownerId: string;
  imageId: string;
  storagePath: string;
  preferredProfile: MediaCropProfile;
  crops: PortfolioMediaCropRow[];
  /**
   * Credential evidence (ownerType "credential"): the private original is never rewritten. Its quarter turns are
   * stored as preview_rotation, only the formats the Credentials layouts print are offered, and the dialog also
   * sets the printed orientation and the explicit "Show in Portfolio" opt-in (§7.1).
   */
  evidence?: CredentialAsset;
}

interface PortfolioMediaCropperCallbacks {
  notify: (message: string, kind?: "info" | "error" | "success") => void;
  onSaved: (target: PortfolioMediaCropTarget) => void | Promise<void>;
}

const layouts: CropLayoutConfig[] = [
  { id: "wide", label: "Wide", frameWidth: 21, frameHeight: 9, outputWidth: 1800, outputHeight: 771 },
  { id: "landscape", label: "Landscape", frameWidth: 4, frameHeight: 3, outputWidth: 1600, outputHeight: 1200 },
  { id: "portrait", label: "Portrait", frameWidth: 3, frameHeight: 4, outputWidth: 1350, outputHeight: 1800 },
];

// Credentials layouts frame evidence as landscape or portrait only; Wide is never printed for them.
const evidenceProfiles: CredentialPreviewProfile[] = ["landscape", "portrait"];

const dialogCopy = {
  media: { eyebrow: "Portfolio media", title: "Adjust image crops", note: "Position the original once for reusable Portfolio formats." },
  evidence: { eyebrow: "Credential evidence", title: "Adjust evidence crops", note: "Crop a public preview; the original file stays private." },
};

const maxSourcePixels = 80_000_000;
const maxZoom = 4;
const panelId = "project-cover-crop-panel";
const tabId = (id: MediaCropProfile): string => `project-cover-crop-tab-${id}`;
const layoutById = (id: MediaCropProfile): CropLayoutConfig => layouts.find((item) => item.id === id) ?? layouts[0];
const ratio = (layout: CropLayoutConfig): number => layout.frameWidth / layout.frameHeight;
const frameLabel = (layout: CropLayoutConfig): string => `${layout.frameWidth}:${layout.frameHeight}`;

const cropperTemplate = (layout: CropLayoutConfig): string => `
  <cropper-canvas background scale-step="0.05">
    <cropper-image initial-center-size="cover" translatable scalable></cropper-image>
    <cropper-shade></cropper-shade>
    <cropper-handle action="move" plain></cropper-handle>
    <cropper-selection initial-aspect-ratio="${ratio(layout)}" aspect-ratio="${ratio(layout)}" initial-coverage="0.82" outlined>
      <cropper-grid role="grid" bordered covered></cropper-grid>
      <cropper-crosshair centered></cropper-crosshair>
      <!-- Last, so a drag anywhere inside the selection moves the image. -->
      <cropper-handle action="move" plain></cropper-handle>
    </cropper-selection>
  </cropper-canvas>`;

export const renderPortfolioMediaCropDialog = (): string => `
  <dialog class="admin-dialog admin-photo-crop-dialog admin-project-cover-crop-dialog" data-project-cover-crop-dialog aria-labelledby="project-cover-crop-title">
    ${renderAdminDialogHeader({
      eyebrow: "Portfolio media",
      title: "Adjust image crops",
      titleId: "project-cover-crop-title",
      note: "Position the original once for reusable Portfolio formats.",
      statusLabel: "Media crop status",
      close: { label: "Close media crop dialog", attribute: "data-project-cover-crop-cancel" },
    })}
    <div class="admin-project-cover-crop-tabs" role="tablist" aria-label="Portfolio media format">
      ${layouts.map((layout) => `<button type="button" role="tab" id="${tabId(layout.id)}" aria-controls="${panelId}" aria-selected="false" data-project-cover-crop-tab="${layout.id}">
        <span class="admin-crop-tab__thumb" style="aspect-ratio:${layout.frameWidth}/${layout.frameHeight}" data-project-cover-crop-thumb="${layout.id}" aria-hidden="true"></span>
        <span class="admin-crop-tab__text"><strong>${layout.label}</strong><small>${frameLabel(layout)}</small></span>
        <span class="admin-crop-tab__status" data-project-cover-crop-status="${layout.id}"></span>
      </button>`).join("")}
    </div>
    <div class="admin-photo-crop-dialog__layout" role="tabpanel" id="${panelId}" aria-labelledby="${tabId("wide")}">
      <section class="admin-photo-crop-editor" aria-label="Crop editor">
        <div class="admin-photo-crop-stage" data-project-cover-crop-stage></div>
      </section>
      <aside class="admin-photo-crop-preview admin-project-cover-crop-preview" aria-label="Format preview">
        <p class="section-kicker">Format preview</p>
        <div class="admin-project-cover-crop-preview__canvas">
          <div class="admin-crop-preview-frame" data-project-cover-crop-preview></div>
        </div>
        <div class="admin-project-cover-crop-preview__info">
          <strong data-project-cover-crop-layout-name></strong>
          <p data-project-cover-crop-meta></p>
        </div>
        <div class="admin-crop-evidence-settings" data-project-cover-crop-evidence hidden>
          ${renderAdminSegmented({ legend: "Print as", name: "project-cover-print-profile", value: "landscape", options: [{ value: "landscape", label: "Landscape" }, { value: "portrait", label: "Portrait" }], attributes: "data-project-cover-print-profile" })}
          <label class="admin-inline-check"><input type="checkbox" data-project-cover-show-in-portfolio><span>Show in Portfolio</span></label>
          <p class="admin-field-hint">Visible to anyone with the Portfolio link.</p>
        </div>
      </aside>
    </div>
    <div class="admin-project-cover-crop-footer">
      ${renderAdminCropZoomControls({ prefix: "project-cover", maxZoom, resetLabel: "Reset to auto", resetTitle: "Reset this format to the automatic crop", rotate: true })}
      <div class="admin-actions admin-photo-crop-dialog__actions">
        <button class="button button--secondary" type="button" data-project-cover-crop-cancel>Cancel</button>
        <button class="button" type="button" data-project-cover-crop-save>Save changes</button>
      </div>
    </div>
  </dialog>`;

const loadImage = (url: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const image = new Image();
  image.decoding = "async";
  image.addEventListener("load", () => resolve(image), { once: true });
  image.addEventListener("error", () => reject(new Error("This image could not be decoded.")), { once: true });
  image.src = url;
});

const canvasToWebp = (canvas: HTMLCanvasElement): Promise<Blob> => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (blob) resolve(blob);
    else reject(new Error("This browser could not export the cover crops as WebP."));
  }, "image/webp", 0.9);
});

const nextFrame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));

const rowState = (row: PortfolioMediaCropRow): CropState => clampCrop({
  x: Number(row.crop_x),
  y: Number(row.crop_y),
  width: Number(row.crop_width),
  height: Number(row.crop_height),
});

export const bindPortfolioMediaCropper = (
  root: ParentNode,
  callbacks: PortfolioMediaCropperCallbacks,
): { open: (target: PortfolioMediaCropTarget) => Promise<void> } => {
  const dialog = root.querySelector<HTMLDialogElement>("[data-project-cover-crop-dialog]");
  const stage = dialog?.querySelector<HTMLElement>("[data-project-cover-crop-stage]");
  const preview = dialog?.querySelector<HTMLElement>("[data-project-cover-crop-preview]");
  const panel = dialog?.querySelector<HTMLElement>(`#${panelId}`);
  const meta = dialog?.querySelector<HTMLElement>("[data-project-cover-crop-meta]");
  const layoutName = dialog?.querySelector<HTMLElement>("[data-project-cover-crop-layout-name]");
  const zoom = dialog?.querySelector<HTMLInputElement>("[data-project-cover-zoom]");
  const zoomValue = dialog?.querySelector<HTMLOutputElement>("[data-project-cover-zoom-value]") ?? null;
  const save = dialog?.querySelector<HTMLButtonElement>("[data-project-cover-crop-save]");
  const evidenceSettings = dialog?.querySelector<HTMLElement>("[data-project-cover-crop-evidence]");
  const printInputs = [...(dialog?.querySelectorAll<HTMLInputElement>("[data-project-cover-print-profile]") ?? [])];
  const showInput = dialog?.querySelector<HTMLInputElement>("[data-project-cover-show-in-portfolio]");

  let target: PortfolioMediaCropTarget | undefined;
  // Formats this target offers: all three for Project and Tool media, landscape and portrait for evidence.
  let profiles: CropLayoutConfig[] = layouts;
  // Turns the saved crops were made at: 0 for media (rotation rewrites the original), preview_rotation for evidence.
  let baselineTurns: QuarterTurns = 0;
  let printProfile: CredentialPreviewProfile = "landscape";
  let showInPortfolio = false;
  let sourceUrl: string | undefined;
  let sourceImage: HTMLImageElement | undefined;
  // Rotation always starts from the untouched original, so turning never re-encodes the picture twice.
  let originalImage: HTMLImageElement | undefined;
  let originalUrl: string | undefined;
  let originalType = "image/jpeg";
  let turns: QuarterTurns = 0;
  let rotatedCanvas: HTMLCanvasElement | undefined;
  let rotating = false;
  let cropper: Cropper | undefined;
  let cropStage: CropStage | undefined;
  let activeLayout: MediaCropProfile = "wide";
  let initialization = 0;
  const states = new Map<MediaCropProfile, CropState>();
  const persisted = new Set<MediaCropProfile>();
  const adjusted = new Set<MediaCropProfile>();
  const automatic = new Set<MediaCropProfile>();

  const isEdited = (id: MediaCropProfile): boolean => adjusted.has(id) || (automatic.has(id) && persisted.has(id));
  const settingsChanged = (): boolean => Boolean(target?.evidence && (
    turns !== target.evidence.previewRotation
    || printProfile !== target.evidence.previewProfile
    || showInPortfolio !== target.evidence.showInPortfolio
  ));
  const isDirty = (): boolean => turns !== baselineTurns || settingsChanged() || profiles.some((layout) => isEdited(layout.id));

  const refreshStatus = (): void => {
    profiles.forEach((layout) => {
      const status = dialog?.querySelector<HTMLElement>(`[data-project-cover-crop-status="${layout.id}"]`);
      if (!status) return;
      // Saved custom crops need no label; only automatic and unsaved states are worth reading.
      const label = isEdited(layout.id) ? "Edited" : persisted.has(layout.id) ? "" : "Auto";
      status.textContent = label;
      status.dataset.kind = isEdited(layout.id) ? "edited" : "auto";
      status.hidden = !label;
    });
    dialog?.querySelectorAll<HTMLButtonElement>("[data-project-cover-crop-tab]").forEach((button) => {
      button.hidden = !profiles.some((layout) => layout.id === button.dataset.projectCoverCropTab);
      const selected = button.dataset.projectCoverCropTab === activeLayout;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    panel?.setAttribute("aria-labelledby", tabId(activeLayout));
  };

  const previewImage = (frame: Element | null | undefined): HTMLImageElement | undefined => {
    if (!frame || !sourceUrl) return undefined;
    let image = frame.querySelector("img");
    if (!image) {
      image = document.createElement("img");
      image.alt = "";
      frame.append(image);
    }
    if (image.getAttribute("src") !== sourceUrl) image.src = sourceUrl;
    return image;
  };

  /** Preview and tab thumbnail read the same CropState that Save exports (§7.1). */
  const renderPreview = (id: MediaCropProfile): void => {
    const state = states.get(id);
    if (!state) return;
    const style = cropPreviewStyle(state);
    const thumb = previewImage(dialog?.querySelector(`[data-project-cover-crop-thumb="${id}"]`));
    if (thumb) thumb.style.cssText = style;
    if (id !== activeLayout) return;
    const image = previewImage(preview);
    if (image) image.style.cssText = style;
  };

  const cleanupCropper = (): void => {
    cropStage?.dispose();
    cropper?.destroy();
    cropper = undefined;
    cropStage = undefined;
    stage?.replaceChildren();
  };

  const cleanup = (): void => {
    initialization += 1;
    cleanupCropper();
    preview?.replaceChildren();
    dialog?.querySelectorAll("[data-project-cover-crop-thumb]").forEach((thumb) => thumb.replaceChildren());
    target = undefined;
    sourceImage = undefined;
    states.clear();
    persisted.clear();
    adjusted.clear();
    automatic.clear();
    if (zoom) setAdminCropZoomValue(zoom, zoomValue, 1);
    if (sourceUrl && sourceUrl !== originalUrl) URL.revokeObjectURL(sourceUrl);
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    sourceUrl = undefined;
    originalUrl = undefined;
    originalImage = undefined;
    rotatedCanvas = undefined;
    turns = 0;
    baselineTurns = 0;
    profiles = layouts;
    showInPortfolio = false;
    printProfile = "landscape";
  };

  const close = (): void => {
    if (dialog?.open) dialog.close();
    cleanup();
  };

  const requestClose = async (): Promise<void> => {
    if (isDirty() && !(await confirmAdmin({
      eyebrow: target?.evidence ? dialogCopy.evidence.eyebrow : dialogCopy.media.eyebrow,
      title: "Discard crop changes?",
      message: target?.evidence ? "Edited formats and Portfolio settings will keep their last saved values." : "Edited formats will keep their last saved crop.",
      confirmLabel: "Discard changes",
      cancelLabel: "Keep editing",
      tone: "danger",
    }))) return;
    close();
  };

  const initializeLayout = async (layoutId: MediaCropProfile): Promise<void> => {
    if (!stage || !preview || !sourceImage || !sourceUrl) return;
    const run = ++initialization;
    cleanupCropper();
    activeLayout = layoutId;
    refreshStatus();
    const layout = layoutById(layoutId);
    if (layoutName) layoutName.textContent = `${layout.label} · ${frameLabel(layout)}`;
    if (meta) meta.textContent = [`${sourceImage.naturalWidth} × ${sourceImage.naturalHeight}px original`, rotationLabel(turns) && `${rotationLabel(turns)} · all formats re-cropped`, `saved as ${layout.outputWidth} × ${layout.outputHeight}px WebP`].filter(Boolean).join(" · ");
    preview.style.setProperty("--admin-crop-ratio", String(ratio(layout)));
    preview.replaceChildren();
    renderPreview(layoutId);

    const image = new Image();
    image.alt = "Portfolio media source";
    image.src = sourceUrl;
    stage.append(image);
    cropper = new Cropper(image, { container: stage, template: cropperTemplate(layout) });
    const cropImage = cropper.getCropperImage();
    const selection = cropper.getCropperSelection();
    if (!cropImage || !selection) return;
    await waitForCropImage(cropImage);
    if (run !== initialization) return;
    cropStage = bindCropStage(cropImage, selection, {
      maxZoom,
      onChange: (state, change) => {
        states.set(layoutId, state);
        if (change.byUser) {
          automatic.delete(layoutId);
          adjusted.add(layoutId);
          refreshStatus();
        }
        if (zoom) setAdminCropZoomValue(zoom, zoomValue, change.zoom);
        renderPreview(layoutId);
      },
    });
    cropStage.setCrop(states.get(layoutId) ?? automaticCrop(sourceImage.naturalWidth, sourceImage.naturalHeight, ratio(layout)));
  };

  if (!dialog || !stage || !preview || !meta || !zoom || !save) {
    return { open: async () => { throw new Error("The cover crop editor is unavailable."); } };
  }

  dialog.querySelectorAll<HTMLButtonElement>("[data-project-cover-crop-cancel]").forEach((button) => button.addEventListener("click", () => void requestClose()));
  dialog.addEventListener("cancel", (event) => { event.preventDefault(); void requestClose(); });
  dialog.addEventListener("click", (event) => { if (event.target === dialog) void requestClose(); });
  dialog.querySelector<HTMLButtonElement>("[data-project-cover-zoom-out]")?.addEventListener("click", () => cropStage?.setZoom(cropStage.zoom() - 0.1));
  dialog.querySelector<HTMLButtonElement>("[data-project-cover-zoom-in]")?.addEventListener("click", () => cropStage?.setZoom(cropStage.zoom() + 0.1));
  zoom.addEventListener("input", () => cropStage?.setZoom(Number(zoom.value)));
  dialog.querySelector<HTMLButtonElement>("[data-project-cover-reset]")?.addEventListener("click", () => {
    if (!sourceImage || !cropStage) return;
    adjusted.delete(activeLayout);
    automatic.add(activeLayout);
    cropStage.setCrop(automaticCrop(sourceImage.naturalWidth, sourceImage.naturalHeight, ratio(layoutById(activeLayout))));
    refreshStatus();
  });
  dialog.querySelectorAll<HTMLButtonElement>("[data-project-cover-crop-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = button.dataset.projectCoverCropTab as MediaCropProfile;
      if (next === activeLayout) return;
      void initializeLayout(next).catch((error: Error) => callbacks.notify(error.message, "error"));
    });
    button.addEventListener("keydown", (event) => {
      const current = profiles.findIndex((item) => item.id === activeLayout);
      const nextIndex = event.key === "ArrowRight" ? current + 1
        : event.key === "ArrowLeft" ? current - 1
          : event.key === "Home" ? 0
            : event.key === "End" ? profiles.length - 1
              : undefined;
      if (nextIndex === undefined) return;
      event.preventDefault();
      const next = profiles[(nextIndex + profiles.length) % profiles.length];
      const nextButton = dialog.querySelector<HTMLButtonElement>(`[data-project-cover-crop-tab="${next.id}"]`);
      nextButton?.click();
      nextButton?.focus();
    });
  });

  /** Saved crops belong to the turns they were made at: back at that turn they return, any other turn re-crops every format. */
  const resetStatesForSource = (): void => {
    if (!sourceImage || !target) return;
    states.clear();
    adjusted.clear();
    automatic.clear();
    if (turns === baselineTurns) target.crops.forEach((crop) => states.set(crop.profile, rowState(crop)));
    profiles.forEach((layout) => {
      if (!states.has(layout.id)) states.set(layout.id, automaticCrop(sourceImage!.naturalWidth, sourceImage!.naturalHeight, ratio(layout)));
      if (turns !== baselineTurns) adjusted.add(layout.id);
      renderPreview(layout.id);
    });
  };

  /** Points the working source at the original turned `next` quarter turns, always drawn from the untouched original. */
  const applyTurns = async (next: QuarterTurns): Promise<void> => {
    if (!originalImage) return;
    turns = next;
    if (sourceUrl && sourceUrl !== originalUrl) URL.revokeObjectURL(sourceUrl);
    if (turns === 0) {
      rotatedCanvas = undefined;
      sourceUrl = originalUrl;
      sourceImage = originalImage;
    } else {
      rotatedCanvas = drawRotated(originalImage, turns);
      sourceUrl = URL.createObjectURL(await canvasToBlob(rotatedCanvas, "image/webp", 0.95));
      sourceImage = await loadImage(sourceUrl);
    }
  };

  const rotate = async (delta: number): Promise<void> => {
    if (!originalImage || rotating) return;
    rotating = true;
    // The buttons stay enabled (a disabled button drops focus out of the dialog, which breaks [ and ]); `rotating` guards.
    try {
      await applyTurns(normalizeTurns(turns + delta));
      resetStatesForSource();
      refreshStatus();
      await initializeLayout(activeLayout);
    } finally {
      rotating = false;
    }
  };
  dialog.querySelector<HTMLButtonElement>("[data-project-cover-rotate-left]")?.addEventListener("click", () => void rotate(-1).catch((error: Error) => callbacks.notify(error.message, "error")));
  dialog.querySelector<HTMLButtonElement>("[data-project-cover-rotate-right]")?.addEventListener("click", () => void rotate(1).catch((error: Error) => callbacks.notify(error.message, "error")));
  // Choosing the printed orientation also opens that format, so what prints is what is being positioned.
  printInputs.forEach((input) => input.addEventListener("change", () => {
    if (!input.checked) return;
    printProfile = input.value as CredentialPreviewProfile;
    if (printProfile !== activeLayout) void initializeLayout(printProfile).catch((error: Error) => callbacks.notify(error.message, "error"));
  }));
  showInput?.addEventListener("change", () => {
    void (async () => {
      if (showInput.checked && !target?.evidence?.showInPortfolio && !(await confirmAdmin({
        eyebrow: dialogCopy.evidence.eyebrow,
        title: "Show this evidence in the Portfolio?",
        message: "The saved crop becomes visible to anyone with the Portfolio link. The original file stays private. Any other file of this credential is hidden from the Portfolio.",
        confirmLabel: "Show in Portfolio",
        cancelLabel: "Keep private",
      }))) {
        showInput.checked = false;
        return;
      }
      showInPortfolio = showInput.checked;
    })();
  });

  dialog.addEventListener("keydown", (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    if (event.key === "[" || event.key === "]") {
      event.preventDefault();
      void rotate(event.key === "]" ? 1 : -1).catch((error: Error) => callbacks.notify(error.message, "error"));
    }
  });

  save.addEventListener("click", () => {
    if (!sourceImage || !target) return;
    const evidence = target.evidence;
    // A shown evidence file always keeps a saved crop in the printed orientation, so "Reset to auto" saves the
    // automatic crop instead of deleting the one the Portfolio prints.
    const printed = (profile: MediaCropProfile): boolean => Boolean(evidence && showInPortfolio && profile === printProfile);
    const changedProfiles = profiles.filter((layout) => adjusted.has(layout.id) || (printed(layout.id) && (!persisted.has(layout.id) || automatic.has(layout.id))));
    const removedProfiles = [...automatic].filter((profile) => persisted.has(profile) && !printed(profile));
    const saveSettings = settingsChanged();
    if (!changedProfiles.length && !removedProfiles.length && !saveSettings) {
      close();
      callbacks.notify(evidence ? "No evidence preview changes were needed." : "No custom crop changes were needed.", "info");
      return;
    }
    // Evidence rotation is a stored setting; only Project and Tool media rewrite their original.
    const rewriteOriginal = !evidence && turns !== 0;
    setButtonBusy(save, true, rewriteOriginal ? "Saving rotation…" : "Saving crops…");
    let rotatedPath: string | undefined;
    void (async () => {
      const source = sourceImage as HTMLImageElement;
      const drawable: CanvasImageSource = rotatedCanvas ?? source;
      const rotatedBlob = rewriteOriginal && rotatedCanvas ? await canvasToBlob(rotatedCanvas, rotatedOriginalType(originalType), 0.92) : undefined;
      if (rotatedBlob && target) rotatedPath = await uploadRotatedOriginal(target.storagePath, rotatedBlob);
      const outputs = await Promise.all(changedProfiles.map(async (layout) => {
        const state = states.get(layout.id) ?? automaticCrop(source.naturalWidth, source.naturalHeight, ratio(layout));
        const canvas = document.createElement("canvas");
        canvas.width = layout.outputWidth;
        canvas.height = layout.outputHeight;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("The browser could not prepare the crop canvas.");
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        const { sx, sy, sw, sh } = cropSourceRect(state, source.naturalWidth, source.naturalHeight);
        context.drawImage(drawable, sx, sy, sw, sh, 0, 0, layout.outputWidth, layout.outputHeight);
        return {
          profile: layout.id,
          blob: await canvasToWebp(canvas),
          cropX: state.x,
          cropY: state.y,
          cropWidth: state.width,
          cropHeight: state.height,
          width: layout.outputWidth,
          height: layout.outputHeight,
        };
      }));
      const owner = target as PortfolioMediaCropTarget;
      await savePortfolioMediaCrops(owner.ownerType, owner.ownerId, owner.imageId, outputs, removedProfiles);
      if (evidence && saveSettings) await saveCredentialPreviewSettings(evidence, { showInPortfolio, previewProfile: printProfile, previewRotation: turns });
      const wasRotated = Boolean(rotatedPath && rotatedBlob);
      if (rotatedPath && rotatedBlob) await commitRotatedOriginal(owner.ownerType, owner.imageId, owner.storagePath, rotatedPath, rotatedBlob);
      rotatedPath = undefined;
      const shown = showInPortfolio;
      close();
      await callbacks.onSaved(owner);
      callbacks.notify(evidence
        ? shown || evidence.showInPortfolio
          ? "Evidence preview saved. Republish the Portfolio to update the public release."
          : "Evidence crops saved. Turn on Show in Portfolio to print this preview."
        : wasRotated
          ? "Image rotated and Portfolio crops saved. Republish the Website and Portfolio to update their public releases."
          : "Portfolio image crops saved. Republish the Portfolio to update the public release.", "success");
    })()
      .catch(async (error: Error) => {
        // Nothing points at an uncommitted rotated original yet; remove it so a failed save leaves no trace.
        if (rotatedPath) await discardRotatedOriginal(rotatedPath).catch(() => undefined);
        callbacks.notify(error.message, "error");
      })
      .finally(() => { if (save.isConnected) setButtonBusy(save, false); });
  });

  return {
    open: async (nextTarget): Promise<void> => {
      cleanup();
      try {
        target = nextTarget;
        const evidence = nextTarget.evidence;
        profiles = evidence ? layouts.filter((layout) => (evidenceProfiles as MediaCropProfile[]).includes(layout.id)) : layouts;
        baselineTurns = evidence ? evidence.previewRotation : 0;
        printProfile = evidence?.previewProfile ?? "landscape";
        showInPortfolio = evidence?.showInPortfolio ?? false;
        activeLayout = evidence ? printProfile : nextTarget.preferredProfile;
        const copy = evidence ? dialogCopy.evidence : dialogCopy.media;
        const header = dialog.querySelector(".admin-dialog__header");
        header?.querySelector(".section-kicker")?.replaceChildren(copy.eyebrow);
        header?.querySelector("h2")?.replaceChildren(copy.title);
        header?.querySelector(".admin-dialog__note")?.replaceChildren(copy.note);
        if (evidenceSettings) evidenceSettings.hidden = !evidence;
        printInputs.forEach((input) => { input.checked = input.value === printProfile; });
        if (showInput) showInput.checked = showInPortfolio;
        nextTarget.crops.forEach((crop) => {
          if (!profiles.some((layout) => layout.id === crop.profile)) return;
          states.set(crop.profile, rowState(crop));
          persisted.add(crop.profile);
        });
        const blob = evidence ? await downloadCredentialAsset(evidence) : await downloadStoredMedia(nextTarget.storagePath);
        originalType = blob.type || "image/jpeg";
        originalUrl = URL.createObjectURL(blob);
        sourceUrl = originalUrl;
        sourceImage = await loadImage(sourceUrl);
        originalImage = sourceImage;
        if (sourceImage.naturalWidth * sourceImage.naturalHeight > maxSourcePixels) {
          throw new Error("Source image is too large to crop safely (maximum 80 megapixels).");
        }
        // Evidence opens at its stored turns, where its saved crops were made.
        if (baselineTurns) await applyTurns(baselineTurns);
        profiles.forEach((layout) => {
          if (!states.has(layout.id)) states.set(layout.id, automaticCrop(sourceImage!.naturalWidth, sourceImage!.naturalHeight, ratio(layout)));
          renderPreview(layout.id);
        });
        refreshStatus();
        dialog.showModal();
        await nextFrame();
        await initializeLayout(activeLayout);
      } catch (error) {
        close();
        throw error;
      }
    },
  };
};

// Kept as aliases while the Admin route remains lazily loaded under its original module name.
export const renderProjectCoverCropDialog = renderPortfolioMediaCropDialog;
export const bindProjectCoverCropper = bindPortfolioMediaCropper;
