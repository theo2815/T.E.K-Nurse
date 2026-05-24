import { ConsoleConnectingSplash } from "@/components/loading/ConsoleConnectingSplash";

/**
 * Root-level loading state. Catches the white-flash gap during the
 * `/login → / → /staff|/student/home` redirect chain — `app/page.tsx` is
 * a server component that does two DB queries (session + role) before
 * its redirect resolves, and without this fallback the user sees the
 * body background during that ~100–400ms window.
 *
 * Also catches any other unhandled cold-load (e.g. PWA launch landing
 * straight on /, hard-refresh bookmarks). Nested layout-level
 * loading.tsx files (app/staff/loading.tsx, app/student/loading.tsx)
 * take precedence inside their segments.
 */
export default function Loading() {
  return <ConsoleConnectingSplash />;
}
