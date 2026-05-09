import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/v1/media/[mediaId]/download
 * Proxies the file from Supabase Storage so it can be downloaded
 * with Content-Disposition: attachment (forces browser download).
 * Uses admin client for storage access (handles private buckets).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
): Promise<NextResponse> {
  try {
    const { mediaId } = await params;

    // --- Auth check with user's session ---
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookies) => {
            cookieStore.getAll().forEach((cookie) => {
              cookieStore.delete(cookie.name);
            });
            cookies.forEach((cookie) => {
              cookieStore.set(cookie.name, cookie.value);
            });
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    // --- Admin client for DB + Storage access ---
    const admin = createAdminClient();

    // Get media row — verify ownership
    const { data: mediaRow, error: fetchError } = await admin
      .from("user_media")
      .select("*")
      .eq("id", mediaId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !mediaRow) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Media not found" } },
        { status: 404 }
      );
    }

    // Download from Supabase Storage using admin (bypasses RLS)
    const { data: fileData, error: downloadError } = await admin.storage
      .from("post-media")
      .download(mediaRow.storage_path);

    if (downloadError || !fileData) {
      console.error("Storage download error:", downloadError);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DOWNLOAD_ERROR",
            message: downloadError?.message ?? "Could not download file from storage",
          },
        },
        { status: 500 }
      );
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const fileName = mediaRow.file_name || "download";

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": mediaRow.mime_type || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(arrayBuffer.byteLength),
      },
    });
  } catch (error) {
    console.error("GET /api/v1/media/[mediaId]/download:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 }
    );
  }
}
