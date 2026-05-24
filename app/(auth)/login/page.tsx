"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useProgressRouter } from "@/lib/use-progress-router";
import { showNavSplash } from "@/lib/nav-splash";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SpeedLines } from "@/components/SpeedLines";
import { createClient } from "@/lib/supabase/client";

// Only accept same-origin relative paths to prevent open-redirect attacks.
function safeNext(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  return raw;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}

/**
 * Server-rendered placeholder that mirrors the real form's layout so users
 * see the sign-in shell before client JS hydrates. Without this fallback,
 * `<Suspense fallback={null}>` (triggered by useSearchParams in LoginForm)
 * leaves the auth shell visibly empty on slow networks — observed on
 * iPhone Safari opening from Messenger handoff.
 *
 * Inputs are rendered with `disabled` + `aria-busy` so screen readers
 * announce the loading state and the keyboard can't focus dead controls.
 */
function LoginFormSkeleton() {
  return (
    <div aria-busy="true">
      <div className="flex items-center gap-3 mb-2">
        <SpeedLines className="w-12 h-5" />
        <p className="font-mono uppercase text-caps-sm text-teal font-semibold">
          CHECK-IN
        </p>
      </div>
      <h1 className="font-display italic font-extrabold text-display md:text-[48px] text-navy">
        Welcome back
      </h1>
      <hr className="mt-3 mb-8 w-12" />

      <div className="flex flex-col gap-5">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="name@cit.edu"
          defaultValue=""
          disabled
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          defaultValue=""
          disabled
        />
        <Button type="button" variant="primary" disabled loading>
          Sign in
        </Button>
      </div>

      <div className="mt-6 flex items-center justify-between text-[14px]">
        <Link
          href="/forgot-password"
          className="text-navy hover:underline underline-offset-4 decoration-teal decoration-2"
        >
          Forgot password? →
        </Link>
      </div>

      <hr className="my-8" />

      <p className="text-slate text-[14px]">
        No account?{" "}
        <Link
          href="/signup"
          className="text-navy font-medium hover:underline underline-offset-4 decoration-teal decoration-2"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}

function LoginForm() {
  const router = useProgressRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError) {
      setSubmitting(false);
      setError(
        authError.message === "Invalid login credentials"
          ? "Email or password is incorrect."
          : authError.message,
      );
      return;
    }

    // Splash up BEFORE the navigation begins so the user never sees an
    // empty body during the segment swap + destination layout's data fetch.
    // Hidden automatically by <NavigationSplash /> when the destination URL
    // commits. Middleware will route by role on next request.
    showNavSplash();
    router.replace(next);
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-2">
        <SpeedLines className="w-12 h-5" />
        <p className="font-mono uppercase text-caps-sm text-teal font-semibold">
          CHECK-IN
        </p>
      </div>
      <h1 className="font-display italic font-extrabold text-display md:text-[48px] text-navy">
        Welcome back
      </h1>
      <hr className="mt-3 mb-8 w-12" />

      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="name@cit.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          revealable
          required
        />

        {error && (
          <p
            role="alert"
            className="font-mono uppercase text-caps-sm text-red-deep tracking-[0.05em]"
          >
            ⚠  {error}
          </p>
        )}

        <Button type="submit" variant="primary" loading={submitting}>
          Sign in
        </Button>
      </form>

      <div className="mt-6 flex items-center justify-between text-[14px]">
        <Link
          href="/forgot-password"
          className="text-navy hover:underline underline-offset-4 decoration-teal decoration-2"
        >
          Forgot password? →
        </Link>
      </div>

      <hr className="my-8" />

      <p className="text-slate text-[14px]">
        No account?{" "}
        <Link
          href="/signup"
          className="text-navy font-medium hover:underline underline-offset-4 decoration-teal decoration-2"
        >
          Sign up
        </Link>
      </p>
    </>
  );
}
