export type AdminConfirmTone = "warning" | "danger" | "primary";

export interface AdminConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: AdminConfirmTone;
  eyebrow?: string;
}

let dialog: HTMLDialogElement | null = null;
let resolver: ((confirmed: boolean) => void) | null = null;
let previouslyFocused: HTMLElement | null = null;

const finish = (confirmed: boolean): void => {
  if (!dialog) return;
  dialog.close();
  const resolve = resolver;
  resolver = null;
  previouslyFocused?.focus({ preventScroll: true });
  previouslyFocused = null;
  resolve?.(confirmed);
};

const ensureDialog = (): HTMLDialogElement => {
  if (dialog) return dialog;
  dialog = document.createElement("dialog");
  dialog.className = "admin-dialog admin-confirm-dialog";
  dialog.setAttribute("aria-labelledby", "admin-confirm-title");
  dialog.setAttribute("aria-describedby", "admin-confirm-message");
  dialog.innerHTML = `<form class="admin-confirm-dialog__form">
    <div class="admin-confirm-dialog__heading">
      <p class="section-kicker" data-admin-confirm-eyebrow>Admin confirmation</p>
      <h2 id="admin-confirm-title" data-admin-confirm-title></h2>
      <p id="admin-confirm-message" data-admin-confirm-message></p>
      <section class="admin-dialog-status-region" data-admin-dialog-status aria-label="Confirmation status" hidden></section>
    </div>
    <div class="admin-confirm-dialog__actions">
      <button class="button button--secondary" type="button" data-admin-confirm-cancel></button>
      <button class="button" type="button" data-admin-confirm-submit></button>
    </div>
  </form>`;
  document.body.append(dialog);
  dialog.querySelector<HTMLButtonElement>("[data-admin-confirm-cancel]")?.addEventListener("click", () => finish(false));
  dialog.querySelector<HTMLButtonElement>("[data-admin-confirm-submit]")?.addEventListener("click", () => finish(true));
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    finish(false);
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) finish(false);
  });
  return dialog;
};

export const confirmAdmin = (options: AdminConfirmOptions): Promise<boolean> => {
  const current = ensureDialog();
  if (resolver) finish(false);
  previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  current.dataset.tone = options.tone ?? "warning";
  current.querySelector<HTMLElement>("[data-admin-confirm-eyebrow]")!.textContent = options.eyebrow ?? "Admin confirmation";
  current.querySelector<HTMLElement>("[data-admin-confirm-title]")!.textContent = options.title;
  current.querySelector<HTMLElement>("[data-admin-confirm-message]")!.textContent = options.message;
  const cancel = current.querySelector<HTMLButtonElement>("[data-admin-confirm-cancel]")!;
  const submit = current.querySelector<HTMLButtonElement>("[data-admin-confirm-submit]")!;
  cancel.textContent = options.cancelLabel ?? "Cancel";
  submit.textContent = options.confirmLabel ?? "Confirm";
  current.showModal();
  window.requestAnimationFrame(() => cancel.focus({ preventScroll: true }));
  return new Promise<boolean>((resolve) => { resolver = resolve; });
};
