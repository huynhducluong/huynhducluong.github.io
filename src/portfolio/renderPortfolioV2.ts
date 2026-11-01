import { assetUrl, escapeHtml, profileName, type Language } from "../shared/format";
import type { LocalizedText } from "../types/career";
import type { CredentialKind } from "../types/credential";
import type {
  AutomationLayout,
  MediaCropProfile,
  PortfolioCredential,
  PortfolioMedia,
  PortfolioProfileStat,
  PortfolioProject,
  PortfolioRuntimeData,
  PortfolioTool,
  ProjectLayout,
} from "../types/portfolio";
import { PORTFOLIO_CREDENTIALS_PER_PAGE, PORTFOLIO_PROFILE_CARD_ITEMS, portfolioCapabilityGroups, portfolioContributionLimit, portfolioCredentialPages, portfolioProjectResponsibilities, type PortfolioCredentialPage, portfolioPageCount, resolveAutomationLayout, resolveProjectLayout } from "./layouts";
import { resolvePortfolioMedia } from "./mediaSlots";

// Every visible string lives here so the Vietnamese PDF never falls back to English chrome.
const copy = {
  en: {
    profile: "Professional profile", selectedWork: "Selected work", projectIndex: "Project index", projectsUnit: "projects",
    noProjects: "No published projects have been selected for the Portfolio PDF.", imagePlaceholder: "Project image placeholder",
    selectedAutomation: "Selected BIM automation", automation: "Automation",
    problem: "The challenge", solution: "The approach", outcome: "Outcome", contribution: "Selected contribution", myContribution: "My contribution",
    credentials: "Education & credentials", credentialsSubtitle: "Selected supporting documents", documentPlaceholder: "Document preview placeholder",
    contentPending: "Content to be supplied", connect: "Let’s connect", email: "Email", phone: "Phone", location: "Location",
    year: "Year", tools: "Tools", selectedProjects: "Selected projects", capabilities: "Capabilities", automationTools: "Automation tools", credentialCount: "Credentials",
    captionOverview: "Coordinated model overview", captionSupporting: "Supporting detail", captionEvidence: "Supporting evidence",
    captionToolOutput: "Tool workflow or output", captionToolInput: "Tool input or interface", captionToolGenerated: "Generated geometry or output",
    captionClosing: "Selected infrastructure BIM model",
    builtWith: "Built with", workflow: "Workflow",
    credentialKinds: {
      professional_certification: "Professional certification", academic_degree: "Academic degree", language_exam: "Language exam",
      license: "License", course: "Course", award: "Award", membership: "Membership", other: "Credential",
    },
  },
  vi: {
    profile: "Hồ sơ chuyên môn", selectedWork: "Dự án tiêu biểu", projectIndex: "Danh mục dự án", projectsUnit: "dự án",
    noProjects: "Chưa có dự án đã xuất bản nào được chọn cho Portfolio PDF.", imagePlaceholder: "Vị trí hình ảnh dự án",
    selectedAutomation: "Tự động hóa BIM tiêu biểu", automation: "Tự động hóa",
    problem: "Thách thức", solution: "Giải pháp", outcome: "Kết quả", contribution: "Đóng góp tiêu biểu", myContribution: "Đóng góp của tôi",
    credentials: "Học vấn & chứng chỉ", credentialsSubtitle: "Tài liệu minh chứng đã chọn", documentPlaceholder: "Vị trí tài liệu minh chứng",
    contentPending: "Nội dung sẽ được bổ sung", connect: "Kết nối", email: "Email", phone: "Điện thoại", location: "Địa điểm",
    year: "Năm", tools: "Công cụ", selectedProjects: "Dự án đã chọn", capabilities: "Năng lực", automationTools: "Công cụ tự động hóa", credentialCount: "Chứng chỉ",
    captionOverview: "Tổng quan mô hình phối hợp", captionSupporting: "Chi tiết bổ trợ", captionEvidence: "Minh chứng bổ trợ",
    captionToolOutput: "Quy trình hoặc kết quả của công cụ", captionToolInput: "Dữ liệu đầu vào hoặc giao diện công cụ", captionToolGenerated: "Hình học hoặc kết quả được tạo",
    captionClosing: "Mô hình BIM hạ tầng tiêu biểu",
    builtWith: "Công nghệ sử dụng", workflow: "Quy trình",
    credentialKinds: {
      professional_certification: "Chứng chỉ chuyên môn", academic_degree: "Bằng cấp", language_exam: "Chứng chỉ ngoại ngữ",
      license: "Giấy phép", course: "Khóa học", award: "Giải thưởng", membership: "Hội viên", other: "Chứng chỉ",
    },
  },
} as const;

