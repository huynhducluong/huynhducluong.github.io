export const supabaseConfig = {
  url: "https://xktfazwwenqhsncoovjw.supabase.co",
  publishableKey: "sb_publishable_SgGfshKSEGYjUJV0sTi1FA_VvG3f-o4",
  storageBucket: "portfolio-public",
  privateDocumentBucket: "portfolio-private-documents",
  adminEmail: "huynhluong321998@gmail.com",
} as const;

// The publishable key is intentionally client-visible and is safe only together
// with the RLS policies in supabase/migrations. Never add a secret/service-role key.
