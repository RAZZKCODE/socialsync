"use client";

import type { ReactElement } from "react";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { UserMediaRow } from "@/types/database";
import { cn } from "@/lib/utils";
import {
  displayName,
  formatBytes,
  formatDate,
  mediaCategory,
} from "@/lib/gallery-display";
import { File, Play } from "lucide-react";

/* ──────────────────────────────────────────────────────────
   Shell + body (unchanged)
   ────────────────────────────────────────────────────────── */

const shellClassName =
  "rounded-xl border bg-surface-elevated overflow-hidden transition-colors";

function GalleryMediaCardBody({ row }: { row: UserMediaRow }): ReactElement {
  const cat = mediaCategory(row);
  const name = displayName(row);

  return (
    <>
      {cat === "video" ? (
        <div className="relative w-full aspect-[4/3] bg-surface flex items-center justify-center overflow-hidden">
          <video
            src={row.public_url}
            className="w-full h-full object-cover"
            muted
            playsInline
            preload="metadata"
          />
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center bg-charcoal/15"
            aria-hidden
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-charcoal/55 text-white shadow-lg ring-2 ring-white/30">
              <Play
                size={22}
                className="ml-0.5"
                fill="currentColor"
                strokeWidth={0}
              />
            </div>
          </div>
        </div>
      ) : cat === "image" ? (
        <div className="relative w-full aspect-[4/3]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={row.public_url}
            alt={name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="relative w-full aspect-[4/3] bg-surface flex items-center justify-center">
          <File size={28} className="text-text-muted" strokeWidth={1.8} />
        </div>
      )}
      <div className="p-2.5">
        <p className="text-xs font-semibold text-foreground truncate">{name}</p>
        <div className="mt-1 flex items-center justify-between text-[11px] text-text-muted">
          <span>{formatBytes(row.file_size_bytes)}</span>
          <span>{formatDate(row.created_at)}</span>
        </div>
      </div>
    </>
  );
}

/* ──────────────────────────────────────────────────────────
   Inline Delete Confirmation Modal
   ────────────────────────────────────────────────────────── */

function DeleteConfirmModal({
  onConfirm,
  onCancel,
  isDeleting,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}): ReactElement {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-surface-elevated p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Warning icon */}
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
          <svg className="h-6 w-6 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>

        <h3 className="text-center text-base font-bold text-foreground">
          Delete Media?
        </h3>
        <p className="mt-2 text-center text-sm text-text-muted">
          Kya aap sure hain? Ye file permanently delete ho jayegi aur wapas nahi aa sakti.
        </p>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-elevated disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Deleting...
              </span>
            ) : (
              "Delete"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Card Props & Component
   ────────────────────────────────────────────────────────── */

export type GalleryMediaCardProps =
  | {
      row: UserMediaRow;
      variant: "link";
      className?: string;
    }
  | {
      row: UserMediaRow;
      variant: "actions";
      onDelete?: () => void;
      onRepost?: () => void;
      className?: string;
    }
  | {
      row: UserMediaRow;
      variant: "selectable";
      selected?: boolean;
      onSelect: () => void;
      className?: string;
    };

export function GalleryMediaCard(props: GalleryMediaCardProps): ReactElement {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const router = useRouter();

  /* ── Link variant ─────────────────────────────── */

  if (props.variant === "link") {
    return (
      <a
        href={props.row.public_url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          shellClassName,
          "border-border hover:border-primary/40",
          props.className
        )}
      >
        <GalleryMediaCardBody row={props.row} />
      </a>
    );
  }

  /* ── Actions variant ──────────────────────────── */

  if (props.variant === "actions") {

    // DELETE — uses custom modal instead of window.confirm
    const handleDeleteClick = useCallback(() => {
      setShowDeleteModal(true);
    }, []);

    const handleDeleteConfirm = useCallback(async () => {
      setIsDeleting(true);
      try {
        const response = await fetch(`/api/v1/media/${props.row.id}`, {
          method: "DELETE",
        });

        let result: { success: boolean; error?: { message: string } } = { success: false };
        try {
          result = await response.json();
        } catch {
          // body parse failed
        }

        if (response.ok && result.success) {
          setShowDeleteModal(false);
          props.onDelete?.();
          router.refresh();
        } else {
          alert(`Delete failed: ${result.error?.message ?? `Server error (${response.status})`}`);
        }
      } catch (error) {
        console.error("Delete error:", error);
        alert("Network error — delete nahi ho saka.");
      } finally {
        setIsDeleting(false);
      }
    }, [props, router]);

    const handleDeleteCancel = useCallback(() => {
      setShowDeleteModal(false);
    }, []);

    // REPOST — navigates to /create with mediaId
    const handleRepost = useCallback(() => {
      props.onRepost?.();
      router.push(`/create?mediaId=${props.row.id}`);
    }, [props, router]);

    // SAVE — downloads via server-side proxy to bypass CORS
    const handleSave = useCallback(async () => {
      setIsSaving(true);
      setSaveSuccess(false);
      try {
        const response = await fetch(`/api/v1/media/${props.row.id}/download`);

        if (!response.ok) {
          throw new Error(`Download failed (${response.status})`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = displayName(props.row);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      } catch (error) {
        console.error("Save error:", error);
        alert("Download nahi ho saka. File missing ho sakti hai.");
      } finally {
        setIsSaving(false);
      }
    }, [props.row]);

    return (
      <>
        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <DeleteConfirmModal
            onConfirm={handleDeleteConfirm}
            onCancel={handleDeleteCancel}
            isDeleting={isDeleting}
          />
        )}

        <div
          className={cn(
            shellClassName,
            "border-border hover:border-primary/40 relative overflow-hidden group",
            props.className
          )}
        >
          <GalleryMediaCardBody row={props.row} />

          {/* Dark gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

          {/* Action buttons — slide up on hover */}
          <div className="absolute bottom-0 left-0 right-0 p-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 ease-out z-10">

            {/* Save / Download */}
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSave(); }}
              disabled={isSaving}
              title="Save / Download"
              className={cn(
                "flex flex-1 items-center justify-center gap-1 rounded-lg px-1.5 py-1.5 text-[11px] font-semibold transition-all duration-150 border backdrop-blur-sm shadow-lg cursor-pointer select-none",
                "active:scale-95 disabled:opacity-60 disabled:cursor-wait",
                saveSuccess
                  ? "bg-green-500/90 text-white border-green-400/40"
                  : "bg-white/15 text-white border-white/20 hover:bg-white/30"
              )}
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Saving...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Save</span>
                </>
              )}
            </button>

            {/* Repost */}
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRepost(); }}
              title="Repost — Use in new post"
              className="flex flex-1 items-center justify-center gap-1 rounded-lg px-1.5 py-1.5 text-[11px] font-semibold transition-all duration-150 border backdrop-blur-sm shadow-lg cursor-pointer select-none active:scale-95 bg-indigo-500/80 text-white border-indigo-400/40 hover:bg-indigo-600/90"
            >
              <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Repost</span>
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteClick(); }}
              disabled={isDeleting}
              title="Delete this media"
              className="flex flex-1 items-center justify-center gap-1 rounded-lg px-1.5 py-1.5 text-[11px] font-semibold transition-all duration-150 border backdrop-blur-sm shadow-lg cursor-pointer select-none active:scale-95 disabled:opacity-60 disabled:cursor-wait bg-red-600/75 text-white border-red-500/40 hover:bg-red-600/95"
            >
              <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Delete</span>
            </button>
          </div>
        </div>
      </>
    );
  }

  /* ── Selectable variant ───────────────────────── */

  return (
    <button
      type="button"
      onClick={props.onSelect}
      className={cn(
        shellClassName,
        "text-left w-full",
        props.selected
          ? "border-primary ring-2 ring-primary/20"
          : "border-border hover:border-primary/40",
        props.className
      )}
    >
      <GalleryMediaCardBody row={props.row} />
    </button>
  );
}
