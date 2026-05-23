import { SkeletonBlock, SkeletonText } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-6 md:px-12 py-12 md:py-16 flex flex-col gap-10">
      <SkeletonText width={140} height={11} />

      {/* Profile header */}
      <div className="flex flex-col gap-6">
        <SkeletonText width={180} height={11} />
        <div className="flex gap-6">
          <SkeletonBlock width={96} height={96} className="rounded-fab" />
          <div className="flex-1 flex flex-col gap-3">
            <SkeletonText width="50%" height={40} />
            <SkeletonText width="35%" height={14} />
          </div>
        </div>
        <hr className="border-rule" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <SkeletonText width={100} height={11} />
              <SkeletonText width={60} height={36} />
            </div>
          ))}
        </div>
      </div>

      {/* Active loans */}
      <div className="flex flex-col gap-4">
        <SkeletonText width={180} height={20} />
        <div className="bg-paper border-[1.5px] border-rule rounded overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="px-4 py-4 border-b border-rule/60 last:border-b-0 flex items-center gap-4"
            >
              <SkeletonText width="40%" height={14} />
              <SkeletonText width={40} height={14} />
              <SkeletonText width={100} height={14} />
            </div>
          ))}
        </div>
      </div>

      {/* History */}
      <div className="flex flex-col gap-4">
        <SkeletonText width={220} height={20} />
        <div className="bg-paper border-[1.5px] border-rule rounded overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="px-4 py-4 border-b border-rule/60 last:border-b-0 flex items-center gap-4"
            >
              <SkeletonText width={140} height={14} />
              <SkeletonText width={80} height={14} />
              <SkeletonText width="35%" height={14} />
              <SkeletonText width={60} height={14} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
