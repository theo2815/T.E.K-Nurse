"use client";

import Link from "next/link";
import { ArrowRight, Package, Stethoscope } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";

type Choice = {
  href: string;
  icon: typeof Stethoscope;
  label: string;
  blurb: string;
};

const CHOICES: Choice[] = [
  {
    href: "/staff/inventory/equipment/new",
    icon: Stethoscope,
    label: "Equipment",
    blurb: "Reusable items. e.g. BP cuff, stethoscope.",
  },
  {
    href: "/staff/inventory/consumables/new",
    icon: Package,
    label: "Consumable",
    blurb: "Single-use stock. e.g. gauze, alcohol pads.",
  },
];

export function NewSkuChooserModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="NEW SKU"
      title="What are you adding?"
      size="wide"
    >
      <div className="grid gap-3 md:grid-cols-2">
        {CHOICES.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.href}
              href={c.href}
              onClick={onClose}
              className="group block focus:outline-none focus-visible:[&>*]:border-teal"
            >
              <Card variant="default" className="cursor-pointer h-full">
                <div className="flex flex-col gap-3 min-h-[140px]">
                  <div className="flex items-center justify-between">
                    <Icon size={28} strokeWidth={1.5} className="text-teal" aria-hidden />
                    <ArrowRight
                      size={18}
                      strokeWidth={1.75}
                      className="text-slate/60 transition-colors group-hover:text-teal"
                      aria-hidden
                    />
                  </div>
                  <h3 className="font-display italic font-extrabold text-[22px] leading-tight text-navy">
                    {c.label}
                  </h3>
                  <p className="text-[14px] text-slate leading-snug">
                    {c.blurb}
                  </p>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </Modal>
  );
}
