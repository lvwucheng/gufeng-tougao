
export async function onRequestPost(context) {
  try {
    const { request } = context;
    const data = await request.json();
    
    // 验证数据
    if (!data.title || data.title.length < 5) {
      throw new Error('标题至少需要5个字');
    }
    
    if (!data.content || data.content.length < 50) {
      throw new Error('内容至少需要50个字');
    }
    
    // 从环境变量获取Supabase配置
    const SUPABASE_URL = context.env.SUPABASE_URL;
    const SUPABASE_KEY = context.env.SUPABASE_KEY;
    
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('服务器配置错误');
    }
    
    // 存储到数据库
    const dbUrl = `${SUPABASE_URL}/rest/v1/submissions`;
    const response = await fetch(dbUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({
        title: data.title,
        content: data.content,
        category: data.category || '散文',
        author: data.author || '匿名',
        status: 'pending', // 待审核状态
        created_at: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`数据库存储失败: ${response.status} - ${errorText}`);
    }
    
    return new Response(JSON.stringify({ 
      success: true,
      message: '投稿已接收'
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
