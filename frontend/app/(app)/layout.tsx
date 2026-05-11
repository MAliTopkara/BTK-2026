import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell user={user} breadcrumb="dashboard">
      {children}
    </AppShell>
  );
}
