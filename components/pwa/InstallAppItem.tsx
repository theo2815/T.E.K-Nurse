"use client";

import { Download, Share } from "lucide-react";
import { useInstallability } from "@/lib/pwa/use-installability";

/**
 * Menu row that offers app install. Hidden when the app is already installed,
 * when the browser doesn't support PWA install, or on iOS browsers that aren't
 * Safari.
 *
 * - On Chromium / Android / desktop installable browsers: fires the deferred
 *   `beforeinstallprompt` event captured by `useInstallability`.
 * - On iOS Safari: calls `onIosRequest` so the parent can open the step-by-step
 *   add-to-home-screen modal.
 */
export function InstallAppItem({
  className,
  onSelect,
  onIosRequest,
}: {
  className: string;
  onSelect: () => void;
  onIosRequest: () => void;
}) {
  const { mode, install } = useInstallability();

  if (mode === "none") return null;

  const isIos = mode === "ios";
  const Icon = isIos ? Share : Download;

  return (
    <button
      type="button"
      role="menuitem"
      onClick={async () => {
        onSelect();
        if (isIos) {
          onIosRequest();
          return;
        }
        await install();
      }}
      className={className}
    >
      <Icon size={16} strokeWidth={1.5} />
      Install app
    </button>
  );
}
