"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UserMediaRow } from "@/types/database";
import { cn } from "@/lib/utils";
import {
  displayName,
  formatBytes,
  formatDate,
  mediaCategory,
} from "@/lib/gallery-display";
import { File, Play, Trash2, Share2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const router = useRouter();

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

  if (props.variant === "actions") {
    const handleDelete = async () => {
      if (!window.confirm("Are you sure you want to delete this media?")) {
        return;
      }

      setIsDeleting(true);
      try {
        const response = await fetch(`/api/v1/media/${props.row.id}`, {
          method: "DELETE",
        });

        const result = await response.json();

        if (result.success) {
          props.onDelete?.();
          router.refresh();
        } else {
          alert("Failed to delete media");
        }
      } catch (error) {
        console.error("Delete error:", error);
        alert("Error deleting media");
      } finally {
        setIsDeleting(false);
      }
    };

    const handleRepost = () => {
      props.onRepost?.();
      // Navigate to create page with media pre-selected
      router.push(`/dashboard/create?mediaId=${props.row.id}`);
    };

    return (
      <div
        className={cn(
          shellClassName,
          "border-border hover:border-primary/40 relative overflow-hidden group",
          props.className
        )}
      >
        <GalleryMediaCardBody row={props.row} />

        {/* Actions Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-end justify-start p-2 gap-2">
          <Button
            variant="secondary"
            onClick={handleRepost}
            title="Create new post with this media"
            className="h-8 w-8 p-0 px-0 py-0"
          >
            <Share2 size={16} strokeWidth={1.8} />
          </Button>
          <Button
            variant="secondary"
            onClick={handleDelete}
            disabled={isDeleting}
            title="Delete this media"
            className="h-8 w-8 p-0 px-0 py-0"
          >
            {isDeleting ? (
              <Loader2 size={16} className="animate-spin" strokeWidth={1.8} />
            ) : (
              <Trash2 size={16} strokeWidth={1.8} />
            )}
          </Button>
        </div>
      </div>
    );
  }

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
