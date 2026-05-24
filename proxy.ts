import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image, favicon, public assets
     * - manifest.webmanifest (PWA manifest must be publicly reachable)
     * - sw.js (service worker must be served unauthenticated from root scope)
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|textures|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
