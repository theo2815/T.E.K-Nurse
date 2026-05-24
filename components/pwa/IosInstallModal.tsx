"use client";

import { Share } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

export function IosInstallModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add T.E.K Nurse to your Home Screen"
      eyebrow="INSTALL · IOS"
      status="SAFARI"
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="font-mono uppercase text-[12px] tracking-[0.08em] font-bold text-paper bg-navy hover:bg-navy-deep px-4 py-2.5 rounded transition-colors"
          >
            Got it
          </button>
        </div>
      }
    >
      <p className="text-navy text-[15px] leading-relaxed">
        Safari can install T.E.K Nurse as an app on your home screen — full
        screen, no browser chrome, faster to open.
      </p>

      <ol className="mt-6 space-y-5">
        <Step n={1}>
          <span className="inline-flex items-center gap-1.5 align-middle">
            Tap the
            <span
              aria-hidden
              className="inline-flex items-center justify-center w-7 h-7 rounded border-[1.5px] border-rule bg-mist text-navy"
            >
              <Share size={14} strokeWidth={1.75} />
            </span>
            <span className="font-semibold">Share</span> button at the bottom
            of Safari.
          </span>
        </Step>
        <Step n={2}>
          Scroll the action list and tap{" "}
          <span className="font-semibold">&ldquo;Add to Home Screen&rdquo;</span>.
        </Step>
        <Step n={3}>
          Tap <span className="font-semibold">Add</span> in the top-right
          corner. The icon will appear on your home screen.
        </Step>
      </ol>

      <p className="mt-6 pt-4 border-t border-rule font-mono uppercase text-[11px] tracking-[0.1em] text-slate">
        Note · only Safari can install web apps on iOS. Chrome and Firefox on
        iPhone use Safari&apos;s engine but can&apos;t install.
      </p>
    </Modal>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden
        className="shrink-0 w-7 h-7 rounded-fab bg-navy text-paper font-mono text-[12px] font-bold flex items-center justify-center"
      >
        {n}
      </span>
      <span className="text-navy text-[15px] leading-relaxed pt-0.5">
        {children}
      </span>
    </li>
  );
}
