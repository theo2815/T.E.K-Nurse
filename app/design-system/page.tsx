"use client";

import { useState } from "react";
import Image from "next/image";
import { Bell, ChevronRight, FileText } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MonoId } from "@/components/ui/MonoId";
import { StatusText, type Status } from "@/components/ui/StatusText";
import { FAB } from "@/components/ui/FAB";
import { FilterChipRow, type Chip } from "@/components/ui/FilterChipRow";
import { SpeedLines } from "@/components/SpeedLines";

const SWATCHES: { name: string; hex: string; bg: string; ink?: "white" | "navy" }[] = [
  { name: "navy",       hex: "#1F3A6E", bg: "bg-navy",       ink: "white" },
  { name: "navy-deep",  hex: "#152849", bg: "bg-navy-deep",  ink: "white" },
  { name: "teal",       hex: "#38B6BC", bg: "bg-teal",       ink: "white" },
  { name: "teal-deep",  hex: "#2A8E94", bg: "bg-teal-deep",  ink: "white" },
  { name: "cyan",       hex: "#87D1D5", bg: "bg-cyan" },
  { name: "mist",       hex: "#F0F4F8", bg: "bg-mist" },
  { name: "paper",      hex: "#F8FAFC", bg: "bg-paper" },
  { name: "slate",      hex: "#475569", bg: "bg-slate",      ink: "white" },
  { name: "rule",       hex: "#CBD5E1", bg: "bg-rule" },
  { name: "red",        hex: "#E53935", bg: "bg-red",        ink: "white" },
  { name: "red-deep",   hex: "#B91C1C", bg: "bg-red-deep",   ink: "white" },
  { name: "green",      hex: "#0EA968", bg: "bg-green",      ink: "white" },
];

