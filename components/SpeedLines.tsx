/**
 * Three short horizontal teal strokes — echoes the speed-line trails
 * on the left side of the official T.E.K Nurse logo's magnifying glass.
 * Use as a small brand marker beside section eyebrows.
 */
export function SpeedLines({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 56 24"
      className={`text-teal ${className}`}
      aria-hidden="true"
    >
      <line
        x1="0"
        y1="5"
        x2="40"
        y2="5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line
        x1="10"
        y1="13"
        x2="54"
        y2="13"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line
        x1="4"
        y1="21"
        x2="34"
        y2="21"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
