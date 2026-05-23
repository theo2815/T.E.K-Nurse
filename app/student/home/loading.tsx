import { SkeletonBlock, SkeletonText } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-6 md:px-12 py-12 md:py-16 flex flex-col gap-10">
      {/* Hero greeting */}
      <div className="flex flex-col gap-3">
        <SkeletonText width={140} height={11} />
        <SkeletonText width="55%" height={56} />
        <SkeletonText width={260} height={11} />
      </div>

      {/* 2-col content */}
      <div className="grid gap-10 md:grid-cols-[minmax(0,_1fr)_280px] md:items-start">
        {/* Main column */}
        <div className="flex flex-col gap-10 min-w-0">
          {/* Due back */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <SkeletonText width={140} height={14} />
              <SkeletonText width={160} height={11} />
            </div>
            <div className="bg-paper border-[1.5px] border-rule rounded overflow-hidden">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="px-4 py-4 border-b border-rule/60 last:border-b-0 flex items-start gap-4"
                >
                  <SkeletonBlock width={36} height={36} className="rounded-fab" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <SkeletonText width="45%" height={15} />
                    <SkeletonText width="35%" height={11} />
                  </div>
                  <SkeletonText width={80} height={11} />
                </div>
              ))}
            </div>
          </div>

          {/* Recent activity */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <SkeletonText width={160} height={14} />
              <SkeletonText width={140} height={11} />
            </div>
            <div className="flex flex-col">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 py-3.5 border-t first:border-t-0 border-rule/60"
                >
                  <SkeletonText width={90} height={11} />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <SkeletonText width="50%" height={15} />
                    <SkeletonText width={60} height={11} />
                  </div>
                  <SkeletonText width={60} height={11} />
                </div>
              ))}
            </div>
          </div>

          {/* How borrowing works */}
          <div className="border-[1.5px] border-rule rounded bg-paper p-6 md:p-7 flex flex-col gap-5">
            <SkeletonText width={180} height={14} />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4">
                <SkeletonBlock width={36} height={36} className="rounded-fab" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <SkeletonText width="40%" height={16} />
                  <SkeletonText width="85%" height={13} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right rail */}
        <div className="flex flex-col gap-3">
          <SkeletonText width={120} height={11} />
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBlock key={i} width="100%" height={52} />
          ))}
        </div>
      </div>
    </div>
  );
}
