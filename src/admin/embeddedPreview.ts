export interface EmbeddedPreviewController {
  refresh: () => void;
  setLoading: (message?: string) => void;
  reveal: () => void;
  setError: (message?: string) => void;
  disconnect: () => void;
}

interface EmbeddedPreviewOptions {
  measurementHeight: number;
  scrollMode?: "outer" | "internal";
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
  let frameResizeObserver: ResizeObserver | undefined;
  let observedDocument: Document | undefined;
  let revealAfterMeasure = false;
  let loadingTimeout: number | undefined;
  let disconnected = false;
  const frame = stage.parentElement as HTMLElement | null;
  const scrollMode = options.scrollMode ?? "outer";

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
      loadingTimeout = undefined;
      stage.dataset.previewState = "error";
      stage.removeAttribute("aria-busy");
      stage.setAttribute("role", "alert");
      stage.setAttribute("aria-label", "Preview is taking longer than expected.");
      if (frame) frame.dataset.previewMessage = "Preview is taking longer than expected.";
    }, 12000);
  };

  const revealIfReady = (): void => {
    if (!revealAfterMeasure) return;
    revealAfterMeasure = false;
    clearLoadingTimeout();
    stage.removeAttribute("aria-busy");
    stage.removeAttribute("role");
    stage.removeAttribute("aria-label");
    stage.dataset.previewState = "ready";
    if (frame) delete frame.dataset.previewMessage;
  };

  const updateStage = (): void => {
    if (disconnected || !iframe.contentDocument?.body) return;
    const scale = Number.parseFloat(getComputedStyle(stage).getPropertyValue("--preview-scale")) || 1;
    const width = iframe.offsetWidth;
    if (scrollMode === "internal" && frame) {
      const frameStyle = getComputedStyle(frame);
      const paddingBlock = Number.parseFloat(frameStyle.paddingTop) + Number.parseFloat(frameStyle.paddingBottom);
      const viewportHeight = Math.max(1, frame.clientHeight - paddingBlock);
      const iframeHeight = Math.max(1, viewportHeight / scale);
      iframe.style.height = `${iframeHeight}px`;
      stage.style.width = `${Math.ceil(width * scale)}px`;
      stage.style.height = `${Math.ceil(viewportHeight)}px`;
      revealIfReady();
      return;
    }
    const height = Math.ceil(contentHeight(iframe.contentDocument));
    const nextHeight = `${height}px`;
    if (iframe.style.height !== nextHeight) iframe.style.height = nextHeight;
    stage.style.width = `${Math.ceil(width * scale)}px`;
    stage.style.height = `${Math.ceil(height * scale)}px`;
    revealIfReady();
  };

  const scheduleMeasure = (): void => {
    if (disconnected) return;
    if (frameId !== undefined) return;
    frameId = window.requestAnimationFrame(() => {
      frameId = undefined;
      settleFrameId = window.requestAnimationFrame(() => {
        settleFrameId = undefined;
        updateStage();
      });
    });
  };

  const handleResourceLoad = (): void => scheduleMeasure();

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
      scheduleMeasure();
      return;
    }
    stopObservingDocument();
    observedDocument = doc;
    if (scrollMode === "outer") {
      doc.documentElement.style.overflow = "hidden";
      doc.body.style.overflow = "hidden";
    }
    doc.addEventListener("load", handleResourceLoad, true);
    if (scrollMode === "outer") {
      mutationObserver = new MutationObserver(() => scheduleMeasure());
      mutationObserver.observe(doc.body, { characterData: true, childList: true, subtree: true });
      resizeObserver = new ResizeObserver(() => scheduleMeasure());
      resizeObserver.observe(doc.body);
    }
    doc.fonts?.ready.then(() => scheduleMeasure()).catch(() => undefined);
    scheduleMeasure();
  };

  const handleWindowResize = (): void => scheduleMeasure();
  const handleFrameLoad = (): void => observeDocument();

  if (scrollMode === "outer") iframe.style.height = `${options.measurementHeight}px`;
  iframe.setAttribute("scrolling", scrollMode === "internal" ? "yes" : "no");
  stage.dataset.previewScroll = scrollMode;
  if (frame) frame.dataset.previewScroll = scrollMode;
  setLoading();
  iframe.addEventListener("load", handleFrameLoad);
  window.addEventListener("resize", handleWindowResize);
  if (frame) {
    frameResizeObserver = new ResizeObserver(() => scheduleMeasure());
    frameResizeObserver.observe(frame);
  }
  if (iframe.contentDocument?.readyState === "complete") observeDocument();

  return {
    refresh: () => scheduleMeasure(),
    setLoading,
    reveal: () => {
      revealAfterMeasure = true;
      scheduleMeasure();
    },
    setError: (message = "Preview is unavailable.") => {
      clearLoadingTimeout();
      revealAfterMeasure = false;
      stage.removeAttribute("aria-busy");
      stage.setAttribute("role", "alert");
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
      frameResizeObserver?.disconnect();
      iframe.removeEventListener("load", handleFrameLoad);
      window.removeEventListener("resize", handleWindowResize);
    },
  };
};
