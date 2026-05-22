import { MapPin } from "lucide-react";
import { MonoId } from "@/components/ui/MonoId";
import { StatusText, type Status } from "@/components/ui/StatusText";
import { PhotoFrame } from "@/components/catalog/PhotoFrame";

type Common = {
  qr_code: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  status: Status;
};

type Equipment = Common & {
  kind: "equipment";
  available_units: number;
  total_units: number;
  location: string | null;
};

type Consumable = Common & {
  kind: "consumable";
  total_remaining: number;
  unit: string;
  per_request_max_quantity: number;
};

type Props = Equipment | Consumable;

/**
 * Compact context card paired with the request form on desktop.
 * Photo + key counts + meta. Sticky-friendly: keep contents short.
 */
export function ItemSummaryCard(props: Props) {
  return (
    <div className="border-[1.5px] border-rule rounded bg-paper p-6 flex flex-col gap-5">
      <div className="flex items-baseline justify-between gap-3">
        <MonoId id={props.qr_code} />
        <StatusText status={props.status} />
      </div>

      <h2 className="font-display italic font-extrabold text-[28px] leading-tight text-navy">
        {props.name}
      </h2>

      <PhotoFrame
        src={props.photo_url}
        alt={props.name}
        className="!max-w-none !w-full"
      />

      {props.description && (
        <p className="text-[14px] text-slate leading-relaxed">
          {props.description}
        </p>
      )}

      <hr className="border-rule" />

      {props.kind === "equipment" ? (
        <div className="flex items-baseline gap-3">
          <span className="font-display italic font-extrabold text-[40px] leading-none text-navy">
            {props.available_units}
          </span>
          <span className="font-mono uppercase text-caps-sm text-slate tracking-[0.08em] font-semibold">
            of {props.total_units} available
          </span>
        </div>
      ) : (
        <div className="flex items-baseline gap-3">
          <span className="font-display italic font-extrabold text-[40px] leading-none text-navy">
            {props.total_remaining}
          </span>
          <span className="font-mono uppercase text-caps-sm text-slate tracking-[0.08em] font-semibold">
            {props.unit} in stock
          </span>
        </div>
      )}

      {props.kind === "equipment" && props.location && (
        <div>
          <p className="font-mono uppercase text-caps-sm font-semibold tracking-[0.1em] text-slate mb-1">
            Location
          </p>
          <p className="inline-flex items-center gap-2 text-[15px] text-navy">
            <MapPin size={16} strokeWidth={1.75} className="text-teal" />
            {props.location}
          </p>
        </div>
      )}

      {props.kind === "consumable" && (
        <div>
          <p className="font-mono uppercase text-caps-sm font-semibold tracking-[0.1em] text-slate mb-1">
            Per-request limit
          </p>
          <p className="text-[15px] text-navy">
            Up to {props.per_request_max_quantity} {props.unit}
          </p>
        </div>
      )}
    </div>
  );
}
