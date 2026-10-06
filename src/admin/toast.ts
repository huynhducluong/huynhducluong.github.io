export type AdminToastKind = "info" | "error" | "success";

export interface AdminToastOptions {
  source?: Element | null;
  scope?: "auto" | "dialog" | "page";
}

interface ToastTimer {
  timeoutId: number;
  remaining: number;
  startedAt: number;
  paused: boolean;
}

interface ToastContent {
  title: string;
  detail?: string;
  technicalDetail?: string;
}

const toastRegionId = "admin-toast-region";
const toastTimers = new Map<string, ToastTimer>();
let toastSequence = 0;
let dialogToastSequence = 0;
let activeOperationId: string | null = null;

const icons: Record<AdminToastKind | "progress", string> = {
  success: '<svg viewBox="0 0 20 20" focusable="false"><path d="m5 10 3.2 3.2L15 6.5"/></svg>',
  error: '<svg viewBox="0 0 20 20" focusable="false"><path d="M10 6v5"/><path d="M10 14h.01"/><circle cx="10" cy="10" r="7.5"/></svg>',
  info: '<svg viewBox="0 0 20 20" focusable="false"><path d="M10 9v5"/><path d="M10 6h.01"/><circle cx="10" cy="10" r="7.5"/></svg>',
  progress: '<svg viewBox="0 0 20 20" focusable="false"><circle cx="10" cy="10" r="7.5"/><path d="M10 2.5a7.5 7.5 0 0 1 7.5 7.5"/></svg>',
};

const ensureToastRegion = (): HTMLElement => {
  const existing = document.getElementById(toastRegionId);
  if (existing) return existing;
  const region = document.createElement("section");
  region.id = toastRegionId;
  region.className = "admin-toast-region";
  region.setAttribute("aria-label", "Notifications");
  document.body.append(region);
  return region;
};

const activeAdminDialog = (source?: Element | null): HTMLDialogElement | null => {
  const sourceDialog = source?.closest<HTMLDialogElement>("dialog[open]");
  if (sourceDialog) return sourceDialog;
  const focusedDialog = document.activeElement instanceof Element
    ? document.activeElement.closest<HTMLDialogElement>("dialog[open]")
    : null;
  if (focusedDialog) return focusedDialog;
  return Array.from(document.querySelectorAll<HTMLDialogElement>("dialog.admin-dialog[open]")).at(-1) ?? null;
};

const clearRegion = (region: HTMLElement): void => {
  region.querySelectorAll<HTMLElement>("[data-admin-toast-id]").forEach((toast) => {
    const id = toast.dataset.adminToastId ?? "";
    const timer = toastTimers.get(id);
    if (timer) window.clearTimeout(timer.timeoutId);
    toastTimers.delete(id);
    toast.remove();
  });
  if (region.matches("[data-admin-dialog-status]")) region.hidden = true;
};

export const clearAdminDialogStatus = (dialog: HTMLDialogElement): void => {
  const region = dialog.querySelector<HTMLElement>("[data-admin-dialog-status]");
  if (region) clearRegion(region);
};

const ensureDialogStatusRegion = (dialog: HTMLDialogElement): HTMLElement => {
  let region = dialog.querySelector<HTMLElement>("[data-admin-dialog-status]");
  if (!region) {
    region = document.createElement("section");
    region.className = "admin-dialog-status-region";
    region.dataset.adminDialogStatus = "";
    region.setAttribute("aria-label", "Dialog status");
    region.hidden = true;
    const heading = dialog.querySelector<HTMLElement>(
      ".admin-credential-dialog__header > div, .admin-photo-crop-dialog__heading > div, .admin-confirm-dialog__heading, .admin-text-input-dialog__form > div:first-child, form > div:first-child",
    );
    (heading ?? dialog).append(region);
  }
  if (dialog.dataset.adminStatusBound !== "true") {
    dialog.dataset.adminStatusBound = "true";
    dialog.addEventListener("close", () => clearAdminDialogStatus(dialog));
  }
  return region;
};

