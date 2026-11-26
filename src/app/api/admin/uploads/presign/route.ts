import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import path from "node:path";
import { verifyAdminToken } from "@/lib/auth";
import { storageProvider } from "@/lib/storage";

export async function POST(req: NextRequest) {
  const authError = verifyAdminToken(req);
  if (authError) return authError;

  const body = (await req.json()) as {
    filename?: string;
    contentType?: string;
    songId?: number;
  };

  if (!body.filename || !body.contentType) {
    return NextResponse.json(
      { error: "filename and contentType are required" },
      { status: 400 }
    );
  }

  const ext = path.extname(body.filename) || ".mp3";
  const songPrefix = body.songId ? `song-${body.songId}` : "misc";
  const key = `clips/${songPrefix}/${crypto.randomUUID()}${ext}`;

  const result = await storageProvider.createPresignedUploadUrl(
    key,
    body.contentType
  );

  if (!result) {
    return NextResponse.json(
      {
        error: "Not Configured",
        message:
          "Cloudflare R2 environment variables (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET) are not configured.",
      },
      { status: 501 }
    );
  }

  return NextResponse.json({
    key,
    uploadUrl: result.uploadUrl,
    publicUrl: result.publicUrl,
  });
}
