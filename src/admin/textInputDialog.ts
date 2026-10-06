export interface AdminTextInputOptions {
  title: string;
  label: string;
  initialValue?: string;
  description?: string;
  eyebrow?: string;
  submitLabel?: string;
  maxLength?: number;
}

let dialog: HTMLDialogElement | null = null;
let resolver: ((value: string | null) => void) | null = null;
let previouslyFocused: HTMLElement | null = null;

const finish = (value: string | null): void => {
  if (!dialog) return;
  dialog.close();
  const resolve = resolver;
  resolver = null;
  previouslyFocused?.focus({ preventScroll: true });
  previouslyFocused = null;
  resolve?.(value);
};

const ensureDialog = (): HTMLDialogElement => {
  if (dialog) return dialog;
  dialog = document.createElement("dialog");
  dialog.className = "admin-dialog admin-text-input-dialog";
  dialog.setAttribute("aria-labelledby", "admin-text-input-title");
  dialog.setAttribute("aria-describedby", "admin-text-input-description");
  dialog.innerHTML = `<form class="admin-text-input-dialog__form" data-admin-text-input-form>
    <div>
      <p class="section-kicker" data-admin-text-input-eyebrow></p>
      <h2 id="admin-text-input-title" data-admin-text-input-title></h2>
      <p id="admin-text-input-description" data-admin-text-input-description></p>
      <section class="admin-dialog-status-region" data-admin-dialog-status aria-label="Input status" hidden></section>
    </div>
    <label><span data-admin-text-input-label></span><input type="text" required data-admin-text-input></label>
    <div class="admin-actions">
      <button class="button button--secondary" type="button" data-admin-text-input-cancel>Cancel</button>
      <button class="button" type="submit" data-admin-text-input-submit></button>
    </div>
  </form>`;
  document.body.append(dialog);
  dialog.querySelector<HTMLFormElement>("[data-admin-text-input-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = dialog?.querySelector<HTMLInputElement>("[data-admin-text-input]");
    const value = input?.value.trim() ?? "";
    if (!value) {
      input?.setCustomValidity("Enter a name to continue.");
      input?.reportValidity();
      return;
    }
    finish(value);
  });
  dialog.querySelector<HTMLButtonElement>("[data-admin-text-input-cancel]")?.addEventListener("click", () => finish(null));
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    finish(null);
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) finish(null);
  });
  return dialog;
};

export const requestAdminText = (options: AdminTextInputOptions): Promise<string | null> => {
  const current = ensureDialog();
  if (resolver) finish(null);
  previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  current.querySelector<HTMLElement>("[data-admin-text-input-eyebrow]")!.textContent = options.eyebrow ?? "Admin workspace";
  current.querySelector<HTMLElement>("[data-admin-text-input-title]")!.textContent = options.title;
  const description = current.querySelector<HTMLElement>("[data-admin-text-input-description]")!;
  description.textContent = options.description ?? "";
  description.hidden = !options.description;
  current.querySelector<HTMLElement>("[data-admin-text-input-label]")!.textContent = options.label;
  current.querySelector<HTMLButtonElement>("[data-admin-text-input-submit]")!.textContent = options.submitLabel ?? "Continue";
  const input = current.querySelector<HTMLInputElement>("[data-admin-text-input]")!;
  input.value = options.initialValue ?? "";
  input.maxLength = options.maxLength ?? 120;
  input.setCustomValidity("");
  current.showModal();
  window.requestAnimationFrame(() => {
    input.focus({ preventScroll: true });
    input.select();
  });
  return new Promise<string | null>((resolve) => { resolver = resolve; });
};
