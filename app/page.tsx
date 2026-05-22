"use client";

import { useState } from "react";
import { Bell, ChevronRight, FileText } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MonoId } from "@/components/ui/MonoId";
import { StatusText, type Status } from "@/components/ui/StatusText";
import { FAB } from "@/components/ui/FAB";
import { FilterChipRow, type Chip } from "@/components/ui/FilterChipRow";

const SWATCHES: { name: string; hex: string; bg: string; ink?: "navy" | "cream" }[] = [
  { name: "navy",        hex: "#0B1F3A", bg: "bg-navy",        ink: "cream" },
  { name: "cream",       hex: "#F4EFE6", bg: "bg-cream" },
  { name: "paper",       hex: "#FBF7EF", bg: "bg-paper" },
  { name: "amber",       hex: "#D4A24C", bg: "bg-amber" },
  { name: "olive",       hex: "#5C6B3B", bg: "bg-olive",       ink: "cream" },
  { name: "brick",       hex: "#A8412B", bg: "bg-brick",       ink: "cream" },
  { name: "brick-bold",  hex: "#902B19", bg: "bg-brick-bold",  ink: "cream" },
  { name: "slate",       hex: "#2E3849", bg: "bg-slate",       ink: "cream" },
  { name: "rule",        hex: "#C8BFAD", bg: "bg-rule" },
  { name: "ink",         hex: "#14181F", bg: "bg-ink",         ink: "cream" },
];

const ALL_STATUSES: Status[] = [
  "AVAILABLE", "BORROWED", "RESERVED", "LOW STOCK", "OUT", "MAINTENANCE",
  "OVERDUE", "LOST", "RETURNED", "EXPIRED", "SKIPPED", "CANCELLED",
];

const CHIPS: Chip[] = [
  { value: "all",         label: "ALL" },
  { value: "available",   label: "AVAILABLE" },
  { value: "out",         label: "OUT" },
  { value: "maintenance", label: "MAINTENANCE" },
];

