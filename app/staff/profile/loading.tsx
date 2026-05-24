import { SkeletonBlock, SkeletonText } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-6 md:px-12 py-12 md:py-16 flex flex-col gap-10">
      <SkeletonText width={140} height={11} />

      {/* Identity strip — teal-bar block */}
      <div className="border-l-4 border-teal bg-paper rounded-r px-5 md:px-7 py-5 md:py-6 flex items-center gap-5">
        <SkeletonBlock width={64} height={64} className="rounded-fab" />
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <SkeletonText width="55%" height={40} />
            <SkeletonText width={64} height={20} />
          </div>
          <SkeletonText width="80%" height={12} />
        </div>
      </div>

      {/* Vitals row — 3 stats */}
      <div className="flex flex-col gap-5">
        <SkeletonText width={120} height={13} />
        <div className="grid gap-x-6 gap-y-6 grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <SkeletonText width={64} height={44} />
              <SkeletonBlock width={48} height={2} />
              <SkeletonText width={84} height={11} />
            </div>
          ))}
        </div>
      </div>

      {/* Transmission log */}
      <div className="flex flex-col gap-4">
        <SkeletonText width={180} height={13} />
        <div className="bg-paper border-[1.5px] border-rule rounded overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="px-5 py-3 border-b border-rule/60 last:border-b-0 grid grid-cols-[88px_minmax(0,_1fr)] gap-3 items-baseline"
            >
              <SkeletonText width={48} height={11} />
              <SkeletonText width="60%" height={14} />
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="md:border-[1.5px] md:border-rule md:rounded md:overflow-hidden flex flex-col md:flex-row gap-2 md:gap-0">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 px-4 py-4 flex items-center justify-between gap-3"
          >
            <SkeletonText width={130} height={12} />
            <SkeletonText width={16} height={16} />
          </div>
        ))}
      </div>
    </div>
  );
}
