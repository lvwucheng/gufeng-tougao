// 完整 Cloudflare Worker 代码 - 增强版
export default {
  async fetch(request, env) {
    // 设置 CORS 响应头
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
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
      if (path === "/sign") {
        return await handleSignRequest(request, env, corsHeaders);
      } else if (path === "/submit") {
        return await handleSubmission(request, env, corsHeaders);
      } else if (path === "/health") {
        return new Response(JSON.stringify({ status: "ok", timestamp: new Date() }), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      } else if (path.startsWith("/api/posts")) {
        return await handleApiPosts(request, env, corsHeaders);
      } else {
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
      status: submission.status || "pending", // 添加状态字段
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
          "Prefer": "return=representation" // 返回插入的数据
        },
        body: JSON.stringify(dbData)
      }
    );
    
    // 检查数据库响应
    if (!dbResponse.ok) {
      const errorText = await dbResponse.text();
      throw new Error(`Database error: ${dbResponse.status} - ${errorText}`);
    }
    
    const insertedData = await dbResponse.json();
    
    // 成功响应
    return new Response(JSON.stringify(insertedData[0]), {
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

// 处理 /api/posts 相关请求
async function handleApiPosts(request, env, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname;
  const id = path.split('/').pop(); // 获取ID部分
  
  // 处理 /api/posts/stats 请求
  if (request.method === "GET" && path.endsWith("/stats")) {
    return await handleGetStats(env, corsHeaders);
  }
  
  // 根据HTTP方法路由到不同的处理函数
  if (request.method === "GET" && id && id !== "posts") {
    return await handleGetSubmission(id, env, corsHeaders);
  } else if (request.method === "GET") {
    return await handleGetSubmissions(request, env, corsHeaders);
  } else if (request.method === "POST") {
    return await handleSubmission(request, env, corsHeaders); // 重用现有的提交处理
  } else if (request.method === "PUT" && id && id !== "posts") {
    return await handleUpdateSubmission(id, request, env, corsHeaders);
  } else if (request.method === "POST" && id && id !== "posts" && path.endsWith("/review")) {
    return await handleReviewSubmission(id, request, env, corsHeaders);
  } else {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders
    });
  }
}

// 获取单个投稿
async function handleGetSubmission(id, env, corsHeaders) {
  try {
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/submissions?id=eq.${id}&select=*`,
      {
        method: "GET",
        headers: {
          "apikey": env.SUPABASE_KEY,
          "Authorization": `Bearer ${env.SUPABASE_KEY}`
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Database error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.length === 0) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    
    return new Response(JSON.stringify(data[0]), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error(`Get submission error: ${error.message}`);
    return new Response(JSON.stringify({ 
      error: "Failed to get submission",
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

// 获取投稿列表
async function handleGetSubmissions(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const category = url.searchParams.get("category");
    const search = url.searchParams.get("search");
    
    let query = `${env.SUPABASE_URL}/rest/v1/submissions?select=*&order=created_at.desc`;
    
    if (status && status !== "all") {
      query += `&status=eq.${status}`;
    }
    
    if (category) {
      query += `&category=eq.${category}`;
    }
    
    if (search) {
      query += `&or=(title.ilike.%${search}%,author.ilike.%${search}%)`;
    }
    
    const response = await fetch(query, {
      method: "GET",
      headers: {
        "apikey": env.SUPABASE_KEY,
        "Authorization": `Bearer ${env.SUPABASE_KEY}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Database error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error(`Get submissions error: ${error.message}`);
    return new Response(JSON.stringify({ 
      error: "Failed to get submissions",
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

// 更新投稿
async function handleUpdateSubmission(id, request, env, corsHeaders) {
  try {
    const updateData = await request.json();
    
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/submissions?id=eq.${id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "apikey": env.SUPABASE_KEY,
          "Authorization": `Bearer ${env.SUPABASE_KEY}`,
          "Prefer": "return=representation"
        },
        body: JSON.stringify(updateData)
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Database error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    return new Response(JSON.stringify(data[0]), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error(`Update submission error: ${error.message}`);
    return new Response(JSON.stringify({ 
      error: "Failed to update submission",
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

// 审核投稿
async function handleReviewSubmission(id, request, env, corsHeaders) {
  try {
    const { status } = await request.json();
    
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/submissions?id=eq.${id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "apikey": env.SUPABASE_KEY,
          "Authorization": `Bearer ${env.SUPABASE_KEY}`,
          "Prefer": "return=representation"
        },
        body: JSON.stringify({ status })
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Database error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    return new Response(JSON.stringify(data[0]), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error(`Review submission error: ${error.message}`);
    return new Response(JSON.stringify({ 
      error: "Failed to review submission",
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

// 获取统计数据
async function handleGetStats(env, corsHeaders) {
  try {
    // 获取总数
    const totalResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/submissions?select=count`,
      {
        method: "GET",
        headers: {
          "apikey": env.SUPABASE_KEY,
          "Authorization": `Bearer ${env.SUPABASE_KEY}`
        }
      }
    );
    
    if (!totalResponse.ok) {
      throw new Error(`Database error: ${totalResponse.status}`);
    }
    
    const totalData = await totalResponse.json();
    const totalCount = totalData[0].count;
    
    // 获取待审核数
    const pendingResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/submissions?status=eq.pending&select=count`,
      {
        method: "GET",
        headers: {
          "apikey": env.SUPABASE_KEY,
          "Authorization": `Bearer ${env.SUPABASE_KEY}`
        }
      }
    );
    
    if (!pendingResponse.ok) {
      throw new Error(`Database error: ${pendingResponse.status}`);
    }
    
    const pendingData = await pendingResponse.json();
    const pendingCount = pendingData[0].count;
    
    // 获取已通过数
    const approvedResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/submissions?status=eq.approved&select=count`,
      {
        method: "GET",
        headers: {
          "apikey": env.SUPABASE_KEY,
          "Authorization": `Bearer ${env.SUPABASE_KEY}`
        }
      }
    );
    
    if (!approvedResponse.ok) {
      throw new Error(`Database error: ${approvedResponse.status}`);
    }
    
    const approvedData = await approvedResponse.json();
    const approvedCount = approvedData[0].count;
    
    // 获取已拒绝数
    const rejectedResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/submissions?status=eq.rejected&select=count`,
      {
        method: "GET",
        headers: {
          "apikey": env.SUPABASE_KEY,
          "Authorization": `Bearer ${env.SUPABASE_KEY}`
        }
      }
    );
    
    if (!rejectedResponse.ok) {
      throw new Error(`Database error: ${rejectedResponse.status}`);
    }
    
    const rejectedData = await rejectedResponse.json();
    const rejectedCount = rejectedData[0].count;
    
    return new Response(JSON.stringify({
      total: totalCount,
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error(`Get stats error: ${error.message}`);
    return new Response(JSON.stringify({ 
      error: "Failed to get stats",
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
