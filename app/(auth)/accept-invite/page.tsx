"use client";

import { useEffect, useState } from "react";
import { useProgressRouter } from "@/lib/use-progress-router";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SpeedLines } from "@/components/SpeedLines";
import {
  PasswordChecklist,
  isPasswordStrong,
} from "@/components/PasswordChecklist";
import { createClient } from "@/lib/supabase/client";

/**
 * Staff-invite acceptance page. The magic link from staff_invite emails
 * redirects here. By the time this page mounts, the Supabase JS client has
 * consumed the URL fragment (#access_token=... &type=invite) and signed
 * the invitee in with a temporary session.
 *
 * The page:
 *   1. Confirms there's an active session (otherwise redirects to /login).
 *   2. Prompts for a new password.
 *   3. On submit: updateUser({password}) → mark_invite_accepted RPC →
 *      redirect to /staff/home.
 *
 * If the invitee opens the link twice, the second visit finds them already
 * signed in but mark_invite_accepted is a silent no-op once
 * invite_accepted_at is set, so the form still works as a generic
 * password-change.
 */
export default function AcceptInvitePage() {
  const router = useProgressRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [sessionReady, setSessionReady] = useState<boolean | null>(null);
  const [inviteeEmail, setInviteeEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const supabase = createClient();

      // Supabase's auth.admin.generateLink({type:'invite'}) generates an
      // implicit-flow magic link: after /auth/v1/verify consumes the token,
      // it redirects here with the session tokens in the URL FRAGMENT
      // (#access_token=...&refresh_token=...). The @supabase/ssr browser
      // client defaults to PKCE flow and only auto-processes ?code=... in
      // the query string — it ignores the fragment entirely. So we extract
      // the tokens manually and seed the session.
      if (typeof window !== "undefined" && window.location.hash.length > 1) {
        const params = new URLSearchParams(window.location.hash.slice(1));
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        if (access_token && refresh_token) {
          const { error: setErr } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (cancelled) return;
          if (setErr) {
            setSessionReady(false);
            return;
          }
          // Strip the consumed tokens from the URL so a refresh doesn't
          // attempt to reuse them (they're one-time on the Supabase side).
          window.history.replaceState(null, "", window.location.pathname);
        }
      }

      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!data.user) {
        setSessionReady(false);
        return;
      }
      setInviteeEmail(data.user.email ?? null);
      setSessionReady(true);
    }
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  const passwordIsStrong = isPasswordStrong(password);
  const passwordsMatch = password.length > 0 && password === confirm;

  const confirmError =
    confirm.length > 0 && password !== confirm
      ? "Passwords don't match."
      : undefined;

  const canSubmit = !submitting && passwordIsStrong && passwordsMatch && sessionReady === true;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setSubmitting(false);
      setError(updateError.message);
      return;
    }

    const { error: rpcError } = await supabase.rpc("mark_invite_accepted");
    if (rpcError) {
      setSubmitting(false);
      setError(
        `Password set, but we couldn't mark your invite as accepted: ${rpcError.message}`,
      );
      return;
    }

    router.replace("/staff/home");
    router.refresh();
  }

  if (sessionReady === null) {
    return (
      <p className="font-mono uppercase text-caps-sm text-slate tracking-[0.08em]">
        Checking your invite…
      </p>
    );
  }

  if (sessionReady === false) {
    return (
      <>
        <div className="flex items-center gap-3 mb-2">
          <SpeedLines className="w-12 h-5" />
          <p className="font-mono uppercase text-caps-sm text-red-deep font-semibold">
            INVITE EXPIRED
          </p>
        </div>
        <h1 className="font-display italic font-extrabold text-display md:text-[48px] text-navy">
          This invite link is no longer valid
        </h1>
        <hr className="mt-3 mb-6 w-12" />
        <p className="text-[15px] text-slate leading-relaxed mb-6">
          Invite links are single-use and expire after a short window. Ask
          your admin to resend the invite — they can do this from the Manage
          users page.
        </p>
        <Button
          type="button"
          variant="primary"
          onClick={() => router.replace("/login")}
        >
          Go to sign in
        </Button>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-2">
        <SpeedLines className="w-12 h-5" />
        <p className="font-mono uppercase text-caps-sm text-teal font-semibold">
          STAFF INVITE
        </p>
      </div>
      <h1 className="font-display italic font-extrabold text-display md:text-[48px] text-navy">
        Set your password
      </h1>
      <hr className="mt-3 mb-6 w-12" />

      {inviteeEmail && (
        <p className="font-mono uppercase text-caps-sm text-slate tracking-[0.08em] mb-6">
          Signing you in as <span className="text-navy font-semibold normal-case">{inviteeEmail}</span>
        </p>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <div>
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            placeholder="Create a strong password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            revealable
            required
            requiredMark
          />
          {(passwordFocused || password.length > 0) && (
            <div className="mt-3">
              <PasswordChecklist password={password} />
            </div>
          )}
        </div>
        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="Re-enter password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={confirmError}
          revealable
          required
          requiredMark
        />

        {error && (
          <p
            role="alert"
            className="font-mono uppercase text-caps-sm text-red-deep tracking-[0.05em]"
          >
            ⚠  {error}
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          disabled={!canSubmit}
          loading={submitting}
        >
          Accept invite & continue
        </Button>
      </form>
    </>
  );
}
