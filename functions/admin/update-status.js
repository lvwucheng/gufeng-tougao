import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ojfmwalxryldzcujehav.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZm13YWx4cnlsZHpjdWplaGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3MjUwMzMsImV4cCI6MjA3MDMwMTAzM30.5LNX9PpYnqb5dVR5OKas7qr7zjd10IRSBZop4cuNryM';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function onRequest(context) {
  if (context.request.method !== 'POST') {
    return new Response(JSON.stringify({ error: '只支持 POST 请求' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { id, status } = await context.request.json();

    // 更新 Supabase 中对应投稿的状态
    const { error } = await supabase
      .from('submissions')
      .update({ status })
      .eq('id', id);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: '更新失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
