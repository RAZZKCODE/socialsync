import { createClient } from "@/lib/supabase/server";
import { PostForm } from "@/components/create-post/post-form";
import { toInstagramAccountOptions } from "@/lib/instagram-accounts";
import { syncUserMediaFromStorage } from "@/lib/user-media-sync";
import type { UserMediaRow } from "@/types/database";

export default async function CreatePostPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await syncUserMediaFromStorage(user.id);
  }

  const { data: credentials } = await supabase
    .from("platform_credentials")
    .select("platform, credentials")
    .eq("is_active", true);

  const availablePlatforms = (credentials ?? []).map(
    (c) => c.platform as string
  );
  const instagramCredentialRow = (credentials ?? []).find(
    (c) => c.platform === "instagram"
  );
  const instagramAccounts = toInstagramAccountOptions(
    (instagramCredentialRow?.credentials ?? null) as Record<string, unknown> | null
  );

  let galleryRows: UserMediaRow[] = [];
  if (user) {
    const { data } = await supabase
      .from("user_media")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    galleryRows = (data ?? []) as UserMediaRow[];
  }

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold tracking-normal font-[family-name:var(--font-heading)] text-foreground">
          Create Post
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Choose a post type and add your content
        </p>
      </div>

      <PostForm
        availablePlatforms={availablePlatforms}
        instagramAccounts={instagramAccounts}
        galleryItems={galleryRows}
      />
    </div>
  );
}
