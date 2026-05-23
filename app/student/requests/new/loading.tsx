import { SkeletonBlock, SkeletonText } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-6 md:px-12 py-12 md:py-16">
      <div className="flex flex-col gap-10">
        <SkeletonText width={140} height={12} />
        <div className="flex flex-col gap-3">
          <SkeletonText width={180} height={11} />
          <SkeletonText width="55%" height={32} />
        </div>
        <hr className="border-rule" />
        <div className="grid gap-x-8 gap-y-6 md:grid-cols-[200px_1fr] md:items-baseline">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="contents">
              <SkeletonText width={120} height={11} />
              <SkeletonBlock width="100%" height={48} />
            </div>
          ))}
        </div>
        <hr className="border-rule" />
        <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-3">
          <SkeletonBlock width={80} height={20} />
          <SkeletonBlock width={180} height={48} />
        </div>
      </div>
    </div>
  );
}
