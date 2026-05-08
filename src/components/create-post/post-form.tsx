"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { MediaInput } from "./media-input";
import { CarouselBuilder } from "./carousel-builder";
import type { InstagramPostType } from "@/lib/validators";
import type { InstagramAccountOption } from "@/lib/instagram-accounts";
import type { PostStatus, UserMediaRow } from "@/types/database";
import type { SelectedMediaItem } from "@/types/media";
import {
  ImageIcon,
  Film,
  Video,
  LayoutGrid,
  Clapperboard,
  ArrowLeft,
  Send,
  CheckCircle,
  Music,
  Circle,
} from "lucide-react";

interface PostFormProps {
  availablePlatforms: string[];
  instagramAccounts: InstagramAccountOption[];
  galleryItems: UserMediaRow[];
}

type Step = "type" | "media" | "details" | "submitting" | "result";

interface SubmittedPostResult {
  post_id: string;
  container_id: string | null;
  status: PostStatus;
  status_check_url: string;
  target_account_id: string | null;
}

const POST_TYPES: {
  id: InstagramPostType;
  label: string;
  description: string;
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
    className?: string;
  }>;
  mediaLabel: string;
  acceptsVideo: boolean;
}[] = [
  {
    id: "image",
    label: "Image Post",
    description: "Share a single photo with caption",
    icon: ImageIcon,
    mediaLabel: "image",
    acceptsVideo: false,
  },
  {
    id: "story_image",
    label: "Story (Image)",
    description: "Post an image to your story",
    icon: Film,
    mediaLabel: "image",
    acceptsVideo: false,
  },
  {
    id: "story_video",
    label: "Story (Video)",
    description: "Post a video to your story",
    icon: Video,
    mediaLabel: "video",
    acceptsVideo: true,
  },
  {
    id: "reel",
    label: "Reel",
    description: "Share a short-form video reel",
    icon: Clapperboard,
    mediaLabel: "video",
    acceptsVideo: true,
  },
  {
    id: "carousel",
    label: "Carousel",
    description: "Share multiple images in one post",
    icon: LayoutGrid,
    mediaLabel: "images",
    acceptsVideo: false,
  },
];

