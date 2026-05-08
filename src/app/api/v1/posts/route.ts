import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { createPostSchema } from "@/lib/validators";
import { createPost, PostServiceError } from "@/services/post.service";
import { InstagramApiError } from "@/services/platforms/instagram/instagram.service";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError("UNAUTHORIZED", "Authentication required", 401);
    }

    // 2. Parse and validate body
    const body = await request.json();
    const parsed = createPostSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid request body",
        400,
        parsed.error.issues
      );
    }

    // 3. Create the post for one or more selected target accounts
    const targetAccountIds =
      parsed.data.target_account_ids?.length
        ? parsed.data.target_account_ids
        : parsed.data.target_account_id
          ? [parsed.data.target_account_id]
          : [undefined];

    const posts = await Promise.all(
      targetAccountIds.map(async (targetAccountId) => {
        const post = await createPost(user.id, {
          ...parsed.data,
          target_account_id: targetAccountId,
          target_account_ids: undefined,
        });

        return {
          post_id: post.id,
          container_id: post.container_id,
          status: post.status,
          status_check_url: `/api/v1/posts/${post.id}`,
          target_account_id: targetAccountId ?? null,
        };
      })
    );

    return apiSuccess(
      {
        post_id: posts[0]?.post_id,
        container_id: posts[0]?.container_id,
        status: posts[0]?.status,
        status_check_url: posts[0]?.status_check_url,
        posts,
      },
      201
    );
  } catch (err) {
    if (err instanceof PostServiceError) {
      return apiError(err.code, err.message, 400);
    }
    if (err instanceof InstagramApiError) {
      return apiError(
        "PLATFORM_API_ERROR",
        err.message,
        err.statusCode >= 500 ? 502 : 400,
        err.apiError
      );
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return apiError("INTERNAL_ERROR", message, 500);
  }
}
