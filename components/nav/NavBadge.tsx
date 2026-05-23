/**
 * Red pip with a count. Two flavors:
 *   • variant="inline"   — trailing badge for SideNav rows (desktop).
 *   • variant="overlay"  — absolute-positioned for BottomNav tab icons (mobile).
 * Mirrors the bell badge in NotificationBell so "red pip" reads as one
 * visual idea across the app regardless of where it appears.
 */
type Props = {
  count: number;
  variant: "inline" | "overlay";
  label?: string;
};

export function NavBadge({ count, variant, label }: Props) {
  if (count <= 0) return null;
  const display = count > 99 ? "99+" : String(count);
  const aria = label ? `${label}, ${display} pending` : `${display} pending`;

  if (variant === "overlay") {
    return (
      <span
        aria-label={aria}
        className="absolute -top-1 -right-2 min-w-[18px] h-[18px] rounded-full bg-red-deep text-white font-display italic font-bold text-[11px] flex items-center justify-center px-1 leading-none"
      >
        {display}
      </span>
    );
  }

  return (
    <span
      aria-label={aria}
      className="ml-auto min-w-[20px] h-5 rounded-full bg-red-deep text-white font-display italic font-bold text-[11px] flex items-center justify-center px-1.5 leading-none"
    >
      {display}
    </span>
  );
}
