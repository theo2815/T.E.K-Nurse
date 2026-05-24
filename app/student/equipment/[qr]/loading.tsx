import { SkeletonBlock, SkeletonText } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-6 md:px-12 py-12 md:py-16">
      <article className="flex flex-col gap-10">
        {/* Back link */}
        <SkeletonText width={60} height={11} />

        {/* HEADER ROW: title block (left) + photo (right) */}
        <header className="grid gap-8 md:grid-cols-[1fr_minmax(0,_320px)] md:items-start">
          <div className="flex flex-col gap-3">
            <SkeletonText width={140} height={11} />
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <SkeletonText width={120} height={20} />
              <SkeletonText width={90} height={12} />
            </div>
            <SkeletonText width="65%" height={48} />
            <div className="flex flex-col gap-2 mt-2">
              <SkeletonText width="80%" height={14} />
              <SkeletonText width="55%" height={14} />
            </div>
          </div>
          <SkeletonBlock width="100%" height={320} className="rounded" />
        </header>

        <hr className="border-rule" />

        {/* MAIN ROW: hero numeral + buckets (left) + aside (right) */}
        <div className="grid gap-10 md:grid-cols-[1fr_minmax(0,_320px)] md:items-start">
          <section className="flex flex-col gap-8">
            <div>
              <SkeletonText width={140} height={11} />
              <div className="mt-3 flex items-baseline gap-5 flex-wrap">
                <SkeletonText width={140} height={96} />
                <SkeletonText width={120} height={14} />
              </div>
            </div>

            <div className="grid grid-cols-4 divide-x divide-rule border-y border-rule">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center justify-center py-5 px-2 gap-2"
                >
                  <SkeletonText width={36} height={28} />
                  <SkeletonText width={48} height={11} />
                </div>
              ))}
            </div>
          </section>

          <aside className="flex flex-col gap-6">
            {/* Request CTA pill */}
            <SkeletonBlock width="100%" height={56} className="rounded" />

            {/* Location MetaBlock */}
            <div className="flex flex-col gap-2">
              <SkeletonText width={80} height={11} />
              <SkeletonText width="70%" height={17} />
            </div>

            {/* Low-stock alert MetaBlock */}
            <div className="flex flex-col gap-2">
              <SkeletonText width={120} height={11} />
              <SkeletonText width="85%" height={15} />
            </div>
          </aside>
        </div>
      </article>
    </div>
  );
}
