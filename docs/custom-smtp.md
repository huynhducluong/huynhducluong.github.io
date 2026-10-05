# Custom SMTP for Career Hub Admin

Career Hub Admin supports Supabase password sign-in with Magic Link as an optional backup. SMTP credentials belong only in the Supabase Dashboard and must never be committed to this repository.

Custom SMTP is optional when the Admin account uses password sign-in. It is still required for reliable Magic Link delivery and email-based password recovery.

## Gmail SMTP for the single Admin account

1. Enable 2-Step Verification for `huynhluong321998@gmail.com`.
2. In Google Account security settings, create an App Password named `Supabase Portfolio`.
3. Copy the generated 16-character App Password. Do not use the normal Gmail password.
4. In Supabase, open **Authentication > Emails > SMTP Settings** and enable Custom SMTP.
5. Enter:
   - Sender name: `Huynh Duc Luong Portfolio`
   - Sender email: `huynhluong321998@gmail.com`
   - Host: `smtp.gmail.com`
   - Port: `587`
   - Username: `huynhluong321998@gmail.com`
   - Password: the Google App Password
6. Save the settings.
7. Keep the Site URL and redirect allowlist configured for:
   - `https://huynhducluong.github.io/`
   - `https://huynhducluong.github.io/admin/`
8. Request one Magic Link and inspect Supabase Auth Logs if delivery fails.

The frontend enforces a 60-second resend delay. Supabase rate limits should remain enabled. Revoke the Google App Password immediately if it is ever exposed.

For a future custom domain or multiple users, replace Gmail SMTP with a transactional provider such as Resend, Postmark, SendGrid, or Brevo and configure SPF, DKIM, and DMARC.