export function PostForm({
  availablePlatforms,
  instagramAccounts,
  galleryItems,
}: PostFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("type");
  const [postType, setPostType] = useState<InstagramPostType | null>(null);
  const [primaryMedia, setPrimaryMedia] = useState<SelectedMediaItem | null>(
    null
  );
  const [carouselItems, setCarouselItems] = useState<SelectedMediaItem[]>([]);
  const [coverItem, setCoverItem] = useState<SelectedMediaItem | null>(null);
  const [caption, setCaption] = useState("");
  const [audioName, setAudioName] = useState("");
  const [selectedInstagramAccountIds, setSelectedInstagramAccountIds] = useState<string[]>(
    () => (instagramAccounts[0]?.id ? [instagramAccounts[0].id] : [])
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedPosts, setSubmittedPosts] = useState<SubmittedPostResult[]>([]);

  const hasInstagram =
    availablePlatforms.includes("instagram") && instagramAccounts.length > 0;
  const selectedTypeConfig = POST_TYPES.find((t) => t.id === postType);
  const needsCaption =
    postType === "image" || postType === "reel" || postType === "carousel";
  const isCarousel = postType === "carousel";
  const isReel = postType === "reel";
  useEffect(() => {
    if (step !== "result") return;
    if (!submittedPosts.some((post) => post.status === "processing")) return;

    const timeout = setTimeout(async () => {
      const updates = await Promise.all(
        submittedPosts
          .filter((post) => post.status === "processing")
          .map(async (post) => {
            try {
              const res = await fetch(`/api/v1/posts/${post.post_id}`);
              const json = await res.json();
              if (json.success) {
                return {
                  postId: post.post_id,
                  status: json.data.status as PostStatus,
                };
              }
            } catch {
              // Keep the post in processing; the next poll can recover.
            }
            return null;
          })
      );

      setSubmittedPosts((prev) =>
        prev.map((post) => {
          const update = updates.find((item) => item?.postId === post.post_id);
          return update ? { ...post, status: update.status } : post;
        })
      );
    }, 4000);

    return () => clearTimeout(timeout);
  }, [step, submittedPosts]);

  function toggleInstagramAccount(accountId: string) {
    setSelectedInstagramAccountIds((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  }

  async function handleSubmit() {
    const mediaIds = isCarousel
      ? carouselItems.map((m) => m.mediaId)
      : primaryMedia
        ? [primaryMedia.mediaId]
        : [];

    if (!postType || mediaIds.length === 0) return;

    setSubmitting(true);
    setError(null);
    setStep("submitting");

    try {
      const body: Record<string, unknown> = {
        platform: "instagram",
        post_type: postType,
        media_ids: mediaIds,
      };
      if (selectedInstagramAccountIds.length > 0) {
        body.target_account_ids = selectedInstagramAccountIds;
      }
      if (caption) body.caption = caption;
      if (isReel && coverItem) body.cover_media_id = coverItem.mediaId;
      if (audioName && isReel) body.audio_name = audioName;

      const res = await fetch("/api/v1/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error.message);
      }

      setSubmittedPosts(json.data.posts ?? [
        {
          post_id: json.data.post_id,
          container_id: json.data.container_id,
          status: json.data.status,
          status_check_url: json.data.status_check_url,
          target_account_id: selectedInstagramAccountIds[0] ?? null,
        },
      ]);
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post");
      setStep("details");
    } finally {
      setSubmitting(false);
    }
  }

  if (!hasInstagram) {
    return (
      <Card className="text-center py-12">
        <p className="text-text-muted mb-4">
          No platforms connected. Add your credentials in Settings to start
          posting.
        </p>
        <Button onClick={() => router.push("/settings")}>Go to Settings</Button>
      </Card>
    );
  }

  if (step === "result" && submittedPosts.length > 0) {
    const allPublished = submittedPosts.every(
      (post) => post.status === "published"
    );
    const hasProcessing = submittedPosts.some(
      (post) => post.status === "processing"
    );
    return (
      <Card className="text-center py-12">
        <div className="mx-auto flex max-w-lg flex-col items-center gap-4">
          {allPublished ? (
            <>
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle
                  size={28}
                  className="text-success"
                  strokeWidth={1.8}
                />
              </div>
              <h2 className="text-xl font-bold tracking-normal font-[family-name:var(--font-heading)]">
                Post Published!
              </h2>
              <p className="text-text-muted text-sm">
                Your post has been successfully published to the selected
                Instagram accounts.
              </p>
            </>
          ) : (
            <>
              <StatusBadge status={hasProcessing ? "processing" : "error"} />
              <h2 className="text-xl font-bold tracking-normal font-[family-name:var(--font-heading)]">
                Posts Created
              </h2>
              <p className="text-text-muted text-sm">
                Your post is being processed for each selected account.
              </p>
            </>
          )}
          <div className="mt-2 w-full space-y-2 text-left">
            {submittedPosts.map((post) => {
              const account = instagramAccounts.find(
                (item) => item.id === post.target_account_id
              );

              return (
                <div
                  key={post.post_id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {account?.label ?? "Instagram account"}
                    </p>
                    <p className="truncate text-xs text-text-muted">
                      {account?.accountId ?? post.target_account_id}
                    </p>
                  </div>
                  <StatusBadge status={post.status} />
                </div>
              );
            })}
          </div>
          <div className="flex w-full flex-col gap-3 mt-4 sm:w-auto sm:flex-row">
            <Button variant="secondary" onClick={() => router.push("/history")}>
              View History
            </Button>
            <Button
              onClick={() => {
                setStep("type");
                setPostType(null);
                setPrimaryMedia(null);
                setCarouselItems([]);
                setCoverItem(null);
                setCaption("");
                setAudioName("");
                setSubmittedPosts([]);
              }}
            >
              Create Another
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (step === "submitting") {
    return (
      <Card className="text-center py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-text-muted">Creating your post...</p>
        </div>
      </Card>
    );
  }

  const mediaContinueDisabled = isCarousel
    ? carouselItems.length < 2
    : !primaryMedia;

  return (
    <div className="max-w-2xl space-y-6">
      {step === "type" && (
        <>
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="processing">Instagram</Badge>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {POST_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => {
                  setPostType(type.id);
                  setPrimaryMedia(null);
                  setCarouselItems([]);
                  setCoverItem(null);
                  setStep("media");
                }}
                className="flex items-start gap-3 p-4 rounded-xl border border-border bg-surface-elevated hover:border-primary/40 hover:bg-primary/5 transition-colors text-left cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center flex-shrink-0">
                  <type.icon
                    size={20}
                    strokeWidth={1.8}
                    className="text-foreground"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {type.label}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {type.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {step === "media" && postType && (
        <>
          <button
            type="button"
            onClick={() => setStep("type")}
            className="flex items-center gap-1 text-sm text-text-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} strokeWidth={1.8} />
            Back to post types
          </button>

          <Card>
            <h2 className="text-base font-bold tracking-normal font-[family-name:var(--font-heading)] mb-4">
              Add {selectedTypeConfig?.mediaLabel}
            </h2>

            {isCarousel ? (
              <CarouselBuilder
                galleryItems={galleryItems}
                items={carouselItems}
                onChange={setCarouselItems}
              />
            ) : (
              <MediaInput
                galleryItems={galleryItems}
                allowedKinds={
                  selectedTypeConfig?.acceptsVideo
                    ? (["video"] as const)
                    : (["image"] as const)
                }
                accept={
                  selectedTypeConfig?.acceptsVideo
                    ? "video/mp4,video/quicktime"
                    : "image/jpeg,image/png,image/webp"
                }
                value={primaryMedia}
                onChange={setPrimaryMedia}
              />
            )}

            <div className="mt-6 flex justify-end">
              <Button
                disabled={mediaContinueDisabled}
                onClick={() => setStep("details")}
                className="w-full sm:w-auto"
              >
                Continue
              </Button>
            </div>
          </Card>
        </>
      )}

      {step === "details" && postType && (
        <>
          <button
            type="button"
            onClick={() => setStep("media")}
            className="flex items-center gap-1 text-sm text-text-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} strokeWidth={1.8} />
            Back to media
          </button>

          <Card>
            <h2 className="text-base font-bold tracking-normal font-[family-name:var(--font-heading)] mb-4">
              Post Details
            </h2>

            <div className="space-y-4">
              {needsCaption && (
                <Textarea
                  id="caption"
                  label="Caption"
                  placeholder="Write your caption..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  charCount={{ current: caption.length, max: 2200 }}
                />
              )}

              {isReel && (
                <>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-foreground">
                      Cover image (optional)
                    </p>
                    <p className="text-xs text-text-muted">
                      Upload, pick from gallery, or paste an image URL.
                    </p>
                    <MediaInput
                      galleryItems={galleryItems}
                      allowedKinds={["image"] as const}
                      accept="image/jpeg,image/png,image/webp"
                      value={coverItem}
                      onChange={setCoverItem}
                    />
                  </div>
                  <Input
                    id="audio_name"
                    label="Audio Name (optional)"
                    placeholder="Original audio"
                    icon={Music}
                    value={audioName}
                    onChange={(e) => setAudioName(e.target.value)}
                  />
                </>
              )}

              <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      Publish to accounts
                    </p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      Tick the accounts where this post should go.
                    </p>
                  </div>
                  {instagramAccounts.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedInstagramAccountIds(
                          selectedInstagramAccountIds.length ===
                            instagramAccounts.length
                            ? []
                            : instagramAccounts.map((account) => account.id)
                        )
                      }
                      className="text-xs font-medium text-primary hover:text-primary/80"
                    >
                      {selectedInstagramAccountIds.length ===
                      instagramAccounts.length
                        ? "Clear all"
                        : "Select all"}
                    </button>
                  )}
                </div>

                <div className="grid gap-2">
                  {instagramAccounts.map((account) => {
                    const selected = selectedInstagramAccountIds.includes(
                      account.id
                    );

                    return (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => toggleInstagramAccount(account.id)}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                          selected
                            ? "border-primary/50 bg-primary/5"
                            : "border-border bg-surface-elevated hover:border-primary/30"
                        }`}
                      >
                        {selected ? (
                          <CheckCircle
                            size={18}
                            strokeWidth={1.8}
                            className="text-primary"
                          />
                        ) : (
                          <Circle
                            size={18}
                            strokeWidth={1.8}
                            className="text-text-muted"
                          />
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-foreground">
                            {account.label}
                          </span>
                          <span className="block truncate text-xs text-text-muted">
                            {account.accountId}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {selectedInstagramAccountIds.length === 0 && (
                  <p className="text-xs text-error">
                    Select at least one account before publishing.
                  </p>
                )}
              </div>

              {error && (
                <div className="bg-error/10 border border-error/20 text-error text-sm px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <Button variant="secondary" onClick={() => setStep("media")}>
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  loading={submitting}
                  disabled={selectedInstagramAccountIds.length === 0}
                  className="sm:min-w-40"
                >
                  <Send size={14} strokeWidth={1.8} />
                  Publish to {selectedInstagramAccountIds.length}{" "}
                  {selectedInstagramAccountIds.length === 1
                    ? "Account"
                    : "Accounts"}
                </Button>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
