export interface PreviewZoomState {
  mode: "fit" | "manual";
  scale: number;
}

export interface PreviewZoomController {
  refresh: () => void;
  resetFit: () => void;
  disconnect: () => void;
}

interface PreviewZoomOptions {
  frame: HTMLElement;
  stage: HTMLElement;
  state: PreviewZoomState;
  contentWidth: () => number;
  onScale?: (scale: number) => void;
  minScale?: number;
  maxScale?: number;
}

const STEP = 0.05;

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

const frameContentWidth = (frame: HTMLElement): number => {
  const styles = getComputedStyle(frame);
  const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0;
  const paddingRight = Number.parseFloat(styles.paddingRight) || 0;
  const padding = paddingLeft + paddingRight;
  return Math.max(frame.clientWidth - padding, 1);
};

export const createPreviewZoomState = (): PreviewZoomState => ({ mode: "fit", scale: 1 });

export const renderPreviewZoomControls = (state: PreviewZoomState): string => `
  <div class="admin-preview-toolbar__group admin-preview-toolbar__zoom" role="group" aria-label="Preview zoom">
    <button type="button" data-admin-preview-zoom="fit" class="${state.mode === "fit" ? "is-active" : ""}" aria-pressed="${state.mode === "fit"}" title="Fit preview to width">Fit</button>
    <button type="button" class="admin-preview-toolbar__zoom-action" data-admin-preview-zoom="out" aria-label="Zoom out" title="Zoom out">
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3.5 8h9"/></svg>
    </button>
    <button type="button" class="admin-preview-toolbar__zoom-action" data-admin-preview-zoom="in" aria-label="Zoom in" title="Zoom in">
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 3.5v9M3.5 8h9"/></svg>
    </button>
    <span class="sr-only" data-admin-preview-zoom-status aria-live="polite"></span>
  </div>`;

export const bindPreviewZoom = (
  root: ParentNode,
  options: PreviewZoomOptions,
): PreviewZoomController => {
  const minimum = options.minScale ?? 0.2;
  const maximum = options.maxScale ?? 2;
  const fitButton = root.querySelector<HTMLButtonElement>('[data-admin-preview-zoom="fit"]');
  const outButton = root.querySelector<HTMLButtonElement>('[data-admin-preview-zoom="out"]');
  const inButton = root.querySelector<HTMLButtonElement>('[data-admin-preview-zoom="in"]');
  const status = root.querySelector<HTMLElement>("[data-admin-preview-zoom-status]");
  let appliedScale = clamp(options.state.scale || 1, minimum, maximum);
  let anchorFrame: number | undefined;
  let settleFrame: number | undefined;
  let disconnected = false;

  const restoreViewportAnchor = (xRatio: number, yRatio: number): void => {
    if (anchorFrame !== undefined) cancelAnimationFrame(anchorFrame);
    if (settleFrame !== undefined) cancelAnimationFrame(settleFrame);
    anchorFrame = requestAnimationFrame(() => {
      anchorFrame = undefined;
      settleFrame = requestAnimationFrame(() => {
        settleFrame = undefined;
        if (disconnected) return;
        options.frame.scrollLeft = Math.max(0, xRatio * options.frame.scrollWidth - options.frame.clientWidth / 2);
        options.frame.scrollTop = Math.max(0, yRatio * options.frame.scrollHeight - options.frame.clientHeight / 2);
      });
    });
  };

  const apply = (preserveViewport = false): void => {
    const xRatio = (options.frame.scrollLeft + options.frame.clientWidth / 2) / Math.max(options.frame.scrollWidth, 1);
    const yRatio = (options.frame.scrollTop + options.frame.clientHeight / 2) / Math.max(options.frame.scrollHeight, 1);
    const sourceWidth = Math.max(options.contentWidth(), 1);
    const fitScale = clamp(frameContentWidth(options.frame) / sourceWidth, minimum, maximum);
    appliedScale = options.state.mode === "fit"
      ? fitScale
      : clamp(options.state.scale, minimum, maximum);
    options.state.scale = appliedScale;
    options.stage.style.setProperty("--preview-scale", String(appliedScale));
    options.frame.dataset.zoom = options.state.mode;

    const percent = Math.round(appliedScale * 100);
    fitButton?.classList.toggle("is-active", options.state.mode === "fit");
    fitButton?.setAttribute("aria-pressed", String(options.state.mode === "fit"));
    if (outButton) {
      outButton.disabled = appliedScale <= minimum + 0.001;
      outButton.title = `Zoom out — current ${percent}%`;
    }
    if (inButton) {
      inButton.disabled = appliedScale >= maximum - 0.001;
      inButton.title = `Zoom in — current ${percent}%`;
    }
    if (status) status.textContent = options.state.mode === "fit" ? `Fit to width, ${percent}%` : `Zoom ${percent}%`;
    options.onScale?.(appliedScale);
    if (preserveViewport) restoreViewportAnchor(xRatio, yRatio);
  };

  const resetFit = (): void => {
    options.state.mode = "fit";
    apply(true);
  };
  const zoomBy = (delta: number): void => {
    options.state.mode = "manual";
    options.state.scale = clamp(Number((appliedScale + delta).toFixed(4)), minimum, maximum);
    apply(true);
  };
  const handleFit = (): void => resetFit();
  const handleOut = (): void => zoomBy(-STEP);
  const handleIn = (): void => zoomBy(STEP);

  fitButton?.addEventListener("click", handleFit);
  outButton?.addEventListener("click", handleOut);
  inButton?.addEventListener("click", handleIn);
  const resizeObserver = new ResizeObserver(() => {
    if (options.state.mode === "fit") apply();
  });
  resizeObserver.observe(options.frame);
  apply();

  return {
    refresh: () => apply(),
    resetFit,
    disconnect: () => {
      disconnected = true;
      resizeObserver.disconnect();
      if (anchorFrame !== undefined) cancelAnimationFrame(anchorFrame);
      if (settleFrame !== undefined) cancelAnimationFrame(settleFrame);
      fitButton?.removeEventListener("click", handleFit);
      outButton?.removeEventListener("click", handleOut);
      inButton?.removeEventListener("click", handleIn);
    },
  };
};
