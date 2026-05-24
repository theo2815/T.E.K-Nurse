"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type EditProfileState = {
  error?: string;
  success?: string;
};

const MAX_NAME_LEN = 120;

/**
 * Staff (and admin) self-update. Only `full_name` is editable — email is
 * tied to sign-in, role flips go through the Admin Manage Users surface
 * (Slice 11.5d), and student_id is null for staff/admin rows.
 */
export async function updateMyProfile(
  _prev: EditProfileState | null,
  formData: FormData,
): Promise<EditProfileState> {
  const raw = formData.get("full_name");
  const fullName = typeof raw === "string" ? raw.trim() : "";

  if (fullName.length === 0) {
    return { error: "Full name is required." };
  }
  if (fullName.length > MAX_NAME_LEN) {
    return { error: `Full name is too long (${fullName.length}/${MAX_NAME_LEN}).` };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("users")
    .update({ full_name: fullName })
    .eq("id", user.id)
    .in("role", ["staff", "admin"]);

  if (error) return { error: error.message };

  revalidatePath("/staff/profile");
  revalidatePath("/staff/settings");
  revalidatePath("/staff/home");
  return { success: "Profile updated." };
}
