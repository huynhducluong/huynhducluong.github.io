export interface EmbeddedPreviewController {
  refresh: () => void;
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
  let disconnected = false;

  const updateStage = (): void => {
    if (disconnected || !iframe.contentDocument?.body) return;
    const height = Math.ceil(contentHeight(iframe.contentDocument));
    const scale = Number.parseFloat(getComputedStyle(stage).getPropertyValue("--preview-scale")) || 1;
    const width = iframe.offsetWidth;
    const nextHeight = `${height}px`;
    if (iframe.style.height !== nextHeight) iframe.style.height = nextHeight;
    stage.style.width = `${Math.ceil(width * scale)}px`;
    stage.style.height = `${Math.ceil(height * scale)}px`;
    stage.removeAttribute("aria-busy");
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
  stage.setAttribute("aria-busy", "true");
  iframe.addEventListener("load", handleFrameLoad);
  window.addEventListener("resize", handleWindowResize);
  if (iframe.contentDocument?.readyState === "complete") observeDocument();

  return {
    refresh: () => scheduleMeasure(true),
    disconnect: () => {
      disconnected = true;
      if (frameId !== undefined) window.cancelAnimationFrame(frameId);
      if (settleFrameId !== undefined) window.cancelAnimationFrame(settleFrameId);
      stopObservingDocument();
      iframe.removeEventListener("load", handleFrameLoad);
      window.removeEventListener("resize", handleWindowResize);
    },
  };
};
