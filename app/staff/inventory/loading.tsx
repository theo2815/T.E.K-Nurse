import {
  SkeletonBlock,
  SkeletonCard,
  SkeletonHeader,
  SkeletonText,
} from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-6 md:px-12 py-12 md:py-16">
      <div className="flex flex-col gap-8">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <SkeletonHeader />
          <SkeletonBlock width={140} height={44} />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <SkeletonBlock width={120} height={32} />
          <SkeletonBlock width={120} height={32} />
          <SkeletonBlock width={260} height={36} className="ml-auto" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <SkeletonText width={200} height={12} />
      </div>
    </div>
  );
}
