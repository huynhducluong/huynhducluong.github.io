import type { CvBackgroundGroup, CvBackgroundOrder, CvBackgroundSelection, CvContent } from "../types/cvContent";

const reconcileIds = <T extends { id: string }>(
  savedIds: readonly string[] | undefined,
  items: readonly T[],
  addNew: "start" | "end" = "end",
): string[] => {
  const available = new Set(items.map((item) => item.id));
  const seen = new Set<string>();
  const retained: string[] = [];
  (savedIds ?? []).forEach((id) => {
    if (!available.has(id) || seen.has(id)) return;
    seen.add(id);
    retained.push(id);
  });
  const added = items.map((item) => item.id).filter((id) => !seen.has(id));
  return addNew === "start" ? [...added, ...retained] : [...retained, ...added];
};

export const resolveCvBackgroundOrder = (content: CvContent): CvBackgroundOrder => ({
  experienceIds: reconcileIds(content.backgroundOrder?.experienceIds, content.experiences, "start"),
  educationIds: reconcileIds(content.backgroundOrder?.educationIds, content.education, "start"),
  credentialIds: reconcileIds(content.backgroundOrder?.credentialIds, content.credentials ?? [], "start"),
  skillGroupIds: reconcileIds(content.backgroundOrder?.skillGroupIds, content.skillGroups),
  languageIds: reconcileIds(content.backgroundOrder?.languageIds, content.languages, "start"),
});

const selectedIds = <T extends { id: string }>(savedIds: readonly string[] | undefined, items: readonly T[]): string[] => {
  if (savedIds === undefined) return items.map((item) => item.id);
  const selected = new Set(savedIds);
  return items.filter((item) => selected.has(item.id)).map((item) => item.id);
};

export const resolveCvBackgroundSelection = (content: CvContent): CvBackgroundSelection => ({
  experienceIds: selectedIds(content.backgroundSelection?.experienceIds, content.experiences),
  educationIds: selectedIds(content.backgroundSelection?.educationIds, content.education),
  credentialIds: selectedIds(content.backgroundSelection?.credentialIds, content.credentials ?? []),
  skillGroupIds: selectedIds(content.backgroundSelection?.skillGroupIds, content.skillGroups),
  languageIds: selectedIds(content.backgroundSelection?.languageIds, content.languages),
});

const orderItems = <T extends { id: string }>(items: readonly T[], ids: readonly string[]): T[] => {
  const byId = new Map(items.map((item) => [item.id, item]));
  return ids.map((id) => byId.get(id)).filter((item): item is T => Boolean(item));
};

export const orderedCvBackground = (content: CvContent) => {
  if (content.backgroundSelection) {
    const selection = resolveCvBackgroundSelection(content);
    return {
      experiences: orderItems(content.experiences, selection.experienceIds),
      education: orderItems(content.education, selection.educationIds),
      credentials: orderItems(content.credentials ?? [], selection.credentialIds),
      skillGroups: orderItems(content.skillGroups, selection.skillGroupIds),
      languages: orderItems(content.languages, selection.languageIds),
    };
  }
  const order = resolveCvBackgroundOrder(content);
  return {
    experiences: orderItems(content.experiences, order.experienceIds),
    education: orderItems(content.education, order.educationIds),
    credentials: orderItems(content.credentials ?? [], order.credentialIds),
    skillGroups: orderItems(content.skillGroups, order.skillGroupIds),
    languages: orderItems(content.languages, order.languageIds),
  };
};

const backgroundOrderKeys: Record<CvBackgroundGroup, keyof CvBackgroundOrder> = {
  experiences: "experienceIds",
  education: "educationIds",
  credentials: "credentialIds",
  skillGroups: "skillGroupIds",
  languages: "languageIds",
};

export const backgroundOrderKey = (group: CvBackgroundGroup): keyof CvBackgroundOrder => backgroundOrderKeys[group];
