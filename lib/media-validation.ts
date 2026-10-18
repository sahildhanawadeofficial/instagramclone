import { z } from "zod";

export const mediaKeySchema = z.string().trim().min(1).max(512).regex(
  /^uploads\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9._-]+$/,
  "Invalid media key"
);

export const mediaTypeSchema = z.enum(["image", "video"]);

export const postInputSchema = z.object({
  caption: z.string().trim().max(2_200).default(""),
  location: z.string().trim().max(100).default(""),
  mediaKey: mediaKeySchema,
  mediaKeys: z.array(mediaKeySchema).max(10).default([]),
  mediaType: mediaTypeSchema,
  taggedUserIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(20).default([]),
});

export const storyInputSchema = z.object({
  mediaKey: mediaKeySchema,
  mediaType: mediaTypeSchema.default("image"),
  caption: z.string().trim().max(2_000).default(""),
  taggedUserIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(20).default([]),
});

export const presignInputSchema = z.object({
  fileName: z.string().trim().min(1).max(180),
  contentType: z.enum([
    "image/jpeg", "image/png", "image/webp", "image/gif",
    "video/mp4", "video/webm", "video/quicktime",
  ]),
});

export const uploadFileInputSchema = z.object({
  fileName: z.string().trim().min(1).max(180),
  contentType: z.enum([
    "image/jpeg", "image/png", "image/webp", "image/gif",
    "video/mp4", "video/webm", "video/quicktime",
  ]),
  size: z.number().int().positive().max(100 * 1024 * 1024),
});

export function isOwnedMediaKey(key: string, userId: string): boolean {
  return key.startsWith(`uploads/${userId}/`);
}
