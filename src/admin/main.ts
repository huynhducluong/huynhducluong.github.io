import "../styles/reset.css";
import "../styles/tokens.css";
import "../styles/global.css";
import "../styles/admin.css";
import { supabaseConfig } from "../config/supabase";
import { getAdminAccess, magicLinkRedirectUrl, safeReturnTo } from "./auth";
import { portfolioProjectSeed, portfolioToolSeed } from "../data/portfolioSeed";
import { escapeHtml } from "../shared/format";
import { supabase } from "../services/supabaseClient";
import type { PortfolioProject, PublicationStatus } from "../types/portfolio";

interface AdminProjectRow {
  id: string;
  slug: string;
  name: { en: string; vi: string };
  location: { en: string; vi: string };
  role: { en: string; vi: string } | null;
  summary: { en: string; vi: string } | null;
  start_date: string | null;
  end_date: string | null;
  year: number | null;
  responsibilities: Array<{ id: string; text: { en: string; vi: string } }>;
  technologies: string[];
  featured: boolean;
  status: PublicationStatus;
  display_order: number;
  include_in_portfolio: boolean;
  portfolio_order: number;
  portfolio_layout: "feature" | "standard" | "compact";
}

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App container was not found.");

let projects: AdminProjectRow[] = [];
let tools: Array<{ id: string; name: string; status: PublicationStatus }> = [];
let selectedProject: AdminProjectRow | null = null;
let magicLinkCooldown: number | undefined;

const resetMagicLinkButton = (button: HTMLButtonElement): void => {
  button.disabled = false;
  button.textContent = "Send magic link";
};

const startMagicLinkCooldown = (button: HTMLButtonElement): void => {
  if (magicLinkCooldown !== undefined) {
    window.clearInterval(magicLinkCooldown);
  }

  let secondsRemaining = 60;
  button.disabled = true;
  button.textContent = `Send again in ${secondsRemaining}s`;

  magicLinkCooldown = window.setInterval(() => {
    secondsRemaining -= 1;

    if (secondsRemaining <= 0) {
      window.clearInterval(magicLinkCooldown);
      magicLinkCooldown = undefined;
      resetMagicLinkButton(button);
      return;
    }

    button.textContent = `Send again in ${secondsRemaining}s`;
  }, 1000);
};

const message = (text: string, kind: "info" | "error" | "success" = "info"): void => {
  const target = document.querySelector<HTMLElement>("[data-admin-message]");
  if (!target) return;
  target.textContent = text;
  target.dataset.kind = kind;
};

const slugify = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const toRow = (project: PortfolioProject): AdminProjectRow => ({
  id: project.id,
  slug: project.slug,
  name: project.name,
  location: project.location,
  role: project.role ?? null,
  summary: project.summary ?? null,
  start_date: project.startDate ?? null,
  end_date: project.endDate ?? null,
  year: project.year ?? null,
  responsibilities: project.responsibilities,
  technologies: project.technologies,
  featured: project.featured,
  status: "draft",
  display_order: project.displayOrder,
  include_in_portfolio: false,
  portfolio_order: project.portfolioOrder,
  portfolio_layout: project.portfolioLayout,
});

const blankProject = (): AdminProjectRow => ({
  id: crypto.randomUUID(),
  slug: "",
  name: { en: "", vi: "" },
  location: { en: "", vi: "" },
  role: null,
  summary: null,
  start_date: null,
  end_date: null,
  year: null,
  responsibilities: [],
  technologies: [],
  featured: false,
  status: "draft",
  display_order: projects.length + 1,
  include_in_portfolio: false,
  portfolio_order: projects.length + 1,
  portfolio_layout: "standard",
});