// Returns raw text: every caller escapes once at the point of output.
const localized = (value: LocalizedText | undefined, language: Language): string => value?.[language] || value?.en || "";
const twoDigits = (value: number): string => String(value).padStart(2, "0");
const numberedCaption = (index: number, label: string): string => `${twoDigits(index)} / ${label}`;
// Sparse content stretches across the row instead of leaving half a page empty.
const columnsStyle = (count: number, max: number): string => `style="--pf-columns: ${Math.max(1, Math.min(max, count))}"`;
const tags = (items: string[]): string => items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
const tagList = (items: string[]): string => items.length ? `<ul class="portfolio-tags">${tags(items)}</ul>` : "";
const mediaSource = (media: PortfolioMedia | undefined, profile?: MediaCropProfile): string | null => {
  if (!media) return null;
  const crop = profile ? media.crops?.[profile] ?? (profile === "portrait" ? media.crops?.standard : undefined) : undefined;
  if (crop) return crop.publicUrl ?? (/^https?:\/\//i.test(crop.storagePath) ? crop.storagePath : assetUrl(crop.storagePath));
  return media.publicUrl ?? (/^https?:\/\//i.test(media.storagePath) ? media.storagePath : assetUrl(media.storagePath));
};
const imageMarkup = (
  media: PortfolioMedia | undefined,
  fallbackAlt: LocalizedText | undefined,
  language: Language,
  profile?: MediaCropProfile,
  className = "portfolio-project-image",
): string => {
  const source = mediaSource(media, profile);
  const crop = profile ? ` data-crop-profile="${profile}"` : "";
  if (!source) return `<div class="portfolio-image-placeholder ${className}"${crop}><span>${copy[language].imagePlaceholder}</span></div>`;
  // The frame carries the layout's sizing class and the Primary overlay (::after), so every layout is tinted alike.
  return `<span class="portfolio-media ${className}"${crop}><img src="${escapeHtml(source)}" alt="${escapeHtml(localized(media?.alt ?? fallbackAlt, language))}"></span>`;
};
const mediaCaption = (media: PortfolioMedia | undefined, language: Language, fallback: string): string =>
  escapeHtml(media?.caption ? localized(media.caption, language) || fallback : fallback);

interface PageChrome {
  displayName: string;
  footerText: string;
  pageNumber: number;
  totalPages: number;
  /** Header label naming the section; omitted pages (cover, full-color closings) render only a page number. */
  section?: string;
}
const page = (content: string, className: string, layoutId: string, chrome: PageChrome): string => {
  const pageLabel = `${twoDigits(chrome.pageNumber)} / ${twoDigits(chrome.totalPages)}`;
  const header = chrome.section === undefined ? "" : `<header class="portfolio-page-header"><strong>${escapeHtml(chrome.displayName)}</strong><span>${escapeHtml(chrome.section)}</span></header>`;
  const footer = chrome.section === undefined
    ? `<span class="portfolio-page-number">${pageLabel}</span>`
    : `<footer class="portfolio-page-footer"><span>${escapeHtml(chrome.footerText)}</span><strong>${pageLabel}</strong></footer>`;
  return `<section class="portfolio-page ${className}" data-portfolio-layout="${escapeHtml(layoutId)}">${header}${content}${footer}</section>`;
};
const projectMeta = (project: PortfolioProject, language: Language): string => [localized(project.location, language), project.role ? localized(project.role, language) : ""].filter(Boolean).join(" · ");
// Unknown content is omitted (§8.4): a project without responsibilities prints no contribution block at all.
const contributionItems = (data: PortfolioRuntimeData, project: PortfolioProject, layout: ProjectLayout) =>
  portfolioProjectResponsibilities(data, project).slice(0, portfolioContributionLimit(layout));
/** One kicker for the whole group, then numbered cards: the label is never repeated per card. */
const projectContributions = (data: PortfolioRuntimeData, project: PortfolioProject, layout: ProjectLayout, language: Language, attributes = ""): string => {
  const items = contributionItems(data, project, layout);
  return items.length ? `<p class="portfolio-kicker">${copy[language].myContribution}</p><div class="portfolio-contributions"${attributes ? ` ${attributes}` : ""}>${items.map((point, index) => `<article><span>${twoDigits(index + 1)}</span><p>${escapeHtml(localized(point.text, language))}</p></article>`).join("")}</div>` : "";
};

/** Challenge → Approach → Outcome, the project's own story (Technical and Editorial). Empty parts are left out. */
const projectStory = (project: PortfolioProject, language: Language): string => {
  const text = copy[language];
  const parts = ([[text.problem, project.challenge], [text.solution, project.approach], [text.outcome, project.outcome]] as const)
    .map(([label, value]) => [label, value ? localized(value, language) : ""] as const)
    .filter(([, value]) => value);
  return parts.length ? `<dl class="portfolio-project-story">${parts.map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>` : "";
};

/** The one image for the Split/Horizontal cover and the White closing (Appearance › Portfolio media › Cover & closing). */
export const resolvePortfolioFeatureImage = (data: PortfolioRuntimeData, selectedProjects: PortfolioProject[]): { project?: PortfolioProject; media?: PortfolioMedia } => {
  const choice = data.content.mediaAssignments.feature;
  const project = selectedProjects.find((item) => item.id === choice?.projectId) ?? selectedProjects[0];
  if (!project) return {};
  const chosen = project.id === choice?.projectId ? project.images.find((image) => image.id === choice?.mediaId) : undefined;
  return { project, media: chosen ?? resolvePortfolioMedia(project.images, data.content.mediaAssignments.projects[project.id]).primary };
};

const renderCover = (data: PortfolioRuntimeData, language: Language, selectedProjects: PortfolioProject[]): string => {
  const { content } = data;
  const displayName = profileName(content.profile.name, language);
  const { project: hero, media: heroMedia } = resolvePortfolioFeatureImage(data, selectedProjects);
  const statement = escapeHtml(localized(content.coverStatement, language));
  const highlightKicker = localized(content.coverHighlight.kicker, language);
  const highlightLines = content.coverHighlight.lines.map((line) => localized(line, language)).filter(Boolean);
  // The aside is the editor's highlight; with nothing written it is left out (§8.4).
  const highlight = highlightKicker || highlightLines.length ? `<aside>${highlightKicker ? `<span>${escapeHtml(highlightKicker)}</span>` : ""}${highlightLines.length ? `<strong>${highlightLines.map(escapeHtml).join("<br>")}</strong>` : ""}</aside>` : "";
  const identity = `<div class="portfolio-cover__identity"><strong>${escapeHtml(displayName)}</strong><span>${escapeHtml(localized(content.profile.professionalTitle, language))}</span></div>`;
  const kicker = `<p class="portfolio-kicker">${escapeHtml(localized(content.kicker, language))}</p>`;
  if (content.layouts.cover === "cover.split-image") return `<div class="portfolio-cover portfolio-cover--split"><div class="portfolio-cover__copy">${kicker}<h1>${escapeHtml(content.title)}</h1>${identity}${statement ? `<p class="portfolio-cover__statement">${statement}</p>` : ""}<p class="portfolio-cover__year">${escapeHtml(content.year)}</p></div><figure>${imageMarkup(heroMedia, hero?.name, language, "portrait", "portfolio-cover__image")}<figcaption>${hero ? escapeHtml(localized(hero.name, language)) : copy[language].imagePlaceholder}</figcaption></figure></div>`;
  if (content.layouts.cover === "cover.horizontal") return `<div class="portfolio-cover portfolio-cover--horizontal"><div class="portfolio-cover__copy">${kicker}<h1>${escapeHtml(content.title)}</h1>${identity}${statement ? `<p class="portfolio-cover__statement">${statement}</p>` : ""}</div><div class="portfolio-cover__horizontal-media">${imageMarkup(heroMedia, hero?.name, language, "wide", "portfolio-cover__image")}${highlight}</div></div>`;
  return `<div class="portfolio-cover portfolio-cover--classic"><div class="portfolio-cover__rail"></div><div class="portfolio-cover__copy">${kicker}<h1>${escapeHtml(content.title)}</h1>${identity}</div><p class="portfolio-cover__year">${escapeHtml(content.year)}</p></div>`;
};

const profilePhoto = (data: PortfolioRuntimeData, displayName: string): string => `<div class="portfolio-about__photo" data-portfolio-profile-photo-frame><span aria-hidden="true">${escapeHtml(displayName.trim().split(/\s+/).slice(0, 3).map((part) => part[0] ?? "").join("").toUpperCase() || "HDL")}</span><img src="${escapeHtml(assetUrl(data.content.profile.photoPath))}" alt="${escapeHtml(displayName)}" data-portfolio-profile-photo></div>`;

const profileFigures = (data: PortfolioRuntimeData, language: Language, selectedProjects: PortfolioProject[]): string => {
  const text = copy[language];
  const figures: Record<PortfolioProfileStat, [number, string]> = {
    projects: [selectedProjects.length, text.selectedProjects],
    tools: [data.tools.filter((tool) => tool.includeInPortfolio).length, text.automationTools],
    capabilities: [data.content.skillGroups.length, text.capabilities],
    credentials: [(data.credentials ?? []).filter((item) => item.includeInPortfolio).length, text.credentialCount],
  };
  // A figure of zero says nothing about the person, so it is left out.
  return [...new Set(data.content.profilePage.stats)].map((stat) => figures[stat]).filter(([value]) => value > 0)
    .map(([value, label]) => `<div><strong>${value}</strong><span>${label}</span></div>`).join("");
};

const renderProfile = (data: PortfolioRuntimeData, language: Language, selectedProjects: PortfolioProject[]): string => {
  const { content } = data;
  const { profile, skillGroups } = content;
  const displayName = profileName(profile.name, language);
  const cardGroups = portfolioCapabilityGroups(data);
  const capabilityCards = cardGroups.map((group, index) => `<article><span>${twoDigits(index + 1)}</span><strong>${escapeHtml(localized(group.title, language))}</strong><p>${group.items.slice(0, PORTFOLIO_PROFILE_CARD_ITEMS).map((item) => escapeHtml(localized(item.label, language))).join(" · ")}</p></article>`).join("");
  if (content.layouts.profile === "profile.portrait") return `<div class="portfolio-profile portfolio-profile--portrait"><aside>${profilePhoto(data, displayName)}<h2>${escapeHtml(displayName)}</h2><strong>${escapeHtml(localized(profile.professionalTitle, language))}</strong></aside><main><p class="portfolio-kicker">${escapeHtml(localized(content.aboutKicker, language))}</p><h2>${escapeHtml(localized(content.aboutHeading, language))}</h2><p class="portfolio-lead">${escapeHtml(localized(profile.summary, language))}</p>${(() => { const figures = profileFigures(data, language, selectedProjects); return figures ? `<div class="portfolio-profile__stats">${figures}</div>` : ""; })()}<address><a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)}</a><span>${escapeHtml(profile.phone)} · ${escapeHtml(localized(profile.location, language))}</span></address><div class="portfolio-profile__cards" ${columnsStyle(cardGroups.length, 3)}>${capabilityCards}</div></main></div>`;
  if (content.layouts.profile === "profile.capability") return `<div class="portfolio-profile portfolio-profile--capability"><main><p class="portfolio-kicker">${escapeHtml(localized(content.aboutKicker, language))}</p><h2>${escapeHtml(localized(content.aboutHeading, language))}</h2><p class="portfolio-lead">${escapeHtml(localized(profile.summary, language))}</p><div class="portfolio-profile__capabilities">${capabilityCards}</div></main><aside>${profilePhoto(data, displayName)}<h2>${escapeHtml(displayName)}</h2><p>${escapeHtml(localized(profile.professionalTitle, language))}</p><address><a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)}</a><strong>${escapeHtml(profile.phone)}</strong><span>${escapeHtml(localized(profile.location, language))}</span></address></aside></div>`;
  return `<div class="portfolio-profile portfolio-profile--classic"><aside>${profilePhoto(data, displayName)}<h2>${escapeHtml(displayName)}</h2><p>${escapeHtml(localized(profile.professionalTitle, language))}</p><address><a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)}</a><span>${escapeHtml(profile.phone)}</span><span>${escapeHtml(localized(profile.location, language))}</span></address></aside><main><p class="portfolio-kicker">${escapeHtml(localized(content.aboutKicker, language))}</p><h2>${escapeHtml(localized(content.aboutHeading, language))}</h2><p class="portfolio-lead">${escapeHtml(localized(profile.summary, language))}</p><div class="portfolio-skill-grid">${skillGroups.map((group) => `<section><h3>${escapeHtml(localized(group.title, language))}</h3>${tagList(group.items.map((item) => localized(item.label, language)))}</section>`).join("")}</div></main></div>`;
};

const renderIndex = (data: PortfolioRuntimeData, language: Language, projects: PortfolioProject[]): string => {
  const title = `<p class="portfolio-kicker">${copy[language].selectedWork} / ${twoDigits(projects.length)} ${copy[language].projectsUnit}</p><h2 class="portfolio-title">${copy[language].projectIndex}</h2>`;
  if (!projects.length) return `<div class="portfolio-page__inner">${title}<p class="portfolio-empty">${copy[language].noProjects}</p></div>`;
  if (data.content.layouts.index === "index.visual") return `<div class="portfolio-page__inner portfolio-index-page portfolio-index-page--visual">${title}<div class="portfolio-index-visual${projects.length > 8 ? " is-dense" : ""}">${projects.map((project, index) => {
    const media = resolvePortfolioMedia(project.images, data.content.mediaAssignments.projects[project.id]).primary;
    return `<article><div>${imageMarkup(media, project.name, language, "wide", "portfolio-index__image")}<span>${twoDigits(index + 1)}</span></div><h3>${escapeHtml(localized(project.name, language))}</h3><p>${escapeHtml(projectMeta(project, language))}</p></article>`;
  }).join("")}</div></div>`;
  if (data.content.layouts.index === "index.editorial") return `<div class="portfolio-index-editorial"><aside><p class="portfolio-kicker">${copy[language].selectedWork}</p><h2>${copy[language].projectIndex}</h2><strong>${twoDigits(projects.length)}</strong><span>${copy[language].selectedProjects}</span></aside><ol>${projects.map((project, index) => `<li><span>${twoDigits(index + 1)}</span><div><strong>${escapeHtml(localized(project.name, language))}</strong><small>${escapeHtml(projectMeta(project, language))}</small></div></li>`).join("")}</ol></div>`;
  return `<div class="portfolio-page__inner portfolio-index-page">${title}<ol class="portfolio-index">${projects.map((project, index) => `<li><span>${twoDigits(index + 1)}</span><div><strong>${escapeHtml(localized(project.name, language))}</strong><small>${escapeHtml(projectMeta(project, language))}</small></div></li>`).join("")}</ol></div>`;
};

const projectHeading = (project: PortfolioProject, language: Language, index: number): string => `<div class="portfolio-project-heading"><p class="portfolio-kicker">${[twoDigits(index + 1), escapeHtml(localized(project.location, language))].filter(Boolean).join(" / ")}</p><h2>${escapeHtml(localized(project.name, language))}</h2>${project.role ? `<strong>${escapeHtml(localized(project.role, language))}</strong>` : ""}</div>`;
const renderProject = (data: PortfolioRuntimeData, project: PortfolioProject, language: Language, index: number): { html: string; layout: ProjectLayout } => {
  const layout = resolveProjectLayout(data, project.id, project.portfolioLayout);
  const text = copy[language];
  const summary = escapeHtml(project.summary ? localized(project.summary, language) : "");
  const summaryBlock = (className = ""): string => summary ? `<p${className ? ` class="${className}"` : ""}>${summary}</p>` : "";
  const media = resolvePortfolioMedia(project.images, data.content.mediaAssignments.projects[project.id]);
  // Unknown facts are omitted rather than printed as a dash.
  const keyFacts = (project.keyFacts ?? []).filter((fact) => fact.value.en && fact.label.en);
  const factItems = keyFacts.length
    ? keyFacts.map((fact) => `<div><strong>${escapeHtml(localized(fact.value, language))}</strong><span>${escapeHtml(localized(fact.label, language))}</span></div>`).join("")
    : [
      project.year ? `<div><strong>${escapeHtml(String(project.year))}</strong><span>${text.year}</span></div>` : "",
      project.technologies.length ? `<div><strong>${project.technologies.length}</strong><span>${text.tools}</span></div>` : "",
    ].filter(Boolean).join("");
  const facts = (withSummary: boolean): string => factItems || (withSummary && summary) ? `<div class="portfolio-project-facts">${factItems}${withSummary ? summaryBlock() : ""}</div>` : "";
  const projectTags = tagList(project.technologies);
  // Technical and Editorial print Challenge → Approach → Outcome in place of the summary when the Portfolio opts in
  // (Appearance › Project pages); a project without any of the three still prints its summary.
  const story = data.content.projectText === "story" && (layout === "project.technical" || layout === "project.editorial") ? projectStory(project, language) : "";
  const caption = (slot: PortfolioMedia | undefined, position: number, label: string): string => mediaCaption(slot, language, numberedCaption(position, label));
  if (layout === "project.balanced") return { layout, html: `<div class="portfolio-project portfolio-project--balanced">${projectHeading(project, language, index)}<div class="portfolio-project__balanced-grid"><div><figure>${imageMarkup(media.primary, project.name, language, "wide")}<figcaption>${caption(media.primary, 1, text.captionOverview)}</figcaption></figure>${facts(true)}</div><aside>${projectContributions(data, project, layout, language)}${projectTags}</aside></div></div>` };
  if (layout === "project.editorial") return { layout, html: `<div class="portfolio-project portfolio-project--editorial"><section>${projectHeading(project, language, index)}<figure>${imageMarkup(media.primary, project.name, language, "landscape")}<figcaption>${caption(media.primary, 1, text.captionOverview)}</figcaption></figure></section><aside>${story || summaryBlock("portfolio-project__summary")}${facts(false)}${contributionItems(data, project, layout).map((point) => `<div class="portfolio-project__editorial-note"><p class="portfolio-kicker">${text.contribution}</p><p>${escapeHtml(localized(point.text, language))}</p></div>`).join("")}<figure>${imageMarkup(media.supporting, project.name, language, "wide")}<figcaption>${caption(media.supporting, 2, text.captionSupporting)}</figcaption></figure>${projectTags}</aside></div>` };
  if (layout === "project.technical") return { layout, html: `<div class="portfolio-project portfolio-project--technical"><aside>${projectHeading(project, language, index)}${facts(false)}${story || summaryBlock()}</aside><main><figure>${imageMarkup(media.primary, project.name, language, "wide")}<figcaption>${caption(media.primary, 1, text.captionOverview)}</figcaption></figure><div class="portfolio-project__technical-detail"><figure>${imageMarkup(media.supporting, project.name, language, "wide")}<figcaption>${caption(media.supporting, 2, text.captionSupporting)}</figcaption></figure><div>${projectContributions(data, project, layout, language)}</div></div>${projectTags}</main></div>` };
  if (layout === "project.portrait") return { layout, html: `<div class="portfolio-project portfolio-project--portrait"><figure>${imageMarkup(media.primary, project.name, language, "portrait")}<figcaption>${caption(media.primary, 1, text.captionOverview)}</figcaption></figure><main>${projectHeading(project, language, index)}${summaryBlock("portfolio-project__summary")}${projectContributions(data, project, layout, language)}${projectTags}</main></div>` };
  if (layout === "project.evidence") return { layout, html: `<div class="portfolio-project portfolio-project--evidence">${projectHeading(project, language, index)}<div class="portfolio-project__evidence-images"><figure>${imageMarkup(media.primary, project.name, language, "wide")}<figcaption>${caption(media.primary, 1, text.captionOverview)}</figcaption></figure><figure>${imageMarkup(media.supporting, project.name, language, "landscape")}<figcaption>${caption(media.supporting, 2, text.captionEvidence)}</figcaption></figure></div>${projectContributions(data, project, layout, language, columnsStyle(contributionItems(data, project, layout).length, 3))}</div>` };
  return { layout, html: `<div class="portfolio-project portfolio-project--classic"><div class="portfolio-project__visual" data-pf-bleed>${imageMarkup(media.primary, project.name, language, "portrait")}</div><div class="portfolio-project__content">${projectHeading(project, language, index)}${summaryBlock("portfolio-project__summary")}${contributionItems(data, project, layout).length ? `<ul class="portfolio-responsibilities">${contributionItems(data, project, layout).map((point) => `<li>${escapeHtml(localized(point.text, language))}</li>`).join("")}</ul>` : ""}${projectTags}</div></div>` };
};

const renderClassicAutomation = (data: PortfolioRuntimeData, tools: PortfolioTool[], language: Language): string => `<div class="portfolio-page__inner portfolio-automation portfolio-automation--classic"><p class="portfolio-kicker">${copy[language].selectedAutomation}</p><h2 class="portfolio-title">${escapeHtml(localized(data.content.automationStatement, language))}</h2><div class="portfolio-tools${tools.length === 1 ? " is-single" : ""}" ${columnsStyle(tools.length, 3)}>${tools.map((tool, index) => `<article><span>${copy[language].automation} ${twoDigits(index + 1)}</span><h3>${escapeHtml(tool.name)}</h3><p><strong>${copy[language].problem}</strong>${escapeHtml(localized(tool.problem, language))}</p><p><strong>${copy[language].solution}</strong>${escapeHtml(localized(tool.solution, language))}</p>${tagList(tool.technologies)}</article>`).join("")}</div></div>`;
const renderAutomation = (data: PortfolioRuntimeData, tool: PortfolioTool, layout: AutomationLayout, language: Language, index: number): string => {
  const text = copy[language];
  const benefit = tool.benefit ? localized(tool.benefit, language) : "";
  const media = resolvePortfolioMedia(tool.images, data.content.mediaAssignments.tools[tool.id]);
  const toolName: LocalizedText = { en: tool.name, vi: tool.name };
  const statement = escapeHtml(localized(data.content.automationStatement, language));
  const heading = (): string => `<p class="portfolio-kicker">${text.selectedAutomation} / ${twoDigits(index + 1)}</p><h2>${escapeHtml(tool.name)}</h2>${statement ? `<p class="portfolio-automation__subtitle">${statement}</p>` : ""}`;
  if (layout === "automation.input-geometry") {
    return `<div class="portfolio-automation portfolio-automation--geometry">${heading()}<div class="portfolio-automation__geometry-grid"><section><p class="portfolio-kicker">${text.builtWith}</p>${tagList(tool.technologies)}<div class="portfolio-automation__brief"><p><strong>${text.problem}</strong>${escapeHtml(localized(tool.problem, language))}</p><p><strong>${text.solution}</strong>${escapeHtml(localized(tool.solution, language))}</p></div></section><div class="portfolio-automation__media-pair"><figure>${imageMarkup(media.primary, toolName, language, "landscape", "portfolio-automation__image")}<figcaption>${mediaCaption(media.primary, language, numberedCaption(1, text.captionToolInput))}</figcaption></figure><figure>${imageMarkup(media.supporting, toolName, language, "landscape", "portfolio-automation__image")}<figcaption>${mediaCaption(media.supporting, language, numberedCaption(2, text.captionToolGenerated))}</figcaption></figure></div></div></div>`;
  }
  // Only real content: the tool's Workflow steps, then its benefit as the Outcome. Nothing is invented.
  const steps = [
    ...(tool.workflowSteps ?? []).filter((step) => step.label.en && step.text.en).map((step) => [localized(step.label, language), localized(step.text, language)]),
    [text.outcome, benefit],
  ].filter(([, value]) => value);
  const numbered = steps.length > 1;
  const workflow = steps.length ? `${numbered ? `<p class="portfolio-kicker">${text.workflow}</p>` : ""}<ol class="portfolio-workflow-steps">${steps.map(([label, value], stepIndex) => `<li${label === text.outcome && stepIndex === steps.length - 1 && benefit ? ' class="is-outcome"' : ""}><span>${numbered ? `${twoDigits(stepIndex + 1)} / ` : ""}${label}</span><strong>${escapeHtml(value)}</strong></li>`).join("")}</ol>` : "";
  return `<div class="portfolio-automation portfolio-automation--workflow">${heading()}<div class="portfolio-automation__workflow-grid"><aside><section><p class="portfolio-kicker">${text.problem}</p><p>${escapeHtml(localized(tool.problem, language))}</p></section><section><p class="portfolio-kicker">${text.solution}</p><p>${escapeHtml(localized(tool.solution, language))}</p></section>${tagList(tool.technologies)}</aside><main><figure class="portfolio-automation__visual">${imageMarkup(media.primary, toolName, language, "wide", "portfolio-automation__image")}<figcaption>${mediaCaption(media.primary, language, text.captionToolOutput)}</figcaption></figure>${workflow}</main></div></div>`;
};

const credentialTitle = (credential: PortfolioCredential | undefined, language: Language): string => credential ? localized(credential.title, language) : copy[language].documentPlaceholder;
const credentialMeta = (credential: PortfolioCredential | undefined, language: Language): string => credential ? [localized(credential.issuer, language), credential.issuedOn?.slice(0, 4)].filter(Boolean).join(" · ") : copy[language].contentPending;
const credentialKind = (kind: CredentialKind, language: Language): string => copy[language].credentialKinds[kind] ?? copy[language].credentialKinds.other;
const renderCredentials = (language: Language, credentialPage: PortfolioCredentialPage, pageIndex: number, pageTotal: number): string => {
  // Placeholders only stand in for an empty selection; a short page keeps its real items.
  const credentials: Array<PortfolioCredential | undefined> = credentialPage.credentials.length ? credentialPage.credentials : Array<undefined>(PORTFOLIO_CREDENTIALS_PER_PAGE).fill(undefined);
  const firstNumber = credentialPage.firstIndex + 1;
  const kicker = `${copy[language].credentialsSubtitle}${pageTotal > 1 ? ` · ${pageIndex + 1} / ${pageTotal}` : ""}`;
  const title = (credential: PortfolioCredential | undefined): string => `<h3 class="portfolio-credential__title">${escapeHtml(credentialTitle(credential, language))}</h3>`;
  // The shown evidence crop at its own ratio, so it prints exactly as cropped; never tinted by the image overlay.
  const documentFrame = (credential: PortfolioCredential | undefined): string => {
    const preview = credential?.preview;
    if (!preview) return `<div class="portfolio-document-frame portfolio-document-placeholder"><span>${copy[language].documentPlaceholder}</span></div>`;
    const source = preview.publicUrl || (/^https?:\/\//i.test(preview.storagePath) ? preview.storagePath : assetUrl(preview.storagePath));
    // The slot keeps the layout's document area; the page inside takes the crop's own ratio (never re-cropped).
    return `<div class="portfolio-document-frame portfolio-document-slot"><span class="portfolio-document-preview" data-crop-profile="${preview.profile}" data-portfolio-credential-preview><img src="${escapeHtml(source)}" alt="${escapeHtml(credentialTitle(credential, language))}"></span></div>`;
  };
  if (credentialPage.layout === "credentials.dual") return `<div class="portfolio-credentials portfolio-credentials--dual"><p class="portfolio-kicker">${kicker}</p><h2>${copy[language].credentials}</h2><div>${credentials.map((credential, index) => `<article><header><span>${twoDigits(firstNumber + index)}</span>${title(credential)}</header>${documentFrame(credential)}<p>${escapeHtml(credentialMeta(credential, language))}</p></article>`).join("")}</div></div>`;
  return `<div class="portfolio-credentials portfolio-credentials--bands"><p class="portfolio-kicker">${kicker}</p><h2>${copy[language].credentials}</h2><div>${credentials.map((credential, index) => `<article>${documentFrame(credential)}<section><p class="portfolio-kicker">${twoDigits(firstNumber + index)}${credential ? ` / ${escapeHtml(credentialKind(credential.kind, language))}` : ""}</p>${title(credential)}<p>${escapeHtml(credentialMeta(credential, language))}</p>${credential?.description && localized(credential.description, language) ? `<small>${escapeHtml(localized(credential.description, language))}</small>` : ""}</section></article>`).join("")}</div></div>`;
};

const renderClosing = (data: PortfolioRuntimeData, language: Language, projects: PortfolioProject[]): string => {
  const { content } = data;
  const { profile } = content;
  const text = copy[language];
  const displayName = profileName(profile.name, language);
  // The closing kicker is the editable "Thank you" line; layouts with a display headline use it as that headline.
  const thankYou = escapeHtml(localized(content.closingKicker, language));
  if (content.layouts.closing === "closing.blue") return `<div class="portfolio-closing portfolio-closing--blue"><h2>${thankYou}</h2><strong>${escapeHtml(localized(content.closingHeading, language))}</strong><p>${escapeHtml(localized(content.closingText, language))}</p><address><div><span>${text.email}</span><a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)}</a></div><div><span>${text.phone}</span><strong>${escapeHtml(profile.phone)}</strong></div><div><span>${text.location}</span><strong>${escapeHtml(localized(profile.location, language))}</strong></div></address></div>`;
  if (content.layouts.closing === "closing.white") {
    const { project: hero, media } = resolvePortfolioFeatureImage(data, projects);
    return `<div class="portfolio-closing portfolio-closing--white"><main><h2>${thankYou}</h2><strong>${escapeHtml(localized(content.closingHeading, language))}</strong><h3>${escapeHtml(displayName)}</h3><p>${escapeHtml(localized(profile.professionalTitle, language))}</p></main><aside><p class="portfolio-kicker">${text.connect}</p><span>${text.email}</span><a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)}</a><span>${text.phone}</span><strong>${escapeHtml(profile.phone)}</strong><span>${text.location}</span><strong>${escapeHtml(localized(profile.location, language))}</strong></aside><figure>${imageMarkup(media, hero?.name, language, "wide", "portfolio-closing__image")}<figcaption>${mediaCaption(media, language, text.captionClosing)}</figcaption></figure></div>`;
  }
  return `<div class="portfolio-closing portfolio-closing--classic"><p class="portfolio-kicker">${thankYou}</p><h2>${escapeHtml(localized(content.closingHeading, language))}</h2><p>${escapeHtml(localized(content.closingText, language))}</p><div><a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)}</a><span>${escapeHtml(profile.phone)}</span></div></div>`;
};

export const renderPortfolio = (data: PortfolioRuntimeData, language: Language = "en"): string => {
  const text = copy[language];
  const selectedProjects = data.projects.filter((project) => project.includeInPortfolio).sort((a, b) => a.portfolioOrder - b.portfolioOrder);
  const selectedTools = data.tools.filter((tool) => tool.includeInPortfolio).sort((a, b) => a.portfolioOrder - b.portfolioOrder);
  const layouts = data.content.layouts;
  const totalPages = portfolioPageCount(data);
  const displayName = profileName(data.content.profile.name, language);
  const footerText = localized(data.content.footerText, language);
  let pageNumber = 0;
  const numbered = (content: string, family: string, layoutId: string, section?: string): string => {
    pageNumber += 1;
    return page(content, `portfolio-page--${family} portfolio-page--${layoutId.replace(".", "-")}`, layoutId, { displayName, footerText, pageNumber, totalPages, section });
  };
  const pages: string[] = [
    numbered(renderCover(data, language, selectedProjects), "cover", layouts.cover),
    numbered(renderProfile(data, language, selectedProjects), "profile", layouts.profile, text.profile),
    numbered(renderIndex(data, language, selectedProjects), "index", layouts.index, text.projectIndex),
  ];
  selectedProjects.forEach((project, index) => {
    const rendered = renderProject(data, project, language, index);
    pages.push(numbered(rendered.html, "project", String(rendered.layout), text.selectedWork));
  });
  const classicTools = selectedTools.filter((tool) => resolveAutomationLayout(data, tool.id) === "automation.classic");
  if (classicTools.length) pages.push(numbered(renderClassicAutomation(data, classicTools, language), "automation", "automation.classic", text.selectedAutomation));
  selectedTools.filter((tool) => resolveAutomationLayout(data, tool.id) !== "automation.classic").forEach((tool, index) => {
    const layout = resolveAutomationLayout(data, tool.id);
    pages.push(numbered(renderAutomation(data, tool, layout, language, index), "automation", layout, text.selectedAutomation));
  });
  const credentialPages = portfolioCredentialPages(data);
  credentialPages.forEach((credentialPage, pageIndex) => {
    pages.push(numbered(renderCredentials(language, credentialPage, pageIndex, credentialPages.length), "credentials", credentialPage.layout, text.credentials));
  });
  pages.push(numbered(renderClosing(data, language, selectedProjects), "closing", layouts.closing, layouts.closing === "closing.white" ? text.connect : undefined));
  return pages.join("");
};
