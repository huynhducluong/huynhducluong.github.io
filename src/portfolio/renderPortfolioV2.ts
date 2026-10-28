import { assetUrl, escapeHtml, profileName, type Language } from "../shared/format";
import type { LocalizedText } from "../types/career";
import type { CredentialKind } from "../types/credential";
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
import { PORTFOLIO_CREDENTIALS_PER_PAGE, portfolioCredentialPages, portfolioPageCount, resolveAutomationLayout, resolveProjectLayout } from "./layouts";
import { resolvePortfolioMedia } from "./mediaSlots";

// Every visible string lives here so the Vietnamese PDF never falls back to English chrome.
const copy = {
  en: {
    profile: "Professional profile", selectedWork: "Selected work", projectIndex: "Project index", projectsUnit: "projects",
    noProjects: "No published projects have been selected for the Portfolio PDF.", imagePlaceholder: "Project image placeholder",
    projectFallback: "Project details will be updated after verification.", locationFallback: "Selected infrastructure",
    selectedAutomation: "Selected BIM automation", toolsTitle: "Tools built around real delivery constraints.", automation: "Automation",
    problem: "The challenge", solution: "The approach", outcome: "Outcome", contribution: "Selected contribution", myContribution: "My contribution",
    credentials: "Education & credentials", credentialsSubtitle: "Selected supporting documents", documentPlaceholder: "Document preview placeholder",
    contentPending: "Content to be supplied", connect: "Let’s connect", email: "Email", phone: "Phone", location: "Location",
    year: "Year", tools: "Tools", selectedProjects: "Selected projects", capabilities: "Capabilities",
    captionOverview: "Coordinated model overview", captionSupporting: "Supporting detail", captionEvidence: "Supporting evidence",
    captionToolOutput: "Tool workflow or output", captionToolInput: "Tool input or interface", captionToolGenerated: "Generated geometry or output",
    captionClosing: "Selected infrastructure BIM model",
    coverAsideKicker: "Infrastructure BIM", coverAsideLines: ["Model coordination.", "Quality control.", "Practical automation."],
    builtWith: "Built with", geometrySubtitle: "From engineering inputs to a repeatable BIM output.", workflow: "Workflow",
    stepInput: "Input", stepInputValue: "Project information", stepParameters: "Parameters", stepParametersFallback: "Parameters to be defined",
    stepGeneration: "Generation", stepGenerationValue: "Automated model generation",
    credentialKinds: {
      professional_certification: "Professional certification", academic_degree: "Academic degree", language_exam: "Language exam",
      license: "License", course: "Course", award: "Award", membership: "Membership", other: "Credential",
    },
  },
  vi: {
    profile: "Hồ sơ chuyên môn", selectedWork: "Dự án tiêu biểu", projectIndex: "Danh mục dự án", projectsUnit: "dự án",
    noProjects: "Chưa có dự án đã xuất bản nào được chọn cho Portfolio PDF.", imagePlaceholder: "Vị trí hình ảnh dự án",
    projectFallback: "Thông tin dự án sẽ được cập nhật sau khi xác minh.", locationFallback: "Hạ tầng tiêu biểu",
    selectedAutomation: "Tự động hóa BIM tiêu biểu", toolsTitle: "Các công cụ được xây dựng từ yêu cầu triển khai thực tế.", automation: "Tự động hóa",
    problem: "Thách thức", solution: "Giải pháp", outcome: "Kết quả", contribution: "Đóng góp tiêu biểu", myContribution: "Đóng góp của tôi",
    credentials: "Học vấn & chứng chỉ", credentialsSubtitle: "Tài liệu minh chứng đã chọn", documentPlaceholder: "Vị trí tài liệu minh chứng",
    contentPending: "Nội dung sẽ được bổ sung", connect: "Kết nối", email: "Email", phone: "Điện thoại", location: "Địa điểm",
    year: "Năm", tools: "Công cụ", selectedProjects: "Dự án đã chọn", capabilities: "Năng lực",
    captionOverview: "Tổng quan mô hình phối hợp", captionSupporting: "Chi tiết bổ trợ", captionEvidence: "Minh chứng bổ trợ",
    captionToolOutput: "Quy trình hoặc kết quả của công cụ", captionToolInput: "Dữ liệu đầu vào hoặc giao diện công cụ", captionToolGenerated: "Hình học hoặc kết quả được tạo",
    captionClosing: "Mô hình BIM hạ tầng tiêu biểu",
    coverAsideKicker: "BIM hạ tầng", coverAsideLines: ["Điều phối mô hình.", "Kiểm soát chất lượng.", "Tự động hóa thực tiễn."],
    builtWith: "Công nghệ sử dụng", geometrySubtitle: "Từ dữ liệu kỹ thuật đến kết quả BIM có thể lặp lại.", workflow: "Quy trình",
    stepInput: "Đầu vào", stepInputValue: "Thông tin dự án", stepParameters: "Tham số", stepParametersFallback: "Tham số sẽ được bổ sung",
    stepGeneration: "Tạo mô hình", stepGenerationValue: "Tự động tạo mô hình",
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
  if (!source) return `<div class="portfolio-image-placeholder ${className}"><span>${copy[language].imagePlaceholder}</span></div>`;
  return `<img class="${className}" src="${escapeHtml(source)}" alt="${escapeHtml(localized(media?.alt ?? fallbackAlt, language))}">`;
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
const contributionItems = (project: PortfolioProject): Array<{ text: LocalizedText }> => {
  const items = project.responsibilities.slice(0, 3);
  return items.length ? items : [{ text: { en: copy.en.projectFallback, vi: copy.vi.projectFallback } }];
};
const projectContributionCards = (project: PortfolioProject, language: Language): string => contributionItems(project)
  .map((point, index) => `<article><span>${twoDigits(index + 1)}</span><div><strong>${copy[language].contribution}</strong><p>${escapeHtml(localized(point.text, language))}</p></div></article>`).join("");

const renderCover = (data: PortfolioRuntimeData, language: Language, selectedProjects: PortfolioProject[]): string => {
  const { content } = data;
  const displayName = profileName(content.profile.name, language);
  const hero = selectedProjects[0];
  const heroMedia = hero ? resolvePortfolioMedia(hero.images, content.mediaAssignments.projects[hero.id]).primary : undefined;
  const identity = `<div class="portfolio-cover__identity"><strong>${escapeHtml(displayName)}</strong><span>${escapeHtml(localized(content.profile.professionalTitle, language))}</span></div>`;
  const kicker = `<p class="portfolio-kicker">${escapeHtml(localized(content.kicker, language))}</p>`;
  if (content.layouts.cover === "cover.split-image") return `<div class="portfolio-cover portfolio-cover--split"><div class="portfolio-cover__copy">${kicker}<h1>${escapeHtml(content.title)}</h1>${identity}<p class="portfolio-cover__statement">${escapeHtml(localized(content.aboutHeading, language))}</p><p class="portfolio-cover__year">${escapeHtml(content.year)}</p></div><figure>${imageMarkup(heroMedia, hero?.name, language, "portrait", "portfolio-cover__image")}<figcaption>${hero ? escapeHtml(localized(hero.name, language)) : copy[language].imagePlaceholder}</figcaption></figure></div>`;
  if (content.layouts.cover === "cover.horizontal") return `<div class="portfolio-cover portfolio-cover--horizontal"><div class="portfolio-cover__copy">${kicker}<h1>${escapeHtml(content.title)}</h1>${identity}<p class="portfolio-cover__statement">${escapeHtml(localized(content.aboutHeading, language))}</p></div><div class="portfolio-cover__horizontal-media">${imageMarkup(heroMedia, hero?.name, language, "wide", "portfolio-cover__image")}<aside><span>${copy[language].coverAsideKicker}</span><strong>${copy[language].coverAsideLines.join("<br>")}</strong></aside></div></div>`;
  return `<div class="portfolio-cover portfolio-cover--classic"><div class="portfolio-cover__rail"></div><div class="portfolio-cover__copy">${kicker}<h1>${escapeHtml(content.title)}</h1>${identity}</div><p class="portfolio-cover__year">${escapeHtml(content.year)}</p></div>`;
};

const profilePhoto = (data: PortfolioRuntimeData, displayName: string): string => `<div class="portfolio-about__photo" data-portfolio-profile-photo-frame><span aria-hidden="true">${escapeHtml(displayName.trim().split(/\s+/).slice(0, 3).map((part) => part[0] ?? "").join("").toUpperCase() || "HDL")}</span><img src="${escapeHtml(assetUrl(data.content.profile.photoPath))}" alt="${escapeHtml(displayName)}" data-portfolio-profile-photo></div>`;
const renderProfile = (data: PortfolioRuntimeData, language: Language, selectedProjects: PortfolioProject[]): string => {
  const { content } = data;
  const { profile, skillGroups } = content;
  const displayName = profileName(profile.name, language);
  const cardGroups = skillGroups.slice(0, 3);
  const capabilityCards = cardGroups.map((group, index) => `<article><span>${twoDigits(index + 1)}</span><strong>${escapeHtml(localized(group.title, language))}</strong><p>${group.items.slice(0, 4).map((item) => escapeHtml(localized(item.label, language))).join(" · ")}</p></article>`).join("");
  if (content.layouts.profile === "profile.portrait") return `<div class="portfolio-profile portfolio-profile--portrait"><aside>${profilePhoto(data, displayName)}<h2>${escapeHtml(displayName)}</h2><strong>${escapeHtml(localized(profile.professionalTitle, language))}</strong></aside><main><p class="portfolio-kicker">${copy[language].profile}</p><h2>${escapeHtml(localized(content.aboutHeading, language))}</h2><p class="portfolio-lead">${escapeHtml(localized(profile.summary, language))}</p><div class="portfolio-profile__stats"><div><strong>${selectedProjects.length}</strong><span>${copy[language].selectedProjects}</span></div><div><strong>${skillGroups.length}</strong><span>${copy[language].capabilities}</span></div></div><address><a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)}</a><span>${escapeHtml(profile.phone)} · ${escapeHtml(localized(profile.location, language))}</span></address><div class="portfolio-profile__cards" ${columnsStyle(cardGroups.length, 3)}>${capabilityCards}</div></main></div>`;
  if (content.layouts.profile === "profile.capability") return `<div class="portfolio-profile portfolio-profile--capability"><main><p class="portfolio-kicker">${escapeHtml(localized(content.aboutKicker, language))}</p><h2>${escapeHtml(localized(content.aboutHeading, language))}</h2><p class="portfolio-lead">${escapeHtml(localized(profile.summary, language))}</p><div class="portfolio-profile__capabilities">${capabilityCards}</div></main><aside>${profilePhoto(data, displayName)}<h2>${escapeHtml(displayName)}</h2><p>${escapeHtml(localized(profile.professionalTitle, language))}</p><address><a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)}</a><strong>${escapeHtml(profile.phone)}</strong><span>${escapeHtml(localized(profile.location, language))}</span></address></aside></div>`;
  return `<div class="portfolio-profile portfolio-profile--classic"><aside>${profilePhoto(data, displayName)}<p class="portfolio-kicker">${copy[language].profile}</p><h2>${escapeHtml(displayName)}</h2><p>${escapeHtml(localized(profile.professionalTitle, language))}</p><address><a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)}</a><span>${escapeHtml(profile.phone)}</span><span>${escapeHtml(localized(profile.location, language))}</span></address></aside><main><p class="portfolio-kicker">${escapeHtml(localized(content.aboutKicker, language))}</p><h2>${escapeHtml(localized(content.aboutHeading, language))}</h2><p class="portfolio-lead">${escapeHtml(localized(profile.summary, language))}</p><div class="portfolio-skill-grid">${skillGroups.map((group) => `<section><h3>${escapeHtml(localized(group.title, language))}</h3>${tagList(group.items.map((item) => localized(item.label, language)))}</section>`).join("")}</div></main></div>`;
};

const renderIndex = (data: PortfolioRuntimeData, language: Language, projects: PortfolioProject[]): string => {
  const title = `<p class="portfolio-kicker">${copy[language].selectedWork} / ${twoDigits(projects.length)} ${copy[language].projectsUnit}</p><h2 class="portfolio-title">${copy[language].projectIndex}</h2>`;
  if (!projects.length) return `<div class="portfolio-page__inner">${title}<p class="portfolio-empty">${copy[language].noProjects}</p></div>`;
  if (data.content.layouts.index === "index.visual") return `<div class="portfolio-page__inner portfolio-index-page portfolio-index-page--visual">${title}<div class="portfolio-index-visual${projects.length > 8 ? " is-dense" : ""}">${projects.map((project, index) => {
    const media = resolvePortfolioMedia(project.images, data.content.mediaAssignments.projects[project.id]).primary;
    return `<article><div>${imageMarkup(media, project.name, language, "landscape", "portfolio-index__image")}<span>${twoDigits(index + 1)}</span></div><h3>${escapeHtml(localized(project.name, language))}</h3><p>${escapeHtml(projectMeta(project, language))}</p></article>`;
  }).join("")}</div></div>`;
  if (data.content.layouts.index === "index.editorial") return `<div class="portfolio-index-editorial"><aside><p class="portfolio-kicker">${copy[language].selectedWork}</p><h2>${copy[language].projectIndex}</h2><strong>${twoDigits(projects.length)}</strong><span>${copy[language].selectedProjects}</span></aside><ol>${projects.map((project, index) => `<li><span>${twoDigits(index + 1)}</span><div><strong>${escapeHtml(localized(project.name, language))}</strong><small>${escapeHtml(projectMeta(project, language))}</small></div></li>`).join("")}</ol></div>`;
  return `<div class="portfolio-page__inner portfolio-index-page">${title}<ol class="portfolio-index">${projects.map((project, index) => `<li><span>${twoDigits(index + 1)}</span><div><strong>${escapeHtml(localized(project.name, language))}</strong><small>${escapeHtml(projectMeta(project, language))}</small></div></li>`).join("")}</ol></div>`;
};

const projectHeading = (project: PortfolioProject, language: Language, index: number): string => `<div class="portfolio-project-heading"><p class="portfolio-kicker">${twoDigits(index + 1)} / ${escapeHtml(localized(project.location, language) || copy[language].locationFallback)}</p><h2>${escapeHtml(localized(project.name, language))}</h2>${project.role ? `<strong>${escapeHtml(localized(project.role, language))}</strong>` : ""}</div>`;
const renderProject = (data: PortfolioRuntimeData, project: PortfolioProject, language: Language, index: number): { html: string; layout: ProjectLayout } => {
  const layout = resolveProjectLayout(data, project.id, project.portfolioLayout);
  const text = copy[language];
  const summary = escapeHtml(project.summary ? localized(project.summary, language) : text.projectFallback);
  const media = resolvePortfolioMedia(project.images, data.content.mediaAssignments.projects[project.id]);
  // Unknown facts are omitted rather than printed as a dash.
  const factItems = [
    project.year ? `<div><strong>${escapeHtml(String(project.year))}</strong><span>${text.year}</span></div>` : "",
    project.technologies.length ? `<div><strong>${project.technologies.length}</strong><span>${text.tools}</span></div>` : "",
  ].filter(Boolean).join("");
  const facts = (withSummary: boolean): string => factItems || withSummary ? `<div class="portfolio-project-facts">${factItems}${withSummary ? `<p>${summary}</p>` : ""}</div>` : "";
  const projectTags = tagList(project.technologies);
  const caption = (slot: PortfolioMedia | undefined, position: number, label: string): string => mediaCaption(slot, language, numberedCaption(position, label));
  if (layout === "project.balanced") return { layout, html: `<div class="portfolio-project portfolio-project--balanced">${projectHeading(project, language, index)}<div class="portfolio-project__balanced-grid"><div><figure>${imageMarkup(media.primary, project.name, language, "wide")}<figcaption>${caption(media.primary, 1, text.captionOverview)}</figcaption></figure>${facts(true)}</div><aside><p class="portfolio-kicker">${text.myContribution}</p><div class="portfolio-contributions">${projectContributionCards(project, language)}</div>${projectTags}</aside></div></div>` };
  if (layout === "project.editorial") return { layout, html: `<div class="portfolio-project portfolio-project--editorial"><section>${projectHeading(project, language, index)}<figure>${imageMarkup(media.primary, project.name, language, "landscape")}<figcaption>${caption(media.primary, 1, text.captionOverview)}</figcaption></figure></section><aside><p class="portfolio-project__summary">${summary}</p>${facts(false)}<div class="portfolio-project__editorial-note"><p class="portfolio-kicker">${text.contribution}</p><p>${escapeHtml(localized(project.responsibilities[0]?.text, language) || text.projectFallback)}</p></div><figure>${imageMarkup(media.supporting, project.name, language, "wide")}<figcaption>${caption(media.supporting, 2, text.captionSupporting)}</figcaption></figure>${projectTags}</aside></div>` };
  if (layout === "project.technical") return { layout, html: `<div class="portfolio-project portfolio-project--technical"><aside>${projectHeading(project, language, index)}${facts(false)}<p>${summary}</p></aside><main><figure>${imageMarkup(media.primary, project.name, language, "wide")}<figcaption>${caption(media.primary, 1, text.captionOverview)}</figcaption></figure><div class="portfolio-project__technical-detail"><figure>${imageMarkup(media.supporting, project.name, language, "wide")}<figcaption>${caption(media.supporting, 2, text.captionSupporting)}</figcaption></figure><div class="portfolio-contributions">${projectContributionCards(project, language)}</div></div>${projectTags}</main></div>` };
  if (layout === "project.portrait") return { layout, html: `<div class="portfolio-project portfolio-project--portrait"><figure>${imageMarkup(media.primary, project.name, language, "portrait")}<figcaption>${caption(media.primary, 1, text.captionOverview)}</figcaption></figure><main>${projectHeading(project, language, index)}<p class="portfolio-project__summary">${summary}</p><div class="portfolio-contributions">${projectContributionCards(project, language)}</div>${projectTags}</main></div>` };
  if (layout === "project.evidence") return { layout, html: `<div class="portfolio-project portfolio-project--evidence">${projectHeading(project, language, index)}<div class="portfolio-project__evidence-images"><figure>${imageMarkup(media.primary, project.name, language, "wide")}<figcaption>${caption(media.primary, 1, text.captionOverview)}</figcaption></figure><figure>${imageMarkup(media.supporting, project.name, language, "landscape")}<figcaption>${caption(media.supporting, 2, text.captionEvidence)}</figcaption></figure></div><div class="portfolio-contributions" ${columnsStyle(contributionItems(project).length, 3)}>${projectContributionCards(project, language)}</div></div>` };
  return { layout, html: `<div class="portfolio-project portfolio-project--classic"><div class="portfolio-project__visual" data-pf-bleed>${imageMarkup(media.primary, project.name, language, "portrait")}</div><div class="portfolio-project__content">${projectHeading(project, language, index)}<p class="portfolio-project__summary">${summary}</p>${project.responsibilities.length ? `<ul class="portfolio-responsibilities">${project.responsibilities.slice(0, 5).map((point) => `<li>${escapeHtml(localized(point.text, language))}</li>`).join("")}</ul>` : ""}${projectTags}</div></div>` };
};

const renderClassicAutomation = (tools: PortfolioTool[], language: Language): string => `<div class="portfolio-page__inner portfolio-automation portfolio-automation--classic"><p class="portfolio-kicker">${copy[language].selectedAutomation}</p><h2 class="portfolio-title">${copy[language].toolsTitle}</h2><div class="portfolio-tools${tools.length === 1 ? " is-single" : ""}" ${columnsStyle(tools.length, 3)}>${tools.map((tool, index) => `<article><span>${copy[language].automation} ${twoDigits(index + 1)}</span><h3>${escapeHtml(tool.name)}</h3><p><strong>${copy[language].problem}</strong>${escapeHtml(localized(tool.problem, language))}</p><p><strong>${copy[language].solution}</strong>${escapeHtml(localized(tool.solution, language))}</p>${tagList(tool.technologies)}</article>`).join("")}</div></div>`;
const renderAutomation = (data: PortfolioRuntimeData, tool: PortfolioTool, layout: AutomationLayout, language: Language, index: number): string => {
  const text = copy[language];
  const benefit = tool.benefit ? localized(tool.benefit, language) : text.projectFallback;
  const media = resolvePortfolioMedia(tool.images, data.content.mediaAssignments.tools[tool.id]);
  const toolName: LocalizedText = { en: tool.name, vi: tool.name };
  const heading = (subtitle: string): string => `<p class="portfolio-kicker">${text.selectedAutomation} / ${twoDigits(index + 1)}</p><h2>${escapeHtml(tool.name)}</h2><p class="portfolio-automation__subtitle">${subtitle}</p>`;
  if (layout === "automation.input-geometry") {
    return `<div class="portfolio-automation portfolio-automation--geometry">${heading(text.geometrySubtitle)}<div class="portfolio-automation__geometry-grid"><section><p class="portfolio-kicker">${text.builtWith}</p>${tagList(tool.technologies)}<div class="portfolio-automation__brief"><p><strong>${text.problem}</strong>${escapeHtml(localized(tool.problem, language))}</p><p><strong>${text.solution}</strong>${escapeHtml(localized(tool.solution, language))}</p></div></section><div class="portfolio-automation__media-pair"><figure>${imageMarkup(media.primary, toolName, language, "landscape", "portfolio-automation__image")}<figcaption>${mediaCaption(media.primary, language, numberedCaption(1, text.captionToolInput))}</figcaption></figure><figure>${imageMarkup(media.supporting, toolName, language, "wide", "portfolio-automation__image")}<figcaption>${mediaCaption(media.supporting, language, numberedCaption(2, text.captionToolGenerated))}</figcaption></figure></div></div></div>`;
  }
  const steps = [
    [text.stepInput, text.stepInputValue],
    [text.stepParameters, tool.technologies.slice(0, 2).join(" + ") || text.stepParametersFallback],
    [text.stepGeneration, text.stepGenerationValue],
    [text.outcome, benefit],
  ];
  return `<div class="portfolio-automation portfolio-automation--workflow">${heading(text.toolsTitle)}<div class="portfolio-automation__workflow-grid"><aside><section><p class="portfolio-kicker">${text.problem}</p><p>${escapeHtml(localized(tool.problem, language))}</p></section><section><p class="portfolio-kicker">${text.solution}</p><p>${escapeHtml(localized(tool.solution, language))}</p></section>${tagList(tool.technologies)}</aside><main><figure class="portfolio-automation__visual">${imageMarkup(media.primary, toolName, language, "wide", "portfolio-automation__image")}<figcaption>${mediaCaption(media.primary, language, text.captionToolOutput)}</figcaption></figure><p class="portfolio-kicker">${text.workflow}</p><ol class="portfolio-workflow-steps">${steps.map(([label, value], stepIndex) => `<li><span>${twoDigits(stepIndex + 1)} / ${label}</span><strong>${escapeHtml(value)}</strong></li>`).join("")}</ol></main></div></div>`;
};

const credentialTitle = (credential: PortfolioCredential | undefined, language: Language): string => credential ? localized(credential.title, language) : copy[language].documentPlaceholder;
const credentialMeta = (credential: PortfolioCredential | undefined, language: Language): string => credential ? [localized(credential.issuer, language), credential.issuedOn?.slice(0, 4)].filter(Boolean).join(" · ") : copy[language].contentPending;
const credentialKind = (kind: CredentialKind, language: Language): string => copy[language].credentialKinds[kind] ?? copy[language].credentialKinds.other;
const renderCredentials = (data: PortfolioRuntimeData, language: Language, pageCredentials: PortfolioCredential[], pageIndex: number, pageTotal: number): string => {
  // Placeholders only stand in for an empty selection; a short last page keeps its real items.
  const credentials: Array<PortfolioCredential | undefined> = pageCredentials.length ? pageCredentials : Array<undefined>(PORTFOLIO_CREDENTIALS_PER_PAGE).fill(undefined);
  const firstNumber = pageIndex * PORTFOLIO_CREDENTIALS_PER_PAGE + 1;
  const kicker = `${copy[language].credentialsSubtitle}${pageTotal > 1 ? ` · ${pageIndex + 1} / ${pageTotal}` : ""}`;
  const title = (credential: PortfolioCredential | undefined): string => `<h3 class="portfolio-credential__title">${escapeHtml(credentialTitle(credential, language))}</h3>`;
  const placeholder = `<div class="portfolio-document-placeholder"><span>${copy[language].documentPlaceholder}</span></div>`;
  if (data.content.layouts.credentials === "credentials.dual") return `<div class="portfolio-credentials portfolio-credentials--dual"><p class="portfolio-kicker">${kicker}</p><h2>${copy[language].credentials}</h2><div>${credentials.map((credential, index) => `<article><header><span>${twoDigits(firstNumber + index)}</span>${title(credential)}</header>${placeholder}<p>${escapeHtml(credentialMeta(credential, language))}</p></article>`).join("")}</div></div>`;
  return `<div class="portfolio-credentials portfolio-credentials--bands"><p class="portfolio-kicker">${kicker}</p><h2>${copy[language].credentials}</h2><div>${credentials.map((credential, index) => `<article>${placeholder}<section><p class="portfolio-kicker">${twoDigits(firstNumber + index)}${credential ? ` / ${escapeHtml(credentialKind(credential.kind, language))}` : ""}</p>${title(credential)}<p>${escapeHtml(credentialMeta(credential, language))}</p>${credential?.description && localized(credential.description, language) ? `<small>${escapeHtml(localized(credential.description, language))}</small>` : ""}</section></article>`).join("")}</div></div>`;
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
    const hero = projects[0];
    const media = hero ? resolvePortfolioMedia(hero.images, content.mediaAssignments.projects[hero.id]).primary : undefined;
    return `<div class="portfolio-closing portfolio-closing--white"><main><h2>${thankYou}</h2><strong>${escapeHtml(localized(content.closingHeading, language))}</strong><h3>${escapeHtml(displayName)}</h3><p>${escapeHtml(localized(profile.professionalTitle, language))}</p></main><aside><p class="portfolio-kicker">${text.connect}</p><span>${text.email}</span><a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)}</a><span>${text.phone}</span><strong>${escapeHtml(profile.phone)}</strong><span>${text.location}</span><strong>${escapeHtml(localized(profile.location, language))}</strong></aside><figure>${imageMarkup(media, hero?.name, language, "wide", "portfolio-closing__image")}<figcaption>${text.captionClosing}</figcaption></figure></div>`;
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
  const footerText = localized(data.content.kicker, language);
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
  if (classicTools.length) pages.push(numbered(renderClassicAutomation(classicTools, language), "automation", "automation.classic", text.selectedAutomation));
  selectedTools.filter((tool) => resolveAutomationLayout(data, tool.id) !== "automation.classic").forEach((tool, index) => {
    const layout = resolveAutomationLayout(data, tool.id);
    pages.push(numbered(renderAutomation(data, tool, layout, language, index), "automation", layout, text.selectedAutomation));
  });
  const credentialPages = portfolioCredentialPages(data);
  credentialPages.forEach((pageCredentials, pageIndex) => {
    pages.push(numbered(renderCredentials(data, language, pageCredentials, pageIndex, credentialPages.length), "credentials", layouts.credentials, text.credentials));
  });
  pages.push(numbered(renderClosing(data, language, selectedProjects), "closing", layouts.closing, layouts.closing === "closing.white" ? text.connect : undefined));
  return pages.join("");
};
