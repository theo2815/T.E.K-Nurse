import { SkeletonHeader, SkeletonRow } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-6 md:px-12 py-12 md:py-16">
      <div className="flex flex-col gap-8">
        <SkeletonHeader />
        <hr className="border-rule" />
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
