import Link from "next/link";
import { notFound } from "next/navigation";
import { renderEmailPayload } from "@/lib/email/render";
import type { TemplateName } from "@/lib/email/types";
import { sampleData } from "../sample-data";
import { PreviewSwitcher } from "./PreviewSwitcher";

export const metadata = {
  title: "Email preview · T.E.K Nurse (dev)",
};

type Params = { template: string };

export default async function EmailPreviewDetail({
  params,
}: {
  params: Promise<Params>;
}) {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const { template } = await params;
  if (!(template in sampleData)) {
    notFound();
  }

  const payload = sampleData[template as TemplateName];
  const rendered = await renderEmailPayload(payload);

  return (
    <main className="mx-auto max-w-screen-xl px-6 py-8 md:py-12">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <Link
            href="/dev/email-preview"
            className="font-mono uppercase text-[11px] tracking-[0.1em] text-slate hover:text-navy"
          >
            ← ALL TEMPLATES
          </Link>
          <h1 className="font-mono text-[18px] text-navy">{template}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <PreviewSwitcher html={rendered.html} text={rendered.text} />

        <aside className="flex flex-col gap-5">
          <div className="bg-paper border-[1.5px] border-rule rounded p-5">
            <p className="font-mono uppercase text-[11px] tracking-[0.1em] text-slate mb-2">
              SUBJECT
            </p>
            <p className="text-[15px] text-navy font-medium leading-snug">
              {rendered.subject}
            </p>
          </div>

          <div className="bg-paper border-[1.5px] border-rule rounded p-5">
            <p className="font-mono uppercase text-[11px] tracking-[0.1em] text-slate mb-2">
              PAYLOAD
            </p>
            <pre className="text-[12px] font-mono text-navy whitespace-pre-wrap break-all leading-relaxed">
              {JSON.stringify(payload.payload, null, 2)}
            </pre>
          </div>

          <div className="bg-paper border-[1.5px] border-rule rounded p-5">
            <p className="font-mono uppercase text-[11px] tracking-[0.1em] text-slate mb-2">
              METADATA
            </p>
            <dl className="text-[13px] space-y-1.5">
              <div className="flex justify-between gap-3">
                <dt className="text-slate">Template</dt>
                <dd className="font-mono text-navy">{template}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate">HTML size</dt>
                <dd className="font-mono text-navy">
                  {(rendered.html.length / 1024).toFixed(1)} KB
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate">Plaintext size</dt>
                <dd className="font-mono text-navy">
                  {(rendered.text.length / 1024).toFixed(1)} KB
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </main>
  );
}
