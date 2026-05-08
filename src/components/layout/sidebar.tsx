"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BRANDING } from "@/lib/branding";
import {
  LayoutDashboard,
  PlusCircle,
  Clock,
  Settings,
  Images,
  UsersRound,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Create Post", href: "/create", icon: PlusCircle },
  { label: "Accounts", href: "/accounts", icon: UsersRound },
  { label: "Gallery", href: "/gallery", icon: Images },
  { label: "History", href: "/history", icon: Clock },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[240px] flex-col border-r border-border bg-surface-elevated lg:flex">
        <div className="h-14 px-5 border-b border-border flex items-center">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src={BRANDING.logo.url}
              alt={BRANDING.logo.alt}
              width={32}
              height={32}
              className="rounded-lg"
              loading="eager"
              fetchPriority="high"
              style={{ width: "auto", height: "auto" }}
            />
            <span className="text-base font-bold tracking-normal font-[family-name:var(--font-heading)] text-foreground">
              {BRANDING.name}
            </span>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-text-muted hover:bg-surface hover:text-foreground"
                )}
              >
                <item.icon size={18} strokeWidth={1.8} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <div className="px-3 py-2">
            <p className="text-xs text-text-muted">
              {BRANDING.name} v1.0
            </p>
          </div>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-elevated/95 px-1.5 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-1.5 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        <div className="grid grid-cols-6 gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className={cn(
                  "flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-0.5 text-[9px] font-medium leading-none transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-text-muted hover:bg-surface hover:text-foreground"
                )}
              >
                <item.icon size={18} strokeWidth={1.8} />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
