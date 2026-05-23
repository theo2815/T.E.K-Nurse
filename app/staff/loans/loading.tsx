import {
  SkeletonHeader,
  SkeletonRow,
  SkeletonBlock,
} from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-6 md:px-12 py-12 md:py-16">
      <div className="flex flex-col gap-8">
        <SkeletonHeader />
        <div className="flex items-center gap-3 flex-wrap">
          <SkeletonBlock width={120} height={32} />
          <SkeletonBlock width={120} height={32} />
          <SkeletonBlock width={120} height={32} />
        </div>
        <ul className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i}>
              <SkeletonRow />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
