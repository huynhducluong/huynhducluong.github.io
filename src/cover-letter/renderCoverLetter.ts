import { escapeHtml } from "../shared/format";
import type { CoverLetterInput, CoverLetterSenderSnapshot } from "../types/coverLetter";

const lines = (value: string): string =>
  value.split(/\r?\n/).map((line) => escapeHtml(line.trim())).filter(Boolean).join("<br>");

const formatPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 && digits.startsWith("0")
    ? digits.replace(/(\d{4})(\d{3})(\d{3})/, "$1 $2 $3")
    : phone;
};

const formatApplicationDate = (value: string): string => {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return escapeHtml(value);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, day)));
};

export const renderCoverLetterMarkup = (letter: CoverLetterInput, sender: CoverLetterSenderSnapshot): string => {
  const recipient = [letter.recipientName, letter.recipientTitle, letter.companyName, letter.companyAddress]
    .filter((item) => item.trim()).map((item) => lines(item)).join("<br>");
  const portfolio = sender.portfolioUrl
    ? '<a href="' + escapeHtml(sender.portfolioUrl) + '">' + escapeHtml(sender.portfolioUrl.replace(/^https?:\/\//, "")) + "</a>"
    : "";

  return [
    '<article class="cover-letter-page" data-cover-letter-page>',
    '<header class="cover-letter-page__header">',
    '<div class="cover-letter-page__identity"><h1>' + escapeHtml(sender.name) + "</h1><p>" + escapeHtml(sender.professionalTitle) + "</p></div>",
    '<address class="cover-letter-page__contact">',
    '<a href="mailto:' + escapeHtml(sender.email) + '">' + escapeHtml(sender.email) + "</a>",
    "<span>" + escapeHtml(formatPhone(sender.phone)) + "</span>",
    "<span>" + escapeHtml(sender.location) + "</span>", portfolio, "</address></header>",
    '<div class="cover-letter-page__rule"></div>',
    '<div class="cover-letter-page__date">' + formatApplicationDate(letter.applicationDate) + "</div>",
    '<address class="cover-letter-page__recipient">' + recipient + "</address>",
    '<main class="cover-letter-page__body">',
    '<p class="cover-letter-page__salutation">' + escapeHtml(letter.salutation) + "</p>",
    "<p>" + escapeHtml(letter.openingParagraph) + "</p>",
    "<p>" + escapeHtml(letter.fitParagraph) + "</p>",
    "<p>" + escapeHtml(letter.companyParagraph) + "</p>",
    "<p>" + escapeHtml(letter.closingParagraph) + "</p></main>",
    '<footer class="cover-letter-page__signoff"><p>' + escapeHtml(letter.signOff) + "</p><strong>" + escapeHtml(sender.name) + "</strong></footer>",
    "</article>",
  ].join("");
};
