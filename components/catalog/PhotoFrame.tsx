import { Camera } from "lucide-react";

type Size = "thumb" | "hero";

export function PhotoFrame({
  src,
  alt,
  size = "hero",
  className = "",
}: {
  src: string | null | undefined;
  alt: string;
  size?: Size;
  className?: string;
}) {
  const dims =
    size === "thumb"
      ? "w-20 h-20"
      : "aspect-[4/3] w-full max-w-md";

  if (src) {
    // Using plain <img> intentionally — photo_url can come from any Supabase
    // Storage host. next/image needs a configured remotePatterns list which
    // belongs in Phase 7 when upload lands.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={`${dims} rounded border-[1.5px] border-rule object-cover bg-mist ${className}`}
      />
    );
  }

  return (
    <div
      aria-label={`No photo for ${alt}`}
      className={`${dims} rounded border-[1.5px] border-dashed border-rule bg-mist flex flex-col items-center justify-center gap-2 text-slate/60 ${className}`}
    >
      <Camera size={size === "thumb" ? 20 : 32} strokeWidth={1.5} />
      {size === "hero" && (
        <span className="font-mono uppercase text-caps-sm font-semibold tracking-[0.1em]">
          No photo
        </span>
      )}
    </div>
  );
}
