"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { InviteStaffModal } from "./InviteStaffModal";

/**
 * Client wrapper used by the server-rendered Manage Users page to host the
 * "Invite staff" button + its modal state. Lives next to the page-level
 * search/filter strip.
 */
export function InviteStaffButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="primary"
        onClick={() => setOpen(true)}
        className="!py-2.5"
      >
        <UserPlus size={16} strokeWidth={2} />
        Invite staff
      </Button>
      <InviteStaffModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
