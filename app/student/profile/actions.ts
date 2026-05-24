"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type EditProfileState = {
  error?: string;
  success?: string;
};

const MAX_NAME_LEN = 120;

/**
 * Student self-update. Only `full_name` is editable from the settings page —
 * email is tied to sign-in, and `student_id` is the institutional handle set
 * at signup. To change a student_id, a staff member edits it via the admin
 * Manage Users surface (Slice 11.5d). This keeps the regular student profile
 * surface free of edge cases around the unique-index regex error.
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
    return {
      error: `Full name is too long (${fullName.length}/${MAX_NAME_LEN}).`,
    };
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
    .eq("role", "student");

  if (error) return { error: error.message };

  revalidatePath("/student/profile");
  revalidatePath("/student/settings");
  revalidatePath("/student/home");
  return { success: "Profile updated." };
}
