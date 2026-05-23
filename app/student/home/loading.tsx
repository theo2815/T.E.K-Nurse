import {
  SkeletonBlock,
  SkeletonHeader,
  SkeletonText,
} from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-6 md:px-12 py-12 md:py-16">
      <div className="flex flex-col gap-10">
        <SkeletonHeader />
        <hr className="border-rule" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-paper border-[1.5px] border-rule rounded p-5 flex flex-col gap-3"
            >
              <SkeletonText width={100} height={11} />
              <SkeletonText width="80%" height={20} />
              <SkeletonText width="60%" height={13} />
              <SkeletonBlock width={120} height={36} className="mt-3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
