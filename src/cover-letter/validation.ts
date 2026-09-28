import type { CoverLetterInput } from "../types/coverLetter";

export interface CoverLetterValidation {
  errors: string[];
  warnings: string[];
  wordCount: number;
}

const words = (value: string): number => value.trim() ? value.trim().split(/\s+/).length : 0;
const hasPlaceholder = (value: string): boolean => /\[[^\]]+\]|\{\{[^}]+\}\}|\b(?:TODO|TBC|PLACEHOLDER)\b/i.test(value);

export const validateCoverLetter = (letter: CoverLetterInput): CoverLetterValidation => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const required: Array<[string, string]> = [
    ["Internal title", letter.internalTitle], ["Company name", letter.companyName],
    ["Position title", letter.positionTitle], ["Application date", letter.applicationDate],
    ["Salutation", letter.salutation], ["Opening paragraph", letter.openingParagraph],
    ["Experience and fit paragraph", letter.fitParagraph], ["Company-specific paragraph", letter.companyParagraph],
    ["Closing paragraph", letter.closingParagraph], ["Sign-off", letter.signOff],
  ];
  required.forEach(([label, value]) => {
    if (!value.trim()) errors.push(label + " is required.");
  });

  const printableText = [letter.companyName, letter.positionTitle, letter.recipientName, letter.recipientTitle, letter.companyAddress, letter.salutation, letter.openingParagraph, letter.fitParagraph, letter.companyParagraph, letter.closingParagraph, letter.signOff].join(" ");
  if (hasPlaceholder(printableText)) errors.push("Replace all placeholder markers before finalizing.");

  const wordCount = [letter.openingParagraph, letter.fitParagraph, letter.companyParagraph, letter.closingParagraph].reduce((total, paragraph) => total + words(paragraph), 0);
  if (wordCount < 220) warnings.push("The body is concise; 250–400 words is usually a stronger target.");
  if (wordCount > 450) warnings.push("The body is long and may overflow the one-page layout.");
  if (!letter.recipientName.trim()) warnings.push("Recipient name is blank; the generic salutation will be used.");
  if (!letter.projectIds.length && !letter.toolIds.length) warnings.push("No project or automation-tool evidence is linked to this draft.");
  return { errors, warnings, wordCount };
};

export const coverLetterOverflows = (page: HTMLElement): boolean =>
  page.scrollHeight > page.clientHeight + 2 || page.scrollWidth > page.clientWidth + 2;
