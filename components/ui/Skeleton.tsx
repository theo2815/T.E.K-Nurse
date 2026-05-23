/**
 * Card Catalog skeleton primitives. Used by per-route `loading.tsx` files to
 * render the shape of the page while server data fetches. No shimmer, no
 * gradient sweep, no glow — just static placeholder geometry in the same
 * `bg-rule/30` tint everywhere so the page reads as "this is a placeholder."
 */

type BlockProps = {
  className?: string;
  width?: string | number;
  height?: string | number;
};

export function SkeletonBlock({ className = "", width, height }: BlockProps) {
  return (
    <div
      aria-hidden
      className={`bg-rule/30 rounded-sm ${className}`}
      style={{ width, height }}
    />
  );
}

export function SkeletonText({
  className = "",
  width = "100%",
  height = "1em",
}: BlockProps) {
  return (
    <SkeletonBlock
      className={`block ${className}`}
      width={width}
      height={height}
    />
  );
}

/** Eyebrow caps line + title block — matches the Card Catalog page header. */
export function SkeletonHeader({
  hasEyebrow = true,
}: {
  hasEyebrow?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      {hasEyebrow && <SkeletonText width={160} height={11} />}
      <SkeletonText width="60%" height={36} />
    </div>
  );
}

/** SKU card placeholder — mirrors `<SkuCard>` shape so the layout doesn't
 *  shift when real cards render. */
export function SkeletonCard() {
  return (
    <div className="bg-paper border-[1.5px] border-rule rounded p-4 flex gap-4">
      <SkeletonBlock className="shrink-0" width={88} height={88} />
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        <SkeletonText width={92} height={11} />
        <SkeletonText width="80%" height={18} />
        <SkeletonText width="60%" height={13} />
        <div className="mt-auto">
          <SkeletonText width={140} height={11} />
        </div>
      </div>
    </div>
  );
}

/** Row placeholder — matches list pages (loans, requests queue, etc.). */
export function SkeletonRow() {
  return (
    <div className="bg-paper border-[1.5px] border-rule rounded px-5 py-4 flex items-center gap-5">
      <SkeletonBlock width={44} height={44} className="rounded-full shrink-0" />
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        <SkeletonText width="50%" height={16} />
        <SkeletonText width="32%" height={12} />
      </div>
      <SkeletonText width={84} height={12} />
    </div>
  );
}
