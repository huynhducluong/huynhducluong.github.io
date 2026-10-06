import Cropper from "cropperjs";
import type { ProfilePhotoAsset } from "../types/profilePhoto";
import { createProfilePhoto } from "../services/profilePhotoRepository";
import { setButtonBusy } from "./ui";

const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const maxSourceBytes = 20 * 1024 * 1024;
const maxSourcePixels = 80_000_000;
const outputSize = 1024;

const cropperTemplate = `
  <cropper-canvas background scale-step="0.05">
    <cropper-image initial-center-size="cover" translatable scalable></cropper-image>
    <cropper-shade></cropper-shade>
    <cropper-handle action="move" plain></cropper-handle>
    <cropper-selection id="profile-photo-crop-selection" initial-aspect-ratio="1" aspect-ratio="1" initial-coverage="0.78" outlined>
      <cropper-grid role="grid" bordered covered></cropper-grid>
      <cropper-crosshair centered></cropper-crosshair>
    </cropper-selection>
  </cropper-canvas>`;

export const renderProfilePhotoCropDialog = (): string => `
  <dialog class="admin-dialog admin-photo-crop-dialog" data-profile-photo-crop-dialog aria-labelledby="profile-photo-crop-title">
    <div class="admin-photo-crop-dialog__heading">
      <div><p class="section-kicker">Profile photo</p><h2 id="profile-photo-crop-title">Crop photo</h2><p>Drag the image and adjust zoom inside the fixed square.</p><section class="admin-dialog-status-region" data-admin-dialog-status aria-label="Photo crop status" hidden></section></div>
      <button class="admin-dialog-close" type="button" aria-label="Close crop photo dialog" data-profile-photo-crop-cancel>&times;</button>
    </div>
    <div class="admin-photo-crop-dialog__layout">
      <section class="admin-photo-crop-editor" aria-label="Photo crop editor">
        <div class="admin-photo-crop-stage" data-profile-photo-crop-stage></div>
        <div class="admin-photo-crop-controls">
          <button class="button button--secondary admin-icon-button" type="button" aria-label="Zoom out" data-profile-photo-zoom-out>&minus;</button>
          <label><span>Zoom</span><input type="range" min="1" max="3" step="0.05" value="1" data-profile-photo-zoom></label>
          <button class="button button--secondary admin-icon-button" type="button" aria-label="Zoom in" data-profile-photo-zoom-in>&plus;</button>
          <button class="button button--secondary" type="button" data-profile-photo-reset>Reset</button>
        </div>
      </section>
      <aside class="admin-photo-crop-preview">
        <p class="section-kicker">Preview</p>
        <div class="admin-photo-crop-preview__images">
          <div><cropper-viewer selection="#profile-photo-crop-selection" resize="both"></cropper-viewer><span>Square</span></div>
          <div><cropper-viewer class="is-round" selection="#profile-photo-crop-selection" resize="both"></cropper-viewer><span>CV / Portfolio</span></div>
        </div>
        <label>Photo name<input type="text" maxlength="120" data-profile-photo-crop-name></label>
        <p data-profile-photo-crop-meta></p>
      </aside>
    </div>
    <div class="admin-actions admin-photo-crop-dialog__actions">
      <button class="button button--secondary" type="button" data-profile-photo-crop-cancel>Cancel</button>
      <button class="button" type="button" data-profile-photo-crop-save>Save photo</button>
    </div>
  </dialog>`;

interface CropperCallbacks {
  notify: (message: string, kind?: "info" | "error" | "success") => void;
  onSaved: (photo: ProfilePhotoAsset) => void;
}

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
    else reject(new Error("This browser could not export the cropped image as WebP."));
  }, "image/webp", 0.9);
});

const defaultPhotoName = (fileName: string): string => {
  const base = fileName.replace(/\.[^.]+$/, "").trim() || "Profile photo";
  return base.slice(0, 120);
};

