"use client";

import { useRef, useState, useTransition } from "react";
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
import { PickupVerifyPicker } from "@/components/scan/PickupVerifyPicker";
import { ConsumableActionPicker } from "@/components/scan/ConsumableActionPicker";
import { resolveScanTargetAction } from "@/app/staff/scan/actions";
import type {
  EquipmentScanTarget,
  ConsumableScanTarget,
} from "@/lib/supabase/queries/scan";
import type { StaffPendingRequestRow } from "@/lib/supabase/queries/staff-requests";

/**
 * A parent picker that an action modal was opened from. Recorded on each
 * child state so the back affordance can return to the picker without a
 * re-scan. `null` for direct-routed actions where no chooser was needed.
 */
type ParentPicker =
  | { type: "equipment"; target: EquipmentScanTarget; qr: string }
  | { type: "consumable"; target: ConsumableScanTarget; qr: string };

type ShellState =
  | { kind: "idle" }
  | { kind: "resolving"; qr: string }
  | { kind: "picker"; target: EquipmentScanTarget; qr: string }
  /** Mirror of `picker` for consumables — surfaced when a scanned consumable
   *  has BOTH approved pickups AND walk-in stock, so staff must choose. */
  | { kind: "consumable_picker"; target: ConsumableScanTarget; qr: string }
  | {
      kind: "lend";
      target: EquipmentScanTarget;
      parent: ParentPicker | null;
    }
  | {
      kind: "return";
      target: EquipmentScanTarget;
      parent: ParentPicker | null;
    }
  | {
      kind: "override";
      target: EquipmentScanTarget;
      parent: ParentPicker | null;
    }
  /** Multi-student picker — surfaced when 2+ approved requests await pickup
   *  for the same SKU. `parent` is set when entered from an ActionPicker so
   *  "back" returns to that picker; otherwise back goes to idle. */
  | {
      kind: "pickup_picker";
      awaitingPickup: StaffPendingRequestRow[];
      qr: string;
      parent: ParentPicker | null;
    }
  /** `fromPickupPicker` true → back re-resolves the QR so the multi-student
   *  picker reopens with the latest list. Otherwise back falls through to
   *  the recorded `parent` (an ActionPicker), or closes to idle. */
  | {
      kind: "verify";
      request: StaffPendingRequestRow;
      qr: string;
      fromPickupPicker: boolean;
      parent: ParentPicker | null;
    }
  | {
      kind: "usage";
      target: ConsumableScanTarget;
      parent: ParentPicker | null;
    };

