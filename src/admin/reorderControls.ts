import { escapeHtml } from "../shared/format";
import { adminArrowBottomIcon, adminArrowDownIcon, adminArrowTopIcon, adminArrowUpIcon } from "./ui";

export interface ReorderPosition { first: boolean; last: boolean }

/** Drag handle plus a 2×2 grid (first / up on row one, last / down on row two): every move is one click (W-11). */
export const renderReorderControls = (item: { type: string; id: string; name: string }, position: ReorderPosition): string => {
  const name = escapeHtml(item.name);
  const target = `data-reorder-type="${escapeHtml(item.type)}" data-reorder-item="${escapeHtml(item.id)}"`;
  const button = (kind: string, label: string, title: string, disabled: boolean, icon: string): string =>
    `<button type="button" ${kind} ${target} aria-label="${label}" title="${title}"${disabled ? " disabled" : ""}>${icon}</button>`;
  return `<div class="admin-content-item__reorder" aria-label="Reorder ${name}"><span class="admin-content-item__drag" draggable="true" data-reorder-drag ${target} title="Drag to reorder" aria-label="Drag to reorder">⋮⋮</span><div class="admin-content-item__reorder-grid">${[
    button('data-reorder-edge="first"', `Move ${name} to first`, "Move to first", position.first, adminArrowTopIcon),
    button('data-reorder-direction="up"', `Move ${name} earlier`, "Move earlier", position.first, adminArrowUpIcon),
    button('data-reorder-edge="last"', `Move ${name} to last`, "Move to last", position.last, adminArrowBottomIcon),
    button('data-reorder-direction="down"', `Move ${name} later`, "Move later", position.last, adminArrowDownIcon),
  ].join("")}</div></div>`;
};