export const bindProfilePhotoCropper = (root: ParentNode, callbacks: CropperCallbacks): void => {
  const input = root.querySelector<HTMLInputElement>("[data-profile-photo-upload]");
  const dialog = root.querySelector<HTMLDialogElement>("[data-profile-photo-crop-dialog]");
  const stage = dialog?.querySelector<HTMLElement>("[data-profile-photo-crop-stage]");
  const nameInput = dialog?.querySelector<HTMLInputElement>("[data-profile-photo-crop-name]");
  const meta = dialog?.querySelector<HTMLElement>("[data-profile-photo-crop-meta]");
  const zoom = dialog?.querySelector<HTMLInputElement>("[data-profile-photo-zoom]");
  const save = dialog?.querySelector<HTMLButtonElement>("[data-profile-photo-crop-save]");
  if (!input || !dialog || !stage || !nameInput || !meta || !zoom || !save) return;

  let sourceUrl: string | undefined;
  let cropper: Cropper | undefined;
  let zoomLevel = 1;

  const cleanup = (): void => {
    stage.replaceChildren();
    cropper = undefined;
    zoomLevel = 1;
    zoom.value = "1";
    input.value = "";
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    sourceUrl = undefined;
  };
  const close = (): void => {
    if (dialog.open) dialog.close();
    cleanup();
  };
  const cropperImage = () => cropper?.getCropperImage();
  const applyZoom = (next: number): void => {
    const bounded = Math.min(3, Math.max(1, next));
    const image = cropperImage();
    if (!image || bounded === zoomLevel) return;
    image.$zoom((bounded / zoomLevel) - 1);
    zoomLevel = bounded;
    zoom.value = String(bounded);
  };

  dialog.querySelectorAll<HTMLButtonElement>("[data-profile-photo-crop-cancel]").forEach((button) => button.addEventListener("click", close));
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  });
  dialog.querySelector<HTMLButtonElement>("[data-profile-photo-zoom-out]")?.addEventListener("click", () => applyZoom(zoomLevel - 0.1));
  dialog.querySelector<HTMLButtonElement>("[data-profile-photo-zoom-in]")?.addEventListener("click", () => applyZoom(zoomLevel + 0.1));
  zoom.addEventListener("input", () => applyZoom(Number(zoom.value)));
  dialog.querySelector<HTMLButtonElement>("[data-profile-photo-reset]")?.addEventListener("click", () => {
    const image = cropperImage();
    if (!image) return;
    image.$resetTransform();
    image.$center("cover");
    zoomLevel = 1;
    zoom.value = "1";
  });

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    if (!acceptedTypes.has(file.type)) {
      input.value = "";
      callbacks.notify("Choose a JPEG, PNG, WebP or AVIF image.", "error");
      return;
    }
    if (file.size > maxSourceBytes) {
      input.value = "";
      callbacks.notify("Source image must be 20 MB or smaller.", "error");
      return;
    }
    try {
      sourceUrl = URL.createObjectURL(file);
      const image = await loadImage(sourceUrl);
      if (image.naturalWidth * image.naturalHeight > maxSourcePixels) throw new Error("Source image is too large to crop safely (maximum 80 megapixels).");
      nameInput.value = defaultPhotoName(file.name);
      meta.textContent = `${image.naturalWidth} × ${image.naturalHeight}px source · output 1024 × 1024px WebP`;
      dialog.showModal();
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      cropper = new Cropper(image, { container: stage, template: cropperTemplate });
      const cropImage = cropper.getCropperImage();
      const cropCanvas = cropper.getCropperCanvas();
      const selection = cropper.getCropperSelection();
      await cropImage?.$ready();
      cropImage?.$center("cover");
      cropImage?.addEventListener("transform", (event) => {
        if (!cropCanvas || !selection) return;
        const transformEvent = event as CustomEvent<{ matrix: number[] }>;
        const clone = cropImage.cloneNode() as HTMLElement;
        clone.style.transform = `matrix(${transformEvent.detail.matrix.join(",")})`;
        clone.style.opacity = "0";
        cropCanvas.append(clone);
        const imageBounds = clone.getBoundingClientRect();
        const selectionBounds = selection.getBoundingClientRect();
        clone.remove();
        if (imageBounds.top > selectionBounds.top
          || imageBounds.right < selectionBounds.right
          || imageBounds.bottom < selectionBounds.bottom
          || imageBounds.left > selectionBounds.left) event.preventDefault();
      });
      requestAnimationFrame(() => nameInput.focus({ preventScroll: true }));
    } catch (error) {
      cleanup();
      callbacks.notify(error instanceof Error ? error.message : "The image could not be opened.", "error");
    }
  });

  save.addEventListener("click", () => {
    const name = nameInput.value.trim();
    if (!name) {
      callbacks.notify("Enter a name for this profile photo.", "error");
      nameInput.focus();
      return;
    }
    const selection = cropper?.getCropperSelection();
    if (!selection) return callbacks.notify("The crop area is not ready yet.", "error");
    setButtonBusy(save, true, "Saving…");
    void (async () => {
      const canvas = await selection.$toCanvas({ width: outputSize, height: outputSize });
      const blob = await canvasToWebp(canvas);
      const photo = await createProfilePhoto(name, blob);
      close();
      callbacks.onSaved(photo);
    })()
      .catch((error: Error) => callbacks.notify(error.message, "error"))
      .finally(() => { if (save.isConnected) setButtonBusy(save, false); });
  });
};
