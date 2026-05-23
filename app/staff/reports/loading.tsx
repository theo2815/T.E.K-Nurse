import {
  SkeletonHeader,
  SkeletonBlock,
  SkeletonText,
} from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-6 md:px-12 py-12 md:py-16 flex flex-col gap-8">
      <SkeletonHeader />

      {/* Tab strip */}
      <div className="flex items-center gap-6 border-b border-rule pb-3">
        <SkeletonBlock width={140} height={14} />
        <SkeletonBlock width={160} height={14} />
        <SkeletonBlock width={140} height={14} />
        <SkeletonBlock width={170} height={14} />
      </div>

      {/* Range picker */}
      <div className="flex items-center gap-2 flex-wrap">
        <SkeletonBlock width={80} height={28} />
        <SkeletonBlock width={120} height={28} />
        <SkeletonBlock width={120} height={28} />
        <SkeletonBlock width={120} height={28} />
        <SkeletonBlock width={90} height={28} />
      </div>

      {/* Chart card */}
      <div className="bg-paper border-[1.5px] border-rule rounded p-5 md:p-6 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <SkeletonText width={180} height={11} />
          <div className="flex gap-6">
            <div className="flex flex-col gap-1 items-end">
              <SkeletonText width={60} height={11} />
              <SkeletonText width={48} height={36} />
            </div>
            <div className="flex flex-col gap-1 items-end">
              <SkeletonText width={60} height={11} />
              <SkeletonText width={48} height={36} />
            </div>
          </div>
        </div>
        <SkeletonBlock height={220} />
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-end gap-4">
        <SkeletonBlock width={220} height={36} />
        <SkeletonBlock width={220} height={36} />
        <SkeletonBlock width={220} height={36} />
      </div>

      {/* Table */}
      <div className="bg-paper border-[1.5px] border-rule rounded overflow-hidden">
        <div className="border-b border-rule px-4 py-3 flex items-center gap-4">
          <SkeletonText width={120} height={11} />
          <SkeletonText width={120} height={11} />
          <SkeletonText width={140} height={11} />
          <SkeletonText width={60} height={11} />
          <SkeletonText width={120} height={11} />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="px-4 py-4 border-b border-rule/60 last:border-b-0 flex items-center gap-4"
          >
            <SkeletonText width={140} height={14} />
            <SkeletonText width="40%" height={14} />
            <SkeletonText width={60} height={14} />
            <SkeletonText width={120} height={14} />
          </div>
        ))}
      </div>
    </div>
  );
}
