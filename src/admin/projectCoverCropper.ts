import Cropper from "cropperjs";
import { downloadStoredMedia, saveProjectCoverCrops, type ProjectImageCropRow } from "../services/projectCoverCropRepository";
import type { PortfolioLayout } from "../types/portfolio";
import { setButtonBusy } from "./ui";

interface CropState {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CropLayoutConfig {
  id: PortfolioLayout;
  label: string;
  frameWidth: number;
  frameHeight: number;
  outputWidth: number;
  outputHeight: number;
}

export interface ProjectCoverCropTarget {
  projectId: string;
  imageId: string;
  storagePath: string;
  preferredLayout: PortfolioLayout;
  crops: ProjectImageCropRow[];
}

interface ProjectCoverCropperCallbacks {
  notify: (message: string, kind?: "info" | "error" | "success") => void;
  onSaved: () => void | Promise<void>;
}

const layouts: CropLayoutConfig[] = [
  { id: "standard", label: "Standard", frameWidth: 164, frameHeight: 210, outputWidth: 1406, outputHeight: 1800 },
  { id: "feature", label: "Feature", frameWidth: 178, frameHeight: 210, outputWidth: 1526, outputHeight: 1800 },
  { id: "compact", label: "Compact", frameWidth: 138, frameHeight: 210, outputWidth: 1183, outputHeight: 1800 },
];

const selectionId = "project-cover-crop-selection";
const maxSourcePixels = 80_000_000;
const layoutById = (id: PortfolioLayout): CropLayoutConfig => layouts.find((item) => item.id === id) ?? layouts[0];
const ratio = (layout: CropLayoutConfig): number => layout.frameWidth / layout.frameHeight;
const frameLabel = (layout: CropLayoutConfig): string => `${layout.frameWidth}:${layout.frameHeight}`;

const cropperTemplate = (layout: CropLayoutConfig): string => `
  <cropper-canvas background scale-step="0.05">
    <cropper-image initial-center-size="cover" translatable scalable></cropper-image>
    <cropper-shade></cropper-shade>
    <cropper-handle action="move" plain></cropper-handle>
    <cropper-selection id="${selectionId}" initial-aspect-ratio="${ratio(layout)}" aspect-ratio="${ratio(layout)}" initial-coverage="0.82" outlined>
      <cropper-grid role="grid" bordered covered></cropper-grid>
      <cropper-crosshair centered></cropper-crosshair>
    </cropper-selection>
  </cropper-canvas>`;

export const renderProjectCoverCropDialog = (): string => `
  <dialog class="admin-dialog admin-photo-crop-dialog admin-project-cover-crop-dialog" data-project-cover-crop-dialog aria-labelledby="project-cover-crop-title">
    <div class="admin-photo-crop-dialog__heading">
      <div><p class="section-kicker">Portfolio cover</p><h2 id="project-cover-crop-title">Adjust cover crops</h2><p>Position the original image for each Portfolio layout.</p></div>
      <button class="admin-dialog-close" type="button" aria-label="Close cover crop dialog" data-project-cover-crop-cancel>&times;</button>
    </div>
    <div class="admin-project-cover-crop-tabs" role="tablist" aria-label="Portfolio cover layout">
      ${layouts.map((layout) => `<button type="button" role="tab" data-project-cover-crop-tab="${layout.id}"><span>${layout.label}</span><small data-project-cover-crop-status="${layout.id}">Auto</small></button>`).join("")}
    </div>
    <div class="admin-photo-crop-dialog__layout">
      <section class="admin-photo-crop-editor" aria-label="Cover crop editor">
        <div class="admin-photo-crop-stage" data-project-cover-crop-stage></div>
      </section>
      <aside class="admin-photo-crop-preview admin-project-cover-crop-preview">
        <p class="section-kicker">Portfolio preview</p>
        <div class="admin-project-cover-crop-preview__frame" data-project-cover-crop-preview></div>
        <div class="admin-project-cover-crop-preview__info">
          <strong data-project-cover-crop-layout-name>Standard</strong>
          <p data-project-cover-crop-meta></p>
        </div>
      </aside>
    </div>
    <div class="admin-project-cover-crop-footer">
      <div class="admin-photo-crop-controls">
        <button class="button button--secondary admin-icon-button" type="button" aria-label="Zoom out" data-project-cover-zoom-out>&minus;</button>
        <label><span>Zoom</span><input type="range" min="1" max="4" step="0.05" value="1" data-project-cover-zoom></label>
        <button class="button button--secondary admin-icon-button" type="button" aria-label="Zoom in" data-project-cover-zoom-in>&plus;</button>
        <button class="button button--secondary" type="button" data-project-cover-reset>Reset</button>
      </div>
      <div class="admin-actions admin-photo-crop-dialog__actions">
        <button class="button button--secondary" type="button" data-project-cover-crop-cancel>Cancel</button>
        <button class="button" type="button" data-project-cover-crop-save>Save 3 crops</button>
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
const bounded = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value));
const rounded = (value: number): number => Math.round(value * 100_000_000) / 100_000_000;

const defaultCrop = (image: HTMLImageElement, layout: CropLayoutConfig): CropState => {
  const sourceRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = ratio(layout);
  if (sourceRatio > targetRatio) {
    const width = targetRatio / sourceRatio;
    return { x: (1 - width) / 2, y: 0, width, height: 1 };
  }
  const height = sourceRatio / targetRatio;
  return { x: 0, y: (1 - height) / 2, width: 1, height };
};

const rowState = (row: ProjectImageCropRow): CropState => ({
  x: Number(row.crop_x),
  y: Number(row.crop_y),
  width: Number(row.crop_width),
  height: Number(row.crop_height),
});

export const bindProjectCoverCropper = (
  root: ParentNode,
  callbacks: ProjectCoverCropperCallbacks,
): { open: (target: ProjectCoverCropTarget) => Promise<void> } => {
  const dialog = root.querySelector<HTMLDialogElement>("[data-project-cover-crop-dialog]");
  const stage = dialog?.querySelector<HTMLElement>("[data-project-cover-crop-stage]");
  const preview = dialog?.querySelector<HTMLElement>("[data-project-cover-crop-preview]");
  const meta = dialog?.querySelector<HTMLElement>("[data-project-cover-crop-meta]");
  const layoutName = dialog?.querySelector<HTMLElement>("[data-project-cover-crop-layout-name]");
  const zoom = dialog?.querySelector<HTMLInputElement>("[data-project-cover-zoom]");
  const save = dialog?.querySelector<HTMLButtonElement>("[data-project-cover-crop-save]");

  let target: ProjectCoverCropTarget | undefined;
  let sourceUrl: string | undefined;
  let sourceImage: HTMLImageElement | undefined;
  let cropper: Cropper | undefined;
  let activeLayout: PortfolioLayout = "standard";
  let zoomLevel = 1;
  let baseImageWidth = 1;
  let restoring = false;
  let initialization = 0;
  const states = new Map<PortfolioLayout, CropState>();
  const persisted = new Set<PortfolioLayout>();
  const adjusted = new Set<PortfolioLayout>();

  const refreshStatus = (): void => {
    layouts.forEach((layout) => {
      const label = adjusted.has(layout.id) ? "Adjusted" : persisted.has(layout.id) ? "Saved" : "Auto";
      const status = dialog?.querySelector<HTMLElement>(`[data-project-cover-crop-status="${layout.id}"]`);
      if (status) status.textContent = label;
    });
    dialog?.querySelectorAll<HTMLButtonElement>("[data-project-cover-crop-tab]").forEach((button) => {
      const selected = button.dataset.projectCoverCropTab === activeLayout;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
  };

  const cleanupCropper = (): void => {
    cropper?.destroy();
    cropper = undefined;
    stage?.replaceChildren();
    preview?.replaceChildren();
  };

  const cleanup = (): void => {
    initialization += 1;
    cleanupCropper();
    target = undefined;
    sourceImage = undefined;
    states.clear();
    persisted.clear();
    adjusted.clear();
    zoomLevel = 1;
    if (zoom) zoom.value = "1";
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    sourceUrl = undefined;
  };

  const close = (): void => {
    if (dialog?.open) dialog.close();
    cleanup();
  };

  const captureState = (): CropState | undefined => {
    const cropImage = cropper?.getCropperImage();
    const selection = cropper?.getCropperSelection();
    if (!cropImage || !selection) return undefined;
    const imageBounds = cropImage.getBoundingClientRect();
    const selectionBounds = selection.getBoundingClientRect();
    if (!imageBounds.width || !imageBounds.height) return undefined;
    const width = bounded(selectionBounds.width / imageBounds.width, 0.000001, 1);
    const height = bounded(selectionBounds.height / imageBounds.height, 0.000001, 1);
    const x = bounded((selectionBounds.left - imageBounds.left) / imageBounds.width, 0, 1 - width);
    const y = bounded((selectionBounds.top - imageBounds.top) / imageBounds.height, 0, 1 - height);
    return { x: rounded(x), y: rounded(y), width: rounded(width), height: rounded(height) };
  };

  const rememberActiveState = (): void => {
    const state = captureState();
    if (state) states.set(activeLayout, state);
  };

  const syncZoom = (): void => {
    const cropImage = cropper?.getCropperImage();
    if (!cropImage || !zoom) return;
    const currentWidth = cropImage.getBoundingClientRect().width;
    zoomLevel = bounded(currentWidth / baseImageWidth, 1, 4);
    zoom.value = String(zoomLevel);
  };

  const applyZoom = (next: number): void => {
    const cropImage = cropper?.getCropperImage();
    if (!cropImage) return;
    const nextLevel = bounded(next, 1, 4);
    if (Math.abs(nextLevel - zoomLevel) < 0.001) return;
    const scale = nextLevel / zoomLevel;
    cropImage.$zoom(scale >= 1 ? scale - 1 : 1 - (1 / scale));
    zoomLevel = nextLevel;
    if (zoom) zoom.value = String(nextLevel);
  };

  const initializeLayout = async (layoutId: PortfolioLayout): Promise<void> => {
    if (!stage || !preview || !sourceImage || !sourceUrl) return;
    const run = ++initialization;
    cleanupCropper();
    activeLayout = layoutId;
    refreshStatus();
    const layout = layoutById(layoutId);
    if (layoutName) layoutName.textContent = `${layout.label} · ${frameLabel(layout)}`;
    preview.style.aspectRatio = String(ratio(layout));

    const image = new Image();
    image.alt = "Project cover source";
    image.src = sourceUrl;
    stage.append(image);
    cropper = new Cropper(image, { container: stage, template: cropperTemplate(layout) });
    preview.innerHTML = `<cropper-viewer selection="#${selectionId}" resize="both"></cropper-viewer><span aria-hidden="true">01</span>`;
    const cropImage = cropper.getCropperImage();
    const cropCanvas = cropper.getCropperCanvas();
    const selection = cropper.getCropperSelection();
    await cropImage?.$ready();
    if (run !== initialization || !cropImage || !selection) return;
    restoring = true;
    cropImage.$center("cover");
    await nextFrame();
    baseImageWidth = cropImage.getBoundingClientRect().width || 1;
    const state = states.get(layoutId) ?? defaultCrop(sourceImage, layout);
    const initialImageBounds = cropImage.getBoundingClientRect();
    const selectionBounds = selection.getBoundingClientRect();
    const requiredScale = selectionBounds.width / (state.width * initialImageBounds.width);
    if (Math.abs(requiredScale - 1) > 0.001) cropImage.$zoom(requiredScale >= 1 ? requiredScale - 1 : 1 - (1 / requiredScale));
    await nextFrame();
    const imageBounds = cropImage.getBoundingClientRect();
    cropImage.$move(
      selectionBounds.left - (imageBounds.left + state.x * imageBounds.width),
      selectionBounds.top - (imageBounds.top + state.y * imageBounds.height),
    );
    await nextFrame();
    syncZoom();
    restoring = false;

    cropImage.addEventListener("transform", (event) => {
      if (!cropCanvas || !selection) return;
      const transformEvent = event as CustomEvent<{ matrix: number[] }>;
      const clone = cropImage.cloneNode() as HTMLElement;
      clone.style.transform = `matrix(${transformEvent.detail.matrix.join(",")})`;
      clone.style.opacity = "0";
      cropCanvas.append(clone);
      const proposed = clone.getBoundingClientRect();
      const bounds = selection.getBoundingClientRect();
      clone.remove();
      if (proposed.top > bounds.top || proposed.right < bounds.right || proposed.bottom < bounds.bottom || proposed.left > bounds.left) {
        event.preventDefault();
        return;
      }
      requestAnimationFrame(() => {
        syncZoom();
        if (!restoring) {
          adjusted.add(activeLayout);
          rememberActiveState();
          refreshStatus();
        }
      });
    });
  };

  if (!dialog || !stage || !preview || !meta || !zoom || !save) {
    return { open: async () => { throw new Error("The cover crop editor is unavailable."); } };
  }

  dialog.querySelectorAll<HTMLButtonElement>("[data-project-cover-crop-cancel]").forEach((button) => button.addEventListener("click", close));
  dialog.addEventListener("cancel", (event) => { event.preventDefault(); close(); });
  dialog.addEventListener("click", (event) => { if (event.target === dialog) close(); });
  dialog.querySelector<HTMLButtonElement>("[data-project-cover-zoom-out]")?.addEventListener("click", () => applyZoom(zoomLevel - 0.1));
  dialog.querySelector<HTMLButtonElement>("[data-project-cover-zoom-in]")?.addEventListener("click", () => applyZoom(zoomLevel + 0.1));
  zoom.addEventListener("input", () => applyZoom(Number(zoom.value)));
  dialog.querySelector<HTMLButtonElement>("[data-project-cover-reset]")?.addEventListener("click", () => {
    if (!sourceImage) return;
    const state = defaultCrop(sourceImage, layoutById(activeLayout));
    states.set(activeLayout, state);
    adjusted.add(activeLayout);
    void initializeLayout(activeLayout);
  });
  dialog.querySelectorAll<HTMLButtonElement>("[data-project-cover-crop-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = button.dataset.projectCoverCropTab as PortfolioLayout;
      if (next === activeLayout) return;
      rememberActiveState();
      void initializeLayout(next).catch((error: Error) => callbacks.notify(error.message, "error"));
    });
    button.addEventListener("keydown", (event) => {
      if (!(["ArrowLeft", "ArrowRight"] as string[]).includes(event.key)) return;
      event.preventDefault();
      const current = layouts.findIndex((item) => item.id === activeLayout);
      const offset = event.key === "ArrowRight" ? 1 : -1;
      const next = layouts[(current + offset + layouts.length) % layouts.length];
      dialog.querySelector<HTMLButtonElement>(`[data-project-cover-crop-tab="${next.id}"]`)?.click();
      dialog.querySelector<HTMLButtonElement>(`[data-project-cover-crop-tab="${next.id}"]`)?.focus();
    });
  });

  save.addEventListener("click", () => {
    if (!sourceImage || !target) return;
    rememberActiveState();
    setButtonBusy(save, true, "Saving crops…");
    void (async () => {
      const outputs = await Promise.all(layouts.map(async (layout) => {
        const state = states.get(layout.id) ?? defaultCrop(sourceImage as HTMLImageElement, layout);
        const canvas = document.createElement("canvas");
        canvas.width = layout.outputWidth;
        canvas.height = layout.outputHeight;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("The browser could not prepare the crop canvas.");
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(
          sourceImage as HTMLImageElement,
          state.x * sourceImage!.naturalWidth,
          state.y * sourceImage!.naturalHeight,
          state.width * sourceImage!.naturalWidth,
          state.height * sourceImage!.naturalHeight,
          0,
          0,
          layout.outputWidth,
          layout.outputHeight,
        );
        return {
          layout: layout.id,
          blob: await canvasToWebp(canvas),
          cropX: state.x,
          cropY: state.y,
          cropWidth: state.width,
          cropHeight: state.height,
          width: layout.outputWidth,
          height: layout.outputHeight,
        };
      }));
      await saveProjectCoverCrops(target.projectId, target.imageId, outputs);
      close();
      await callbacks.onSaved();
      callbacks.notify("Portfolio cover crops saved. Republish the Portfolio to update the public release.", "success");
    })()
      .catch((error: Error) => callbacks.notify(error.message, "error"))
      .finally(() => { if (save.isConnected) setButtonBusy(save, false); });
  });

  return {
    open: async (nextTarget): Promise<void> => {
      cleanup();
      try {
        target = nextTarget;
        activeLayout = nextTarget.preferredLayout;
        nextTarget.crops.forEach((crop) => {
          states.set(crop.layout, rowState(crop));
          persisted.add(crop.layout);
        });
        const blob = await downloadStoredMedia(nextTarget.storagePath);
        sourceUrl = URL.createObjectURL(blob);
        sourceImage = await loadImage(sourceUrl);
        if (sourceImage.naturalWidth * sourceImage.naturalHeight > maxSourcePixels) {
          throw new Error("Source image is too large to crop safely (maximum 80 megapixels).");
        }
        layouts.forEach((layout) => {
          if (!states.has(layout.id)) states.set(layout.id, defaultCrop(sourceImage as HTMLImageElement, layout));
        });
        meta.textContent = `${sourceImage.naturalWidth} × ${sourceImage.naturalHeight}px original · WebP output up to 1526 × 1800px`;
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
