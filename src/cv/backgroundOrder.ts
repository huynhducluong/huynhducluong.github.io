import type { CvBackgroundGroup, CvBackgroundOrder, CvContent } from "../types/cvContent";

const reconcileIds = <T extends { id: string }>(savedIds: readonly string[] | undefined, items: readonly T[]): string[] => {
  const available = new Set(items.map((item) => item.id));
  const seen = new Set<string>();
  const retained: string[] = [];
  (savedIds ?? []).forEach((id) => {
    if (!available.has(id) || seen.has(id)) return;
    seen.add(id);
    retained.push(id);
  });
  return [...retained, ...items.map((item) => item.id).filter((id) => !seen.has(id))];
};

export const resolveCvBackgroundOrder = (content: CvContent): CvBackgroundOrder => ({
  experienceIds: reconcileIds(content.backgroundOrder?.experienceIds, content.experiences),
  educationIds: reconcileIds(content.backgroundOrder?.educationIds, content.education),
  skillGroupIds: reconcileIds(content.backgroundOrder?.skillGroupIds, content.skillGroups),
  languageIds: reconcileIds(content.backgroundOrder?.languageIds, content.languages),
});

const orderItems = <T extends { id: string }>(items: readonly T[], ids: readonly string[]): T[] => {
  const byId = new Map(items.map((item) => [item.id, item]));
  return ids.map((id) => byId.get(id)).filter((item): item is T => Boolean(item));
};

export const orderedCvBackground = (content: CvContent) => {
  const order = resolveCvBackgroundOrder(content);
  return {
    experiences: orderItems(content.experiences, order.experienceIds),
    education: orderItems(content.education, order.educationIds),
    skillGroups: orderItems(content.skillGroups, order.skillGroupIds),
    languages: orderItems(content.languages, order.languageIds),
  };
};

const backgroundOrderKeys: Record<CvBackgroundGroup, keyof CvBackgroundOrder> = {
  experiences: "experienceIds",
  education: "educationIds",
  skillGroups: "skillGroupIds",
  languages: "languageIds",
};

export const backgroundOrderKey = (group: CvBackgroundGroup): keyof CvBackgroundOrder => backgroundOrderKeys[group];
