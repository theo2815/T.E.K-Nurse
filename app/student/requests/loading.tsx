import {
  SkeletonBlock,
  SkeletonHeader,
  SkeletonRow,
} from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl px-6 md:px-12 py-12 md:py-16">
      <div className="flex flex-col gap-8">
        <SkeletonHeader />
        <div className="flex items-center gap-2 border-b border-rule">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} width={88} height={36} />
          ))}
        </div>
        <ul className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i}>
              <SkeletonRow />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
