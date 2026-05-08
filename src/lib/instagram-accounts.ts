import type {
  InstagramAccountCredentials,
  PlatformCredentials,
} from "@/services/platforms/types";

export interface InstagramAccountOption {
  id: string;
  label: string;
  accountId: string;
}

export function normalizeInstagramAccounts(
  credentials: PlatformCredentials | Record<string, unknown> | null | undefined
): InstagramAccountCredentials[] {
  if (!credentials) return [];

  const accounts = Array.isArray(credentials.accounts)
    ? credentials.accounts
    : [];

  const normalized = accounts
    .map((account) => normalizeInstagramAccount(account))
    .filter((account): account is InstagramAccountCredentials => Boolean(account));

  if (normalized.length > 0) {
    return normalized;
  }

  const legacyAccountId =
    typeof credentials.account_id === "string" ? credentials.account_id : "";
  const legacyAccessToken =
    typeof credentials.access_token === "string" ? credentials.access_token : "";

  if (!legacyAccountId || !legacyAccessToken) {
    return [];
  }

  return [
    {
      id: legacyAccountId,
      label: "Instagram Account",
      account_id: legacyAccountId,
      access_token: legacyAccessToken,
    },
  ];
}

export function getActiveInstagramAccount(
  credentials: PlatformCredentials,
  preferredAccountId?: string
): InstagramAccountCredentials | null {
  const accounts = normalizeInstagramAccounts(credentials);
  if (accounts.length === 0) return null;

  const selectedId =
    preferredAccountId ||
    credentials.active_account_id ||
    accounts[0]?.id;

  return accounts.find((account) => account.id === selectedId) ?? accounts[0] ?? null;
}

export function toInstagramAccountOptions(
  credentials: PlatformCredentials | Record<string, unknown> | null | undefined
): InstagramAccountOption[] {
  return normalizeInstagramAccounts(credentials).map((account) => ({
    id: account.id,
    label: account.label,
    accountId: account.account_id,
  }));
}

function normalizeInstagramAccount(value: unknown): InstagramAccountCredentials | null {
  if (!value || typeof value !== "object") return null;

  const account = value as Record<string, unknown>;
  const accountId = typeof account.account_id === "string" ? account.account_id.trim() : "";
  const accessToken =
    typeof account.access_token === "string" ? account.access_token.trim() : "";

  if (!accountId || !accessToken) return null;

  const id =
    typeof account.id === "string" && account.id.trim()
      ? account.id.trim()
      : accountId;
  const label =
    typeof account.label === "string" && account.label.trim()
      ? account.label.trim()
      : accountId;

  return {
    id,
    label,
    account_id: accountId,
    access_token: accessToken,
  };
}