const loginView = (): void => {
  if (magicLinkCooldown !== undefined) {
    window.clearInterval(magicLinkCooldown);
    magicLinkCooldown = undefined;
  }

  app.innerHTML = `
    <main class="admin-login">
      <section class="admin-login__card">
        <p class="section-kicker">Private CMS</p>
        <h1>Portfolio administration</h1>
        <p>Sign in with your password, or use a one-time Magic Link as a backup.</p>
        <label class="admin-login__email">Email<input type="email" autocomplete="username" value="${escapeHtml(supabaseConfig.adminEmail)}" readonly></label>
        <div class="admin-auth-tabs" role="tablist" aria-label="Sign-in method">
          <button class="admin-auth-tabs__button is-active" type="button" role="tab" aria-selected="true" aria-controls="password-panel" data-auth-mode="password">Password</button>
          <button class="admin-auth-tabs__button" type="button" role="tab" aria-selected="false" aria-controls="magic-link-panel" data-auth-mode="magic-link">Magic Link</button>
        </div>
        <form id="password-panel" role="tabpanel" data-password-login-form>
          <label>Password
            <span class="admin-password-field">
              <input name="password" type="password" autocomplete="current-password" required autofocus>
              <button type="button" data-password-visibility aria-label="Show password">Show</button>
            </span>
          </label>
          <button class="button" type="submit" data-password-submit>Sign in</button>
        </form>
        <form id="magic-link-panel" role="tabpanel" data-magic-link-form hidden>
          <button class="button" type="submit" data-magic-link-submit>Send magic link</button>
        </form>
        <p class="admin-login__help" data-login-help>Password sign-in does not require email delivery.</p>
        <p class="admin-message" data-admin-message role="status"></p>
        <a href="${import.meta.env.BASE_URL}">← Return to website</a>
      </section>
    </main>`;

  const passwordPanel = app.querySelector<HTMLFormElement>("[data-password-login-form]");
  const magicLinkPanel = app.querySelector<HTMLFormElement>("[data-magic-link-form]");
  const loginHelp = app.querySelector<HTMLElement>("[data-login-help]");

  app.querySelectorAll<HTMLButtonElement>("[data-auth-mode]").forEach((tab) => {
    tab.addEventListener("click", () => {
      const passwordMode = tab.dataset.authMode === "password";
      app.querySelectorAll<HTMLButtonElement>("[data-auth-mode]").forEach((item) => {
        const selected = item === tab;
        item.classList.toggle("is-active", selected);
        item.setAttribute("aria-selected", String(selected));
      });
      if (passwordPanel) passwordPanel.hidden = !passwordMode;
      if (magicLinkPanel) magicLinkPanel.hidden = passwordMode;
      if (loginHelp) {
        loginHelp.textContent = passwordMode
          ? "Password sign-in does not require email delivery."
          : "Allow a few minutes for delivery and check Spam or Promotions. Requests are limited to one per minute.";
      }
      message("");
      if (passwordMode) {
        passwordPanel?.querySelector<HTMLInputElement>("input[name='password']")?.focus();
      } else {
        magicLinkPanel?.querySelector<HTMLButtonElement>("[data-magic-link-submit]")?.focus();
      }
    });
  });

  app.querySelector<HTMLButtonElement>("[data-password-visibility]")?.addEventListener("click", (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    const input = passwordPanel?.querySelector<HTMLInputElement>("input[name='password']");
    if (!input) return;
    const visible = input.type === "text";
    input.type = visible ? "password" : "text";
    button.textContent = visible ? "Show" : "Hide";
    button.setAttribute("aria-label", visible ? "Show password" : "Hide password");
    input.focus();
  });

  passwordPanel?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget as HTMLFormElement;
    const form = new FormData(formElement);
    const password = String(form.get("password") ?? "");
    const submitButton = formElement.querySelector<HTMLButtonElement>("[data-password-submit]");

    if (!submitButton) return;

    submitButton.disabled = true;
    submitButton.textContent = "Signing in…";
    message("Checking your credentials…");

    const { error } = await supabase.auth.signInWithPassword({
      email: supabaseConfig.adminEmail,
      password,
    });

    if (error) {
      submitButton.disabled = false;
      submitButton.textContent = "Sign in";
      message("Email or password is incorrect, or this account does not have a password yet.", "error");
      return;
    }

    await initialize();
  });

  magicLinkPanel?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget as HTMLFormElement;
    const submitButton = formElement.querySelector<HTMLButtonElement>("[data-magic-link-submit]");

    if (!submitButton) return;

    submitButton.disabled = true;
    submitButton.textContent = "Sending…";
    message("Sending magic link…");
    const { error } = await supabase.auth.signInWithOtp({
      email: supabaseConfig.adminEmail,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: magicLinkRedirectUrl(),
      },
    });

    if (error) {
      resetMagicLinkButton(submitButton);
      message(
        error.status === 429
          ? "Too many requests. Wait before requesting another Magic Link."
          : error.message,
        "error",
      );
      return;
    }

    message(
      "Request accepted by Supabase. Check Inbox, Spam, and Promotions. Delivery may take a few minutes.",
      "success",
    );
    startMagicLinkCooldown(submitButton);
  });
};

