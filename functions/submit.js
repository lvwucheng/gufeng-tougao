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
    const SUPABASE_URL = "https://your-project.supabase.co";
    const SUPABASE_KEY = "your-supabase-anon-key";
    
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
export async function onRequestPost(context) {
  // 自定义日志函数
  const log = (message) => {
    // 发送日志到外部服务
    fetch('https://gufeng-logger.workers.dev/log', {
      method: 'POST',
      body: JSON.stringify({ 
        project: "gufeng", 
        message 
      })
    });
  };
  
  try {
    log("开始处理投稿请求");
    const data = await context.request.json();
    log(`收到投稿：${data.title.substring(0, 20)}...`);
    
    // ...原有处理逻辑...
    
  } catch (error) {
    log(`错误：${error.message}`);
    // ...
  }
}
