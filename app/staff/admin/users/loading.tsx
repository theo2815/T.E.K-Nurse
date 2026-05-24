import { SkeletonHeader, SkeletonBlock, SkeletonText } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-6 md:px-12 py-12 md:py-16 flex flex-col gap-8">
      <SkeletonHeader />
      <SkeletonText width="60%" height={14} />
      <div className="flex gap-6 border-b border-rule">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonText key={i} width={64} height={14} />
        ))}
      </div>
      <SkeletonBlock width={384} height={42} />
      <div className="bg-paper border-[1.5px] border-rule rounded overflow-hidden">
        <div className="border-b border-rule px-4 py-3 flex items-center gap-4">
          <SkeletonText width={160} height={11} />
          <SkeletonText width={80} height={11} />
          <SkeletonText width={80} height={11} />
          <SkeletonText width={80} height={11} />
          <SkeletonText width={120} height={11} />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="px-4 py-4 border-b border-rule/60 last:border-b-0 flex items-center gap-4"
          >
            <SkeletonBlock width={36} height={36} className="rounded-fab shrink-0" />
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              <SkeletonText width="40%" height={14} />
              <SkeletonText width="32%" height={12} />
            </div>
            <SkeletonText width={64} height={20} />
            <SkeletonText width={96} height={12} />
            <SkeletonText width={96} height={28} />
          </div>
        ))}
      </div>
    </div>
  );
}
