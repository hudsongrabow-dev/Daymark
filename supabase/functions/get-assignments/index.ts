import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed.' }, { status: 405, headers: corsHeaders });
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization) {
    return Response.json({ error: 'Sign in to access assignments.' }, { status: 401, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseKey) {
    return Response.json({ error: 'Supabase function configuration is missing.' }, { status: 500, headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'A valid signed-in user is required.' }, { status: 401, headers: corsHeaders });
  }

  const { data, error } = await supabase
    .from('assignments')
    .select('id,title,due_date,due_time,reminder,type,color,color_hex,completed,completed_at')
    .eq('user_id', user.id)
    .order('due_date')
    .order('id');

  if (error) {
    console.error('Could not fetch assignments:', error.message);
    return Response.json({ error: 'Could not fetch assignments.' }, { status: 500, headers: corsHeaders });
  }

  return Response.json({
    assignments: data.map(({ id, title, due_date, due_time, reminder, type, color, color_hex, completed, completed_at }) => ({
      id,
      name: title,
      dueDate: due_date,
      dueTime: due_time.slice(0, 5),
      reminder,
      type,
      color,
      colorHex: color_hex,
      completed,
      ...(completed_at ? { completedAt: completed_at } : {})
    }))
  }, { headers: corsHeaders });
});
