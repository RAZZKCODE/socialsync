"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BRANDING } from "@/lib/branding";
import { LogOut } from "lucide-react";

interface TopbarProps {
  userEmail?: string;
}

export function Topbar({ userEmail }: TopbarProps) {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 max-w-full items-center justify-between border-b border-border bg-surface-elevated px-3 sm:px-6">
      <Link href="/dashboard" className="flex min-w-0 items-center gap-2 lg:hidden">
        <Image
          src={BRANDING.logo.url}
          alt={BRANDING.logo.alt}
          width={28}
          height={28}
          className="rounded-lg"
          loading="eager"
          fetchPriority="high"
          style={{ width: "auto", height: "auto" }}
        />
        <span className="truncate text-sm font-bold font-[family-name:var(--font-heading)] text-foreground">
          {BRANDING.name}
        </span>
      </Link>
      <div className="hidden lg:block" />
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        {userEmail && (
          <span className="hidden max-w-[12rem] truncate text-sm text-text-muted sm:block">
            {userEmail}
          </span>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-sm text-text-muted hover:text-foreground transition-colors cursor-pointer"
        >
          <LogOut size={16} strokeWidth={1.8} />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
}