const ALL_STATUSES: Status[] = [
  "AVAILABLE", "BORROWED", "RESERVED", "LOW STOCK", "OUT", "MAINTENANCE",
  "OVERDUE", "LOST", "RETURNED", "EXPIRED", "SKIPPED", "CANCELLED", "DECLINED",
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
        <div className="flex items-start gap-5">
          <Image
            src="/teknurselogo.png"
            alt="T.E.K Nurse"
            width={240}
            height={240}
            priority
            className="h-24 w-24 object-contain"
          />
          <div>
            <div className="flex items-center gap-3 mb-3">
              <SpeedLines className="w-12 h-5" />
              <p className="font-mono uppercase text-caps-sm text-teal font-semibold">
                Clinical Console · v0.2
              </p>
            </div>
            <h1 className="font-display italic font-extrabold text-display-lg md:text-hero text-navy leading-none">
              T.E.K <span className="text-teal">NURSE</span>
            </h1>
            <p className="mt-4 text-slate max-w-md">
              Design system for the school nursing lab&apos;s equipment and
              consumables in-out inventory PWA. Built around the official
              logo&apos;s navy + teal palette with a faint heart-monitor
              scan-line atmosphere.
            </p>
          </div>
        </div>
        <div className="hidden md:flex flex-col items-end gap-2">
          <span className="font-mono uppercase text-caps-sm text-slate font-semibold">Phase 2</span>
          <span className="font-mono uppercase text-caps-sm text-teal-deep font-semibold">AUTH · SHELL · LIVE</span>
        </div>
      </header>

      {/* ──────────────────────────────── 01 color */}
      <Section number="01" title="Colour">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule rounded overflow-hidden">
          {SWATCHES.map((s) => (
            <div
              key={s.name}
              className={`${s.bg} ${s.ink === "white" ? "text-white" : "text-navy"} p-4 aspect-[3/2] flex flex-col justify-between`}
            >
              <span className="font-mono uppercase text-caps-sm font-semibold">{s.name}</span>
              <span className="font-mono text-[11px] tracking-[0.04em]">{s.hex}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 italic text-slate text-[13px]">
          Teal is sacred — reserved for the FAB, primary CTAs, active states,
          and focus rings. Red is reserved for OVERDUE / LOST / LOW STOCK.
        </p>
      </Section>

      {/* ──────────────────────────────── 02 typography */}
      <Section number="02" title="Typography">
        <div className="space-y-10">
          <Specimen label="Hero numeral / Montserrat italic 88px">
            <span className="font-display italic font-extrabold text-hero text-navy">154</span>
          </Specimen>
          <Specimen label="Display large / Montserrat italic 56px">
            <span className="font-display italic font-extrabold text-display-lg text-navy">Stethoscope</span>
          </Specimen>
          <Specimen label="Display / Montserrat italic 32px">
            <span className="font-display italic font-bold text-display text-navy">Dual-head, adult</span>
          </Specimen>
          <Specimen label="Body / Manrope 16px">
            <p className="text-navy max-w-md">
              The clinical console feels like a hospital-grade dashboard —
              clean surfaces, sharp accents, scanner-readable codes.
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
          <Specimen label="Speed-lines accent / SVG (echoes logo)">
            <SpeedLines className="w-14 h-6" />
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
            <h3 className="font-display italic text-[22px] mt-4">Stethoscope</h3>
            <p className="text-navy">Dual-head, adult</p>
            <p className="text-slate text-[13px] mt-1">Cabinet A · Drawer 3</p>
            <div className="flex items-end justify-between mt-6">
              <span className="font-display italic font-extrabold text-[44px] leading-none text-navy">
                8<span className="text-slate font-medium not-italic"> / 10</span>
              </span>
              <ChevronRight className="text-slate" strokeWidth={1.75} />
            </div>
          </Card>

          <Card variant="alert">
            <div className="flex items-center justify-between">
              <MonoId id="BPC-014" />
              <StatusText status="OVERDUE" emphatic />
            </div>
            <h3 className="font-display italic text-[22px] mt-4">Blood pressure cuff</h3>
            <p className="text-navy">Adult, manual</p>
            <p className="text-slate text-[13px] mt-1">
              Due 2026-05-19 · 3 days overdue
            </p>
            <div className="flex items-end justify-between mt-6">
              <span className="font-mono uppercase text-caps-sm font-semibold text-red-deep">
                Reminder · T+3
              </span>
              <ChevronRight className="text-slate" strokeWidth={1.75} />
            </div>
          </Card>

          <Card variant="pending">
            <div className="flex items-center justify-between">
              <MonoId id="GLV-2024-11" />
              <StatusText status="EXPIRED" />
            </div>
            <h3 className="font-display italic text-[22px] mt-4">Nitrile gloves</h3>
            <p className="text-navy">Size M · Lot 2024-11</p>
            <p className="text-slate text-[13px] mt-1">
              Request expired 2026-05-21
            </p>
            <div className="flex items-end justify-between mt-6">
              <span className="font-mono uppercase text-caps-sm font-semibold text-slate">
                Requested 50 · skipped
              </span>
              <ChevronRight className="text-slate" strokeWidth={1.75} />
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
          <h3 className="font-display italic text-display mt-3">Stethoscope</h3>
          <p className="font-mono uppercase text-caps-sm text-slate mt-8 font-semibold">Inventory</p>
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
                <div className="font-display italic font-extrabold text-[44px] leading-none text-navy">
                  {c.n}
                </div>
                <div className="font-mono uppercase text-caps-sm text-slate mt-2 font-semibold">
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
            Teal owns the spotlight.
          </p>
        </div>
      </Section>

      {/* ──────────────────────────────── 10 empty + notification */}
      <Section number="10" title="Empty State">
        <Card>
          <div className="flex flex-col items-center text-center py-10">
            <FileText size={48} strokeWidth={1.5} className="text-slate/50" />
            <hr className="w-12 mt-4" />
            <p className="font-display italic text-display mt-6">No requests yet.</p>
            <p className="text-slate mt-2">
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
          <Bell size={18} strokeWidth={1.75} className="text-slate" />
          <span className="font-mono uppercase text-caps-sm text-slate font-semibold">
            phase 2 · clinical console · auth + shell shipped
          </span>
        </div>
        <span className="font-mono uppercase text-caps-sm text-slate font-semibold">
          v0.2
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
        <span className="font-mono uppercase text-caps-sm text-teal font-semibold">{number}</span>
        <h2 className="font-display italic font-extrabold text-display text-navy">{title}</h2>
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
    <div className="grid md:grid-cols-[200px_1fr] gap-2 md:gap-8 items-baseline">
      <span className="font-mono uppercase text-caps-sm text-slate font-semibold">{label}</span>
      <div>{children}</div>
    </div>
  );
}