export default function Showcase() {
  const [chip, setChip] = useState("all");

  return (
    <div className="mx-auto max-w-5xl px-6 md:px-12 py-12 md:py-20">
      {/* ──────────────────────────────── header */}
      <header className="flex items-start justify-between gap-6 mb-16">
        <div>
          <p className="font-mono uppercase text-caps-sm text-slate mb-3">
            T·E·K&nbsp;&nbsp;N&nbsp;U&nbsp;R&nbsp;S&nbsp;E
          </p>
          <h1 className="font-display text-display-lg md:text-hero text-navy leading-none">
            The Card<br />Catalog
          </h1>
          <p className="mt-4 italic text-slate max-w-md">
            A design-system index for the school nursing lab&apos;s
            equipment and consumables app.
          </p>
        </div>
        <div className="hidden md:flex flex-col items-end gap-2">
          <span className="font-mono uppercase text-caps-sm text-slate">Phase 0</span>
          <span className="font-mono uppercase text-caps-sm text-amber">SCAFFOLD · OK</span>
        </div>
      </header>

      {/* ──────────────────────────────── 01 color */}
      <Section number="01" title="Colour">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-rule border border-rule">
          {SWATCHES.map((s) => (
            <div
              key={s.name}
              className={`${s.bg} ${s.ink === "cream" ? "text-cream" : "text-navy"} p-4 aspect-[3/2] flex flex-col justify-between`}
            >
              <span className="font-mono uppercase text-caps-sm">{s.name}</span>
              <span className="font-mono text-[11px] tracking-[0.04em]">{s.hex}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 italic text-slate text-[13px]">
          Amber is sacred — reserved for the FAB, primary CTAs, active states, and focus rings.
        </p>
      </Section>

      {/* ──────────────────────────────── 02 typography */}
      <Section number="02" title="Typography">
        <div className="space-y-10">
          <Specimen label="Hero numeral / Fraunces 96px">
            <span className="font-display text-hero text-navy">154</span>
          </Specimen>
          <Specimen label="Display large / Fraunces 64px">
            <span className="font-display text-display-lg text-navy">Stethoscope</span>
          </Specimen>
          <Specimen label="Display / Fraunces 36px">
            <span className="font-display text-display text-navy">Dual-head, adult</span>
          </Specimen>
          <Specimen label="Body / Be Vietnam Pro 16px">
            <p className="text-navy max-w-md">
              The catalog feels like a meticulously kept inventory ledger —
              because that is what an inventory app actually is.
            </p>
          </Specimen>
          <Specimen label="Mono ID / JetBrains Mono 13px caps">
            <MonoId id="STH-001" />
          </Specimen>
          <Specimen label="Caps small / JetBrains Mono 11px tracked">
            <span className="font-mono uppercase text-caps-sm tracking-[0.08em] text-slate">
              cabinet A · drawer 3
            </span>
          </Specimen>
        </div>
      </Section>

      {/* ──────────────────────────────── 03 cards */}
      <Section number="03" title="Cards">
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <div className="flex items-center justify-between">
              <MonoId id="STH-001" />
              <StatusText status="AVAILABLE" />
            </div>
            <h3 className="font-display text-[22px] mt-4">Stethoscope</h3>
            <p className="text-navy">Dual-head, adult</p>
            <p className="text-slate text-[13px] mt-1">Cabinet A · Drawer 3</p>
            <div className="flex items-end justify-between mt-6">
              <span className="font-display text-[44px] leading-none text-navy">
                8<span className="text-slate"> / 10</span>
              </span>
              <ChevronRight className="text-slate" strokeWidth={1.5} />
            </div>
          </Card>

          <Card variant="alert">
            <div className="flex items-center justify-between">
              <MonoId id="BPC-014" />
              <StatusText status="OVERDUE" emphatic />
            </div>
            <h3 className="font-display text-[22px] mt-4">Blood pressure cuff</h3>
            <p className="text-navy">Adult, manual</p>
            <p className="text-slate text-[13px] mt-1 italic">
              Due 2026-05-19 · 3 days overdue
            </p>
            <div className="flex items-end justify-between mt-6">
              <span className="font-mono uppercase text-caps-sm text-brick-bold">
                Reminder · T+3
              </span>
              <ChevronRight className="text-slate" strokeWidth={1.5} />
            </div>
          </Card>

          <Card variant="pending">
            <div className="flex items-center justify-between">
              <MonoId id="GLV-2024-11" />
              <StatusText status="EXPIRED" />
            </div>
            <h3 className="font-display text-[22px] mt-4">Nitrile gloves</h3>
            <p className="text-navy">Size M · Lot 2024-11</p>
            <p className="text-slate text-[13px] mt-1 italic">
              Request expired 2026-05-21
            </p>
            <div className="flex items-end justify-between mt-6">
              <span className="font-mono uppercase text-caps-sm text-slate">
                Requested 50 · skipped
              </span>
              <ChevronRight className="text-slate" strokeWidth={1.5} />
            </div>
          </Card>
        </div>
      </Section>

      {/* ──────────────────────────────── 04 SKU count block */}
      <Section number="04" title="SKU Count Block">
        <Card>
          <div className="flex items-center justify-between">
            <MonoId id="STH-001" />
            <StatusText status="AVAILABLE" />
          </div>
          <h3 className="font-display text-display mt-3">Stethoscope</h3>
          <p className="font-mono uppercase text-caps-sm text-slate mt-8">Inventory</p>
          <hr className="mt-2" />
          <div className="grid grid-cols-5 mt-4 text-center">
            {[
              { n: 8, l: "AVAIL" },
              { n: 1, l: "OUT" },
              { n: 1, l: "RES" },
              { n: 0, l: "MAINT" },
              { n: 0, l: "LOST" },
            ].map((c) => (
              <div key={c.l}>
                <div className="font-display text-[44px] leading-none text-navy">
                  {c.n}
                </div>
                <div className="font-mono uppercase text-caps-sm text-slate mt-2">
                  {c.l}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      {/* ──────────────────────────────── 05 buttons */}
      <Section number="05" title="Buttons">
        <div className="flex flex-wrap gap-4 items-center">
          <Button variant="primary">Request to Borrow</Button>
          <Button variant="secondary">Cancel</Button>
          <Button variant="tertiary">View history →</Button>
          <Button variant="primary" disabled>Disabled</Button>
        </div>
      </Section>

      {/* ──────────────────────────────── 06 inputs */}
      <Section number="06" title="Inputs">
        <div className="grid md:grid-cols-2 gap-6 max-w-2xl">
          <Input label="Student email" placeholder="name@cit.edu" />
          <Input search placeholder="search equipment…" />
          <Input label="Return date" defaultValue="2026-05-24" />
          <Input
            label="Quantity"
            defaultValue="999"
            error="Maximum 20 per request."
          />
        </div>
      </Section>

      {/* ──────────────────────────────── 07 filter chips */}
      <Section number="07" title="Filter Chips">
        <FilterChipRow chips={CHIPS} value={chip} onChange={setChip} />
        <p className="mt-3 text-slate italic text-[13px]">
          Active filter: <span className="font-mono not-italic">{chip}</span>
        </p>
      </Section>

      {/* ──────────────────────────────── 08 status */}
      <Section number="08" title="Status Vocabulary">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4">
          {ALL_STATUSES.map((s) => (
            <div key={s} className="flex items-center gap-3">
              <StatusText status={s} emphatic={["OVERDUE", "LOST", "LOW STOCK"].includes(s)} />
            </div>
          ))}
        </div>
        <p className="mt-6 italic text-slate text-[13px]">
          Status is typography, not pills — mono uppercase next to the ID does the work.
        </p>
      </Section>

      {/* ──────────────────────────────── 09 scan FAB */}
      <Section number="09" title="Scan FAB">
        <div className="flex items-center gap-12">
          <FAB />
          <FAB size="lg" label="SCAN" />
          <p className="text-slate italic max-w-sm">
            The FAB lives centered in the bottom nav, raised above the bar.
            Amber owns the spotlight.
          </p>
        </div>
      </Section>

      {/* ──────────────────────────────── 10 empty + notification */}
      <Section number="10" title="Empty State">
        <Card>
          <div className="flex flex-col items-center text-center py-10">
            <FileText size={48} strokeWidth={1.25} className="text-slate/50" />
            <hr className="w-12 mt-4" />
            <p className="font-display text-display mt-6">No requests yet.</p>
            <p className="text-slate mt-2 italic">
              New requests will appear here.
            </p>
            <Button variant="secondary" className="mt-6">
              Browse catalog
            </Button>
          </div>
        </Card>
      </Section>

      {/* ──────────────────────────────── footer */}
      <footer className="mt-24 pt-8 border-t border-rule flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell size={18} strokeWidth={1.5} className="text-slate" />
          <span className="font-mono uppercase text-caps-sm text-slate">
            phase 0 · design system · scaffold complete
          </span>
        </div>
        <span className="font-mono uppercase text-caps-sm text-slate">
          v0.1
        </span>
      </footer>
    </div>
  );
}

function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-20">
      <div className="flex items-baseline gap-6 mb-8">
        <span className="font-mono uppercase text-caps-sm text-amber">{number}</span>
        <h2 className="font-display text-display text-navy">{title}</h2>
        <span className="flex-1 border-b border-rule -translate-y-1" />
      </div>
      {children}
    </section>
  );
}

function Specimen({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid md:grid-cols-[180px_1fr] gap-2 md:gap-8 items-baseline">
      <span className="font-mono uppercase text-caps-sm text-slate">{label}</span>
      <div>{children}</div>
    </div>
  );
}
