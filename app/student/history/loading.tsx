import { SkeletonBlock, SkeletonText } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-6 md:px-12 py-12 md:py-16 flex flex-col gap-10">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <SkeletonText width={120} height={11} />
        <SkeletonText width="35%" height={44} />
        <SkeletonText width="80%" height={14} />
      </div>

      {/* Hero stat band */}
      <div className="bg-paper border-[1.5px] border-rule rounded p-5 md:p-7 grid grid-cols-2 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <SkeletonText width={120} height={11} />
            <SkeletonText width={70} height={42} />
          </div>
        ))}
      </div>

      {/* Section header */}
      <div className="flex items-center justify-between">
        <SkeletonText width={180} height={22} />
        <SkeletonText width={160} height={11} />
      </div>

      {/* Table rows */}
      <div className="bg-paper border-[1.5px] border-rule rounded overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="px-4 py-4 border-b border-rule/60 last:border-b-0 flex items-center gap-4"
          >
            <SkeletonText width={140} height={14} />
            <SkeletonBlock width={70} height={14} />
            <SkeletonText width="40%" height={14} />
            <SkeletonText width={50} height={14} className="ml-auto" />
            <SkeletonText width={80} height={14} />
          </div>
        ))}
      </div>
    </div>
  );
}
