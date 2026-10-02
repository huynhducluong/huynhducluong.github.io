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
  activate: (render: (data: T) => void) => void;
  disconnect: () => void;
}

export interface PreviewSender {
  send: () => void;
  disconnect: () => void;
}

const updateType = (kind: PreviewKind): string => `hdl:${kind}-preview`;

export const createPreviewReceiver = <T>(kind: PreviewKind): PreviewReceiver<T> => {
  let pending: PreviewUpdate<T> | null = null;
  let renderPreview: ((data: T) => void) | null = null;

  const render = (message: PreviewUpdate<T>): void => {
    if (!renderPreview) {
      pending = message;
      return;
    }
    renderPreview(message.data);
    const rendered: PreviewRendered = {
      type: "hdl:preview-rendered",
      kind,
      sequence: message.sequence ?? 0,
    };
    window.parent.postMessage(rendered, window.location.origin);
  };

  const receive = (event: MessageEvent<PreviewUpdate<T>>): void => {
    if (
      event.origin !== window.location.origin
      || event.source !== window.parent
      || event.data?.type !== updateType(kind)
      || !event.data.data
    ) return;
    render(event.data);
  };

  window.addEventListener("message", receive);

  return {
    activate: (nextRender) => {
      renderPreview = nextRender;
      if (pending) {
        const queued = pending;
        pending = null;
        render(queued);
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
  onRendered?: () => void,
): PreviewSender => {
  let sequence = 0;
  let disconnected = false;

  const send = (): void => {
    if (disconnected) return;
    sequence += 1;
    iframe.contentWindow?.postMessage({
      type: updateType(kind),
      data: payload(),
      sequence,
    }, window.location.origin);
  };

  const receive = (event: MessageEvent<PreviewReady | PreviewRendered>): void => {
    if (event.origin !== window.location.origin || event.source !== iframe.contentWindow || event.data?.kind !== kind) return;
    if (event.data.type === "hdl:preview-ready") send();
    if (event.data.type === "hdl:preview-rendered") onRendered?.();
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
