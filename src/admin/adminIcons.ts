export type AdminNavIconName =
  | "overview"
  | "homepage"
  | "projects"
  | "tools"
  | "profile"
  | "cv"
  | "portfolio"
  | "cover-letters"
  | "trash";

export const adminNavIconNames: readonly AdminNavIconName[] = [
  "overview",
  "homepage",
  "projects",
  "tools",
  "profile",
  "cv",
  "portfolio",
  "cover-letters",
  "trash",
];

const iconPaths: Record<AdminNavIconName, string> = {
  overview: '<rect x="3" y="3" width="7" height="9" rx="1.75"/><rect x="14" y="3" width="7" height="5" rx="1.75"/><rect x="14" y="12" width="7" height="9" rx="1.75"/><rect x="3" y="16" width="7" height="5" rx="1.75"/>',
  homepage: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.4 2.45 3.6 5.45 3.6 9S14.4 18.55 12 21c-2.4-2.45-3.6-5.45-3.6-9S9.6 5.45 12 3Z"/>',
  projects: '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2h7.5A2.5 2.5 0 0 1 21 9.5v8A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-10Z"/><path d="M3 10h18"/>',
  tools: '<rect x="3" y="3" width="6" height="6" rx="1.75"/><rect x="15" y="3" width="6" height="6" rx="1.75"/><rect x="15" y="15" width="6" height="6" rx="1.75"/><path d="M9 6h6M6 9v5a4 4 0 0 0 4 4h5"/>',
  profile: '<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0Z"/>',
  cv: '<path d="M6 3h8l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v5h5M8 12h7M8 16h7"/>',
  portfolio: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/>',
  "cover-letters": '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/>',
};

export const renderAdminNavIcon = (name: AdminNavIconName): string =>
  `<svg class="admin-nav__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${iconPaths[name]}</svg>`;
