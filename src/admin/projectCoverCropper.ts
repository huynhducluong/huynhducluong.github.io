import Cropper from "cropperjs";
import {
  downloadStoredMedia,
  savePortfolioMediaCrops,
  type PortfolioMediaCropRow,
  type PortfolioMediaOwnerType,
} from "../services/portfolioMediaCropRepository";
import type { MediaCropProfile } from "../types/portfolio";
import { confirmAdmin } from "./confirmDialog";
import { automaticCrop, clampCrop, cropPreviewStyle, cropSourceRect, type CropState } from "./cropGeometry";
import { bindCropStage, waitForCropImage, type CropStage } from "./cropStage";
import { renderAdminCropZoomControls, renderAdminDialogHeader, setAdminCropZoomValue, setButtonBusy } from "./ui";

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
      </aside>
    </div>
    <div class="admin-project-cover-crop-footer">
      ${renderAdminCropZoomControls({ prefix: "project-cover", maxZoom, resetLabel: "Reset to auto", resetTitle: "Reset this format to the automatic crop" })}
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

  let target: PortfolioMediaCropTarget | undefined;
  let sourceUrl: string | undefined;
  let sourceImage: HTMLImageElement | undefined;
  let cropper: Cropper | undefined;
  let cropStage: CropStage | undefined;
  let activeLayout: MediaCropProfile = "wide";
  let initialization = 0;
  const states = new Map<MediaCropProfile, CropState>();
  const persisted = new Set<MediaCropProfile>();
  const adjusted = new Set<MediaCropProfile>();
  const automatic = new Set<MediaCropProfile>();

  const isEdited = (id: MediaCropProfile): boolean => adjusted.has(id) || (automatic.has(id) && persisted.has(id));
  const isDirty = (): boolean => layouts.some((layout) => isEdited(layout.id));

  const refreshStatus = (): void => {
    layouts.forEach((layout) => {
      const status = dialog?.querySelector<HTMLElement>(`[data-project-cover-crop-status="${layout.id}"]`);
      if (!status) return;
      // Saved custom crops need no label; only automatic and unsaved states are worth reading.
      const label = isEdited(layout.id) ? "Edited" : persisted.has(layout.id) ? "" : "Auto";
      status.textContent = label;
      status.dataset.kind = isEdited(layout.id) ? "edited" : "auto";
      status.hidden = !label;
    });
    dialog?.querySelectorAll<HTMLButtonElement>("[data-project-cover-crop-tab]").forEach((button) => {
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
      image.src = sourceUrl;
      frame.append(image);
    }
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
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    sourceUrl = undefined;
  };

  const close = (): void => {
    if (dialog?.open) dialog.close();
    cleanup();
  };

  const requestClose = async (): Promise<void> => {
    if (isDirty() && !(await confirmAdmin({
      eyebrow: "Portfolio media",
      title: "Discard crop changes?",
      message: "Edited formats will keep their last saved crop.",
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
    if (meta) meta.textContent = `${sourceImage.naturalWidth} × ${sourceImage.naturalHeight}px original · saved as ${layout.outputWidth} × ${layout.outputHeight}px WebP`;
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
      const current = layouts.findIndex((item) => item.id === activeLayout);
      const nextIndex = event.key === "ArrowRight" ? current + 1
        : event.key === "ArrowLeft" ? current - 1
          : event.key === "Home" ? 0
            : event.key === "End" ? layouts.length - 1
              : undefined;
      if (nextIndex === undefined) return;
      event.preventDefault();
      const next = layouts[(nextIndex + layouts.length) % layouts.length];
      const nextButton = dialog.querySelector<HTMLButtonElement>(`[data-project-cover-crop-tab="${next.id}"]`);
      nextButton?.click();
      nextButton?.focus();
    });
  });

  save.addEventListener("click", () => {
    if (!sourceImage || !target) return;
    const changedProfiles = layouts.filter((layout) => adjusted.has(layout.id));
    const removedProfiles = [...automatic].filter((profile) => persisted.has(profile));
    if (!changedProfiles.length && !removedProfiles.length) {
      close();
      callbacks.notify("No custom crop changes were needed.", "info");
      return;
    }
    setButtonBusy(save, true, "Saving crops…");
    void (async () => {
      const source = sourceImage as HTMLImageElement;
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
        context.drawImage(source, sx, sy, sw, sh, 0, 0, layout.outputWidth, layout.outputHeight);
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
      await savePortfolioMediaCrops(target.ownerType, target.ownerId, target.imageId, outputs, removedProfiles);
      const savedTarget = target;
      close();
      await callbacks.onSaved(savedTarget);
      callbacks.notify("Portfolio image crops saved. Republish the Portfolio to update the public release.", "success");
    })()
      .catch((error: Error) => callbacks.notify(error.message, "error"))
      .finally(() => { if (save.isConnected) setButtonBusy(save, false); });
  });

  return {
    open: async (nextTarget): Promise<void> => {
      cleanup();
      try {
        target = nextTarget;
        activeLayout = nextTarget.preferredProfile;
        nextTarget.crops.forEach((crop) => {
          states.set(crop.profile, rowState(crop));
          persisted.add(crop.profile);
        });
        const blob = await downloadStoredMedia(nextTarget.storagePath);
        sourceUrl = URL.createObjectURL(blob);
        sourceImage = await loadImage(sourceUrl);
        if (sourceImage.naturalWidth * sourceImage.naturalHeight > maxSourcePixels) {
          throw new Error("Source image is too large to crop safely (maximum 80 megapixels).");
        }
        layouts.forEach((layout) => {
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
