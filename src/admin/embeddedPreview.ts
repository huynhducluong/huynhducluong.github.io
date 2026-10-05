export interface EmbeddedPreviewController {
  refresh: () => void;
  setLoading: (message?: string) => void;
  reveal: () => void;
  setError: (message?: string) => void;
  disconnect: () => void;
}

interface EmbeddedPreviewOptions {
  measurementHeight: number;
}

const contentHeight = (doc: Document): number => {
  const body = doc.body;
  const root = doc.documentElement;
  return Math.max(
    body?.scrollHeight ?? 0,
    body?.offsetHeight ?? 0,
    root?.scrollHeight ?? 0,
    root?.offsetHeight ?? 0,
    1,
  );
};

export const bindEmbeddedPreview = (
  iframe: HTMLIFrameElement,
  stage: HTMLElement,
  options: EmbeddedPreviewOptions,
): EmbeddedPreviewController => {
  let frameId: number | undefined;
  let settleFrameId: number | undefined;
  let mutationObserver: MutationObserver | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let observedDocument: Document | undefined;
  let resetBeforeMeasure = false;
  let revealAfterMeasure = false;
  let loadingTimeout: number | undefined;
  let disconnected = false;
  const frame = stage.parentElement as HTMLElement | null;

  const clearLoadingTimeout = (): void => {
    if (loadingTimeout === undefined) return;
    window.clearTimeout(loadingTimeout);
    loadingTimeout = undefined;
  };

  const setLoading = (message = "Preparing preview…"): void => {
    clearLoadingTimeout();
    revealAfterMeasure = false;
    stage.setAttribute("aria-busy", "true");
    stage.setAttribute("role", "status");
    stage.setAttribute("aria-label", message);
    stage.dataset.previewState = "loading";
    if (frame) frame.dataset.previewMessage = message;
    loadingTimeout = window.setTimeout(() => {
      stage.dataset.previewState = "error";
      stage.setAttribute("aria-label", "Preview is taking longer than expected.");
      if (frame) frame.dataset.previewMessage = "Preview is taking longer than expected.";
    }, 12000);
  };

  const updateStage = (): void => {
    if (disconnected || !iframe.contentDocument?.body) return;
    const height = Math.ceil(contentHeight(iframe.contentDocument));
    const scale = Number.parseFloat(getComputedStyle(stage).getPropertyValue("--preview-scale")) || 1;
    const width = iframe.offsetWidth;
    const nextHeight = `${height}px`;
    if (iframe.style.height !== nextHeight) iframe.style.height = nextHeight;
    stage.style.width = `${Math.ceil(width * scale)}px`;
    stage.style.height = `${Math.ceil(height * scale)}px`;
    if (revealAfterMeasure) {
      revealAfterMeasure = false;
      clearLoadingTimeout();
      stage.removeAttribute("aria-busy");
      stage.removeAttribute("role");
      stage.removeAttribute("aria-label");
      stage.dataset.previewState = "ready";
      if (frame) delete frame.dataset.previewMessage;
    }
  };

  const scheduleMeasure = (reset: boolean): void => {
    if (disconnected) return;
    resetBeforeMeasure ||= reset;
    if (frameId !== undefined) return;
    frameId = window.requestAnimationFrame(() => {
      frameId = undefined;
      if (resetBeforeMeasure) {
        iframe.style.height = `${options.measurementHeight}px`;
        resetBeforeMeasure = false;
      }
      settleFrameId = window.requestAnimationFrame(() => {
        settleFrameId = undefined;
        updateStage();
      });
    });
  };

  const handleResourceLoad = (): void => scheduleMeasure(true);

  const stopObservingDocument = (): void => {
    mutationObserver?.disconnect();
    resizeObserver?.disconnect();
    mutationObserver = undefined;
    resizeObserver = undefined;
    observedDocument?.removeEventListener("load", handleResourceLoad, true);
    observedDocument = undefined;
  };

  const observeDocument = (): void => {
    const doc = iframe.contentDocument;
    if (!doc?.body || doc === observedDocument) {
      scheduleMeasure(true);
      return;
    }
    stopObservingDocument();
    observedDocument = doc;
    doc.documentElement.style.overflow = "hidden";
    doc.body.style.overflow = "hidden";
    doc.addEventListener("load", handleResourceLoad, true);
    mutationObserver = new MutationObserver(() => scheduleMeasure(true));
    mutationObserver.observe(doc.body, { attributes: true, characterData: true, childList: true, subtree: true });
    resizeObserver = new ResizeObserver(() => scheduleMeasure(false));
    resizeObserver.observe(doc.body);
    doc.fonts?.ready.then(() => scheduleMeasure(true)).catch(() => undefined);
    scheduleMeasure(true);
  };

  const handleWindowResize = (): void => scheduleMeasure(false);
  const handleFrameLoad = (): void => observeDocument();

  iframe.setAttribute("scrolling", "no");
  setLoading();
  iframe.addEventListener("load", handleFrameLoad);
  window.addEventListener("resize", handleWindowResize);
  if (iframe.contentDocument?.readyState === "complete") observeDocument();

  return {
    refresh: () => scheduleMeasure(true),
    setLoading,
    reveal: () => {
      revealAfterMeasure = true;
      scheduleMeasure(true);
    },
    setError: (message = "Preview is unavailable.") => {
      clearLoadingTimeout();
      revealAfterMeasure = false;
      stage.setAttribute("aria-busy", "true");
      stage.setAttribute("role", "status");
      stage.setAttribute("aria-label", message);
      stage.dataset.previewState = "error";
      if (frame) frame.dataset.previewMessage = message;
    },
    disconnect: () => {
      disconnected = true;
      clearLoadingTimeout();
      if (frameId !== undefined) window.cancelAnimationFrame(frameId);
      if (settleFrameId !== undefined) window.cancelAnimationFrame(settleFrameId);
      stopObservingDocument();
      iframe.removeEventListener("load", handleFrameLoad);
      window.removeEventListener("resize", handleWindowResize);
    },
  };
};
