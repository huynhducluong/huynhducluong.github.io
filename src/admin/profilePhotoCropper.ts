import Cropper from "cropperjs";
import type { ProfilePhotoAsset } from "../types/profilePhoto";
import { createProfilePhoto } from "../services/profilePhotoRepository";
import { automaticCrop, cropPreviewStyle, cropSourceRect, type CropState } from "./cropGeometry";
import { bindCropStage, waitForCropImage, type CropStage } from "./cropStage";
import { renderAdminCropZoomControls, renderAdminDialogHeader, renderAdminFieldLabel, setAdminCropZoomValue, setButtonBusy } from "./ui";

const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const maxSourceBytes = 20 * 1024 * 1024;
const maxSourcePixels = 80_000_000;
const outputSize = 1024;
const maxZoom = 3;

const cropperTemplate = `
  <cropper-canvas background scale-step="0.05">
    <cropper-image initial-center-size="cover" translatable scalable></cropper-image>
    <cropper-shade></cropper-shade>
    <cropper-handle action="move" plain></cropper-handle>
    <cropper-selection initial-aspect-ratio="1" aspect-ratio="1" initial-coverage="0.78" outlined>
      <cropper-grid role="grid" bordered covered></cropper-grid>
      <cropper-crosshair centered></cropper-crosshair>
      <!-- Last, so a drag anywhere inside the selection moves the image. -->
      <cropper-handle action="move" plain></cropper-handle>
    </cropper-selection>
  </cropper-canvas>`;

export const renderProfilePhotoCropDialog = (): string => `
  <dialog class="admin-dialog admin-photo-crop-dialog" data-profile-photo-crop-dialog aria-labelledby="profile-photo-crop-title">
    ${renderAdminDialogHeader({
      eyebrow: "Profile photo",
      title: "Crop photo",
      titleId: "profile-photo-crop-title",
      note: "Drag the image and adjust zoom inside the fixed square.",
      statusLabel: "Photo crop status",
      close: { label: "Close crop photo dialog", attribute: "data-profile-photo-crop-cancel" },
    })}
    <div class="admin-photo-crop-dialog__layout">
      <section class="admin-photo-crop-editor" aria-label="Photo crop editor">
        <div class="admin-photo-crop-stage" data-profile-photo-crop-stage></div>
        ${renderAdminCropZoomControls({ prefix: "profile-photo", maxZoom, resetLabel: "Reset to auto", resetTitle: "Reset to the automatic centered crop" })}
      </section>
      <aside class="admin-photo-crop-preview">
        <p class="section-kicker">Preview</p>
        <div class="admin-photo-crop-preview__images">
          <div><span class="admin-crop-preview-frame" data-profile-photo-crop-preview></span><span>Square</span></div>
          <div><span class="admin-crop-preview-frame is-round" data-profile-photo-crop-preview></span><span>CV / Portfolio</span></div>
        </div>
        <label>${renderAdminFieldLabel("Photo name", true)}<input type="text" maxlength="120" aria-required="true" data-profile-photo-crop-name></label>
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
  const zoomValue = dialog?.querySelector<HTMLOutputElement>("[data-profile-photo-zoom-value]") ?? null;
  const previews = dialog ? [...dialog.querySelectorAll<HTMLElement>("[data-profile-photo-crop-preview]")] : [];
  const save = dialog?.querySelector<HTMLButtonElement>("[data-profile-photo-crop-save]");
  if (!input || !dialog || !stage || !nameInput || !meta || !zoom || !save) return;

  let sourceUrl: string | undefined;
  let sourceImage: HTMLImageElement | undefined;
  let cropper: Cropper | undefined;
  let cropStage: CropStage | undefined;
  let cropState: CropState | undefined;

  /** Both previews and the exported file read the same CropState (docs/admin-ui-guidelines.md §7.1). */
  const renderPreviews = (): void => {
    if (!cropState || !sourceUrl) return;
    const style = cropPreviewStyle(cropState);
    previews.forEach((frame) => {
      let image = frame.querySelector("img");
      if (!image) {
        image = document.createElement("img");
        image.alt = "";
        image.src = sourceUrl as string;
        frame.append(image);
      }
      image.style.cssText = style;
    });
  };

  const cleanup = (): void => {
    cropStage?.dispose();
    cropper?.destroy();
    stage.replaceChildren();
    previews.forEach((frame) => frame.replaceChildren());
    cropper = undefined;
    cropStage = undefined;
    cropState = undefined;
    sourceImage = undefined;
    setAdminCropZoomValue(zoom, zoomValue, 1);
    input.value = "";
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    sourceUrl = undefined;
  };
  const close = (): void => {
    if (dialog.open) dialog.close();
    cleanup();
  };

  dialog.querySelectorAll<HTMLButtonElement>("[data-profile-photo-crop-cancel]").forEach((button) => button.addEventListener("click", close));
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  });
  dialog.querySelector<HTMLButtonElement>("[data-profile-photo-zoom-out]")?.addEventListener("click", () => cropStage?.setZoom(cropStage.zoom() - 0.1));
  dialog.querySelector<HTMLButtonElement>("[data-profile-photo-zoom-in]")?.addEventListener("click", () => cropStage?.setZoom(cropStage.zoom() + 0.1));
  zoom.addEventListener("input", () => cropStage?.setZoom(Number(zoom.value)));
  dialog.querySelector<HTMLButtonElement>("[data-profile-photo-reset]")?.addEventListener("click", () => {
    if (sourceImage) cropStage?.setCrop(automaticCrop(sourceImage.naturalWidth, sourceImage.naturalHeight, 1));
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
      sourceImage = image;
      if (image.naturalWidth * image.naturalHeight > maxSourcePixels) throw new Error("Source image is too large to crop safely (maximum 80 megapixels).");
      nameInput.value = defaultPhotoName(file.name);
      meta.textContent = `${image.naturalWidth} × ${image.naturalHeight}px source · output 1024 × 1024px WebP`;
      dialog.showModal();
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      cropper = new Cropper(image, { container: stage, template: cropperTemplate });
      const cropImage = cropper.getCropperImage();
      const selection = cropper.getCropperSelection();
      if (!cropImage || !selection) throw new Error("The crop editor could not start.");
      await waitForCropImage(cropImage);
      cropStage = bindCropStage(cropImage, selection, {
        maxZoom,
        onChange: (state, change) => {
          cropState = state;
          setAdminCropZoomValue(zoom, zoomValue, change.zoom);
          renderPreviews();
        },
      });
      cropStage.setCrop(automaticCrop(image.naturalWidth, image.naturalHeight, 1));
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
    const source = sourceImage;
    const state = cropState;
    if (!source || !state) return callbacks.notify("The crop area is not ready yet.", "error");
    setButtonBusy(save, true, "Saving…");
    void (async () => {
      const canvas = document.createElement("canvas");
      canvas.width = outputSize;
      canvas.height = outputSize;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("The browser could not prepare the crop canvas.");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      const { sx, sy, sw, sh } = cropSourceRect(state, source.naturalWidth, source.naturalHeight);
      context.drawImage(source, sx, sy, sw, sh, 0, 0, outputSize, outputSize);
      const blob = await canvasToWebp(canvas);
      const photo = await createProfilePhoto(name, blob);
      close();
      callbacks.onSaved(photo);
    })()
      .catch((error: Error) => callbacks.notify(error.message, "error"))
      .finally(() => { if (save.isConnected) setButtonBusy(save, false); });
  });
};
