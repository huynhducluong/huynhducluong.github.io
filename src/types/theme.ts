export interface DocumentThemeTokens {
  primary: string;
  primaryStrong: string;
  accent: string;
  onPrimary: string;
  onAccent: string;
  text: string;
  textMuted: string;
  surface: string;
  surfaceMuted: string;
  border: string;
}

export interface DocumentTheme {
  id: string;
  name: string;
  tokens: DocumentThemeTokens;
}

export interface StoredDocumentTheme {
  presetId: string;
  primary?: string;
  accent?: string;
}
