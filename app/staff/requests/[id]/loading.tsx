import {
  SkeletonBlock,
  SkeletonText,
} from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl px-6 md:px-12 py-12 md:py-16">
      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-3">
          <SkeletonText width={120} height={12} />
          <SkeletonText width={180} height={11} />
          <SkeletonText width="50%" height={32} />
          <div className="flex flex-col gap-1.5 mt-3">
            <SkeletonText width={240} height={13} />
            <SkeletonText width={160} height={13} />
          </div>
        </div>
        <hr className="border-rule" />

        <div className="flex flex-col gap-3">
          <SkeletonText width={130} height={11} />
          <div className="flex items-center gap-4">
            <SkeletonBlock width={88} height={88} className="shrink-0" />
            <div className="flex flex-col gap-2 flex-1">
              <SkeletonText width="60%" height={22} />
              <SkeletonText width="80%" height={14} />
            </div>
          </div>
        </div>

        <div className="grid gap-x-8 gap-y-6 md:grid-cols-[200px_1fr] md:items-baseline">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="contents">
              <SkeletonText width={120} height={11} />
              <SkeletonText width="50%" height={17} />
            </div>
          ))}
        </div>

        <hr className="border-rule" />

        <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-3">
          <SkeletonBlock width={160} height={48} />
          <SkeletonBlock width={180} height={48} />
        </div>
      </div>
    </div>
  );
}
