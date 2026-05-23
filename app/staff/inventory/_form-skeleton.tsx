import { SkeletonBlock, SkeletonText } from "@/components/ui/Skeleton";

/**
 * Shared SKU-form skeleton — both equipment and consumable create/edit pages
 * fall back to this shape via their `loading.tsx` files. Lives under
 * `_form-skeleton` (leading underscore) so Next doesn't treat it as a route.
 */
export function FormSkeleton({
  kind,
}: {
  kind: "equipment" | "consumable";
  /** Reserved for future mode-specific differences. */
  mode: "new" | "edit";
}) {
  const fields = kind === "consumable" ? 6 : 5;
  return (
    <div className="mx-auto max-w-5xl px-6 md:px-12 py-12 md:py-16">
      <div className="flex flex-col gap-10">
        <SkeletonText width={140} height={12} />
        <div className="flex flex-col gap-3">
          <SkeletonText width={180} height={11} />
          <SkeletonText width="50%" height={32} />
        </div>
        <hr className="border-rule" />
        <div className="grid gap-8 md:grid-cols-[1fr_minmax(0,_320px)] md:items-start">
          <div className="flex flex-col gap-5">
            {Array.from({ length: fields }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <SkeletonText width={120} height={11} />
                <SkeletonBlock width="100%" height={48} />
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <SkeletonBlock width={160} height={48} />
              <SkeletonBlock width={80} height={20} />
            </div>
          </div>
          <SkeletonBlock width="100%" height={280} className="rounded" />
        </div>
      </div>
    </div>
  );
}
