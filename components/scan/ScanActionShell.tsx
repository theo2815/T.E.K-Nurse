"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { QrScanner } from "@/components/scan/QrScanner";
import { SkuPicker } from "@/components/scan/SkuPicker";
import { ActionPicker } from "@/components/scan/ActionPicker";
import {
  RecentActions,
  type RecentActivity,
} from "@/components/scan/RecentActions";
import {
  LendModal,
  type LendSuccessActivity,
} from "@/components/staff/LendModal";
import {
  ReturnModal,
  type ReturnSuccessActivity,
} from "@/components/staff/ReturnModal";
import {
  OverrideModal,
  type OverrideSuccessActivity,
} from "@/components/staff/OverrideModal";
import {
  LogUsageModal,
  type UsageSuccessActivity,
} from "@/components/staff/LogUsageModal";
import {
  VerifyAtPickupModal,
  type ReleaseSuccessActivity,
} from "@/components/staff/VerifyAtPickupModal";
import { resolveScanTargetAction } from "@/app/staff/scan/actions";
import type {
  EquipmentScanTarget,
  ConsumableScanTarget,
} from "@/lib/supabase/queries/scan";
import type { StaffPendingRequestRow } from "@/lib/supabase/queries/staff-requests";

type ShellState =
  | { kind: "idle" }
  | { kind: "resolving"; qr: string }
  | { kind: "picker"; target: EquipmentScanTarget }
  | { kind: "lend"; target: EquipmentScanTarget }
  | { kind: "return"; target: EquipmentScanTarget }
  | { kind: "override"; target: EquipmentScanTarget }
  | { kind: "verify"; request: StaffPendingRequestRow }
  | { kind: "usage"; target: ConsumableScanTarget };

/**
 * Orchestrator for /staff/scan. Decoded QRs (from the camera or the picker)
 * resolve into a ScanTarget; the shell then routes to the appropriate
 * Phase 5 action modal based on item state. Scanner stays alive between
 * scans and is paused while a modal is open.
 */
