import {
  SkeletonBlock,
  SkeletonText,
} from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-6 md:px-12 py-12 md:py-16">
      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-3">
          <SkeletonText width={120} height={12} />
          <SkeletonText width={180} height={11} />
          <SkeletonText width="60%" height={32} />
        </div>
        <hr className="border-rule" />
        <div className="flex items-center gap-4">
          <SkeletonBlock width={88} height={88} className="shrink-0" />
          <div className="flex flex-col gap-2 flex-1">
            <SkeletonText width="60%" height={22} />
            <SkeletonText width="80%" height={14} />
          </div>
        </div>
        <div className="grid gap-x-8 gap-y-6 md:grid-cols-[180px_1fr] md:items-baseline">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="contents">
              <SkeletonText width={120} height={11} />
              <SkeletonText width="50%" height={17} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
