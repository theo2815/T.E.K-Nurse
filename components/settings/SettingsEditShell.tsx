"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useProgressRouter } from "@/lib/use-progress-router";
import { ProfileFields } from "./ProfileFields";
import { SecurityFields } from "./SecurityFields";
import { EditModeFab } from "./EditModeFab";
import { SectionEyebrow } from "./SectionEyebrow";
import { isPasswordStrong } from "@/components/PasswordChecklist";

type ActionResult = { error?: string; success?: string };
type Action = (
  prev: ActionResult | null,
  formData: FormData,
) => Promise<ActionResult>;

type StaffData = {
  role: "staff" | "admin";
  fullName: string;
  email: string;
  staffId: string | null;
};

type StudentData = {
  role: "student";
  fullName: string;
  email: string;
  studentId: string;
};

type Props = (StaffData | StudentData) & {
  updateProfile: Action;
  changePassword: Action;
};

/**
 * Settings page interactivity shell. Holds the single `isEditing` flag that
 * drives Profile + Security sections in lockstep — one Edit button toggles
 * both, one Save persists both. The shell intentionally owns the form state
 * and submit orchestration (no <form action={...}>) so the Edit FAB can
 * never accidentally trigger a submission.
 *
 * Save routes to the two existing server actions independently:
 *  - if full_name was changed → fire updateProfile
 *  - if any password field was filled → fire changePassword (with local
 *    pre-validation to skip a network call when the inputs are obviously
 *    broken)
 *  - both → fire sequentially; partial success is tolerated (profile saves
 *    even when password fails) so the user doesn't lose a name-change
 *    because of a typo in current password
 *
 * Errors stay inline per-section; success(es) fire a single toast that
 * summarizes what actually changed.
 */
export function SettingsEditShell(props: Props) {
  const router = useProgressRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [fullName, setFullName] = useState(props.fullName);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Sync the editable name buffer to server-truth whenever we're NOT
  // mid-edit so a revalidatePath on the parent reflects in view mode
  // without clobbering an in-progress edit.
  useEffect(() => {
    if (!isEditing) setFullName(props.fullName);
  }, [props.fullName, isEditing]);

  function onEnterEdit() {
    setIsEditing(true);
    setProfileError(null);
    setPasswordError(null);
  }

  function onCancel() {
    setFullName(props.fullName);
    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
    setProfileError(null);
    setPasswordError(null);
    setIsEditing(false);
  }

  function validatePassword(): string | null {
    if (!currentPw && !newPw && !confirmPw) return null;
    if (!currentPw) return "Enter your current password.";
    if (!newPw) return "Enter a new password.";
    if (newPw !== confirmPw) return "New passwords don't match.";
    if (newPw === currentPw) {
      return "New password must be different from your current password.";
    }
    if (!isPasswordStrong(newPw)) {
      return "New password doesn't meet all requirements.";
    }
    return null;
  }

  async function onSave() {
    setIsSaving(true);
    setProfileError(null);
    setPasswordError(null);

    const nameChanged = fullName.trim() !== props.fullName.trim();
    const pwTouched =
      currentPw.length > 0 || newPw.length > 0 || confirmPw.length > 0;

    if (pwTouched) {
      const clientError = validatePassword();
      if (clientError) {
        setPasswordError(clientError);
        setIsSaving(false);
        return;
      }
    }

    let profileOk = !nameChanged;
    let passwordOk = !pwTouched;

    if (nameChanged) {
      const fd = new FormData();
      fd.set("full_name", fullName);
      const result = await props.updateProfile(null, fd);
      if (result.error) {
        setProfileError(result.error);
      } else {
        profileOk = true;
      }
    }

    if (pwTouched) {
      const fd = new FormData();
      fd.set("current_password", currentPw);
      fd.set("new_password", newPw);
      fd.set("confirm_password", confirmPw);
      const result = await props.changePassword(null, fd);
      if (result.error) {
        setPasswordError(result.error);
      } else {
        passwordOk = true;
        setCurrentPw("");
        setNewPw("");
        setConfirmPw("");
      }
    }

    setIsSaving(false);

    if (nameChanged && profileOk && pwTouched && passwordOk) {
      toast.success("Profile and password updated.");
    } else if (nameChanged && profileOk) {
      toast.success("Profile updated.");
    } else if (pwTouched && passwordOk) {
      toast.success("Password changed.");
    }

    if (profileOk && passwordOk) {
      setIsEditing(false);
      // Force a refresh when the server-rendered name needs to update —
      // revalidatePath alone won't always re-render a client subtree.
      if (nameChanged) router.refresh();
    }
  }

  const studentId =
    props.role === "student" ? props.studentId : null;
  const staffId = props.role !== "student" ? props.staffId : null;

  return (
    <>
      <section
        id="profile"
        aria-labelledby="profile-heading"
        className="scroll-mt-24 flex flex-col gap-5"
      >
        <SectionEyebrow
          id="profile-heading"
          label="Profile"
          hint="Your display name across the app."
        />
        <ProfileFields
          mode={isEditing ? "edit" : "view"}
          role={props.role}
          fullName={fullName}
          email={props.email}
          studentId={studentId}
          staffId={staffId}
          onChangeFullName={setFullName}
          error={profileError}
        />
      </section>

      <section
        id="password"
        aria-labelledby="password-heading"
        className="scroll-mt-24 flex flex-col gap-5"
      >
        <SectionEyebrow
          id="password-heading"
          label="Security"
          hint="Your sign-in password."
        />
        <SecurityFields
          mode={isEditing ? "edit" : "view"}
          currentPassword={currentPw}
          newPassword={newPw}
          confirmPassword={confirmPw}
          onChangeCurrentPassword={setCurrentPw}
          onChangeNewPassword={setNewPw}
          onChangeConfirmPassword={setConfirmPw}
          error={passwordError}
        />
      </section>

      <EditModeFab
        isEditing={isEditing}
        pending={isSaving}
        onEdit={onEnterEdit}
        onCancel={onCancel}
        onSave={onSave}
      />
    </>
  );
}
