"use client";

import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { MonoId } from "@/components/ui/MonoId";
import { StatusText, type Status } from "@/components/ui/StatusText";
import { PhotoFrame } from "@/components/catalog/PhotoFrame";

type Tone = "ok" | "danger" | "muted";

export function SkuCard({
  href,
  qr,
  status,
  name,
  description,
  meta,
  count,
  countLabel,
  countTone = "ok",
  photoUrl,
  selected,
  onToggle,
}: {
  href: string;
  qr: string;
  status: Status;
  name: string;
  description?: string | null;
  meta?: string | null;
  count: string;
  countLabel?: string;
  countTone?: Tone;
  photoUrl?: string | null;
  /** When defined, the card becomes selectable. Toggles override link nav. */
  onToggle?: () => void;
  selected?: boolean;
}) {
  const isAlert = status === "OVERDUE" || status === "LOST";
  const countColor =
    countTone === "danger"
      ? "text-red-deep"
      : countTone === "muted"
      ? "text-slate"
      : "text-navy";

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggle?.();
  };

  const selectedClass = selected
    ? "ring-[1.5px] ring-teal bg-teal/5"
    : "";

  return (
    <Link
      href={href}
      className="group block focus:outline-none focus-visible:[&>*]:border-teal"
    >
      <Card variant={isAlert ? "alert" : "default"} className={`cursor-pointer ${selectedClass}`}>
        <div className="flex gap-4">
          {onToggle && (
            <button
              type="button"
              onClick={handleCheckboxClick}
              aria-pressed={!!selected}
              aria-label={selected ? `Deselect ${name}` : `Select ${name}`}
              className={`shrink-0 size-6 mt-1 rounded border-[1.5px] flex items-center justify-center transition-colors ${
                selected
                  ? "bg-teal border-teal text-white hover:bg-teal-deep hover:border-teal-deep"
                  : "bg-paper border-rule hover:border-teal"
              }`}
            >
              {selected && <Check size={14} strokeWidth={3} />}
            </button>
          )}

          <PhotoFrame
            src={photoUrl}
            alt={name}
            size="thumb"
            className="shrink-0"
          />

          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-baseline justify-between gap-3">
              <MonoId id={qr} />
              <StatusText status={status} emphatic={isAlert} />
            </div>

            <h3 className="mt-2 font-display italic font-extrabold text-[20px] leading-tight text-navy line-clamp-1">
              {name}
            </h3>
            {description && (
              <p className="mt-1 text-[14px] text-slate leading-snug line-clamp-2">
                {description}
              </p>
            )}
            {meta && (
              <p className="mt-1 font-mono uppercase text-caps-sm text-slate tracking-[0.08em] line-clamp-1">
                {meta}
              </p>
            )}

            <div className="mt-auto pt-3 flex items-end justify-between gap-3">
              <div className="flex items-baseline gap-2">
                <span
                  className={`font-display italic font-extrabold text-[26px] leading-none ${countColor}`}
                >
                  {count}
                </span>
                {countLabel && (
                  <span className="font-mono uppercase text-caps-sm font-semibold tracking-[0.1em] text-slate">
                    {countLabel}
                  </span>
                )}
              </div>
              <ChevronRight
                size={22}
                strokeWidth={1.75}
                className="text-slate/70 transition-colors group-hover:text-teal"
                aria-hidden
              />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
