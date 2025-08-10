// cloudflare/functions/admin.js
export async function onRequestPost(context) {
  const { request } = context;
  
  try {
    const data = await request.json();
    const { action } = data;
    
    // 从环境变量获取Supabase配置
    const SUPABASE_URL = context.env.SUPABASE_URL;
    const SUPABASE_KEY = context.env.SUPABASE_KEY;
    
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('服务器配置错误');
    }
    
    // 处理不同管理操作
    switch (action) {
      case 'get_submissions': {
        const { status = 'pending', page = 1, limit = 10 } = data;
        const offset = (page - 1) * limit;
        
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/submissions?` + 
          new URLSearchParams({
            select: '*',
            status: `eq.${status}`,
            order: 'created_at.desc',
            offset: offset,
            limit: limit
          }), 
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`
            }
          }
        );
        
        if (!response.ok) {
          throw new Error('获取投稿列表失败');
        }
        
        const submissions = await response.json();
        const countResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/submissions?` + 
          new URLSearchParams({
            select: 'count',
            status: `eq.${status}`
          }), 
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Prefer': 'count=exact'
            }
          }
        );
        
        const count = countResponse.headers.get('content-range').split('/')[1];
        
        return new Response(JSON.stringify({
          success: true,
          data: submissions,
          total: parseInt(count),
          page,
          limit
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      case 'update_status': {
        const { id, status } = data;
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/submissions?id=eq.${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          },
          body: JSON.stringify({ status })
        });
        
        if (!response.ok) {
          throw new Error('更新状态失败');
        }
        
        return new Response(JSON.stringify({ 
          success: true,
          message: '状态更新成功'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      default:
        throw new Error('无效的操作类型');
    }
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