export function ScanActionShell() {
  const [state, setState] = useState<ShellState>({ kind: "idle" });
  const [recent, setRecent] = useState<RecentActivity[]>([]);
  const [isPending, startTransition] = useTransition();

  const scannerPaused = state.kind !== "idle" || isPending;

  function recordActivity(
    a:
      | LendSuccessActivity
      | ReturnSuccessActivity
      | UsageSuccessActivity
      | OverrideSuccessActivity
      | ReleaseSuccessActivity,
  ) {
    // Cap session log at 20 — anything older is in the audit log.
    setRecent((prev) =>
      [{ ...a, id: `${a.at}:${a.sku.qr_code}` } as RecentActivity, ...prev].slice(
        0,
        20,
      ),
    );
  }

  function handleResolve(qr: string) {
    // Defensive — ignore additional decodes while we're already mid-flow.
    if (state.kind !== "idle" || isPending) return;
    setState({ kind: "resolving", qr });
    startTransition(async () => {
      const res = await resolveScanTargetAction(qr);
      if (!res.ok) {
        toast.error("Lookup failed", { description: res.error });
        setState({ kind: "idle" });
        return;
      }
      routeTarget(res.data);
    });
  }

  function routeTarget(
    target:
      | EquipmentScanTarget
      | ConsumableScanTarget
      | { kind: "not_found"; qr: string },
  ) {
    if (target.kind === "not_found") {
      toast.error("QR not recognised", {
        description: `${target.qr} isn't in T.E.K Nurse inventory.`,
      });
      setState({ kind: "idle" });
      return;
    }

    if (target.kind === "consumable") {
      // 1. Approved pickup waiting → student-at-counter verification.
      if (target.canVerify) {
        setState({ kind: "verify", request: target.awaitingPickup[0] });
        return;
      }
      if (target.sku.total_remaining === 0) {
        toast.error("Out of stock", {
          description: `${target.sku.qr_code} · ${target.sku.name} has no active lots.`,
        });
        setState({ kind: "idle" });
        return;
      }
      setState({ kind: "usage", target });
      return;
    }

    // Equipment.
    const { canBorrow, canReturn, canVerify, fullyReserved } = target;

    // 1. Verify + lend/return both possible → ActionPicker with Verify tile.
    if (canVerify && (canBorrow || canReturn)) {
      setState({ kind: "picker", target });
      return;
    }

    // 2. Verify only → straight to Verify modal.
    if (canVerify) {
      setState({ kind: "verify", request: target.awaitingPickup[0] });
      return;
    }

    // 3. Fully reserved walk-in (no verify) → straight to Override.
    if (fullyReserved && target.pendingRequests.length > 0) {
      setState({ kind: "override", target });
      return;
    }

    // 4. Borrow + return both possible → ActionPicker.
    if (canBorrow && canReturn) {
      setState({ kind: "picker", target });
      return;
    }

    // 5. Borrow only.
    if (canBorrow) {
      setState({ kind: "lend", target });
      return;
    }

    // 6. Return only.
    if (canReturn) {
      setState({ kind: "return", target });
      return;
    }

    // 7. Neither — all units in maintenance or lost.
    toast.error("Out of service", {
      description: `${target.sku.qr_code} · all units are in maintenance or marked lost.`,
    });
    setState({ kind: "idle" });
  }

  function closeAll() {
    setState({ kind: "idle" });
  }

  // Switch from Lend → Override when the LendModal's "Open override" link is tapped.
  function escalateToOverride() {
    if (state.kind !== "lend") return;
    const target = state.target;
    setState({ kind: "idle" });
    requestAnimationFrame(() => setState({ kind: "override", target }));
  }

  // Switch picker → lend or return or verify.
  function pickerToLend() {
    if (state.kind !== "picker") return;
    const target = state.target;
    setState({ kind: "lend", target });
  }
  function pickerToReturn() {
    if (state.kind !== "picker") return;
    const target = state.target;
    setState({ kind: "return", target });
  }
  function pickerToVerify() {
    if (state.kind !== "picker") return;
    const first = state.target.awaitingPickup[0];
    if (!first) return;
    setState({ kind: "verify", request: first });
  }

  return (
    <>
      {recent.length > 0 && (
        <RecentActions items={recent} onClear={() => setRecent([])} />
      )}

      <section>
        <QrScanner onResolve={handleResolve} paused={scannerPaused} />
        {state.kind === "resolving" && (
          <p className="mt-3 inline-flex items-center gap-2 font-mono uppercase text-caps-sm text-slate tracking-[0.1em]">
            <Loader2
              size={13}
              strokeWidth={2}
              className="animate-spin text-teal"
            />
            Resolving {state.qr}…
          </p>
        )}
      </section>

      <div className="flex items-center gap-4">
        <hr className="flex-1" />
        <p className="font-mono uppercase text-caps-sm text-slate/70 tracking-[0.1em] font-semibold">
          Or find by ID / name
        </p>
        <hr className="flex-1" />
      </div>

      <section>
        <SkuPicker onResolve={handleResolve} />
      </section>

      {/* Action modals — keyed by qr so re-scanning the same item between
          opens still resets the modal's internal form state. */}
      {state.kind === "picker" && (
        <ActionPicker
          key={`pick:${state.target.sku.qr_code}`}
          open
          onClose={closeAll}
          target={state.target}
          onPickBorrow={pickerToLend}
          onPickReturn={pickerToReturn}
          onPickVerify={
            state.target.canVerify ? pickerToVerify : undefined
          }
        />
      )}

      {state.kind === "verify" && (
        <VerifyAtPickupModal
          key={`verify:${state.request.id}`}
          open
          onClose={closeAll}
          request={state.request}
          onSuccess={recordActivity}
        />
      )}

      {state.kind === "lend" && (
        <LendModal
          key={`lend:${state.target.sku.qr_code}`}
          mode="walk-in"
          open
          onClose={closeAll}
          sku={state.target.sku}
          onOverrideRequest={
            state.target.pendingRequests.length > 0
              ? escalateToOverride
              : undefined
          }
          onSuccess={recordActivity}
        />
      )}

      {state.kind === "return" && (
        <ReturnModal
          key={`return:${state.target.sku.qr_code}`}
          open
          onClose={closeAll}
          sku={state.target.sku}
          openBorrows={state.target.openBorrows}
          onSuccess={recordActivity}
        />
      )}

      {state.kind === "override" && (
        <OverrideModal
          key={`override:${state.target.sku.qr_code}`}
          open
          onClose={closeAll}
          sku={state.target.sku}
          pendingRequests={state.target.pendingRequests}
          onSuccess={recordActivity}
        />
      )}

      {state.kind === "usage" && (
        <LogUsageModal
          key={`usage:${state.target.sku.qr_code}`}
          mode="walk-in"
          open
          onClose={closeAll}
          sku={state.target.sku}
          onSuccess={recordActivity}
        />
      )}
    </>
  );
}