const projectList = (): string =>
  projects.length
    ? projects.map((project) => `
      <li class="admin-project">
        <button type="button" data-edit="${escapeHtml(project.id)}">
          <span>${escapeHtml(project.name.en || "Untitled project")}</span>
          <small>${escapeHtml(project.slug || "No slug")}</small>
        </button>
        <span class="status status--${project.status}">${project.status}</span>
        <button class="admin-project__status" type="button" data-status="${escapeHtml(project.id)}" data-next="${project.status === "published" ? "draft" : "published"}">
          ${project.status === "published" ? "Unpublish" : "Publish"}
        </button>
      </li>`).join("")
    : '<li class="admin-empty">No projects. Create one or import starter data.</li>';

const toolList = (): string =>
  tools.length
    ? tools.map((tool) => `<li class="admin-project"><div><span>${escapeHtml(tool.name)}</span><small>BIM automation tool</small></div><span class="status status--${tool.status}">${tool.status}</span><button class="admin-project__status" type="button" data-tool-status="${escapeHtml(tool.id)}" data-next="${tool.status === "published" ? "draft" : "published"}">${tool.status === "published" ? "Unpublish" : "Publish"}</button></li>`).join("")
    : '<li class="admin-empty">No tools. Import starter data first.</li>';

const field = (label: string, name: string, value = "", type = "text"): string =>
  `<label>${label}<input name="${name}" type="${type}" value="${escapeHtml(value)}"></label>`;

const editor = (project: AdminProjectRow): string => `
  <form class="admin-editor" data-project-form>
    <input name="id" type="hidden" value="${escapeHtml(project.id)}">
    <div class="admin-editor__heading"><div><p class="section-kicker">${project.name.en ? "Edit project" : "New project"}</p><h2>${escapeHtml(project.name.en || "Untitled project")}</h2></div><span class="status status--${project.status}">${project.status}</span></div>
    <div class="admin-form-grid">
      ${field("Project name (English) *", "name_en", project.name.en)}
      ${field("Project name (Vietnamese)", "name_vi", project.name.vi)}
      ${field("Slug *", "slug", project.slug)}
      ${field("Location (English)", "location_en", project.location.en)}
      ${field("Location (Vietnamese)", "location_vi", project.location.vi)}
      ${field("Role (English)", "role_en", project.role?.en ?? "")}
      ${field("Start (YYYY-MM)", "start_date", project.start_date ?? "")}
      ${field("End (YYYY-MM or blank)", "end_date", project.end_date ?? "")}
      ${field("Display order", "display_order", String(project.display_order), "number")}
      ${field("Portfolio order", "portfolio_order", String(project.portfolio_order), "number")}
    </div>
    <label>Summary (English)<textarea name="summary_en" rows="4">${escapeHtml(project.summary?.en ?? "")}</textarea></label>
    <label>Responsibilities (one English item per line)<textarea name="responsibilities" rows="6">${escapeHtml(project.responsibilities.map((item) => item.text.en).join("\n"))}</textarea></label>
    <label>Technologies (comma separated)<input name="technologies" value="${escapeHtml(project.technologies.join(", "))}"></label>
    <div class="admin-checks">
      <label><input name="featured" type="checkbox" ${project.featured ? "checked" : ""}> Featured on website</label>
      <label><input name="include_in_portfolio" type="checkbox" ${project.include_in_portfolio ? "checked" : ""}> Include in Portfolio PDF</label>
    </div>
    <label>Portfolio layout<select name="portfolio_layout"><option value="standard" ${project.portfolio_layout === "standard" ? "selected" : ""}>Standard</option><option value="feature" ${project.portfolio_layout === "feature" ? "selected" : ""}>Feature</option><option value="compact" ${project.portfolio_layout === "compact" ? "selected" : ""}>Compact</option></select></label>
    <div class="admin-actions"><button class="button" type="submit">Save as ${project.status}</button><button class="button button--secondary" type="button" data-cancel>Edit another project</button></div>
  </form>
  <form class="admin-upload" data-upload-form>
    <div><p class="section-kicker">Project media</p><h2>Upload sanitized images</h2><p>Select one or more JPEG, PNG, WebP or AVIF images, maximum 5 MB each. Uploading never changes project status.</p></div>
    <label>Alt text (English)<input name="alt" required value="${escapeHtml(project.name.en)}"><small>The same alt text will be applied to every selected image.</small></label>
    <label>Images<input name="images" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple required></label>
    <button class="button button--secondary" type="submit" data-upload-submit>Upload images</button>
  </form>`;

