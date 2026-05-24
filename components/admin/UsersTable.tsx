"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useProgressRouter } from "@/lib/use-progress-router";
import {
  User as UserIcon,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownLeft,
  Ban,
  Clock,
  RefreshCw,
  X,
} from "lucide-react";
import { ReportsTable, type ColumnDef } from "@/components/reports/ReportsTable";
import { Button } from "@/components/ui/Button";
import { PromoteDemoteModal } from "./PromoteDemoteModal";
import { CancelInviteModal } from "./CancelInviteModal";
import { resendStaffInvite } from "@/app/staff/admin/users/actions";
import type { AdminUserRow } from "@/app/staff/admin/users/queries";

function isPending(r: AdminUserRow): boolean {
  return r.invited_at !== null && r.invite_accepted_at === null;
}

/**
 * Admin-only users table. Action column behavior per row:
 *   - row is YOU            → "(you)"
 *   - row is an admin       → "(admin — locked)"
 *   - row is a student      → [Promote to staff] (teal primary)
 *   - row is a staff member → [Demote to student] (red-deep danger)
 *
 * Suspended students show a red Suspended chip and the Promote button is
 * disabled — admin must reinstate first. The RPC enforces this too; the
 * disable is purely a UX hint.
 */
export function UsersTable({
  rows,
  currentUserId,
}: {
  rows: AdminUserRow[];
  currentUserId: string;
}) {
  const router = useProgressRouter();
  const [modal, setModal] = useState<{
    mode: "promote" | "demote";
    user: AdminUserRow;
  } | null>(null);
  const [cancelTarget, setCancelTarget] = useState<AdminUserRow | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleResend(r: AdminUserRow) {
    setResendingId(r.id);
    startTransition(async () => {
      const result = await resendStaffInvite({ user_id: r.id });
      setResendingId(null);
      if (!result.ok) {
        toast.error("Could not resend invite", { description: result.error });
        return;
      }
      toast.success(`Re-sent invite to ${r.full_name}`, {
        description: `Email is on its way to ${r.email}.`,
      });
      router.refresh();
    });
  }

  const columns: ColumnDef<AdminUserRow>[] = [
    {
      key: "user",
      header: "User",
      render: (r) => (
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className={`shrink-0 size-9 rounded-fab flex items-center justify-center ${
              r.role === "admin"
                ? "bg-amber/15 text-amber-700"
                : r.role === "staff"
                  ? "bg-teal/15 text-teal-deep"
                  : "bg-slate/15 text-slate"
            }`}
          >
            {r.role === "admin" ? (
              <ShieldCheck size={16} strokeWidth={1.75} />
            ) : (
              <UserIcon size={16} strokeWidth={1.75} />
            )}
          </span>
          <div className="min-w-0 flex flex-col">
            <span className="text-[15px] text-navy font-semibold truncate">
              {r.full_name}
              {r.id === currentUserId && (
                <span className="ml-2 font-mono uppercase text-caps-sm text-slate/60 tracking-[0.08em] font-medium">
                  (you)
                </span>
              )}
            </span>
            <span className="font-mono text-[12px] text-slate/80 tracking-[0.04em] truncate">
              {r.email}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      width: "120px",
      render: (r) => <RoleChip role={r.role} />,
    },
    {
      key: "id",
      header: "ID",
      width: "140px",
      hideOnMobile: true,
      render: (r) => {
        const id = r.role === "student" ? r.student_id : r.staff_id;
        return id ? (
          <span className="font-mono uppercase text-caps-md text-slate tracking-[0.06em]">
            {id}
          </span>
        ) : (
          <span className="font-mono uppercase text-caps-sm text-slate/50 tracking-[0.08em]">
            —
          </span>
        );
      },
    },
    {
      key: "flags",
      header: "Status",
      width: "140px",
      hideOnMobile: true,
      render: (r) => {
        if (isPending(r)) {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-amber bg-amber/10 text-amber-700 font-mono uppercase text-caps-sm font-semibold tracking-[0.08em]">
              <Clock size={11} strokeWidth={2.5} />
              Pending
            </span>
          );
        }
        if (!r.is_active) {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-red-deep bg-red-deep/10 text-red-deep font-mono uppercase text-caps-sm font-semibold tracking-[0.08em]">
              <Ban size={11} strokeWidth={2.5} />
              Suspended
            </span>
          );
        }
        return (
          <span className="font-mono uppercase text-caps-sm text-slate/50 tracking-[0.08em]">
            Active
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      width: "220px",
      align: "right",
      render: (r) => {
        if (r.id === currentUserId) {
          return (
            <span className="font-mono uppercase text-caps-sm text-slate/50 tracking-[0.08em]">
              You
            </span>
          );
        }
        if (isPending(r)) {
          const isResending = resendingId === r.id;
          return (
            <div className="inline-flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => handleResend(r)}
                disabled={isResending}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded border border-teal text-teal-deep font-semibold text-[13px] hover:bg-teal/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw size={12} strokeWidth={2} />
                Resend
              </button>
              <button
                type="button"
                onClick={() => setCancelTarget(r)}
                disabled={isResending}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded border border-red-deep text-red-deep font-semibold text-[13px] hover:bg-red-deep/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <X size={12} strokeWidth={2} />
                Cancel
              </button>
            </div>
          );
        }
        if (r.role === "admin") {
          return (
            <span className="font-mono uppercase text-caps-sm text-amber-700/80 tracking-[0.08em]">
              Locked
            </span>
          );
        }
        if (r.role === "student") {
          const disabled = !r.is_active;
          return (
            <Button
              type="button"
              variant="primary"
              onClick={() => setModal({ mode: "promote", user: r })}
              disabled={disabled}
              title={
                disabled
                  ? "Reinstate this student first, then promote them."
                  : undefined
              }
              className="!py-2 !text-[13px]"
            >
              <ArrowUpRight size={14} strokeWidth={2} />
              Promote
            </Button>
          );
        }
        // role === "staff" (accepted)
        return (
          <Button
            type="button"
            variant="danger"
            onClick={() => setModal({ mode: "demote", user: r })}
            className="!py-2 !text-[13px]"
          >
            <ArrowDownLeft size={14} strokeWidth={2} />
            Demote
          </Button>
        );
      },
    },
  ];

  return (
    <>
      <ReportsTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        emptyTitle="No users match"
        emptyHint="Try a different search, or change the role filter."
      />
      {modal && (
        <PromoteDemoteModal
          open={true}
          onClose={() => setModal(null)}
          mode={modal.mode}
          user={{
            id: modal.user.id,
            full_name: modal.user.full_name,
            email: modal.user.email,
            staff_id: modal.user.staff_id,
          }}
        />
      )}
      {cancelTarget && (
        <CancelInviteModal
          open={true}
          onClose={() => setCancelTarget(null)}
          user={{
            id: cancelTarget.id,
            full_name: cancelTarget.full_name,
            email: cancelTarget.email,
            staff_id: cancelTarget.staff_id,
          }}
        />
      )}
    </>
  );
}

function RoleChip({ role }: { role: AdminUserRow["role"] }) {
  if (role === "admin") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-amber bg-amber/10 text-amber-700 font-mono uppercase text-caps-sm font-semibold tracking-[0.08em]">
        <ShieldCheck size={11} strokeWidth={2.5} />
        Admin
      </span>
    );
  }
  if (role === "staff") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-teal bg-teal/10 text-teal-deep font-mono uppercase text-caps-sm font-semibold tracking-[0.08em]">
        Staff
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate/40 bg-slate/10 text-slate font-mono uppercase text-caps-sm font-semibold tracking-[0.08em]">
      Student
    </span>
  );
}
