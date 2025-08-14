// worker.js
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }
    
    const formData = await request.formData();
    const file = formData.get('file');
    
    // 将文件信息保存到 Supabase
    const supabaseResponse = await fetch(
      `https://${env.SUPABASE_PROJECT}.supabase.co/rest/v1/files`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_KEY}`
        },
        body: JSON.stringify({
          filename: file.name,
          size: file.size,
          type: file.type
        })
      }
    );
    
    return new Response(await supabaseResponse.text(), {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  }
};

function handleOptions(request) {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': '*'
    }
  });
}