/** Restore a parent picker as the current state (used by back affordances). */
function parentToState(p: ParentPicker): ShellState {
  return p.type === "equipment"
    ? { kind: "picker", target: p.target, qr: p.qr }
    : { kind: "consumable_picker", target: p.target, qr: p.qr };
}

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
  /** Suppress the next closeAll() so verify modal's auto-close after a
   *  from-picker success doesn't clobber the re-resolve we just kicked off. */
  const skipNextClose = useRef(false);

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
      routeTarget(res.data, qr);
    });
  }

  /** Re-resolve the same QR after a successful verify — keeps staff in the
   *  flow without forcing a re-scan. Unlike handleResolve this doesn't gate
   *  on `state.kind !== "idle"` since the verify modal closes first. */
  function reResolve(qr: string) {
    setState({ kind: "resolving", qr });
    startTransition(async () => {
      const res = await resolveScanTargetAction(qr);
      if (!res.ok) {
        toast.error("Lookup failed", { description: res.error });
        setState({ kind: "idle" });
        return;
      }
      routeTarget(res.data, qr);
    });
  }

  function routeTarget(
    target:
      | EquipmentScanTarget
      | ConsumableScanTarget
      | { kind: "not_found"; qr: string },
    qr: string,
  ) {
    if (target.kind === "not_found") {
      toast.error("QR not recognised", {
        description: `${target.qr} isn't in T.E.K Nurse inventory.`,
      });
      setState({ kind: "idle" });
      return;
    }

    if (target.kind === "consumable") {
      const hasVerify = target.canVerify;
      const hasUsage = target.sku.total_remaining > 0;

      // 1. Both verify + walk-in possible → consumable ActionPicker so staff
      //    can choose whether the person at the counter is a reserved
      //    pickup or a walk-in.
      if (hasVerify && hasUsage) {
        setState({ kind: "consumable_picker", target, qr });
        return;
      }

      // 2. Verify only (no stock left, but pickups still pending).
      if (hasVerify) {
        if (target.awaitingPickup.length > 1) {
          setState({
            kind: "pickup_picker",
            awaitingPickup: target.awaitingPickup,
            qr,
            parent: null,
          });
          return;
        }
        setState({
          kind: "verify",
          request: target.awaitingPickup[0],
          qr,
          fromPickupPicker: false,
          parent: null,
        });
        return;
      }

      // 3. Walk-in only.
      if (hasUsage) {
        setState({ kind: "usage", target, parent: null });
        return;
      }

      // 4. Neither — out of stock, no pickups.
      toast.error("Out of stock", {
        description: `${target.sku.qr_code} · ${target.sku.name} has no active lots.`,
      });
      setState({ kind: "idle" });
      return;
    }

    // Equipment.
    const { canBorrow, canReturn, canVerify, fullyReserved } = target;

    // 1. Verify + lend/return both possible → ActionPicker with Verify tile.
    if (canVerify && (canBorrow || canReturn)) {
      setState({ kind: "picker", target, qr });
      return;
    }

    // 2. Verify only → picker (multi) or direct verify (single).
    if (canVerify) {
      if (target.awaitingPickup.length > 1) {
        setState({
          kind: "pickup_picker",
          awaitingPickup: target.awaitingPickup,
          qr,
          parent: null,
        });
        return;
      }
      setState({
        kind: "verify",
        request: target.awaitingPickup[0],
        qr,
        fromPickupPicker: false,
        parent: null,
      });
      return;
    }

    // 3. Fully reserved walk-in (no verify) → straight to Override.
    if (fullyReserved && target.pendingRequests.length > 0) {
      setState({ kind: "override", target, parent: null });
      return;
    }

    // 4. Borrow + return both possible → ActionPicker.
    if (canBorrow && canReturn) {
      setState({ kind: "picker", target, qr });
      return;
    }

    // 5. Borrow only.
    if (canBorrow) {
      setState({ kind: "lend", target, parent: null });
      return;
    }

    // 6. Return only.
    if (canReturn) {
      setState({ kind: "return", target, parent: null });
      return;
    }

    // 7. Neither — all units in maintenance or lost.
    toast.error("Out of service", {
      description: `${target.sku.qr_code} · all units are in maintenance or marked lost.`,
    });
    setState({ kind: "idle" });
  }

  function closeAll() {
    if (skipNextClose.current) {
      skipNextClose.current = false;
      return;
    }
    setState({ kind: "idle" });
  }

  // Switch from Lend → Override when the LendModal's "Open override" link is tapped.
  function escalateToOverride() {
    if (state.kind !== "lend") return;
    const target = state.target;
    const parent = state.parent;
    setState({ kind: "idle" });
    requestAnimationFrame(() =>
      setState({ kind: "override", target, parent }),
    );
  }

  // Switch picker → lend or return or verify. The picker becomes the parent
  // of the child state so the back affordance returns to it.
  function pickerToLend() {
    if (state.kind !== "picker") return;
    const parent: ParentPicker = {
      type: "equipment",
      target: state.target,
      qr: state.qr,
    };
    setState({ kind: "lend", target: state.target, parent });
  }
  function pickerToReturn() {
    if (state.kind !== "picker") return;
    const parent: ParentPicker = {
      type: "equipment",
      target: state.target,
      qr: state.qr,
    };
    setState({ kind: "return", target: state.target, parent });
  }
  function pickerToVerify() {
    if (state.kind !== "picker") return;
    const parent: ParentPicker = {
      type: "equipment",
      target: state.target,
      qr: state.qr,
    };
    const target = state.target;
    if (target.awaitingPickup.length === 0) return;
    if (target.awaitingPickup.length > 1) {
      setState({
        kind: "pickup_picker",
        awaitingPickup: target.awaitingPickup,
        qr: state.qr,
        parent,
      });
      return;
    }
    setState({
      kind: "verify",
      request: target.awaitingPickup[0],
      qr: state.qr,
      fromPickupPicker: false,
      parent,
    });
  }

  // Switch consumable picker → verify or walk-in usage.
  function consumablePickerToVerify() {
    if (state.kind !== "consumable_picker") return;
    const parent: ParentPicker = {
      type: "consumable",
      target: state.target,
      qr: state.qr,
    };
    const awaiting = state.target.awaitingPickup;
    if (awaiting.length === 0) return;
    if (awaiting.length > 1) {
      setState({
        kind: "pickup_picker",
        awaitingPickup: awaiting,
        qr: state.qr,
        parent,
      });
      return;
    }
    setState({
      kind: "verify",
      request: awaiting[0],
      qr: state.qr,
      fromPickupPicker: false,
      parent,
    });
  }
  function consumablePickerToUsage() {
    if (state.kind !== "consumable_picker") return;
    const parent: ParentPicker = {
      type: "consumable",
      target: state.target,
      qr: state.qr,
    };
    setState({ kind: "usage", target: state.target, parent });
  }

  function pickupPickerToVerify(req: StaffPendingRequestRow) {
    if (state.kind !== "pickup_picker") return;
    setState({
      kind: "verify",
      request: req,
      qr: state.qr,
      fromPickupPicker: true,
      parent: state.parent,
    });
  }

  function verifyBack() {
    if (state.kind !== "verify") return;
    if (state.fromPickupPicker) {
      // Re-resolve so the picker reopens with the freshest awaiting list.
      // (Staff may have lingered; another request could have been approved
      // or another staff member could have released one in parallel.)
      reResolve(state.qr);
      return;
    }
    if (state.parent) {
      setState(parentToState(state.parent));
      return;
    }
    setState({ kind: "idle" });
  }

  function pickupPickerBack() {
    if (state.kind !== "pickup_picker") return;
    if (state.parent) {
      setState(parentToState(state.parent));
      return;
    }
    setState({ kind: "idle" });
  }

  // Generic "back to parent picker" used by lend / return / override / usage.
  function backTo(parent: ParentPicker | null) {
    if (parent) {
      setState(parentToState(parent));
      return;
    }
    setState({ kind: "idle" });
  }

  function handleVerifySuccess(
    a:
      | LendSuccessActivity
      | ReturnSuccessActivity
      | UsageSuccessActivity
      | OverrideSuccessActivity
      | ReleaseSuccessActivity,
  ) {
    recordActivity(a);
    // If this verify started from the multi-student picker, keep staff in
    // the same SKU's flow — re-resolve so the picker shows the now-shrunken
    // awaiting list (or auto-routes to verify when only one remains, or to
    // idle when the list is empty). The verify modal calls onClose right
    // after onSuccess; the skipNextClose flag prevents that from resetting
    // state to idle before our re-resolve lands.
    if (state.kind === "verify" && state.fromPickupPicker) {
      skipNextClose.current = true;
      reResolve(state.qr);
    }
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

      {state.kind === "consumable_picker" && (
        <ConsumableActionPicker
          key={`cn-pick:${state.target.sku.qr_code}`}
          open
          onClose={closeAll}
          target={state.target}
          onPickVerify={consumablePickerToVerify}
          onPickUsage={consumablePickerToUsage}
        />
      )}

      {state.kind === "pickup_picker" && (
        <PickupVerifyPicker
          key={`pickup-picker:${state.qr}:${state.awaitingPickup.length}`}
          open
          onClose={closeAll}
          onBack={state.parent ? pickupPickerBack : undefined}
          awaitingPickup={state.awaitingPickup}
          onPick={pickupPickerToVerify}
        />
      )}

      {state.kind === "verify" && (
        <VerifyAtPickupModal
          key={`verify:${state.request.id}`}
          open
          onClose={closeAll}
          onBack={
            state.fromPickupPicker || state.parent ? verifyBack : undefined
          }
          request={state.request}
          onSuccess={handleVerifySuccess}
        />
      )}

      {state.kind === "lend" && (
        <LendModal
          key={`lend:${state.target.sku.qr_code}`}
          mode="walk-in"
          open
          onClose={closeAll}
          onBack={state.parent ? () => backTo(state.parent) : undefined}
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
          onBack={state.parent ? () => backTo(state.parent) : undefined}
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
          onBack={state.parent ? () => backTo(state.parent) : undefined}
          sku={state.target.sku}
          onSuccess={recordActivity}
        />
      )}
    </>
  );
}
