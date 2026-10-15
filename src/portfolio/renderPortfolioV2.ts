import { assetUrl, escapeHtml, localize, profileName, type Language } from "../shared/format";
import type {
  AutomationLayout,
  MediaCropProfile,
  PortfolioCredential,
  PortfolioMedia,
  PortfolioProject,
  PortfolioRuntimeData,
  PortfolioTool,
  ProjectLayout,
} from "../types/portfolio";
import { portfolioPageCount, resolveAutomationLayout, resolveProjectLayout } from "./layouts";
import { resolvePortfolioMedia } from "./mediaSlots";

const copy = {
  en: {
    profile: "Professional profile", selectedWork: "Selected work", projectIndex: "Project index",
    noProjects: "No published projects have been selected for the Portfolio PDF.", imagePlaceholder: "Project image placeholder",
    projectFallback: "Project details will be updated after verification.", selectedAutomation: "Selected BIM automation",
    toolsTitle: "Tools built around real delivery constraints.", automation: "Automation", problem: "The challenge",
    solution: "The approach", outcome: "Outcome", contribution: "Selected contribution", credentials: "Education & credentials",
    credentialsSubtitle: "Selected supporting documents", documentPlaceholder: "Document preview placeholder", connect: "Let’s connect",
    year: "Year", tools: "Tools", selectedProjects: "Selected projects", capabilities: "Capabilities",
  },
  vi: {
    profile: "Hồ sơ chuyên môn", selectedWork: "Dự án tiêu biểu", projectIndex: "Danh mục dự án",
    noProjects: "Chưa có dự án đã xuất bản nào được chọn cho Portfolio PDF.", imagePlaceholder: "Vị trí hình ảnh dự án",
    projectFallback: "Thông tin dự án sẽ được cập nhật sau khi xác minh.", selectedAutomation: "Tự động hóa BIM tiêu biểu",
    toolsTitle: "Các công cụ được xây dựng từ yêu cầu triển khai thực tế.", automation: "Tự động hóa", problem: "Thách thức",
    solution: "Giải pháp", outcome: "Kết quả", contribution: "Đóng góp tiêu biểu", credentials: "Học vấn & chứng chỉ",
    credentialsSubtitle: "Tài liệu minh chứng đã chọn", documentPlaceholder: "Vị trí tài liệu minh chứng", connect: "Kết nối",
    year: "Năm", tools: "Công cụ", selectedProjects: "Dự án đã chọn", capabilities: "Năng lực",
  },
} as const;

