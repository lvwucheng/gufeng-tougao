export async function onRequestPost(context) {
  try {
    const { request } = context;
    
    // 添加 CORS 头
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };
    
    // 处理 OPTIONS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders
      });
    }
    
    const data = await request.json();
    console.log('收到投稿数据:', data);
    
    // 验证数据
    if (!data.title || data.title.trim().length < 5) {
      return new Response(JSON.stringify({ 
        error: '标题至少需要5个字' 
      }), { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    if (!data.content || data.content.trim().length < 50) {
      return new Response(JSON.stringify({ 
        error: '内容至少需要50个字' 
      }), { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 从环境变量获取Supabase配置
    const SUPABASE_URL = context.env.SUPABASE_URL;
    const SUPABASE_KEY = context.env.SUPABASE_KEY;
    
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return new Response(JSON.stringify({ 
        error: '服务器配置错误' 
      }), { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 存储到数据库
    const dbUrl = `${SUPABASE_URL}/rest/v1/submissions`;
    console.log('数据库URL:', dbUrl);
    
    const response = await fetch(dbUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal' // 减少响应数据大小
      },
      body: JSON.stringify({
        title: data.title,
        content: data.content,
        category: data.category || '散文',
        author: data.author || '匿名',
        status: 'pending'
        // 移除 created_at，由数据库自动生成
      })
    });
    
    console.log('Supabase响应状态:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('数据库错误详情:', errorText);
      
      return new Response(JSON.stringify({ 
        error: `数据库存储失败: ${response.status}`,
        details: errorText
      }), { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    return new Response(JSON.stringify({ 
      success: true,
      message: '投稿已接收'
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
    
  } catch (error) {
    console.error('服务器错误:', error);
    
    return new Response(JSON.stringify({ 
      error: '服务器内部错误',
      message: error.message
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}
