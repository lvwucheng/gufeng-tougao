export default {
  async fetch(request, env) {
    // 处理跨域请求
    if (request.method === "OPTIONS") {
      return handleOptions();
    }
    
    // 只接受POST请求
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }
    
    try {
      const formData = await request.formData();
      const title = formData.get("title");
      const content = formData.get("content");
      const file = formData.get("file");
      
      // 验证必填字段
      if (!title || !content) {
        return jsonResponse(400, { error: "标题和内容不能为空" });
      }
      
      // 处理文件上传
      let fileUrl = null;
      if (file) {
        const fileName = `${Date.now()}-${file.name}`;
        await env.SUBMISSIONS_BUCKET.put(fileName, file);
        fileUrl = `https://${env.WORKER_DOMAIN}/file/${fileName}`;
      }
      
      // 保存到数据库
      const dbResult = await fetch(
        `${env.SUPABASE_URL}/rest/v1/submissions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": env.SUPABASE_KEY,
            "Authorization": `Bearer ${env.SUPABASE_KEY}`
          },
          body: JSON.stringify({
            title,
            content,
            file_url: fileUrl
          })
        }
      );
      
      if (!dbResult.ok) {
        throw new Error("数据库保存失败");
      }
      
      return jsonResponse(200, { success: true });
      
    } catch (error) {
      return jsonResponse(500, { error: error.message });
    }
  }
};

// 文件访问路由（新增）
async function handleFileRequest(request, env, fileName) {
  const file = await env.SUBMISSIONS_BUCKET.get(fileName);
  if (!file) return new Response("文件不存在", { status: 404 });
  
  const headers = new Headers();
  file.writeHttpMetadata(headers);
  headers.set("etag", file.httpEtag);
  
  return new Response(file.body, { headers });
}

// 跨域处理
function handleOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}

// JSON响应辅助函数
function jsonResponse(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

// 路由主处理（新增）
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // 文件访问路由
    if (url.pathname.startsWith("/file/")) {
      const fileName = url.pathname.split("/file/")[1];
      return handleFileRequest(request, env, fileName);
    }
    
    // 投稿处理路由
    if (url.pathname === "/submit") {
      return handleSubmission(request, env);
    }
    
    return new Response("Not Found", { status: 404 });
  }
};
