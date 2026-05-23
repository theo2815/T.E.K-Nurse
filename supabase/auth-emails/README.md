# Supabase Auth email templates

Visually-matched HTML templates for the emails that **Supabase Auth itself**
sends (signup verification, password reset) — styled to match the Clinical
Console palette used by the Phase 8b transactional templates in
`lib/email/templates/`.

Supabase's dashboard has no version history for email templates, so the
canonical source lives here. Whenever you edit a template in the Supabase
dashboard, mirror the change back into this directory and commit.

## OTP-first auth (no links)

Both templates here ship as **OTP-only** — they show a 6-digit code that the
user types into the app rather than a clickable link. The rationale:

| | Magic link | OTP code |
|---|---|---|
| Depends on Site URL config | Yes | No |
| Depends on Redirect URLs allowlist | Yes | No |
| Survives Outlook/Gmail URL mangling | Sometimes | Always |
| Works the same in dev / preview / prod | No | Yes |
| Phishing-resistant | No (link → unknown destination) | Yes (typed into our domain) |

The app pages that consume these codes are:

- `app/(auth)/signup/page.tsx` — calls `verifyOtp({ type: 'signup', token })`
- `app/(auth)/forgot-password/page.tsx` — calls `verifyOtp({ type: 'recovery', token })`, then routes to `/reset-password`

Both pages use the reusable `<OtpInput>` component at `components/ui/OtpInput.tsx`.

## Files

| File | Supabase dashboard slot | When it fires |
|---|---|---|
| `confirm-signup.html` | Authentication → Email Templates → **Confirm signup** | A user signs up via `supabase.auth.signUp()`. Email contains the 6-digit verification code. |
| `reset-password.html` | Authentication → Email Templates → **Reset Password** | A user submits the forgot-password form. Email contains the 6-digit reset code. |

## How to apply

1. Open Supabase Dashboard → **Authentication → Email Templates**
2. Select the template you want to update (e.g. "Confirm signup")
3. **Subject** field: paste the recommended subject below
4. **Message body (HTML)** field: paste the full file contents from this directory
5. Click **Save changes**
6. Trigger the real flow in your local dev (`npm run dev` → `/signup` or `/forgot-password`) and confirm the email lands at `t.e.k.nurse.support@gmail.com` with the code prominently displayed

## Recommended subjects

| Template | Subject line |
|---|---|
| `confirm-signup.html` | `Confirm your email · T.E.K Nurse` |
| `reset-password.html` | `Reset your password · T.E.K Nurse` |

## Magic variables used

Supabase Auth fills these in with Go template syntax (`{{ .Var }}`) before
sending. Both current templates use only `{{ .Token }}`.

| Variable | Used? | Meaning |
|---|---|---|
| `{{ .Token }}` | ✅ both templates | The 6-digit OTP code the user types into the app. |
| `{{ .ConfirmationURL }}` | not used | Full one-time URL — only relevant for link-based flows. We do not ship these in our HTML. |
| `{{ .SiteURL }}` | not used | "Site URL" from Authentication → URL Configuration. |
| `{{ .Email }}` | not used | Recipient's email address. |
| `{{ .TokenHash }}` | not used | Hashed token, for custom verification flows. |

## URL Configuration is no longer required

Because OTP-only flows never redirect, you don't need to maintain Site URL or
Redirect URLs for the signup or password-reset flows. If you keep those
fields set for other reasons (e.g. a future magic-link feature) that's fine,
but they don't affect anything in the current auth surface.

## Out of scope (not styled yet)

Supabase Auth has four more templates that ship with bland default HTML. We
haven't customised them because the current app doesn't expose those flows:

- **Magic Link** — passwordless login. Off in this app.
- **Invite user** — admin-invites flow. Not used (self-signup only).
- **Change Email Address** — fires when a user updates their email. No
  profile-settings page exists yet.
- **Reauthentication** — extra-secure re-verify before sensitive actions.

When any of these is turned on, copy `confirm-signup.html`, swap copy + magic
variable, and add to the table above.

## Deliverability note (same as worker)

These emails are sent via the same Brevo SMTP credentials configured in
**Authentication → SMTP Settings**. Sending `From: t.e.k.nurse.support@gmail.com`
via Brevo will fail DMARC at Gmail/Yahoo/Outlook for the same reason
discussed in `../README.md` → "Deliverability caveat". Brevo also rewrites
the visible sender to a `*.brevosend.com` subdomain to keep DMARC alignment.
Expect spam-folder placement for non-Gmail recipients until a real domain
(e.g. `teknurse.app`) is verified in Brevo.
