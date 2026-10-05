export type PreviewKind = "cv" | "portfolio" | "website";

interface PreviewUpdate<T> {
  type: string;
  data: T;
  sequence?: number;
}

interface PreviewReady {
  type: "hdl:preview-ready";
  kind: PreviewKind;
}

interface PreviewRendered {
  type: "hdl:preview-rendered";
  kind: PreviewKind;
  sequence: number;
}

export interface PreviewReceiver<T> {
  activate: (render: (data: T) => void | Promise<void>) => void;
  disconnect: () => void;
}

export interface PreviewSender {
  send: () => void;
  disconnect: () => void;
}

const updateType = (kind: PreviewKind): string => `hdl:${kind}-preview`;

const nextFrame = (): Promise<void> => new Promise((resolve) => window.requestAnimationFrame(() => resolve()));

const waitForPreviewAssets = async (): Promise<void> => {
  const images = [...document.images];
  const imageReady = Promise.all(images.map(async (image) => {
    if (!image.complete) {
      await new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      });
    }
    if (image.naturalWidth > 0 && typeof image.decode === "function") {
      await image.decode().catch(() => undefined);
    }
  }));
  const assetsReady = Promise.all([document.fonts?.ready.catch(() => undefined), imageReady]);
  await Promise.race([
    assetsReady,
    new Promise<void>((resolve) => window.setTimeout(resolve, 4000)),
  ]);
  await nextFrame();
  await nextFrame();
};

export const createPreviewReceiver = <T>(kind: PreviewKind): PreviewReceiver<T> => {
  let pending: PreviewUpdate<T> | null = null;
  let renderPreview: ((data: T) => void | Promise<void>) | null = null;
  let rendering = false;

  const drain = async (): Promise<void> => {
    if (rendering || !renderPreview) return;
    rendering = true;
    try {
      while (pending) {
        const message = pending;
        pending = null;
        await renderPreview(message.data);
        await waitForPreviewAssets();
        if (pending) continue;
        const rendered: PreviewRendered = {
          type: "hdl:preview-rendered",
          kind,
          sequence: message.sequence ?? 0,
        };
        window.parent.postMessage(rendered, window.location.origin);
      }
    } finally {
      rendering = false;
      if (pending) void drain();
    }
  };

  const receive = (event: MessageEvent<PreviewUpdate<T>>): void => {
    if (
      event.origin !== window.location.origin
      || event.source !== window.parent
      || event.data?.type !== updateType(kind)
      || !event.data.data
    ) return;
    pending = event.data;
    void drain();
  };

  window.addEventListener("message", receive);

  return {
    activate: (nextRender) => {
      renderPreview = nextRender;
      if (pending) {
        void drain();
        return;
      }
      const ready: PreviewReady = { type: "hdl:preview-ready", kind };
      window.parent.postMessage(ready, window.location.origin);
    },
    disconnect: () => window.removeEventListener("message", receive),
  };
};

export const bindPreviewSender = <T>(
  iframe: HTMLIFrameElement,
  kind: PreviewKind,
  payload: () => T,
  onRendered?: (sequence: number) => void,
): PreviewSender => {
  let sequence = 0;
  let latestSequence = 0;
  let disconnected = false;

  const send = (): void => {
    if (disconnected) return;
    sequence += 1;
    latestSequence = sequence;
    iframe.contentWindow?.postMessage({
      type: updateType(kind),
      data: payload(),
      sequence,
    }, window.location.origin);
  };

  const receive = (event: MessageEvent<PreviewReady | PreviewRendered>): void => {
    if (event.origin !== window.location.origin || event.source !== iframe.contentWindow || event.data?.kind !== kind) return;
    if (event.data.type === "hdl:preview-ready") send();
    if (event.data.type === "hdl:preview-rendered" && event.data.sequence === latestSequence) onRendered?.(event.data.sequence);
  };

  const handleLoad = (): void => send();
  window.addEventListener("message", receive);
  iframe.addEventListener("load", handleLoad);

  return {
    send,
    disconnect: () => {
      disconnected = true;
      window.removeEventListener("message", receive);
      iframe.removeEventListener("load", handleLoad);
    },
  };
};