const isProgressMessage = (text: string, kind: AdminToastKind): boolean =>
  kind === "info" && (/…$/.test(text) || /\.\.\.$/.test(text));

const technicalErrorDetail = (text: string): string | null => {
  if (/schema cache|could not find the ['"].+['"] column/i.test(text)) {
    return "The database schema is not up to date. Apply the latest migration and try again.";
  }
  if (/row-level security|permission denied|not authorized/i.test(text)) {
    return "Your account does not have permission to complete this action.";
  }
  if (/duplicate key|unique constraint/i.test(text)) {
    return "A record with the same unique value already exists.";
  }
  return null;
};

const splitMessage = (text: string): { title: string; detail?: string } => {
  const match = text.match(/^(.+?[.!?])\s+(.+)$/);
  if (!match) return { title: text.replace(/[.]$/, "") };
  return {
    title: match[1].replace(/[.]$/, ""),
    detail: match[2],
  };
};

const toastContent = (text: string, kind: AdminToastKind): ToastContent => {
  if (kind === "error") {
    const friendlyDetail = technicalErrorDetail(text);
    return {
      title: "Action couldn’t be completed",
      detail: friendlyDetail ?? text,
      technicalDetail: friendlyDetail ? text : undefined,
    };
  }
  return splitMessage(text);
};

const toastById = (region: HTMLElement, id: string): HTMLElement | undefined =>
  Array.from(region.querySelectorAll<HTMLElement>("[data-admin-toast-id]"))
    .find((toast) => toast.dataset.adminToastId === id);

const toastByKey = (region: HTMLElement, key: string): HTMLElement | undefined =>
  Array.from(region.querySelectorAll<HTMLElement>("[data-admin-toast-key]"))
    .find((toast) => toast.dataset.adminToastKey === key);

const toastAnywhereById = (id: string): HTMLElement | undefined =>
  Array.from(document.querySelectorAll<HTMLElement>("[data-admin-toast-id]"))
    .find((toast) => toast.dataset.adminToastId === id);

const clearToastTimer = (id: string): ToastTimer | undefined => {
  const timer = toastTimers.get(id);
  if (timer) window.clearTimeout(timer.timeoutId);
  toastTimers.delete(id);
  return timer;
};

const removeToast = (id: string, immediate = false): void => {
  clearToastTimer(id);
  const toast = toastAnywhereById(id);
  if (!toast) return;
  const region = toast.parentElement;
  const finish = (): void => {
    toast.remove();
    if (region?.matches("[data-admin-dialog-status]") && !region.querySelector("[data-admin-toast-id]")) region.hidden = true;
  };
  if (immediate) {
    finish();
    return;
  }
  toast.classList.add("is-leaving");
  window.setTimeout(finish, 180);
};

const scheduleToastRemoval = (id: string, duration: number): void => {
  clearToastTimer(id);
  if (duration <= 0) return;
  const timer: ToastTimer = {
    timeoutId: 0,
    remaining: duration,
    startedAt: Date.now(),
    paused: false,
  };
  timer.timeoutId = window.setTimeout(() => removeToast(id), duration);
  toastTimers.set(id, timer);
};

const pauseToastRemoval = (id: string): void => {
  const timer = toastTimers.get(id);
  if (!timer || timer.paused) return;
  window.clearTimeout(timer.timeoutId);
  timer.remaining = Math.max(0, timer.remaining - (Date.now() - timer.startedAt));
  timer.paused = true;
};

const resumeToastRemoval = (id: string): void => {
  const timer = toastTimers.get(id);
  if (!timer || !timer.paused || timer.remaining <= 0) return;
  timer.startedAt = Date.now();
  timer.paused = false;
  timer.timeoutId = window.setTimeout(() => removeToast(id), timer.remaining);
};

const bindToastPauseEvents = (toast: HTMLElement): void => {
  const currentId = (): string => toast.dataset.adminToastId ?? "";
  toast.addEventListener("mouseenter", () => pauseToastRemoval(currentId()));
  toast.addEventListener("mouseleave", () => {
    if (!toast.contains(document.activeElement)) resumeToastRemoval(currentId());
  });
  toast.addEventListener("focusin", () => pauseToastRemoval(currentId()));
  toast.addEventListener("focusout", () => window.queueMicrotask(() => {
    if (!toast.matches(":hover") && !toast.contains(document.activeElement)) resumeToastRemoval(currentId());
  }));
};

const renderToast = (toast: HTMLElement, id: string, key: string, text: string, kind: AdminToastKind): void => {
  const content = toastContent(text, kind);
  const progress = isProgressMessage(text, kind);
  toast.className = "admin-toast";
  toast.dataset.adminToastId = id;
  toast.dataset.adminToastKey = key;
  toast.dataset.kind = kind;
  toast.dataset.progress = String(progress);
  toast.setAttribute("role", kind === "error" ? "alert" : "status");
  toast.setAttribute("aria-atomic", "true");

  const icon = document.createElement("span");
  icon.className = "admin-toast__icon";
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = icons[progress ? "progress" : kind];

  const body = document.createElement("div");
  body.className = "admin-toast__body";
  const title = document.createElement("strong");
  title.textContent = content.title;
  body.append(title);
  if (content.detail) {
    const detail = document.createElement("p");
    detail.textContent = content.detail;
    body.append(detail);
  }
  if (content.technicalDetail) {
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = "Technical details";
    const code = document.createElement("code");
    code.textContent = content.technicalDetail;
    details.append(summary, code);
    body.append(details);
  }

  const close = document.createElement("button");
  close.className = "admin-toast__close";
  close.type = "button";
  close.setAttribute("aria-label", "Dismiss notification");
  close.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="m6 6 8 8M14 6l-8 8"/></svg>';
  close.addEventListener("click", () => removeToast(id));

  toast.replaceChildren(icon, body, close);
};

export const showAdminToast = (text: string, kind: AdminToastKind = "info", options: AdminToastOptions = {}): void => {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return;
  const dialog = options.scope === "page" ? null : activeAdminDialog(options.source);
  const useDialog = Boolean(dialog) && options.scope !== "page";
  const region = useDialog && dialog ? ensureDialogStatusRegion(dialog) : ensureToastRegion();
  const progress = isProgressMessage(normalized, kind);
  const key = `${kind}:${normalized}`;
  const proposedId = kind === "info"
    ? (activeOperationId ??= "admin-operation")
    : activeOperationId ?? `admin-toast-${++toastSequence}`;
  if (kind !== "info") activeOperationId = null;

  let toast = useDialog
    ? region.querySelector<HTMLElement>("[data-admin-toast-id]") ?? undefined
    : toastById(region, proposedId) ?? toastByKey(region, key);
  const id = toast?.dataset.adminToastId
    ?? (useDialog ? `admin-dialog-toast-${++dialogToastSequence}` : proposedId);
  if (!toast) {
    toast = document.createElement("article");
    bindToastPauseEvents(toast);
    region.prepend(toast);
  }
  if (useDialog) region.hidden = false;
  renderToast(toast, id, key, normalized, kind);
  scheduleToastRemoval(id, kind === "error" ? 0 : progress ? 30_000 : kind === "success" ? 4_500 : 6_000);

  if (!useDialog) {
    Array.from(region.querySelectorAll<HTMLElement>("[data-admin-toast-id]"))
      .slice(3)
      .forEach((item) => removeToast(item.dataset.adminToastId ?? "", true));
  }
};

export const clearAdminToasts = (): void => {
  toastTimers.forEach((timer) => window.clearTimeout(timer.timeoutId));
  toastTimers.clear();
  activeOperationId = null;
  document.getElementById(toastRegionId)?.remove();
  document.querySelectorAll<HTMLElement>("[data-admin-dialog-status]").forEach((region) => clearRegion(region));
};
