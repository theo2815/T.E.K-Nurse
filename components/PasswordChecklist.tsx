import { Check, Circle } from "lucide-react";

export type PasswordRule = {
  label: string;
  test: (password: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  { label: "At least 8 characters",       test: (p) => p.length >= 8 },
  { label: "One uppercase letter (A–Z)",  test: (p) => /[A-Z]/.test(p) },
  { label: "One lowercase letter (a–z)",  test: (p) => /[a-z]/.test(p) },
  { label: "One number (0–9)",            test: (p) => /\d/.test(p) },
  { label: "One special character",       test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function isPasswordStrong(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}

export function PasswordChecklist({ password }: { password: string }) {
  const metFlags = PASSWORD_RULES.map((r) => r.test(password));
  const metCount = metFlags.filter(Boolean).length;
  const total = PASSWORD_RULES.length;
  const allMet = metCount === total;

  return (
    <div className="space-y-3">
      {/* 5-segment strength bar + label */}
      <div className="flex items-center gap-3">
        <div
          className="flex gap-1 flex-1"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={metCount}
          aria-label="Password strength"
        >
          {metFlags.map((met, i) => (
            <span
              key={i}
              aria-hidden
              className={`h-2 flex-1 rounded-full transition-colors duration-150 ease-out ${
                met
                  ? allMet
                    ? "bg-green"
                    : "bg-teal"
                  : "bg-slate/20"
              }`}
            />
          ))}
        </div>
        {allMet ? (
          <span className="font-mono uppercase text-caps-sm font-bold text-green flex items-center gap-1 tracking-[0.1em]">
            <Check size={14} strokeWidth={2.75} />
            STRONG
          </span>
        ) : (
          <span className="font-mono text-caps-sm text-slate font-semibold tabular-nums tracking-[0.05em]">
            {metCount} / {total}
          </span>
        )}
      </div>

      {/* Detailed checklist — only while still incomplete */}
      {!allMet && (
        <ul
          className="space-y-1.5"
          aria-label="Password requirements"
        >
          {PASSWORD_RULES.map((rule, i) => {
            const met = metFlags[i];
            return (
              <li
                key={rule.label}
                className="flex items-center gap-2 text-[14px]"
              >
                {met ? (
                  <Check
                    size={14}
                    strokeWidth={2.5}
                    className="text-green shrink-0"
                    aria-hidden
                  />
                ) : (
                  <Circle
                    size={14}
                    strokeWidth={1.75}
                    className="text-slate/40 shrink-0"
                    aria-hidden
                  />
                )}
                <span className={met ? "text-navy font-medium" : "text-slate"}>
                  {rule.label}
                </span>
                <span className="sr-only">{met ? "(met)" : "(not met)"}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
