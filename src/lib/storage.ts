import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface StorageProvider {
  isR2Configured(): boolean;
  saveImageBuffer(
    category: string,
    filenameHint: string,
    buffer: Buffer,
    contentType?: string
  ): Promise<string>;
  createPresignedUploadUrl(
    key: string,
    contentType: string
  ): Promise<{ uploadUrl: string; publicUrl: string } | null>;
}

export function getCacheRootDir(): string {
  const raw = process.env.CACHE_DIR || "./data/cache";
  return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
}

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET?.trim();
  const publicUrl = process.env.R2_PUBLIC_URL?.trim()?.replace(/\/+$/, "");

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    return null;
  }

  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl };
}

function createR2Client(cfg: NonNullable<ReturnType<typeof getR2Config>>) {
  return new S3Client({
    region: "auto",
    endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });
}

function extFromContentType(contentType?: string, fallbackUrl?: string): string {
  if (contentType) {
    if (contentType.includes("png")) return ".png";
    if (contentType.includes("webp")) return ".webp";
    if (contentType.includes("gif")) return ".gif";
    if (contentType.includes("jpeg") || contentType.includes("jpg"))
      return ".jpg";
  }
  if (fallbackUrl) {
    const clean = fallbackUrl.split("?")[0];
    const ext = path.extname(clean).toLowerCase();
    if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) return ext;
  }
  return ".jpg";
}

export const storageProvider: StorageProvider = {
  isR2Configured(): boolean {
    return getR2Config() !== null;
  },

  async saveImageBuffer(
    category: string,
    filenameHint: string,
    buffer: Buffer,
    contentType = "image/jpeg"
  ): Promise<string> {
    const safeCategory = category.replace(/[^a-zA-Z0-9_-]/g, "");
    const hash = crypto.createHash("sha256").update(filenameHint).digest("hex").slice(0, 16);
    const ext = extFromContentType(contentType, filenameHint);
    const filename = `${hash}${ext}`;

    const r2 = getR2Config();
    if (r2 && r2.publicUrl) {
      const key = `media/${safeCategory}/${filename}`;
      const client = createR2Client(r2);
      await client.send(
        new PutObjectCommand({
          Bucket: r2.bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          CacheControl: "public, max-age=86400",
        })
      );
      return `${r2.publicUrl}/${key}`;
    }

    const cacheDir = getCacheRootDir();
    const targetDir = path.join(cacheDir, safeCategory);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const targetPath = path.join(targetDir, filename);
    fs.writeFileSync(targetPath, buffer);
    return `/api/media/${safeCategory}/${filename}`;
  },

  async createPresignedUploadUrl(key: string, contentType: string) {
    const r2 = getR2Config();
    if (!r2) return null;

    const client = createR2Client(r2);
    const command = new PutObjectCommand({
      Bucket: r2.bucket,
      Key: key,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 600 });
    const publicUrl = r2.publicUrl
      ? `${r2.publicUrl}/${key}`
      : `r2://${r2.bucket}/${key}`;

    return { uploadUrl, publicUrl };
  },
};

export async function downloadAndCacheImage(
  imageUrl: string,
  category: string,
  referer = "https://www.bilibili.com/"
): Promise<string> {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("/api/media/") || imageUrl.startsWith("/images/")) {
    return imageUrl;
  }

  const normalizedUrl = imageUrl.startsWith("//")
    ? `https:${imageUrl}`
    : imageUrl;

  const res = await fetch(normalizedUrl, {
    headers: {
      Referer: referer,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to download image (${res.status}): ${normalizedUrl}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = res.headers.get("content-type") || "image/jpeg";

  return storageProvider.saveImageBuffer(category, normalizedUrl, buffer, contentType);
}
