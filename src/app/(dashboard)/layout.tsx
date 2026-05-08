import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function DashboardLayout({
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
    <div className="flex min-h-dvh max-w-full overflow-x-hidden bg-background">
      <Sidebar />
      <div className="min-w-0 max-w-full flex-1 lg:ml-[240px]">
        <Topbar userEmail={user.email} />
        <main className="w-full max-w-full overflow-x-hidden px-3 pb-24 pt-4 sm:px-6 lg:pb-6">
          {children}
        </main>
      </div>
    </div>
  );
}
