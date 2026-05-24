"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Camera,
  CameraOff,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import type { Html5Qrcode } from "html5-qrcode";

type ScanState =
  | { kind: "idle" }
  | { kind: "starting" }
  | { kind: "scanning" }
  | { kind: "denied" }
  | { kind: "no_camera" }
  | { kind: "error"; message: string };

type Props = {
  /** Called with the parsed qr_code when a frame is decoded. The parent owns
   *  the post-decode flow (open modal, fetch state, etc.). */
  onResolve: (qr: string) => void;
  /** External pause control. While true the camera feed is paused and decode
   *  callbacks are gated. When toggled back to false the scanner resumes and
   *  re-arms for the next decode. */
  paused: boolean;
};

const CONTAINER_ID = "tek-qr-reader";
/** Same QR can't re-fire within this window — prevents re-firing the moment
 *  a modal closes if the camera is still pointed at the just-scanned card. */
const DUP_DECODE_WINDOW_MS = 1500;

/**
 * Parse a scanned QR text into a SKU qr_code.
 * Accepts:
 *   - Our printed URL format: https://anywhere/s/{qr_code}[?query][#hash]
 *   - Bare ID format: STH-001, CTN, ABC-12 (2–5 caps + optional -digits)
 * Returns null for anything else.
 */
