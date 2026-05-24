import { SkeletonBlock, SkeletonText } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-6 md:px-12 py-12 md:py-16 flex flex-col gap-10">
      <SkeletonText width={140} height={11} />

      {/* Identity strip — teal-bar block */}
      <div className="border-l-4 border-teal bg-paper rounded-r px-5 md:px-7 py-4 md:py-5 flex items-center gap-4">
        <SkeletonBlock width={48} height={48} className="rounded-fab" />
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <SkeletonText width="40%" height={30} />
            <SkeletonText width={64} height={20} />
          </div>
          <SkeletonText width="70%" height={12} />
        </div>
      </div>

      {/* Three sections: Profile / Security / Sessions */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-5">
          <div className="flex items-baseline gap-3">
            <SkeletonText width={90} height={13} />
            <span aria-hidden className="flex-1 h-px bg-rule" />
          </div>
          <SkeletonBlock width="100%" height={148} className="rounded" />
        </div>
      ))}
    </div>
  );
}
