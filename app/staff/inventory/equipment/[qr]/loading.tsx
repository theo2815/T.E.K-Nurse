import {
  SkeletonBlock,
  SkeletonText,
} from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-6 md:px-12 py-12 md:py-16">
      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-3">
          <SkeletonText width={140} height={12} />
          <SkeletonText width={200} height={11} />
          <SkeletonText width="55%" height={32} />
        </div>
        <hr className="border-rule" />
        <div className="grid gap-8 md:grid-cols-[280px_1fr] md:items-start">
          <SkeletonBlock width="100%" height={280} className="rounded" />
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-paper border-[1.5px] border-rule rounded p-4 flex flex-col gap-2"
                >
                  <SkeletonText width={70} height={11} />
                  <SkeletonText width={40} height={28} />
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <SkeletonText width={120} height={11} />
              <SkeletonText width="80%" height={14} />
              <SkeletonText width="60%" height={14} />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <SkeletonBlock width={160} height={48} />
              <SkeletonBlock width={140} height={48} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
