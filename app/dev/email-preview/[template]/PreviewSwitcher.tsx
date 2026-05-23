"use client";

import { useState } from "react";

type Props = {
  html: string;
  text: string;
};

export function PreviewSwitcher({ html, text }: Props) {
  const [mode, setMode] = useState<"html" | "text">("html");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMode("html")}
          className={`px-3 py-1.5 font-mono uppercase text-[11px] tracking-[0.1em] border-[1.5px] transition-colors ${
            mode === "html"
              ? "bg-navy text-paper border-navy"
              : "bg-paper text-slate border-rule hover:border-navy"
          }`}
        >
          HTML
        </button>
        <button
          type="button"
          onClick={() => setMode("text")}
          className={`px-3 py-1.5 font-mono uppercase text-[11px] tracking-[0.1em] border-[1.5px] transition-colors ${
            mode === "text"
              ? "bg-navy text-paper border-navy"
              : "bg-paper text-slate border-rule hover:border-navy"
          }`}
        >
          PLAIN TEXT
        </button>
      </div>

      {mode === "html" ? (
        <iframe
          title="Email HTML preview"
          srcDoc={html}
          className="w-full border-[1.5px] border-rule rounded bg-white"
          style={{ height: "calc(100vh - 220px)", minHeight: "640px" }}
        />
      ) : (
        <pre
          className="bg-paper border-[1.5px] border-rule rounded p-6 font-mono text-[13px] text-navy whitespace-pre-wrap leading-relaxed overflow-auto"
          style={{ height: "calc(100vh - 220px)", minHeight: "640px" }}
        >
          {text}
        </pre>
      )}
    </div>
  );
}
