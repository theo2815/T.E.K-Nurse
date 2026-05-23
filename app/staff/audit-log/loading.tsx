import {
  SkeletonBlock,
  SkeletonHeader,
  SkeletonText,
} from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-6 md:px-12 py-12 md:py-16 flex flex-col gap-8">
      <SkeletonHeader />

      {/* Range picker */}
      <div className="flex items-center gap-2 flex-wrap">
        <SkeletonBlock width={80} height={28} />
        <SkeletonBlock width={120} height={28} />
        <SkeletonBlock width={120} height={28} />
        <SkeletonBlock width={120} height={28} />
        <SkeletonBlock width={90} height={28} />
      </div>

      {/* Hero stat band */}
      <div className="grid grid-cols-3 gap-4 md:gap-6 bg-paper border-[1.5px] border-rule rounded p-5 md:p-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <SkeletonText width={60} height={11} />
            <SkeletonText width={70} height={42} />
            <SkeletonText width={80} height={11} />
          </div>
        ))}
      </div>

      {/* Filter rail */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="flex flex-col gap-2">
          <SkeletonText width={60} height={11} />
          <SkeletonBlock height={42} />
        </div>
        <div className="flex flex-col gap-2">
          <SkeletonText width={60} height={11} />
          <SkeletonBlock height={42} />
        </div>
      </div>

      {/* Entity chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBlock key={i} width={100} height={28} />
        ))}
      </div>

      {/* Table */}
      <div className="bg-paper border-[1.5px] border-rule rounded overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="px-4 md:px-5 py-4 border-b border-rule/60 last:border-b-0 flex items-center gap-4"
          >
            <SkeletonBlock width={14} height={14} />
            <SkeletonText width={140} height={14} />
            <SkeletonText width="30%" height={14} />
            <SkeletonText width="20%" height={14} />
            <SkeletonText width={70} height={11} />
          </div>
        ))}
      </div>
    </div>
  );
}