function extractQrCode(text: string): string | null {
  const trimmed = text.trim();
  const urlMatch = trimmed.match(/^https?:\/\/[^/]+\/s\/([^/?#]+)/i);
  if (urlMatch) {
    try {
      return decodeURIComponent(urlMatch[1]);
    } catch {
      return urlMatch[1];
    }
  }
  if (/^[A-Z]{2,5}(-\d+)?$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  return null;
}

export function QrScanner({ onResolve, paused }: Props) {
  const [state, setState] = useState<ScanState>({ kind: "idle" });
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lockRef = useRef(false);
  const lastDecodeRef = useRef<{ qr: string; at: number } | null>(null);
  const onResolveRef = useRef(onResolve);
  // Keep the resolve callback in a ref so the (long-lived) scanner.start
  // closure always invokes the latest parent handler without restarting.
  useEffect(() => {
    onResolveRef.current = onResolve;
  }, [onResolve]);

  // Cleanup on unmount — release the camera.
  // html5-qrcode's .stop() throws SYNCHRONOUSLY (not as a rejected promise)
  // when the scanner isn't running — so wrap in try/catch as well as .catch().
  useEffect(() => {
    return () => {
      const s = scannerRef.current;
      if (!s) return;
      scannerRef.current = null;
      try {
        const p = s.stop();
        if (p && typeof p.catch === "function") {
          p.catch(() => {}).finally(() => {
            try {
              s.clear();
            } catch {
              /* noop */
            }
          });
        }
      } catch {
        try {
          s.clear();
        } catch {
          /* noop */
        }
      }
    };
  }, []);

  // Sync the `paused` prop to the live scanner. Resuming also re-arms the
  // decode lock so the next QR in view can fire.
  useEffect(() => {
    const s = scannerRef.current;
    if (!s) return;
    if (state.kind !== "scanning") return;
    if (paused) {
      try {
        s.pause(true);
      } catch {
        /* noop */
      }
    } else {
      try {
        s.resume();
      } catch {
        /* noop */
      }
      lockRef.current = false;
    }
  }, [paused, state.kind]);

  // iOS Safari hardening: pause scanner when the tab is backgrounded so the
  // camera light goes off and resources are released; resume on return —
  // but only if the parent hasn't requested a pause for its own reasons.
  useEffect(() => {
    function onVisibility() {
      const s = scannerRef.current;
      if (!s) return;
      if (document.hidden) {
        try {
          s.pause(true);
        } catch {
          /* noop */
        }
      } else if (state.kind === "scanning" && !paused) {
        try {
          s.resume();
        } catch {
          /* noop */
        }
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () =>
      document.removeEventListener("visibilitychange", onVisibility);
  }, [state.kind, paused]);

  async function startCamera() {
    setState({ kind: "starting" });
    lockRef.current = false;
    try {
      // iOS WebViews and HTTP origins leave navigator.mediaDevices undefined.
      // Pre-check so we surface a real explanation instead of a cryptic
      // "cannot read property enumerateDevices of undefined" from html5-qrcode.
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.enumerateDevices
      ) {
        setState({
          kind: "error",
          message:
            "This browser doesn't expose camera APIs. Open T.E.K Nurse in Safari or Chrome over HTTPS, or use Find item below.",
        });
        return;
      }

      const mod = await import("html5-qrcode");
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = mod;

      // Enumerate cameras (this also triggers the permission prompt).
      // Works on both mobile (front + rear) and laptops (single webcam).
      const cameras = await Html5Qrcode.getCameras();
      if (!cameras || cameras.length === 0) {
        setState({ kind: "no_camera" });
        return;
      }
      // Prefer a rear-facing camera on phones; fall back to the first
      // available on laptops (webcam usually has no directional label).
      const back = cameras.find((c) =>
        /back|rear|environment/i.test(c.label ?? ""),
      );
      const cameraId = (back ?? cameras[0]).id;

      const scanner = new Html5Qrcode(CONTAINER_ID, {
        verbose: false,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      });
      scannerRef.current = scanner;

      await scanner.start(
        cameraId,
        {
          fps: 10,
          // No qrbox: html5-qrcode would render its own white overlay that
          // doesn't align with our custom cyan reticle. We scan the whole
          // frame and let the reticle be purely visual guidance.
        },
        (decodedText) => {
          if (lockRef.current) return;

          const qr = extractQrCode(decodedText);
          if (!qr) {
            // Not one of ours — re-arm and let the user try again.
            toast.error("Unrecognized QR code", {
              description:
                "That QR isn't in T.E.K Nurse format. Try scanning a card from this lab.",
            });
            return;
          }

          // Same QR scanned again too quickly — silently ignore so closing a
          // modal while still pointed at the card doesn't immediately re-fire.
          const last = lastDecodeRef.current;
          const now = Date.now();
          if (last && last.qr === qr && now - last.at < DUP_DECODE_WINDOW_MS) {
            return;
          }

          lockRef.current = true;
          lastDecodeRef.current = { qr, at: now };
          onResolveRef.current(qr);
        },
        () => {
          /* per-frame decode errors are normal — swallow */
        },
      );

      // iOS PWA hardening: html5-qrcode binds the MediaStream but the standalone
      // WebView often leaves the <video> in a paused/black state. Force the
      // inline-playback attributes (both the modern and legacy webkit forms) and
      // call .play() explicitly so the camera surface actually shows the feed.
      const video = document
        .getElementById(CONTAINER_ID)
        ?.querySelector("video");
      if (video) {
        video.setAttribute("playsinline", "true");
        video.setAttribute("webkit-playsinline", "true");
        video.setAttribute("autoplay", "true");
        video.setAttribute("muted", "true");
        video.muted = true; // iOS requires both the attribute and the property
        try {
          await video.play();
        } catch {
          /* Some iOS builds auto-play and reject the redundant .play() — the
             stream is already live, so this rejection is safe to swallow. */
        }
      }

      setState({ kind: "scanning" });
    } catch (err) {
      const name = (err as { name?: string } | undefined)?.name ?? "";
      const message =
        (err as { message?: string } | undefined)?.message ?? String(err);
      if (
        name === "NotAllowedError" ||
        /permission|denied/i.test(message)
      ) {
        setState({ kind: "denied" });
      } else if (name === "NotFoundError" || /no camera/i.test(message)) {
        setState({ kind: "no_camera" });
      } else {
        setState({ kind: "error", message });
      }
    }
  }

  async function retry() {
    const s = scannerRef.current;
    if (s) {
      try {
        await s.stop();
      } catch {
        /* noop */
      }
      try {
        s.clear();
      } catch {
        /* noop */
      }
      scannerRef.current = null;
    }
    lastDecodeRef.current = null;
    setState({ kind: "idle" });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Status bar */}
      <StatusBar state={state} paused={paused} />

      {/* Camera surface */}
      <div className="relative aspect-square w-full max-w-md mx-auto bg-navy-deep rounded overflow-hidden border-[1.5px] border-rule">
        {/* html5-qrcode mounts the <video> into this div */}
        <div id={CONTAINER_ID} className="absolute inset-0" />

        {/* Scanning overlay — reticle + cyan scan-line (hidden while paused) */}
        {state.kind === "scanning" && !paused && (
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
          >
            <div className="relative w-[60%] aspect-square">
              {/* Corners */}
              <CornerMark className="top-0 left-0" />
              <CornerMark className="top-0 right-0 rotate-90" />
              <CornerMark className="bottom-0 right-0 rotate-180" />
              <CornerMark className="bottom-0 left-0 -rotate-90" />
              {/* Animated scan line */}
              <div className="absolute inset-x-2 top-0 h-[2px] bg-teal shadow-[0_0_12px_2px_var(--color-teal)] animate-tek-scan" />
            </div>
          </div>
        )}

        {/* Overlays per state — anything other than scanning */}
        {state.kind === "idle" && (
          <Overlay>
            <div className="flex flex-col items-center text-center gap-4 px-6">
              <span
                aria-hidden
                className="size-14 rounded-fab bg-teal/20 border border-teal/40 flex items-center justify-center text-teal"
              >
                <Camera size={28} strokeWidth={1.75} />
              </span>
              <p className="font-display italic font-extrabold text-white text-[22px] leading-tight">
                Tap to start the camera
              </p>
              <p className="font-mono uppercase text-caps-sm text-white/70 tracking-[0.08em] max-w-[280px]">
                Camera frames stay on this device. Only the decoded ID is
                recorded.
              </p>
              <button
                type="button"
                onClick={startCamera}
                className="mt-1 inline-flex items-center justify-center gap-2 bg-teal text-white font-mono uppercase text-[14px] tracking-[0.12em] font-bold px-6 py-3 rounded transition-colors hover:bg-teal-deep active:bg-navy-deep"
              >
                <Camera size={16} strokeWidth={2} />
                Allow camera
              </button>
            </div>
          </Overlay>
        )}

        {state.kind === "starting" && (
          <Overlay>
            <div className="flex flex-col items-center gap-3">
              <span className="size-8 rounded-fab border-2 border-teal/30 border-t-teal animate-spin" />
              <p className="font-mono uppercase text-caps-sm text-white/80 tracking-[0.1em]">
                Starting camera…
              </p>
            </div>
          </Overlay>
        )}

        {state.kind === "denied" && (
          <Overlay tone="alert">
            <div className="flex flex-col items-center text-center gap-3 px-6">
              <span
                aria-hidden
                className="size-12 rounded-fab bg-red-deep/20 border border-red-deep/60 flex items-center justify-center text-red-deep"
              >
                <CameraOff size={26} strokeWidth={1.75} />
              </span>
              <p className="font-display italic font-extrabold text-white text-[20px] leading-tight">
                Camera blocked
              </p>
              <div className="font-mono text-[12px] text-white/80 tracking-[0.04em] text-left bg-black/30 rounded p-3 max-w-[320px]">
                <p className="uppercase text-caps-sm text-teal font-bold tracking-[0.1em] mb-2">
                  To enable:
                </p>
                <p>
                  <span className="text-white font-bold">iPhone (Safari):</span>{" "}
                  Settings → Safari → Camera → Allow
                </p>
                <p className="mt-1">
                  <span className="text-white font-bold">
                    iPhone (installed app):
                  </span>{" "}
                  Settings → T.E.K Nurse → Camera → Allow
                </p>
                <p className="mt-1">
                  <span className="text-white font-bold">Android:</span> tap the
                  lock icon in the address bar → Permissions → Camera
                </p>
              </div>
              <p className="font-mono uppercase text-caps-sm text-white/60 tracking-[0.08em]">
                Or use Find item below.
              </p>
            </div>
          </Overlay>
        )}

        {state.kind === "no_camera" && (
          <Overlay tone="alert">
            <div className="flex flex-col items-center text-center gap-3 px-6">
              <span
                aria-hidden
                className="size-12 rounded-fab bg-red-deep/20 border border-red-deep/60 flex items-center justify-center text-red-deep"
              >
                <AlertTriangle size={26} strokeWidth={1.75} />
              </span>
              <p className="font-display italic font-extrabold text-white text-[20px] leading-tight">
                No camera detected
              </p>
              <p className="font-mono uppercase text-caps-sm text-white/70 tracking-[0.08em] max-w-[280px]">
                This device has no usable camera. Use Find item below.
              </p>
            </div>
          </Overlay>
        )}

        {state.kind === "error" && (
          <Overlay tone="alert">
            <div className="flex flex-col items-center text-center gap-3 px-6">
              <span
                aria-hidden
                className="size-12 rounded-fab bg-red-deep/20 border border-red-deep/60 flex items-center justify-center text-red-deep"
              >
                <AlertTriangle size={26} strokeWidth={1.75} />
              </span>
              <p className="font-display italic font-extrabold text-white text-[20px] leading-tight">
                Camera error
              </p>
              <p className="font-mono text-[12px] text-white/70 tracking-[0.02em] max-w-[300px] break-words">
                {state.message}
              </p>
              <button
                type="button"
                onClick={retry}
                className="mt-1 inline-flex items-center justify-center gap-2 bg-teal text-white font-mono uppercase text-[13px] tracking-[0.12em] font-bold px-5 py-2.5 rounded transition-colors hover:bg-teal-deep"
              >
                <RotateCcw size={14} strokeWidth={2} />
                Try again
              </button>
            </div>
          </Overlay>
        )}
      </div>
    </div>
  );
}

function StatusBar({ state, paused }: { state: ScanState; paused: boolean }) {
  let label: string;
  let tone: "ready" | "live" | "alert" | "hold";

  if (state.kind === "scanning" && paused) {
    label = "HOLD · ACTION OPEN";
    tone = "hold";
  } else {
    switch (state.kind) {
      case "idle":
        label = "READY · TAP TO BEGIN";
        tone = "ready";
        break;
      case "starting":
        label = "INITIALIZING";
        tone = "live";
        break;
      case "scanning":
        label = "SCANNING · POINT AT QR";
        tone = "live";
        break;
      case "denied":
        label = "PERMISSION BLOCKED";
        tone = "alert";
        break;
      case "no_camera":
        label = "NO CAMERA";
        tone = "alert";
        break;
      case "error":
        label = "ERROR";
        tone = "alert";
        break;
    }
  }

  const dotColor =
    tone === "alert"
      ? "bg-red-deep"
      : tone === "hold"
        ? "bg-cyan"
        : tone === "live"
          ? "bg-teal"
          : "bg-slate/60";
  const labelColor =
    tone === "alert"
      ? "text-red-deep"
      : tone === "hold"
        ? "text-cyan"
        : tone === "live"
          ? "text-teal"
          : "text-slate";

  return (
    <div className="flex items-center gap-3">
      <span className="relative inline-flex">
        <span
          className={`absolute inline-flex h-2.5 w-2.5 rounded-fab ${dotColor} ${
            tone === "live" || tone === "alert" ? "animate-ping opacity-75" : ""
          }`}
        />
        <span
          className={`relative inline-flex h-2.5 w-2.5 rounded-fab ${dotColor}`}
        />
      </span>
      <p
        className={`font-mono uppercase text-caps-sm font-bold tracking-[0.1em] ${labelColor}`}
      >
        {label}
      </p>
    </div>
  );
}

function Overlay({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "alert" | "success";
}) {
  const bg =
    tone === "alert"
      ? "bg-navy-deep/95"
      : tone === "success"
        ? "bg-navy-deep/95"
        : "bg-navy-deep/85";
  return (
    <div
      className={`absolute inset-0 flex items-center justify-center ${bg} backdrop-blur-[1px]`}
    >
      {children}
    </div>
  );
}

function CornerMark({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`absolute size-6 border-teal ${className}`}
      style={{
        borderTopWidth: 3,
        borderLeftWidth: 3,
      }}
    />
  );
}
