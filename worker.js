// 完整 Cloudflare Worker 代码
export default {
  async fetch(request, env) {
    // 设置 CORS 响应头
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };
    
    // 处理预检请求 (OPTIONS)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders
      });
    }
    
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      
      // 路由处理
      switch (path) {
        case "/sign": // 获取预签名URL
          return await handleSignRequest(request, env, corsHeaders);
          
        case "/submit": // 提交投稿数据
          return await handleSubmission(request, env, corsHeaders);
          
        case "/health": // 健康检查端点
          return new Response(JSON.stringify({ status: "ok", timestamp: new Date() }), {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });
          
        default:
          return new Response("Not Found", { 
            status: 404,
            headers: corsHeaders
          });
      }
    } catch (error) {
      // 全局错误处理
      console.error(`Worker Error: ${error.message}`);
      return new Response(JSON.stringify({ 
        error: "Internal Server Error",
        message: error.message 
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
  }
};

// 处理预签名请求
async function handleSignRequest(request, env, corsHeaders) {
  // 验证请求方法
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders
    });
  }
  
  try {
    // 解析请求数据
    const { fileName } = await request.json();
    
    // 验证文件名
    if (!fileName || typeof fileName !== "string" || fileName.length > 255) {
      return new Response(JSON.stringify({ 
        error: "Invalid file name" 
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    
    // 生成唯一文件名（防止冲突）
    const uniqueFileName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '')}`;
    
    // 调用 Supabase 生成预签名 URL
    const signResponse = await fetch(
      `${env.SUPABASE_URL}/storage/v1/object/sign/${env.SUPABASE_BUCKET}/${uniqueFileName}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": env.SUPABASE_KEY,
          "Authorization": `Bearer ${env.SUPABASE_KEY}`
        },
        body: JSON.stringify({
          expiresIn: 600 // 10分钟有效期
        })
      }
    );
    
    // 检查 Supabase 响应
    if (!signResponse.ok) {
      const errorText = await signResponse.text();
      throw new Error(`Supabase sign error: ${signResponse.status} - ${errorText}`);
    }
    
    // 解析预签名 URL
    const { signedURL } = await signResponse.json();
    const fullUrl = `${env.SUPABASE_URL}${signedURL}`;
    
    // 返回响应
    return new Response(JSON.stringify({ 
      signedUrl: fullUrl,
      fileName: uniqueFileName
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
    
  } catch (error) {
    console.error(`Sign Error: ${error.message}`);
    return new Response(JSON.stringify({ 
      error: "Sign URL generation failed",
      message: error.message 
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
}

// 处理投稿提交
async function handleSubmission(request, env, corsHeaders) {
  // 验证请求方法
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders
    });
  }
  
  try {
    // 解析请求数据
    const submission = await request.json();
    
    // 验证必要字段
    const requiredFields = ["title", "content"];
    const missingFields = requiredFields.filter(field => !submission[field]);
    
    if (missingFields.length > 0) {
      return new Response(JSON.stringify({ 
        error: "Missing required fields",
        missing: missingFields
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    
    // 验证标题长度
    if (submission.title.length < 5) {
      return new Response(JSON.stringify({ 
        error: "Title must be at least 5 characters"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    
    // 验证内容长度
    if (submission.content.length < 50) {
      return new Response(JSON.stringify({ 
        error: "Content must be at least 50 characters"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    
    // 准备数据库数据
    const dbData = {
      title: submission.title,
      category: submission.category || "未分类",
      author: submission.author || "匿名",
      content: submission.content,
      file_url: submission.fileUrl || null,
      created_at: new Date().toISOString()
    };
    
    // 保存到数据库
    const dbResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/submissions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": env.SUPABASE_KEY,
          "Authorization": `Bearer ${env.SUPABASE_KEY}`,
          "Prefer": "return=minimal" // 不返回插入的数据
        },
        body: JSON.stringify(dbData)
      }
    );
    
    // 检查数据库响应
    if (!dbResponse.ok) {
      const errorText = await dbResponse.text();
      throw new Error(`Database error: ${dbResponse.status} - ${errorText}`);
    }
    
    // 成功响应
    return new Response(JSON.stringify({ 
      success: true,
      message: "Submission created"
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
    
  } catch (error) {
    console.error(`Submission Error: ${error.message}`);
    return new Response(JSON.stringify({ 
      error: "Submission failed",
      message: error.message 
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
}
