import { escapeHtml, formatNumericDate } from "../shared/format";

export const renderExperienceDate = (
  startDate: string | undefined,
  endDate: string | null | undefined,
  presentLabel: string,
): string => {
  if (!startDate) {
    return '<p class="cv-experience-item__date"></p>';
  }

  const startLabel = formatNumericDate(startDate);
  const endLabel = endDate === null
    ? presentLabel
    : endDate
      ? formatNumericDate(endDate)
      : "";
  const endMarkup = endDate
    ? `<time class="cv-experience-item__date-end" datetime="${escapeHtml(endDate)}">${escapeHtml(endLabel)}</time>`
    : `<span class="cv-experience-item__date-end">${escapeHtml(endLabel)}</span>`;

  return `
    <p class="cv-experience-item__date" aria-label="${escapeHtml(`${startLabel} - ${endLabel}`)}">
      <time class="cv-experience-item__date-start" datetime="${escapeHtml(startDate)}">${escapeHtml(startLabel)}</time>
      <span class="cv-experience-item__date-separator" aria-hidden="true">-</span>
      ${endMarkup}
    </p>
  `;
};