const localized = (value: Parameters<typeof localize>[0], language: Language): string => localize(value, language) || localize(value, "en");
const tags = (items: string[]): string => items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
const mediaSource = (media: PortfolioMedia | undefined, profile?: MediaCropProfile): string | null => {
  if (!media) return null;
  const crop = profile ? media.crops?.[profile] ?? (profile === "portrait" ? media.crops?.standard : undefined) : undefined;
  if (crop) return crop.publicUrl ?? (/^https?:\/\//i.test(crop.storagePath) ? crop.storagePath : assetUrl(crop.storagePath));
  return media.publicUrl ?? (/^https?:\/\//i.test(media.storagePath) ? media.storagePath : assetUrl(media.storagePath));
};
const imageMarkup = (
  media: PortfolioMedia | undefined,
  fallbackAlt: Parameters<typeof localized>[0],
  language: Language,
  profile?: MediaCropProfile,
  className = "portfolio-project-image",
): string => {
  const source = mediaSource(media, profile);
  if (!source) return `<div class="portfolio-image-placeholder ${className}"><span>${copy[language].imagePlaceholder}</span></div>`;
  return `<img class="${className}" src="${escapeHtml(source)}" alt="${escapeHtml(localized(media?.alt ?? fallbackAlt, language))}">`;
};
const mediaCaption = (media: PortfolioMedia | undefined, language: Language, fallback: string): string =>
  escapeHtml(media?.caption ? localized(media.caption, language) || fallback : fallback);
const layoutName = (id: string): string => id.includes(".") ? id.split(".").at(-1)?.replaceAll("-", " ") ?? id : id;
const page = (content: string, className: string, pageNumber: number, totalPages: number, displayName: string, layoutId: string, chrome = true): string => `<section class="portfolio-page ${className}" data-portfolio-layout="${escapeHtml(layoutId)}">
  ${chrome ? `<header class="portfolio-page-header"><strong>${escapeHtml(displayName)}</strong><span>${escapeHtml(layoutName(layoutId))}</span></header>` : ""}${content}
  ${chrome ? `<footer class="portfolio-page-footer"><span>BIM COORDINATOR · INFRASTRUCTURE · AUTOMATION</span><strong>${String(pageNumber).padStart(2, "0")} / ${String(totalPages).padStart(2, "0")}</strong></footer>` : `<span class="portfolio-page-number">${String(pageNumber).padStart(2, "0")} / ${String(totalPages).padStart(2, "0")}</span>`}</section>`;
const projectMeta = (project: PortfolioProject, language: Language): string => [localized(project.location, language), project.role ? localized(project.role, language) : ""].filter(Boolean).join(" · ");
const projectContributionCards = (project: PortfolioProject, language: Language): string => {
  const items = project.responsibilities.slice(0, 3);
  const populated = items.length ? items : [{ id: "placeholder", text: { en: copy.en.projectFallback, vi: copy.vi.projectFallback } }];
  return populated.map((point, index) => `<article><span>${String(index + 1).padStart(2, "0")}</span><div><strong>${copy[language].contribution}</strong><p>${escapeHtml(localized(point.text, language))}</p></div></article>`).join("");
};

const renderCover = (data: PortfolioRuntimeData, language: Language, selectedProjects: PortfolioProject[]): string => {
  const { content } = data;
  const displayName = profileName(content.profile.name, language);
  const hero = selectedProjects[0];
  const heroMedia = hero ? resolvePortfolioMedia(hero.images, content.mediaAssignments.projects[hero.id]).primary : undefined;
  if (content.layouts.cover === "cover.split-image") return `<div class="portfolio-cover portfolio-cover--split"><div class="portfolio-cover__copy"><p class="portfolio-kicker">${escapeHtml(localized(content.kicker, language))}</p><h1>${escapeHtml(content.title)}</h1><div class="portfolio-cover__identity"><strong>${escapeHtml(displayName)}</strong><span>${escapeHtml(localized(content.profile.professionalTitle, language))}</span></div><p class="portfolio-cover__statement">${escapeHtml(localized(content.aboutHeading, language))}</p><p class="portfolio-cover__year">${escapeHtml(content.year)}</p></div><figure>${imageMarkup(heroMedia, hero?.name ?? { en: "", vi: "" }, language, "portrait", "portfolio-cover__image")}<figcaption>${hero ? escapeHtml(localized(hero.name, language)) : copy[language].imagePlaceholder}</figcaption></figure></div>`;
  if (content.layouts.cover === "cover.horizontal") return `<div class="portfolio-cover portfolio-cover--horizontal"><div class="portfolio-cover__copy"><p class="portfolio-kicker">${escapeHtml(localized(content.kicker, language))}</p><h1>${escapeHtml(content.title)}</h1><div class="portfolio-cover__identity"><strong>${escapeHtml(displayName)}</strong><span>${escapeHtml(localized(content.profile.professionalTitle, language))}</span></div><p class="portfolio-cover__statement">${escapeHtml(localized(content.aboutHeading, language))}</p></div><div class="portfolio-cover__horizontal-media">${imageMarkup(heroMedia, hero?.name ?? { en: "", vi: "" }, language, "wide", "portfolio-cover__image")}<aside><span>Infrastructure BIM</span><strong>Model coordination.<br>Quality control.<br>Practical automation.</strong></aside></div></div>`;
  return `<div class="portfolio-cover portfolio-cover--classic"><div class="portfolio-cover__rail"></div><div class="portfolio-cover__copy"><p class="portfolio-kicker">${escapeHtml(localized(content.kicker, language))}</p><h1>${escapeHtml(content.title)}</h1><div class="portfolio-cover__identity"><strong>${escapeHtml(displayName)}</strong><span>${escapeHtml(localized(content.profile.professionalTitle, language))}</span></div><p class="portfolio-cover__year">${escapeHtml(content.year)}</p></div></div>`;
};

const profilePhoto = (data: PortfolioRuntimeData, displayName: string): string => `<div class="portfolio-about__photo" data-portfolio-profile-photo-frame><span aria-hidden="true">${escapeHtml(displayName.trim().split(/\s+/).slice(0, 3).map((part) => part[0] ?? "").join("").toUpperCase() || "HDL")}</span><img src="${escapeHtml(assetUrl(data.content.profile.photoPath))}" alt="${escapeHtml(displayName)}" data-portfolio-profile-photo></div>`;
const renderProfile = (data: PortfolioRuntimeData, language: Language, selectedProjects: PortfolioProject[]): string => {
  const { content } = data;
  const { profile, skillGroups } = content;
  const displayName = profileName(profile.name, language);
  const capabilityCards = skillGroups.slice(0, 3).map((group, index) => `<article><span>${String(index + 1).padStart(2, "0")}</span><strong>${escapeHtml(localized(group.title, language))}</strong><p>${group.items.slice(0, 4).map((item) => escapeHtml(localized(item.label, language))).join(" · ")}</p></article>`).join("");
  if (content.layouts.profile === "profile.portrait") return `<div class="portfolio-profile portfolio-profile--portrait"><aside>${profilePhoto(data, displayName)}<h2>${escapeHtml(displayName)}</h2><strong>${escapeHtml(localized(profile.professionalTitle, language))}</strong></aside><main><p class="portfolio-kicker">${copy[language].profile}</p><h2>${escapeHtml(localized(content.aboutHeading, language))}</h2><p class="portfolio-lead">${escapeHtml(localized(profile.summary, language))}</p><div class="portfolio-profile__stats"><div><strong>${selectedProjects.length}</strong><span>${copy[language].selectedProjects}</span></div><div><strong>${skillGroups.length}</strong><span>${copy[language].capabilities}</span></div></div><address><a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)}</a><span>${escapeHtml(profile.phone)} · ${escapeHtml(localized(profile.location, language))}</span></address><div class="portfolio-profile__cards">${capabilityCards}</div></main></div>`;
  if (content.layouts.profile === "profile.capability") return `<div class="portfolio-profile portfolio-profile--capability"><main><p class="portfolio-kicker">${escapeHtml(localized(content.aboutKicker, language))}</p><h2>${escapeHtml(localized(content.aboutHeading, language))}</h2><p class="portfolio-lead">${escapeHtml(localized(profile.summary, language))}</p><div class="portfolio-profile__capabilities">${capabilityCards}</div></main><aside>${profilePhoto(data, displayName)}<h2>${escapeHtml(displayName)}</h2><p>${escapeHtml(localized(profile.professionalTitle, language))}</p><address><a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)}</a><strong>${escapeHtml(profile.phone)}</strong><span>${escapeHtml(localized(profile.location, language))}</span></address></aside></div>`;
  return `<div class="portfolio-profile portfolio-profile--classic"><aside>${profilePhoto(data, displayName)}<p class="portfolio-kicker">${copy[language].profile}</p><h2>${escapeHtml(displayName)}</h2><p>${escapeHtml(localized(profile.professionalTitle, language))}</p><address><a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)}</a><span>${escapeHtml(profile.phone)}</span><span>${escapeHtml(localized(profile.location, language))}</span></address></aside><main><p class="portfolio-kicker">${escapeHtml(localized(content.aboutKicker, language))}</p><h2>${escapeHtml(localized(content.aboutHeading, language))}</h2><p class="portfolio-lead">${escapeHtml(localized(profile.summary, language))}</p><div class="portfolio-skill-grid">${skillGroups.map((group) => `<section><h3>${escapeHtml(localized(group.title, language))}</h3><ul>${group.items.map((item) => `<li>${escapeHtml(localized(item.label, language))}</li>`).join("")}</ul></section>`).join("")}</div></main></div>`;
};

const renderIndex = (data: PortfolioRuntimeData, language: Language, projects: PortfolioProject[]): string => {
  const title = `<p class="portfolio-kicker">${copy[language].selectedWork} / ${String(projects.length).padStart(2, "0")} projects</p><h2 class="portfolio-title">${copy[language].projectIndex}</h2>`;
  if (!projects.length) return `<div class="portfolio-page__inner">${title}<p class="portfolio-empty">${copy[language].noProjects}</p></div>`;
  if (data.content.layouts.index === "index.visual") return `<div class="portfolio-page__inner portfolio-index-page portfolio-index-page--visual">${title}<div class="portfolio-index-visual${projects.length > 8 ? " is-dense" : ""}">${projects.map((project, index) => {
    const media = resolvePortfolioMedia(project.images, data.content.mediaAssignments.projects[project.id]).primary;
    return `<article><div>${imageMarkup(media, project.name, language, "landscape", "portfolio-index__image")}<span>${String(index + 1).padStart(2, "0")}</span></div><h3>${escapeHtml(localized(project.name, language))}</h3><p>${escapeHtml(projectMeta(project, language))}</p></article>`;
  }).join("")}</div></div>`;
  if (data.content.layouts.index === "index.editorial") return `<div class="portfolio-index-editorial"><aside><p class="portfolio-kicker">${copy[language].selectedWork}</p><h2>PROJECT<br>INDEX</h2><strong>${String(projects.length).padStart(2, "0")}</strong><span>${copy[language].selectedProjects}</span></aside><ol>${projects.map((project, index) => `<li><span>${String(index + 1).padStart(2, "0")}</span><div><strong>${escapeHtml(localized(project.name, language))}</strong><small>${escapeHtml(projectMeta(project, language))}</small></div></li>`).join("")}</ol></div>`;
  return `<div class="portfolio-page__inner portfolio-index-page">${title}<ol class="portfolio-index">${projects.map((project, index) => `<li><span>${String(index + 1).padStart(2, "0")}</span><div><strong>${escapeHtml(localized(project.name, language))}</strong><small>${escapeHtml(projectMeta(project, language))}</small></div></li>`).join("")}</ol></div>`;
};

const projectHeading = (project: PortfolioProject, language: Language, index: number): string => `<div class="portfolio-project-heading"><p class="portfolio-kicker">${String(index + 1).padStart(2, "0")} / ${escapeHtml(localized(project.location, language) || "Selected infrastructure")}</p><h2>${escapeHtml(localized(project.name, language))}</h2>${project.role ? `<strong>${escapeHtml(localized(project.role, language))}</strong>` : ""}</div>`;
const renderProject = (data: PortfolioRuntimeData, project: PortfolioProject, language: Language, index: number): { html: string; layout: ProjectLayout } => {
  const layout = resolveProjectLayout(data, project.id, project.portfolioLayout);
  const summary = escapeHtml(project.summary ? localized(project.summary, language) : copy[language].projectFallback);
  const media = resolvePortfolioMedia(project.images, data.content.mediaAssignments.projects[project.id]);
  const facts = `<div class="portfolio-project-facts"><div><strong>${project.year ?? "—"}</strong><span>${copy[language].year}</span></div><div><strong>${project.technologies.length || "—"}</strong><span>${copy[language].tools}</span></div><p>${summary}</p></div>`;
  const tagList = `<ul class="portfolio-tags">${tags(project.technologies)}</ul>`;
  if (layout === "project.balanced") return { layout, html: `<div class="portfolio-project portfolio-project--balanced">${projectHeading(project, language, index)}<div class="portfolio-project__balanced-grid"><div><figure>${imageMarkup(media.primary, project.name, language, "wide")}<figcaption>${mediaCaption(media.primary, language, "01 / Coordinated model overview")}</figcaption></figure>${facts}</div><aside><p class="portfolio-kicker">My contribution</p><div class="portfolio-contributions">${projectContributionCards(project, language)}</div>${tagList}</aside></div></div>` };
  if (layout === "project.editorial") return { layout, html: `<div class="portfolio-project portfolio-project--editorial"><section>${projectHeading(project, language, index)}<figure>${imageMarkup(media.primary, project.name, language, "landscape")}<figcaption>${mediaCaption(media.primary, language, "01 / Coordinated model overview")}</figcaption></figure></section><aside><p class="portfolio-project__summary">${summary}</p>${facts}<div class="portfolio-project__editorial-note"><p class="portfolio-kicker">${copy[language].contribution}</p><p>${escapeHtml(localized(project.responsibilities[0]?.text, language) || copy[language].projectFallback)}</p></div><figure>${imageMarkup(media.supporting, project.name, language, "wide")}<figcaption>${mediaCaption(media.supporting, language, "02 / Supporting detail")}</figcaption></figure>${tagList}</aside></div>` };
  if (layout === "project.technical") return { layout, html: `<div class="portfolio-project portfolio-project--technical"><aside>${projectHeading(project, language, index)}${facts}<p>${summary}</p></aside><main><figure>${imageMarkup(media.primary, project.name, language, "wide")}<figcaption>${mediaCaption(media.primary, language, "01 / Coordinated model overview")}</figcaption></figure><div class="portfolio-project__technical-detail"><figure>${imageMarkup(media.supporting, project.name, language, "wide")}<figcaption>${mediaCaption(media.supporting, language, "02 / Supporting detail")}</figcaption></figure><div class="portfolio-contributions">${projectContributionCards(project, language)}</div></div>${tagList}</main></div>` };
  if (layout === "project.portrait") return { layout, html: `<div class="portfolio-project portfolio-project--portrait"><figure>${imageMarkup(media.primary, project.name, language, "portrait")}<figcaption>${mediaCaption(media.primary, language, "01 / Project model overview")}</figcaption></figure><main>${projectHeading(project, language, index)}<p class="portfolio-project__summary">${summary}</p><div class="portfolio-contributions">${projectContributionCards(project, language)}</div>${tagList}</main></div>` };
  if (layout === "project.evidence") return { layout, html: `<div class="portfolio-project portfolio-project--evidence">${projectHeading(project, language, index)}<div class="portfolio-project__evidence-images"><figure>${imageMarkup(media.primary, project.name, language, "wide")}<figcaption>${mediaCaption(media.primary, language, "01 / Coordinated model")}</figcaption></figure><figure>${imageMarkup(media.supporting, project.name, language, "landscape")}<figcaption>${mediaCaption(media.supporting, language, "02 / Supporting evidence")}</figcaption></figure></div><div class="portfolio-contributions">${projectContributionCards(project, language)}</div></div>` };
  return { layout, html: `<div class="portfolio-project portfolio-project--classic"><div class="portfolio-project__visual">${imageMarkup(media.primary, project.name, language, "portrait")}<span class="portfolio-project__index">${String(index + 1).padStart(2, "0")}</span></div><div class="portfolio-project__content">${projectHeading(project, language, index)}<p class="portfolio-project__summary">${summary}</p>${project.responsibilities.length ? `<ul class="portfolio-responsibilities">${project.responsibilities.slice(0, 5).map((point) => `<li>${escapeHtml(localized(point.text, language))}</li>`).join("")}</ul>` : ""}${tagList}</div></div>` };
};

const renderClassicAutomation = (tools: PortfolioTool[], language: Language): string => `<div class="portfolio-page__inner portfolio-automation portfolio-automation--classic"><p class="portfolio-kicker">${copy[language].selectedAutomation}</p><h2 class="portfolio-title">${copy[language].toolsTitle}</h2><div class="portfolio-tools">${tools.map((tool, index) => `<article><span>${copy[language].automation} ${String(index + 1).padStart(2, "0")}</span><h3>${escapeHtml(tool.name)}</h3><p><strong>${copy[language].problem}</strong>${escapeHtml(localized(tool.problem, language))}</p><p><strong>${copy[language].solution}</strong>${escapeHtml(localized(tool.solution, language))}</p><ul class="portfolio-tags">${tags(tool.technologies)}</ul></article>`).join("")}</div></div>`;
const renderAutomation = (data: PortfolioRuntimeData, tool: PortfolioTool, layout: AutomationLayout, language: Language, index: number): string => {
  const benefit = tool.benefit ? localized(tool.benefit, language) : copy[language].projectFallback;
  const media = resolvePortfolioMedia(tool.images, data.content.mediaAssignments.tools[tool.id]);
  if (layout === "automation.input-geometry") {
    const inputs = [...tool.technologies.slice(0, 4)];
    while (inputs.length < 4) inputs.push("Input to be defined");
    return `<div class="portfolio-automation portfolio-automation--geometry"><p class="portfolio-kicker">${copy[language].selectedAutomation} / ${String(index + 1).padStart(2, "0")}</p><h2>${escapeHtml(tool.name)}</h2><p class="portfolio-automation__subtitle">From engineering inputs to a repeatable BIM output.</p><div class="portfolio-automation__geometry-grid"><section><p class="portfolio-kicker">Engineering inputs</p>${inputs.map((input, inputIndex) => `<article><span>Input ${String(inputIndex + 1).padStart(2, "0")}</span><strong>${escapeHtml(input)}</strong></article>`).join("")}<p><strong>${copy[language].problem}</strong>${escapeHtml(localized(tool.problem, language))}</p></section><div class="portfolio-automation__media-pair"><figure>${imageMarkup(media.primary, { en: tool.name, vi: tool.name }, language, "landscape", "portfolio-automation__image")}<figcaption>${mediaCaption(media.primary, language, "01 / Tool input or interface")}</figcaption></figure><figure>${imageMarkup(media.supporting, { en: tool.name, vi: tool.name }, language, "wide", "portfolio-automation__image")}<figcaption>${mediaCaption(media.supporting, language, "02 / Generated geometry or output")}</figcaption></figure></div></div><ul class="portfolio-tags">${tags(tool.technologies)}</ul></div>`;
  }
  return `<div class="portfolio-automation portfolio-automation--workflow"><p class="portfolio-kicker">${copy[language].selectedAutomation} / ${String(index + 1).padStart(2, "0")}</p><h2>${escapeHtml(tool.name)}</h2><p class="portfolio-automation__subtitle">Tools built around real delivery constraints.</p><div class="portfolio-automation__workflow-grid"><aside><section><p class="portfolio-kicker">${copy[language].problem}</p><p>${escapeHtml(localized(tool.problem, language))}</p></section><section><p class="portfolio-kicker">${copy[language].solution}</p><p>${escapeHtml(localized(tool.solution, language))}</p></section><ul class="portfolio-tags">${tags(tool.technologies)}</ul></aside><main><figure class="portfolio-automation__visual">${imageMarkup(media.primary, { en: tool.name, vi: tool.name }, language, "wide", "portfolio-automation__image")}<figcaption>${mediaCaption(media.primary, language, "Tool workflow or output")}</figcaption></figure><p class="portfolio-kicker">Workflow</p><ol><li><span>01 / Input</span><strong>Project information</strong></li><li><span>02 / Parameters</span><strong>${escapeHtml(tool.technologies.slice(0, 2).join(" + ") || "Parameters to be defined")}</strong></li><li><span>03 / Generation</span><strong>${escapeHtml(localized(tool.solution, language))}</strong></li><li><span>04 / ${copy[language].outcome}</span><strong>${escapeHtml(benefit)}</strong></li></ol></main></div></div>`;
};

const credentialTitle = (credential: PortfolioCredential | undefined, language: Language): string => credential ? localized(credential.title, language) : copy[language].documentPlaceholder;
const credentialMeta = (credential: PortfolioCredential | undefined, language: Language): string => credential ? [localized(credential.issuer, language), credential.issuedOn?.slice(0, 4)].filter(Boolean).join(" · ") : "Content to be supplied";
const credentialItems = (data: PortfolioRuntimeData): Array<PortfolioCredential | undefined> => {
  const selected = (data.credentials ?? []).filter((item) => item.includeInPortfolio).sort((a, b) => a.portfolioOrder - b.portfolioOrder).slice(0, 2);
  return selected.length >= 2 ? selected : [...selected, ...Array<undefined>(2 - selected.length)];
};
const renderCredentials = (data: PortfolioRuntimeData, language: Language): string => {
  const credentials = credentialItems(data);
  if (data.content.layouts.credentials === "credentials.dual") return `<div class="portfolio-credentials portfolio-credentials--dual"><p class="portfolio-kicker">${copy[language].credentialsSubtitle}</p><h2>${copy[language].credentials}</h2><div>${credentials.map((credential, index) => `<article><header><span>${String(index + 1).padStart(2, "0")}</span><strong>${escapeHtml(credentialTitle(credential, language))}</strong></header><div class="portfolio-document-placeholder"><span>${copy[language].documentPlaceholder}</span></div><p>${escapeHtml(credentialMeta(credential, language))}</p></article>`).join("")}</div></div>`;
  return `<div class="portfolio-credentials portfolio-credentials--bands"><p class="portfolio-kicker">${copy[language].credentialsSubtitle}</p><h2>${copy[language].credentials}</h2><div>${credentials.map((credential, index) => `<article><div class="portfolio-document-placeholder"><span>${copy[language].documentPlaceholder}</span></div><section><p class="portfolio-kicker">${String(index + 1).padStart(2, "0")} / ${credential ? escapeHtml(credential.kind.replaceAll("_", " ")) : "placeholder"}</p><h3>${escapeHtml(credentialTitle(credential, language))}</h3><p>${escapeHtml(credentialMeta(credential, language))}</p>${credential?.description ? `<small>${escapeHtml(localized(credential.description, language))}</small>` : ""}</section></article>`).join("")}</div></div>`;
};

const renderClosing = (data: PortfolioRuntimeData, language: Language, projects: PortfolioProject[]): string => {
  const { content } = data;
  const { profile } = content;
  const displayName = profileName(profile.name, language);
  if (content.layouts.closing === "closing.blue") return `<div class="portfolio-closing portfolio-closing--blue"><p class="portfolio-kicker">${escapeHtml(localized(content.closingKicker, language))}</p><h2>THANK YOU</h2><strong>${escapeHtml(localized(content.closingHeading, language))}</strong><p>${escapeHtml(localized(content.closingText, language))}</p><address><div><span>Email</span><a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)}</a></div><div><span>Phone</span><strong>${escapeHtml(profile.phone)}</strong></div><div><span>Location</span><strong>${escapeHtml(localized(profile.location, language))}</strong></div></address></div>`;
  if (content.layouts.closing === "closing.white") {
    const hero = projects[0];
    const media = hero ? resolvePortfolioMedia(hero.images, content.mediaAssignments.projects[hero.id]).primary : undefined;
    return `<div class="portfolio-closing portfolio-closing--white"><main><p class="portfolio-kicker">${escapeHtml(localized(content.closingKicker, language))}</p><h2>THANK YOU</h2><strong>${escapeHtml(localized(content.closingHeading, language))}</strong><h3>${escapeHtml(displayName)}</h3><p>${escapeHtml(localized(profile.professionalTitle, language))}</p></main><aside><p class="portfolio-kicker">${copy[language].connect}</p><span>Email</span><a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)}</a><span>Phone</span><strong>${escapeHtml(profile.phone)}</strong><span>Location</span><strong>${escapeHtml(localized(profile.location, language))}</strong></aside><figure>${imageMarkup(media, hero?.name ?? { en: "", vi: "" }, language, "wide", "portfolio-closing__image")}<figcaption>Selected infrastructure BIM model</figcaption></figure></div>`;
  }
  return `<div class="portfolio-closing portfolio-closing--classic"><p class="portfolio-kicker">${escapeHtml(localized(content.closingKicker, language))}</p><h2>${escapeHtml(localized(content.closingHeading, language))}</h2><p>${escapeHtml(localized(content.closingText, language))}</p><div><a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)}</a><span>${escapeHtml(profile.phone)}</span></div></div>`;
};

export const renderPortfolio = (data: PortfolioRuntimeData, language: Language = "en"): string => {
  const displayName = profileName(data.content.profile.name, language);
  const selectedProjects = data.projects.filter((project) => project.includeInPortfolio).sort((a, b) => a.portfolioOrder - b.portfolioOrder);
  const selectedTools = data.tools.filter((tool) => tool.includeInPortfolio).sort((a, b) => a.portfolioOrder - b.portfolioOrder);
  const totalPages = portfolioPageCount(data);
  let pageNumber = 0;
  const numbered = (content: string, className: string, layoutId: string, chrome = true): string => {
    pageNumber += 1;
    return page(content, className, pageNumber, totalPages, displayName, layoutId, chrome);
  };
  const pages: string[] = [
    numbered(renderCover(data, language, selectedProjects), `portfolio-page--cover portfolio-page--${data.content.layouts.cover.replace(".", "-")}`, data.content.layouts.cover, false),
    numbered(renderProfile(data, language, selectedProjects), `portfolio-page--profile portfolio-page--${data.content.layouts.profile.replace(".", "-")}`, data.content.layouts.profile),
    numbered(renderIndex(data, language, selectedProjects), `portfolio-page--index portfolio-page--${data.content.layouts.index.replace(".", "-")}`, data.content.layouts.index),
  ];
  selectedProjects.forEach((project, index) => {
    const rendered = renderProject(data, project, language, index);
    pages.push(numbered(rendered.html, `portfolio-page--project portfolio-page--${String(rendered.layout).replace(".", "-")}`, String(rendered.layout)));
  });
  const classicTools = selectedTools.filter((tool) => resolveAutomationLayout(data, tool.id) === "automation.classic");
  if (classicTools.length) pages.push(numbered(renderClassicAutomation(classicTools, language), "portfolio-page--automation portfolio-page--automation-classic", "automation.classic"));
  selectedTools.filter((tool) => resolveAutomationLayout(data, tool.id) !== "automation.classic").forEach((tool, index) => {
    const layout = resolveAutomationLayout(data, tool.id);
    pages.push(numbered(renderAutomation(data, tool, layout, language, index), `portfolio-page--automation portfolio-page--${layout.replace(".", "-")}`, layout));
  });
  if (data.content.layouts.includeCredentials) pages.push(numbered(renderCredentials(data, language), `portfolio-page--credentials portfolio-page--${data.content.layouts.credentials.replace(".", "-")}`, data.content.layouts.credentials));
  pages.push(numbered(renderClosing(data, language, selectedProjects), `portfolio-page--closing portfolio-page--${data.content.layouts.closing.replace(".", "-")}`, data.content.layouts.closing, data.content.layouts.closing === "closing.white"));
  return pages.join("");
};
