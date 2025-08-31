export async function onRequestPost(context) {
  try {
    const { request } = context;
    
    // 这里仅作为兼容处理，实际文件上传已在前端通过Supabase完成
    // 此接口用于避免405错误，返回成功状态
    return new Response(JSON.stringify({
      success: true,
      message: "文件上传已在前端处理"
    }), {
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