const dashboardView = (): void => {
  app.innerHTML = `
    <header class="admin-header"><div><p>HDL Portfolio CMS</p><small>Supabase · Singapore region</small></div><div><a href="${import.meta.env.BASE_URL}admin/cover-letters/">Cover letters</a><a href="${import.meta.env.BASE_URL}" target="_blank" rel="noreferrer">View website</a><button type="button" data-password-open>Account security</button><button type="button" data-sign-out>Sign out</button></div></header>
    <main class="admin-layout">
      <aside class="admin-sidebar">
        <div class="admin-sidebar__actions"><button class="button" type="button" data-new-project>New project</button><button class="button button--secondary" type="button" data-import>Import starter drafts</button></div>
        <p class="admin-message" data-admin-message role="status"></p>
        <h2 class="admin-sidebar__title">Projects</h2>
        <ul class="admin-projects">${projectList()}</ul>
        <h2 class="admin-sidebar__title">Tools</h2>
        <ul class="admin-projects">${toolList()}</ul>
      </aside>
      <section class="admin-workspace">${editor(selectedProject ?? blankProject())}</section>
    </main>
    <dialog class="admin-dialog" data-password-dialog>
      <form data-password-update-form>
        <div><p class="section-kicker">Account security</p><h2>Set or change password</h2></div>
        <p>Use at least 12 characters. The password is sent directly to Supabase Auth and is never stored in this website's code.</p>
        <label>New password<input name="new_password" type="password" autocomplete="new-password" minlength="12" required></label>
        <label>Confirm password<input name="confirm_password" type="password" autocomplete="new-password" minlength="12" required></label>
        <p class="admin-message" data-password-message role="status"></p>
        <div class="admin-actions"><button class="button" type="submit" data-password-update-submit>Save password</button><button class="button button--secondary" type="button" data-password-close>Cancel</button></div>
      </form>
    </dialog>`;
  bindDashboard();
};

const loadProjects = async (): Promise<void> => {
  const [projectResult, toolResult] = await Promise.all([
    supabase.from("projects").select("*").order("display_order"),
    supabase.from("automation_tools").select("id,name,status").order("display_order"),
  ]);
  if (projectResult.error) throw projectResult.error;
  if (toolResult.error) throw toolResult.error;
  projects = projectResult.data as AdminProjectRow[];
  tools = toolResult.data as Array<{ id: string; name: string; status: PublicationStatus }>;
};

