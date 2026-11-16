import "server-only";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./data/uploads");

const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};
const MAX_BYTES = 10 * 1024 * 1024;

/** Save an uploaded image and return its public URL. Swap for S3/R2 in production. */
export async function saveUpload(file: File, folder: string): Promise<string> {
  const ext = ALLOWED[file.type];
  if (!ext) throw new Error("Unsupported image type. Use JPG, PNG, WebP, GIF or AVIF.");
  if (file.size > MAX_BYTES) throw new Error("Image is larger than 10 MB.");
  const safeFolder = folder.replace(/[^a-z0-9_-]/gi, "");
  const dir = path.join(UPLOAD_DIR, safeFolder);
  await mkdir(dir, { recursive: true });
  const name = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}.${ext}`;
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return `/api/uploads/${safeFolder}/${name}`;
}

export function isFile(v: FormDataEntryValue | null): v is File {
  return typeof v === "object" && v !== null && "arrayBuffer" in v && (v as File).size > 0;
}
