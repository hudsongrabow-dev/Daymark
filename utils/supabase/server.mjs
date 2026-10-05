import { config } from 'dotenv';
import { createServerClient } from '@supabase/ssr';

config({ path: '.env.local' });
config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase environment variables are missing.');
}

function parseCookies(cookieHeader = '') {
  return cookieHeader.split(';').reduce((cookies, part) => {
    const separator = part.indexOf('=');
    if (separator < 0) return cookies;
    cookies[part.slice(0, separator).trim()] = decodeURIComponent(part.slice(separator + 1).trim());
    return cookies;
  }, {});
}

export function createClient(request, response) {
  const requestCookies = parseCookies(request.headers.cookie);
  const pendingCookies = [];

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return Object.entries(requestCookies).map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          requestCookies[name] = value;
          pendingCookies.push(`${name}=${encodeURIComponent(value)}; Path=${options?.path || '/'}${options?.httpOnly ? '; HttpOnly' : ''}${options?.secure ? '; Secure' : ''}`);
        });
        if (pendingCookies.length) response.setHeader('Set-Cookie', pendingCookies);
      }
    }
  });

  return supabase;
}
