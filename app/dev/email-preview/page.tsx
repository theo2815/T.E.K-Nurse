import Link from "next/link";
import { notFound } from "next/navigation";
import { templateGroups } from "./sample-data";

export const metadata = {
  title: "Email preview · T.E.K Nurse (dev)",
};

export default function EmailPreviewIndex() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 md:py-16">
      <div className="flex flex-col gap-2 mb-8">
        <p className="font-mono uppercase text-[11px] tracking-[0.1em] text-slate">
          DEV · EMAIL TEMPLATES
        </p>
        <h1 className="text-display">Email preview</h1>
        <p className="text-[14px] text-slate mt-2 max-w-lg">
          Click any template to render it with sample data in an isolated
          iframe. This route is only available in development.
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {templateGroups.map((group) => (
          <section key={group.label} className="flex flex-col gap-3">
            <h2 className="font-mono uppercase text-[11px] tracking-[0.1em] text-slate">
              {group.label}
            </h2>
            <ul className="bg-paper border-[1.5px] border-rule rounded overflow-hidden divide-y divide-rule/60">
              {group.templates.map((name) => (
                <li key={name}>
                  <Link
                    href={`/dev/email-preview/${name}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-mist transition-colors"
                  >
                    <span className="font-mono text-[13px] text-navy">
                      {name}
                    </span>
                    <span className="font-mono text-[11px] tracking-[0.1em] text-slate">
                      OPEN →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
