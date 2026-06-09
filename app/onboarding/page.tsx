import { redirect } from "next/navigation";

import { logoutAction } from "@/app/(auth)/actions";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("restaurant_members")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membership) {
    redirect("/dashboard");
  }

  const fullName =
    typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : "";

  return <OnboardingWizard fullName={fullName} logoutAction={logoutAction} />;
}
