import Constants from 'expo-constants';
import { z } from 'zod';

/**
 * Client configuration, validated once at startup.
 *
 * The Supabase anon key is a publishable credential guarded by RLS, so it
 * ships in the client bundle by design. It still lives in env rather than
 * source so staging and production can differ without a code change.
 */
const envSchema = z.object({
  EXPO_PUBLIC_SUPABASE_PROJECT_ID: z.string().min(1, 'Supabase project id is required'),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
});

function readEnv(): z.infer<typeof envSchema> {
  const raw = {
    EXPO_PUBLIC_SUPABASE_PROJECT_ID: process.env.EXPO_PUBLIC_SUPABASE_PROJECT_ID,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  };

  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Missing or invalid environment configuration: ${missing}`);
  }
  return parsed.data;
}

const env = readEnv();

export const config = {
  supabaseUrl: `https://${env.EXPO_PUBLIC_SUPABASE_PROJECT_ID}.supabase.co`,
  supabaseAnonKey: env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  isDevelopment: Boolean(Constants.expoConfig?.extra?.isDevelopment) || __DEV__,
} as const;
