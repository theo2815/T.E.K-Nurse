import { SkeletonBlock, SkeletonText } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl px-6 md:px-12 py-12 md:py-16">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <SkeletonText width={120} height={11} />
          <SkeletonText width="40%" height={32} />
        </div>
        <SkeletonBlock width="100%" height={420} className="rounded" />
        <div className="flex flex-col gap-2">
          <SkeletonText width={100} height={11} />
          <SkeletonBlock width="100%" height={48} />
        </div>
      </div>
    </div>
  );
}
