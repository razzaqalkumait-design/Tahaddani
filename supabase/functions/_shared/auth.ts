import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export function cors(req: Request): Headers {
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  });
  return headers;
}

export function json(data: unknown, status = 200, extraHeaders?: Headers): Response {
  const h = new Headers({ 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  extraHeaders?.forEach((v, k) => h.set(k, v));
  return new Response(JSON.stringify(data), { status, headers: h });
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Verifies JWT and returns the user id, or throws. */
export async function requireAuth(req: Request): Promise<string> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new Error('Missing Authorization header');

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  );
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !user) throw new Error('Unauthorized');
  return user.id;
}

/** Service-role client for writing to DB bypassing RLS. */
export function serviceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}
