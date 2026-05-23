import Image from "next/image";
import { Camera } from "lucide-react";

type Size = "tiny" | "thumb" | "hero";

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
    size === "tiny"
      ? "w-9 h-9"
      : size === "thumb"
      ? "w-20 h-20"
      : "aspect-[4/3] w-full max-w-md";

  if (src) {
    const dimAttrs =
      size === "tiny"
        ? { width: 36, height: 36 }
        : size === "thumb"
        ? { width: 80, height: 80 }
        : { width: 480, height: 360 };
    return (
      <div className={`${dims} rounded border-[1.5px] border-rule overflow-hidden bg-mist ${className}`}>
        <Image
          src={src}
          alt={alt}
          {...dimAttrs}
          className="w-full h-full object-cover"
          unoptimized
        />
      </div>
    );
  }

  const iconSize = size === "tiny" ? 14 : size === "thumb" ? 20 : 32;

  return (
    <div
      aria-label={`No photo for ${alt}`}
      className={`${dims} rounded border-[1.5px] border-dashed border-rule bg-mist flex flex-col items-center justify-center gap-2 text-slate/60 ${className}`}
    >
      <Camera size={iconSize} strokeWidth={1.5} />
      {size === "hero" && (
        <span className="font-mono uppercase text-caps-sm font-semibold tracking-[0.1em]">
          No photo
        </span>
      )}
    </div>
  );
}
