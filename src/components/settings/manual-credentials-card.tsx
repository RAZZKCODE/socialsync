"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { normalizeInstagramAccounts } from "@/lib/instagram-accounts";
import type { InstagramAccountCredentials } from "@/services/platforms/types";

export interface ManualCredentialField {
  /** Object key used to store the value in the credentials JSONB. */
  key: string;
  label: string;
  placeholder: string;
  type: "text" | "password";
  icon: LucideIcon;
  helpText: string;
  /** If true, the field must be filled before saving. Defaults to true. */
  required?: boolean;
}

export interface ManualSetupStep {
  title: string;
  detail: string;
}

export interface ManualPlatformDefinition {
  /** Lowercase platform slug (e.g. "instagram"). */
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  fields: ManualCredentialField[];
  setupGuide: ManualSetupStep[];
}

interface ManualCredentialsCardProps {
  platform: ManualPlatformDefinition;
  /** Currently saved credentials for this platform (may be masked). */
  initialCredentials: Record<string, unknown>;
  /** Whether a credential row already exists in the DB for this platform. */
  isConnected: boolean;
}

/**
 * Settings card for platforms that use manual long-lived token entry rather
 * than a full OAuth redirect flow (currently Instagram).
 *
 * Extracts and generalizes the credential form logic that previously lived
 * inline inside PlatformCredentialsForm.
 */
