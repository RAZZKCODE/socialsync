import Link from "next/link";
import {
  Camera,
  CheckCircle,
  ExternalLink,
  Globe,
  PlayCircle,
  Plus,
  UsersRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { normalizeInstagramAccounts } from "@/lib/instagram-accounts";
import { Badge } from "@/components/ui/badge";

type OAuthStatus = "active" | "expired" | "disconnected";

interface OAuthConnectionRow {
  platform: string;
  account_title: string | null;
  status: OAuthStatus;
  token_expiry: string | null;
  oauth_provider: "system" | "custom";
}

interface PlatformCredentialRow {
  platform: string;
  credentials: Record<string, unknown> | null;
  is_active: boolean;
}

interface SocialPlatform {
  id: "instagram" | "youtube" | "facebook" | "linkedin";
  name: string;
  description: string;
  icon: typeof Camera;
  accentClassName: string;
  available: boolean;
}

const SOCIAL_PLATFORMS: SocialPlatform[] = [
  {
    id: "instagram",
    name: "Instagram",
    description: "Images, stories, reels, and carousels",
    icon: Camera,
    accentClassName: "bg-pink-500/10 text-pink-600",
    available: true,
  },
  {
    id: "youtube",
    name: "YouTube",
    description: "Videos and comment automation",
    icon: PlayCircle,
    accentClassName: "bg-red-500/10 text-red-600",
    available: true,
  },
  {
    id: "facebook",
    name: "Facebook",
    description: "Pages and engagement tools",
    icon: Globe,
    accentClassName: "bg-blue-500/10 text-blue-600",
    available: false,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    description: "Profiles and company pages",
    icon: UsersRound,
    accentClassName: "bg-sky-500/10 text-sky-700",
    available: false,
  },
];

export default async function SocialAccountsPage() {
  const supabase = await createClient();

  const [credentialsResult, oauthResult] = await Promise.all([
    supabase
      .from("platform_credentials")
      .select("platform, credentials, is_active"),
    supabase
      .from("platform_oauth_connections")
      .select("platform, account_title, status, token_expiry, oauth_provider"),
  ]);

  const credentialRows = (credentialsResult.data ?? []) as PlatformCredentialRow[];
  const oauthRows = (oauthResult.data ?? []) as OAuthConnectionRow[];

  const connectedCount = SOCIAL_PLATFORMS.filter((platform) =>
    getConnectedAccounts(platform.id, credentialRows, oauthRows).length > 0
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-normal font-[family-name:var(--font-heading)] text-foreground">
            Social Accounts
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            View all connected social media accounts in one place
          </p>
        </div>
        <Link
          href="/settings"
          className="inline-flex w-full min-w-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover sm:w-auto sm:px-6"
        >
          <Plus size={14} strokeWidth={1.8} />
          Connect Account
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryTile label="Platforms" value={SOCIAL_PLATFORMS.length} />
        <SummaryTile label="Connected" value={connectedCount} />
        <SummaryTile
          label="Available Now"
          value={SOCIAL_PLATFORMS.filter((platform) => platform.available).length}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {SOCIAL_PLATFORMS.map((platform) => {
          const accounts = getConnectedAccounts(
            platform.id,
            credentialRows,
            oauthRows
          );
          const Icon = platform.icon;
          const isConnected = accounts.length > 0;

          return (
            <section
              key={platform.id}
              className="rounded-xl border border-border bg-surface-elevated p-4 sm:p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${platform.accentClassName}`}
                  >
                    <Icon size={21} strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold tracking-normal font-[family-name:var(--font-heading)] text-foreground">
                      {platform.name}
                    </h2>
                    <p className="mt-0.5 text-sm text-text-muted">
                      {platform.description}
                    </p>
                  </div>
                </div>

                <Badge
                  variant={
                    isConnected
                      ? "success"
                      : platform.available
                        ? "default"
                        : "warning"
                  }
                  className="self-start"
                >
                  {isConnected
                    ? `${accounts.length} connected`
                    : platform.available
                      ? "Not connected"
                      : "Coming soon"}
                </Badge>
              </div>

              <div className="mt-5 space-y-3">
                {isConnected ? (
                  accounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-start gap-3 rounded-lg border border-border bg-surface px-3 py-3"
                    >
                      <CheckCircle
                        size={16}
                        strokeWidth={1.8}
                        className="mt-0.5 shrink-0 text-success"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {account.title}
                        </p>
                        <p className="mt-0.5 break-all text-xs text-text-muted">
                          {account.detail}
                        </p>
                      </div>
                      {account.meta && (
                        <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-[11px] font-medium text-text-muted">
                          {account.meta}
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-border px-3 py-5 text-center">
                    <p className="text-sm font-medium text-foreground">
                      No account connected
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      {platform.available
                        ? `Connect ${platform.name} from Settings.`
                        : `${platform.name} integration is not active yet.`}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-5">
                <Link
                  href="/settings"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover"
                >
                  Manage in Settings
                  <ExternalLink size={13} strokeWidth={1.8} />
                </Link>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-4">
      <p className="text-xs font-medium text-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-normal font-[family-name:var(--font-heading)] text-foreground">
        {value}
      </p>
    </div>
  );
}

function getConnectedAccounts(
  platformId: SocialPlatform["id"],
  credentialRows: PlatformCredentialRow[],
  oauthRows: OAuthConnectionRow[]
) {
  if (platformId === "instagram") {
    const instagramCredentials = credentialRows.find(
      (row) => row.platform === "instagram" && row.is_active
    );
    return normalizeInstagramAccounts(instagramCredentials?.credentials).map(
      (account) => ({
        id: account.id,
        title: account.label,
        detail: account.account_id,
        meta: "Manual",
      })
    );
  }

  return oauthRows
    .filter((row) => row.platform === platformId && row.status === "active")
    .map((row, index) => ({
      id: `${row.platform}-${row.account_title ?? index}`,
      title: row.account_title || `${platformId} account`,
      detail: row.token_expiry
        ? `Token refreshes until ${new Date(row.token_expiry).toLocaleDateString(
            "en-US",
            { month: "short", day: "numeric", year: "numeric" }
          )}`
        : "OAuth connection active",
      meta: row.oauth_provider === "custom" ? "Custom OAuth" : "OAuth",
    }));
}
