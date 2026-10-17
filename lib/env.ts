import { z } from "zod";

const envSchema = z.object({
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  AWS_REGION: z.string().min(1, "AWS_REGION is required").default("us-east-1"),
  AWS_ACCESS_KEY_ID: z.string().min(1, "AWS_ACCESS_KEY_ID is required"),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, "AWS_SECRET_ACCESS_KEY is required"),
  S3_BUCKET_NAME: z.string().min(1, "S3_BUCKET_NAME is required"),
  NEXT_PUBLIC_CLOUDFRONT_URL: z.string().min(1, "NEXT_PUBLIC_CLOUDFRONT_URL is required"),
});

export type Env = z.infer<typeof envSchema>;

let validatedEnv: Env | null = null;

export function getEnv(): Env {
  if (validatedEnv) return validatedEnv;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Environment validation error:", parsed.error.format());
    // In production or runtime, throw an informative error
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Missing or invalid environment variables: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
    }
  }

  // Fallback to process.env as partial Env for development resilience
  validatedEnv = (parsed.success ? parsed.data : (process.env as unknown as Env));
  return validatedEnv;
}
