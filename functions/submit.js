export async function onRequestPost(context) {
    try {
        const { request } = context;
        const data = await request.json();
        
        // 验证数据
        if (!data.title || !data.content) {
            return new Response(JSON.stringify({ error: "标题和内容不能为空" }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // 存储到Supabase数据库
        const supabaseResponse = await storeInSupabase(data);
        
        if (!supabaseResponse.ok) {
            throw new Error('数据库存储失败');
        }
        
        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function storeInSupabase(data) {
    // 替换为您的Supabase信息
    const SUPABASE_URL = "https://ojfmwalxryldzcujehav.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZm13YWx4cnlsZHpjdWplaGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3MjUwMzMsImV4cCI6MjA3MDMwMTAzM30.5LNX9PpYnqb5dVR5OKas7qr7zjd10IRSBZop4cuNryM";
    
    return fetch(`${SUPABASE_URL}/rest/v1/submissions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify({
            title: data.title,
            category: data.category,
            author: data.author,
            content: data.content,
            created_at: new Date().toISOString()
        })
    });
}