const saveForm = async (formElement: HTMLFormElement): Promise<void> => {
  const form = new FormData(formElement);
  const current = projects.find((item) => item.id === String(form.get("id"))) ?? selectedProject ?? blankProject();
  const nameEn = String(form.get("name_en") ?? "").trim();
  const slug = slugify(String(form.get("slug") ?? "") || nameEn);
  if (!nameEn || !slug) throw new Error("English name and slug are required.");
  const responsibilities = String(form.get("responsibilities") ?? "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean).map((text, index) => ({ id: `${slug}-${index + 1}`, text: { en: text, vi: "" } }));
  const payload: AdminProjectRow = {
    ...current,
    id: String(form.get("id")),
    slug,
    name: { en: nameEn, vi: String(form.get("name_vi") ?? "").trim() },
    location: { en: String(form.get("location_en") ?? "").trim(), vi: String(form.get("location_vi") ?? "").trim() },
    role: String(form.get("role_en") ?? "").trim() ? { en: String(form.get("role_en")).trim(), vi: "" } : null,
    summary: String(form.get("summary_en") ?? "").trim() ? { en: String(form.get("summary_en")).trim(), vi: "" } : null,
    start_date: String(form.get("start_date") ?? "").trim() || null,
    end_date: String(form.get("end_date") ?? "").trim() || null,
    responsibilities,
    technologies: String(form.get("technologies") ?? "").split(",").map((item) => item.trim()).filter(Boolean),
    featured: form.get("featured") === "on",
    include_in_portfolio: form.get("include_in_portfolio") === "on",
    display_order: Number(form.get("display_order")) || 100,
    portfolio_order: Number(form.get("portfolio_order")) || 100,
    portfolio_layout: String(form.get("portfolio_layout")) as AdminProjectRow["portfolio_layout"],
  };
  const { error } = await supabase.from("projects").upsert(payload);
  if (error) throw error;
  selectedProject = payload;
  await loadProjects();
  dashboardView();
  message("Project saved. Status was not changed.", "success");
};

const uploadImages = async (formElement: HTMLFormElement): Promise<void> => {
  if (!selectedProject) throw new Error("Save or select a project before uploading.");
  const form = new FormData(formElement);
  const fileInput = formElement.elements.namedItem("images");
  if (!(fileInput instanceof HTMLInputElement) || fileInput.type !== "file") throw new Error("Image picker is unavailable.");
  const files = Array.from(fileInput.files ?? []);
  if (!files.length) throw new Error("Choose one or more images.");
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/avif"];
  const invalidFile = files.find((file) => !allowed.includes(file.type) || file.size > 5 * 1024 * 1024);
  if (invalidFile) throw new Error(`Use JPEG, PNG, WebP or AVIF files smaller than 5 MB. Check "${invalidFile.name}".`);

  const alt = String(form.get("alt") ?? "").trim();
  const submitButton = formElement.querySelector<HTMLButtonElement>("[data-upload-submit]");
  const failures: Array<{ name: string; reason: string }> = [];
  let uploaded = 0;

  if (submitButton) submitButton.disabled = true;
  try {
    for (const [index, file] of files.entries()) {
      if (submitButton) submitButton.textContent = `Uploading ${index + 1} of ${files.length}...`;
      message(`Uploading image ${index + 1} of ${files.length}...`);

      try {
        const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const path = `projects/${selectedProject.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from(supabaseConfig.storageBucket).upload(path, file, { contentType: file.type, upsert: false });
        if (uploadError) throw uploadError;

        const { error: metadataError } = await supabase.from("project_images").insert({
          project_id: selectedProject.id,
          storage_path: path,
          alt: { en: alt, vi: "" },
          kind: "gallery",
          display_order: 100 + index,
          mime_type: file.type,
          file_size: file.size,
        });
        if (metadataError) {
          await supabase.storage.from(supabaseConfig.storageBucket).remove([path]);
          throw metadataError;
        }
        uploaded += 1;
      } catch (error) {
        failures.push({
          name: file.name,
          reason: error instanceof Error ? error.message : "Upload failed.",
        });
      }
    }
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Upload images";
    }
  }

  formElement.reset();
  if (failures.length) {
    const details = failures.map((failure) => `${failure.name}: ${failure.reason}`).join("; ");
    throw new Error(`${uploaded} of ${files.length} images uploaded. Failed: ${details}`);
  }
  message(`${uploaded} ${uploaded === 1 ? "image" : "images"} uploaded. Project publication status was not changed.`, "success");
};

const bindDashboard = (): void => {
  const passwordDialog = app.querySelector<HTMLDialogElement>("[data-password-dialog]");
  app.querySelector("[data-password-open]")?.addEventListener("click", () => passwordDialog?.showModal());
  app.querySelector("[data-password-close]")?.addEventListener("click", () => passwordDialog?.close());
  app.querySelector<HTMLFormElement>("[data-password-update-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget as HTMLFormElement;
    const form = new FormData(formElement);
    const newPassword = String(form.get("new_password") ?? "");
    const confirmPassword = String(form.get("confirm_password") ?? "");
    const status = formElement.querySelector<HTMLElement>("[data-password-message]");
    const submitButton = formElement.querySelector<HTMLButtonElement>("[data-password-update-submit]");
    const setStatus = (text: string, kind: "error" | "success" | "info" = "info"): void => {
      if (!status) return;
      status.textContent = text;
      status.dataset.kind = kind;
    };

    if (newPassword.length < 12) return setStatus("Use a password with at least 12 characters.", "error");
    if (newPassword !== confirmPassword) return setStatus("The passwords do not match.", "error");
    if (!submitButton) return;

    submitButton.disabled = true;
    submitButton.textContent = "Saving…";
    setStatus("Updating your Supabase Auth password…");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    submitButton.disabled = false;
    submitButton.textContent = "Save password";

    if (error) return setStatus(error.message, "error");

    formElement.reset();
    setStatus("Password updated. You can use Password sign-in next time.", "success");
  });
  app.querySelector("[data-sign-out]")?.addEventListener("click", async () => { await supabase.auth.signOut(); loginView(); });
  app.querySelector("[data-new-project]")?.addEventListener("click", () => { selectedProject = blankProject(); dashboardView(); });
  app.querySelector("[data-cancel]")?.addEventListener("click", () => { selectedProject = null; dashboardView(); });
  app.querySelectorAll<HTMLElement>("[data-edit]").forEach((button) => button.addEventListener("click", () => { selectedProject = projects.find((item) => item.id === button.dataset.edit) ?? null; dashboardView(); }));
  app.querySelectorAll<HTMLElement>("[data-status]").forEach((button) => button.addEventListener("click", async () => {
    if (button.dataset.next === "published" && !window.confirm("Publish this project on the public website?")) return;
    const { error } = await supabase.from("projects").update({ status: button.dataset.next }).eq("id", button.dataset.status);
    if (error) return message(error.message, "error");
    await loadProjects(); dashboardView(); message(`Project changed to ${button.dataset.next}.`, "success");
  }));
  app.querySelectorAll<HTMLElement>("[data-tool-status]").forEach((button) => button.addEventListener("click", async () => {
    if (button.dataset.next === "published" && !window.confirm("Publish this automation tool on the public website?")) return;
    const { error } = await supabase.from("automation_tools").update({ status: button.dataset.next }).eq("id", button.dataset.toolStatus);
    if (error) return message(error.message, "error");
    await loadProjects(); dashboardView(); message(`Tool changed to ${button.dataset.next}.`, "success");
  }));
  app.querySelector("[data-import]")?.addEventListener("click", async () => {
    if (!window.confirm("Import starter CV/Portfolio records as drafts? Existing matching IDs will be updated.")) return;
    const projectResult = await supabase.from("projects").upsert(portfolioProjectSeed.map(toRow));
    if (projectResult.error) return message(projectResult.error.message, "error");
    const toolResult = await supabase.from("automation_tools").upsert(portfolioToolSeed.map((tool) => ({
      id: tool.id,
      slug: tool.slug,
      name: tool.name,
      problem: tool.problem,
      solution: tool.solution,
      benefit: tool.benefit ?? null,
      technologies: tool.technologies,
      featured: tool.featured,
      status: "draft",
      display_order: tool.displayOrder,
      include_in_portfolio: false,
      portfolio_order: tool.portfolioOrder,
    })));
    if (toolResult.error) return message(toolResult.error.message, "error");
    await loadProjects(); dashboardView(); message("Starter projects imported as drafts.", "success");
  });
  app.querySelector<HTMLFormElement>("[data-project-form]")?.addEventListener("submit", (event) => { event.preventDefault(); void saveForm(event.currentTarget as HTMLFormElement).catch((error: Error) => message(error.message, "error")); });
  app.querySelector<HTMLFormElement>("[data-upload-form]")?.addEventListener("submit", (event) => { event.preventDefault(); void uploadImages(event.currentTarget as HTMLFormElement).catch((error: Error) => message(error.message, "error")); });
};

const initialize = async (): Promise<void> => {
  const access = await getAdminAccess();
  if (access === "signed-out") return loginView();
  if (access === "forbidden") {
    await supabase.auth.signOut();
    loginView();
    message("This account is not in the Portfolio admin allowlist.", "error");
    return;
  }

  const returnTo = safeReturnTo();
  if (returnTo) {
    window.location.replace(returnTo);
    return;
  }

  try {
    await loadProjects();
    dashboardView();
  } catch (error) {
    loginView();
    message(error instanceof Error ? error.message : "Admin data could not be loaded.", "error");
  }
};

void initialize();
