# Admin password sign-in

The Admin page supports two Supabase Auth methods:

- Password is the primary method and does not require email delivery.
- Magic Link remains available as a backup and requires a working email provider.

No password or Supabase secret key belongs in this repository. The browser sends the password directly to Supabase Auth over HTTPS, and the existing `portfolio_admins` allowlist plus Row Level Security continues to control CMS access.

## Set the initial password

An authenticated Admin session is required before a user can set their own password safely.

1. If the Admin session is still active in any browser, open `/admin/`.
2. Select **Account security**.
3. Enter and confirm a password of at least 12 characters.
4. Save, sign out, and test the **Password** sign-in method.

If no authenticated session remains, obtain one final Magic Link or use Supabase's server-side Admin API with a secret key. Never expose the secret key in browser code. Do not modify `auth.users` directly and do not delete/recreate the existing user, because its ID is linked to the Admin allowlist and may own uploaded Storage objects.
