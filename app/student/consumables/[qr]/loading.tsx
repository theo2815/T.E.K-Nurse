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
            <SkeletonText width={150} height={11} />
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

        {/* MAIN ROW: hero stock + lots table (left) + aside (right) */}
        <div className="grid gap-10 md:grid-cols-[1fr_minmax(0,_320px)] md:items-start">
          <section className="flex flex-col gap-8">
            {/* Hero stock numeral */}
            <div>
              <SkeletonText width={90} height={11} />
              <div className="mt-3 flex items-baseline gap-5 flex-wrap">
                <SkeletonText width={140} height={96} />
                <div className="flex flex-col gap-2">
                  <SkeletonText width={80} height={14} />
                  <SkeletonText width={120} height={11} />
                </div>
              </div>
            </div>

            {/* Read-only lots table */}
            <div>
              <SkeletonText width={130} height={11} className="mb-3" />
              <div className="border border-rule rounded overflow-hidden">
                <div className="bg-mist px-4 py-3 grid grid-cols-[1fr_1fr_auto] gap-4">
                  <SkeletonText width={36} height={11} />
                  <SkeletonText width={60} height={11} />
                  <SkeletonText width={80} height={11} />
                </div>
                <div className="divide-y divide-rule">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-paper px-4 py-3 grid grid-cols-[1fr_1fr_auto] gap-4 items-center"
                    >
                      <SkeletonText width={70} height={14} />
                      <div className="flex flex-col gap-1.5">
                        <SkeletonText width={110} height={15} />
                        <SkeletonText width={70} height={11} />
                      </div>
                      <div className="flex items-baseline gap-1">
                        <SkeletonText width={36} height={22} />
                        <SkeletonText width={28} height={11} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <aside className="flex flex-col gap-6">
            {/* Request CTA pill */}
            <SkeletonBlock width="100%" height={56} className="rounded" />

            {/* Per-request limit MetaBlock */}
            <div className="flex flex-col gap-2">
              <SkeletonText width={130} height={11} />
              <SkeletonText width="75%" height={15} />
            </div>

            {/* Low-stock alert MetaBlock */}
            <div className="flex flex-col gap-2">
              <SkeletonText width={120} height={11} />
              <SkeletonText width="85%" height={15} />
            </div>

            {/* Expiry warning MetaBlock */}
            <div className="flex flex-col gap-2">
              <SkeletonText width={110} height={11} />
              <SkeletonText width="70%" height={15} />
            </div>
          </aside>
        </div>
      </article>
    </div>
  );
}
