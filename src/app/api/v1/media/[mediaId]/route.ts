import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
): Promise<NextResponse> {
  try {
    const { mediaId } = await params;

    // Get user session
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

    // Get media row to verify ownership and get storage path
    const { data: mediaRow, error: fetchError } = await supabase
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

    // Delete from Supabase Storage
    const { error: storageError } = await supabase.storage
      .from("post-media")
      .remove([mediaRow.storage_path]);

    if (storageError) {
      console.error("Storage delete error:", storageError);
      // Continue even if storage delete fails
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from("user_media")
      .delete()
      .eq("id", mediaId)
      .eq("user_id", user.id);

    if (dbError) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "DELETE_ERROR", message: "Failed to delete media" },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { mediaId },
    });
  } catch (error) {
    console.error("DELETE /api/v1/media/[mediaId]:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      },
      { status: 500 }
    );
  }
}
