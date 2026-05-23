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

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-paper border-[1.5px] border-rule rounded p-5 flex flex-col gap-3"
            >
              <SkeletonText width={84} height={11} />
              <SkeletonBlock width={64} height={40} />
              <SkeletonText width="70%" height={14} />
            </div>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="bg-paper border-[1.5px] border-rule rounded p-5 flex flex-col gap-4"
            >
              <SkeletonText width={120} height={12} />
              {Array.from({ length: 4 }).map((__, j) => (
                <div key={j} className="flex items-center gap-3">
                  <SkeletonBlock width={36} height={36} className="rounded shrink-0" />
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <SkeletonText width="60%" height={14} />
                    <SkeletonText width="40%" height={11} />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