export function ManualCredentialsCard({
  platform,
  initialCredentials,
  isConnected,
}: ManualCredentialsCardProps) {
  const [credentials, setCredentials] = useState<Record<string, string>>(
    () => ({ ...(initialCredentials as Record<string, string>) })
  );
  const [instagramAccounts, setInstagramAccounts] = useState<
    InstagramAccountCredentials[]
  >(() => normalizeInstagramAccounts(initialCredentials));
  const [activeInstagramAccountId, setActiveInstagramAccountId] = useState(
    () =>
      (typeof initialCredentials.active_account_id === "string"
        ? initialCredentials.active_account_id
        : undefined) ||
      normalizeInstagramAccounts(initialCredentials)[0]?.id ||
      ""
  );
  const [newInstagramAccount, setNewInstagramAccount] = useState({
    label: "",
    account_id: "",
    access_token: "",
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );
  const supabase = createClient();

  function updateField(key: string, value: string): void {
    setCredentials((prev) => ({ ...prev, [key]: value }));
    if (status) setStatus(null);
  }

  function handleAddInstagramAccount(): void {
    const label = newInstagramAccount.label.trim();
    const accountId = newInstagramAccount.account_id.trim();
    const accessToken = newInstagramAccount.access_token.trim();

    if (!accountId || !accessToken) {
      setStatus({ type: "error", message: "Account ID and access token are required." });
      return;
    }

    const account: InstagramAccountCredentials = {
      id: accountId,
      label: label || accountId,
      account_id: accountId,
      access_token: accessToken,
    };

    setInstagramAccounts((prev) => {
      const withoutDuplicate = prev.filter((item) => item.id !== account.id);
      return [...withoutDuplicate, account];
    });
    setActiveInstagramAccountId((prev) => prev || account.id);
    setNewInstagramAccount({ label: "", account_id: "", access_token: "" });
    setStatus(null);
  }

  function handleRemoveInstagramAccount(accountId: string): void {
    setInstagramAccounts((prev) => {
      const next = prev.filter((account) => account.id !== accountId);
      if (activeInstagramAccountId === accountId) {
        setActiveInstagramAccountId(next[0]?.id ?? "");
      }
      return next;
    });
    setStatus(null);
  }

  async function handleSave(): Promise<void> {
    if (platform.id === "instagram") {
      await handleSaveInstagramAccounts();
      return;
    }

    const requiredFields = platform.fields.filter((f) => f.required !== false);
    const hasMissing = requiredFields.some((f) => !credentials[f.key]?.trim());

    if (hasMissing) {
      setStatus({ type: "error", message: "All required fields must be filled before saving." });
      return;
    }

    setSaving(true);
    setStatus(null);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setSaving(false);
      setStatus({
        type: "error",
        message: "Your session could not be verified. Refresh the page and sign in again.",
      });
      return;
    }

    const { error } = await supabase.from("platform_credentials").upsert(
      {
        user_id: user.id,
        platform: platform.id,
        credentials,
        is_active: true,
      },
      { onConflict: "user_id,platform" }
    );

    setSaving(false);

    if (error) {
      setStatus({ type: "error", message: error.message });
    } else {
      setStatus({ type: "success", message: "Credentials saved successfully." });
    }
  }

  async function handleSaveInstagramAccounts(): Promise<void> {
    if (instagramAccounts.length === 0) {
      setStatus({ type: "error", message: "Add at least one Instagram account before saving." });
      return;
    }

    setSaving(true);
    setStatus(null);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setSaving(false);
      setStatus({
        type: "error",
        message: "Your session could not be verified. Refresh the page and sign in again.",
      });
      return;
    }

    const { data: currentRow } = await supabase
      .from("platform_credentials")
      .select("credentials")
      .eq("user_id", user.id)
      .eq("platform", platform.id)
      .maybeSingle<{ credentials: Record<string, unknown> }>();

    const currentAccounts = normalizeInstagramAccounts(currentRow?.credentials);
    const tokenById = new Map(
      currentAccounts.map((account) => [account.id, account.access_token])
    );

    const accountsToSave = instagramAccounts.map((account) => ({
      ...account,
      access_token: account.access_token.includes("*")
        ? tokenById.get(account.id) ?? account.access_token
        : account.access_token,
    }));

    const { error } = await supabase.from("platform_credentials").upsert(
      {
        user_id: user.id,
        platform: platform.id,
        credentials: {
          active_account_id: activeInstagramAccountId || accountsToSave[0]?.id,
          accounts: accountsToSave,
        },
        is_active: true,
      },
      { onConflict: "user_id,platform" }
    );

    setSaving(false);

    if (error) {
      setStatus({ type: "error", message: error.message });
    } else {
      setStatus({ type: "success", message: "Instagram accounts saved successfully." });
    }
  }

  if (platform.id === "instagram") {
    return (
      <Card className="h-full">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="w-10 h-10 shrink-0 rounded-lg bg-surface flex items-center justify-center">
                <platform.icon size={20} strokeWidth={1.8} className="text-foreground" />
              </div>
              <div>
                <CardTitle>{platform.name}</CardTitle>
                <CardDescription>{platform.description}</CardDescription>
              </div>
            </div>
            {instagramAccounts.length > 0 ? (
              <Badge variant="success">
                {instagramAccounts.length} connected
              </Badge>
            ) : (
              <Badge variant="default">Not connected</Badge>
            )}
          </div>
        </CardHeader>

        <div className="space-y-4">
          <details className="rounded-md border border-border px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              How to get these credentials
            </summary>
            <ol className="mt-2 space-y-2 text-sm text-text-muted list-decimal list-inside">
              {platform.setupGuide.map((step) => (
                <li key={step.title}>
                  <span className="text-foreground font-medium">{step.title}:</span>{" "}
                  {step.detail}
                </li>
              ))}
            </ol>
          </details>

          {instagramAccounts.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">Connected accounts</p>
              {instagramAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2"
                >
                  <input
                    type="radio"
                    name="active-instagram-account"
                    checked={activeInstagramAccountId === account.id}
                    onChange={() => setActiveInstagramAccountId(account.id)}
                    className="h-4 w-4 accent-primary"
                    aria-label={`Use ${account.label} by default`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {account.label}
                    </p>
                    <p className="truncate text-xs text-text-muted">{account.account_id}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveInstagramAccount(account.id)}
                    className="text-text-muted transition-colors hover:text-error"
                    title="Remove account"
                  >
                    <Trash2 size={15} strokeWidth={1.8} />
                  </button>
                </div>
              ))}
              <p className="text-xs text-text-muted">
                The selected account is used by default when creating a post.
              </p>
            </div>
          )}

          <div className="space-y-3 rounded-lg border border-border p-3">
            <p className="text-sm font-medium text-foreground">Add Instagram account</p>
            <Input
              id="instagram-account-label"
              label="Account Label"
              type="text"
              placeholder="e.g. Main brand, Client account"
              icon={platform.icon}
              value={newInstagramAccount.label}
              onChange={(e) =>
                setNewInstagramAccount((prev) => ({ ...prev, label: e.target.value }))
              }
            />
            {platform.fields.map((field) => (
              <div key={field.key}>
                <Input
                  id={`${platform.id}-${field.key}`}
                  label={field.label}
                  type={field.type}
                  placeholder={field.placeholder}
                  icon={field.icon}
                  value={
                    newInstagramAccount[
                      field.key as keyof typeof newInstagramAccount
                    ] ?? ""
                  }
                  onChange={(e) =>
                    setNewInstagramAccount((prev) => ({
                      ...prev,
                      [field.key]: e.target.value,
                    }))
                  }
                />
                <p className="mt-1 text-xs text-text-muted">{field.helpText}</p>
              </div>
            ))}
            <Button variant="secondary" onClick={handleAddInstagramAccount}>
              <Plus size={14} strokeWidth={1.8} />
              Add Account
            </Button>
          </div>

          {status && (
            <div
              className={`flex items-center gap-2 text-sm ${
                status.type === "success" ? "text-success" : "text-error"
              }`}
            >
              {status.type === "success" ? (
                <CheckCircle size={14} strokeWidth={1.8} />
              ) : (
                <AlertCircle size={14} strokeWidth={1.8} />
              )}
              {status.message}
            </div>
          )}

          <Button onClick={handleSave} loading={saving}>
            Save Instagram Accounts
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="w-10 h-10 shrink-0 rounded-lg bg-surface flex items-center justify-center">
              <platform.icon size={20} strokeWidth={1.8} className="text-foreground" />
            </div>
            <div>
              <CardTitle>{platform.name}</CardTitle>
              <CardDescription>{platform.description}</CardDescription>
            </div>
          </div>
          {isConnected ? (
            <Badge variant="success">Connected</Badge>
          ) : (
            <Badge variant="default">Not connected</Badge>
          )}
        </div>
      </CardHeader>

      <div className="space-y-4">
        {/* Setup guide */}
        <details className="rounded-md border border-border px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium text-foreground">
            How to get these credentials
          </summary>
          <ol className="mt-2 space-y-2 text-sm text-text-muted list-decimal list-inside">
            {platform.setupGuide.map((step) => (
              <li key={step.title}>
                <span className="text-foreground font-medium">{step.title}:</span>{" "}
                {step.detail}
              </li>
            ))}
          </ol>
        </details>

        {/* Credential fields */}
        {platform.fields.map((field) => (
          <div key={field.key}>
            <Input
              id={`${platform.id}-${field.key}`}
              label={field.label}
              type={field.type}
              placeholder={field.placeholder}
              icon={field.icon}
              value={credentials[field.key] ?? ""}
              onChange={(e) => updateField(field.key, e.target.value)}
            />
            <p className="mt-1 text-xs text-text-muted">{field.helpText}</p>
          </div>
        ))}

        {/* Status feedback */}
        {status && (
          <div
            className={`flex items-center gap-2 text-sm ${
              status.type === "success" ? "text-success" : "text-error"
            }`}
          >
            {status.type === "success" ? (
              <CheckCircle size={14} strokeWidth={1.8} />
            ) : (
              <AlertCircle size={14} strokeWidth={1.8} />
            )}
            {status.message}
          </div>
        )}

        <Button onClick={handleSave} loading={saving}>
          {isConnected ? "Update Credentials" : "Save Credentials"}
        </Button>
      </div>
    </Card>
  );
}
