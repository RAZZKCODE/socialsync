"use client";

import { useState } from "react";
import {
  Share2,
  KeyRound,
  User,
  Shield,
  ChevronRight,
  Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Nav structure
// ---------------------------------------------------------------------------

interface NavItem {
  id: string;
  label: string;
  icon: typeof Share2;
  description: string;
}

interface NavSection {
  heading: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    heading: "Account",
    items: [
      {
        id: "profile",
        label: "My Profile",
        icon: User,
        description: "Display name and avatar",
      },
      {
        id: "security",
        label: "Security",
        icon: Shield,
        description: "Password and two-factor authentication",
      },
    ],
  },
  {
    heading: "Integrations",
    items: [
      {
        id: "platforms",
        label: "Connected Platforms",
        icon: Share2,
        description: "Instagram, YouTube, and more",
      },
      {
        id: "api-keys",
        label: "API Keys",
        icon: KeyRound,
        description: "OpenRouter and headless access keys",
      },
      {
        id: "ai",
        label: "AI Settings",
        icon: Cpu,
        description: "Model preferences and automation rules",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SettingsShellProps {
  platformsContent: React.ReactNode;
  apiKeysContent: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Two-column settings layout — sidebar nav on the left, content on the right.
 */
export function SettingsShell({ platformsContent, apiKeysContent }: SettingsShellProps) {
  const [activeId, setActiveId] = useState<string>("platforms");

  const activeItem = NAV_SECTIONS.flatMap((s) => s.items).find((i) => i.id === activeId);

  function renderContent() {
    switch (activeId) {
      case "platforms":
        return platformsContent;
      case "api-keys":
        return apiKeysContent;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
            <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center">
              {activeItem && <activeItem.icon size={22} strokeWidth={1.8} className="text-text-muted" />}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{activeItem?.label}</p>
              <p className="text-xs text-text-muted mt-0.5">Coming soon</p>
            </div>
          </div>
        );
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-10rem)] max-w-full flex-col gap-6 lg:flex-row lg:gap-0">
      {/* ------------------------------------------------------------------ */}
      {/* Sidebar                                                              */}
      {/* ------------------------------------------------------------------ */}
      <aside className="w-full border-b border-border pb-4 lg:mr-8 lg:w-56 lg:shrink-0 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-1">
        <nav className="grid gap-4 pb-1 min-[480px]:grid-cols-2 lg:block lg:space-y-6 lg:pb-0">
          {NAV_SECTIONS.map((section) => (
            <div key={section.heading} className="min-w-0">
              <p className="px-3 mb-1 text-[10px] font-semibold tracking-widest uppercase text-text-muted select-none">
                {section.heading}
              </p>
              <ul className="grid gap-1 lg:block lg:space-y-0.5">
                {section.items.map((item) => {
                  const isActive = item.id === activeId;
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => setActiveId(item.id)}
                        className={cn(
                          "flex w-full min-w-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all group",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-text-muted hover:text-foreground hover:bg-surface"
                        )}
                      >
                        <item.icon
                          size={15}
                          strokeWidth={1.8}
                          className={cn(
                            "shrink-0 transition-colors",
                            isActive ? "text-primary" : "text-text-muted group-hover:text-foreground"
                          )}
                        />
                        <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                        {isActive && (
                          <ChevronRight size={12} strokeWidth={1.8} className="text-primary shrink-0" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* ------------------------------------------------------------------ */}
      {/* Main content                                                         */}
      {/* ------------------------------------------------------------------ */}
      <main className="min-w-0 flex-1">
        {/* Section header */}
        {activeItem && (
          <div className="mb-6 pb-5 border-b border-border">
            <h2 className="text-lg font-bold tracking-normal font-[family-name:var(--font-heading)] text-foreground">
              {activeItem.label}
            </h2>
            <p className="text-sm text-text-muted mt-0.5">{activeItem.description}</p>
          </div>
        )}

        {renderContent()}
      </main>
    </div>
  );
}
