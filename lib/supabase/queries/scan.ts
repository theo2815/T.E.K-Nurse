import {
  getEquipmentSkuByQr,
  type EquipmentSku,
} from "@/lib/supabase/queries/equipment";
import {
  getConsumableSkuByQr,
  type ConsumableSkuWithStock,
} from "@/lib/supabase/queries/consumables";
import {
  listOpenBorrowsForEquipmentSku,
  listPendingRequestsForEquipmentSku,
  listAwaitingPickupForEquipmentSku,
  listAwaitingPickupForConsumableSku,
  type OpenBorrowRow,
  type StaffPendingRequestRow,
} from "@/lib/supabase/queries/staff-requests";

export type EquipmentScanTarget = {
  kind: "equipment";
  sku: EquipmentSku;
  openBorrows: OpenBorrowRow[];
  pendingRequests: StaffPendingRequestRow[];
  /** APPROVED-but-not-yet-released requests for this SKU — student-at-counter verifications. */
  awaitingPickup: StaffPendingRequestRow[];
  /** available_units > 0 → at least one unit can be lent (subject to reservation check). */
  canBorrow: boolean;
  /** borrowed_units > 0 → at least one active borrow exists that could be returned. */
  canReturn: boolean;
  /** awaitingPickup.length > 0 → at least one APPROVED request to release. */
  canVerify: boolean;
  /** available_units === 0 && reserved_units > 0 → walk-in lend requires Override. */
  fullyReserved: boolean;
};

export type ConsumableScanTarget = {
  kind: "consumable";
  sku: ConsumableSkuWithStock;
  awaitingPickup: StaffPendingRequestRow[];
  canVerify: boolean;
};

export type ScanTarget =
  | EquipmentScanTarget
  | ConsumableScanTarget
  | { kind: "not_found"; qr: string };

/**
 * Single entry point for the /staff/scan flow.
 * Resolves a QR string to the SKU it identifies plus the live state needed
 * to decide which action modal to open (borrow / return / usage / override).
 * Equipment + consumable lookups run in parallel; if equipment hits, the
 * follow-up borrow + reservation queries also run in parallel.
 */
export async function getScanTarget(qr: string): Promise<ScanTarget> {
  const trimmed = qr.trim();
  if (!trimmed) return { kind: "not_found", qr: trimmed };

  const [equipment, consumable] = await Promise.all([
    getEquipmentSkuByQr(trimmed),
    getConsumableSkuByQr(trimmed),
  ]);

  if (equipment) {
    const [openBorrows, pendingRequests, awaitingPickup] = await Promise.all([
      listOpenBorrowsForEquipmentSku(equipment.id),
      listPendingRequestsForEquipmentSku(equipment.id),
      listAwaitingPickupForEquipmentSku(equipment.id),
    ]);
    return {
      kind: "equipment",
      sku: equipment,
      openBorrows,
      pendingRequests,
      awaitingPickup,
      canBorrow: equipment.available_units > 0,
      canReturn: equipment.borrowed_units > 0 && openBorrows.length > 0,
      canVerify: awaitingPickup.length > 0,
      fullyReserved:
        equipment.available_units === 0 && equipment.reserved_units > 0,
    };
  }

  if (consumable) {
    const awaitingPickup = await listAwaitingPickupForConsumableSku(
      consumable.sku.id,
    );
    return {
      kind: "consumable",
      sku: consumable.sku,
      awaitingPickup,
      canVerify: awaitingPickup.length > 0,
    };
  }

  return { kind: "not_found", qr: trimmed };
}
