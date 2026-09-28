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

If no authenticated session remains, use the local one-time setup command:

1. In Supabase Dashboard, open **Project Settings > API Keys** and copy the Secret key (`sb_secret_...`) or legacy `service_role` key.
2. Open a VS Code terminal in the project folder.
3. Run `npm run setup:admin-password`.
4. Paste the Secret key, then enter and confirm the new password. All three prompts are hidden.
5. After the success message, close the terminal and test Password sign-in at `/admin/`.

The setup utility reads the project URL and Admin email from the shared project configuration. It does not save or print the Secret key or password. Never expose the Secret key in browser code, commit it, or send it to another person. Do not modify `auth.users` directly and do not delete/recreate the existing user, because its ID is linked to the Admin allowlist and may own uploaded Storage objects.
