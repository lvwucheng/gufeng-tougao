// 获取投稿列表接口：/admin/submissions
export async function onRequest(context) {
  // 简单验证：实际项目中应检查登录状态（如 JWT token）
  if (!isLoggedIn(context.request)) { // 需要实现登录状态检查函数
    return new Response(JSON.stringify({ error: '请先登录' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // 从数据库获取投稿数据（这里简化为模拟数据）
    // 实际项目中应连接你的数据库（如 Cloudflare D1、PlanetScale 等）
    const submissions = [
      {
        id: '1',
        title: '测试文章',
        author: '匿名',
        category: '散文',
        status: '待审核',
        timestamp: '2023-10-01T08:00:00Z'
      }
    ];

    return new Response(JSON.stringify(submissions), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: '获取数据失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 简单的登录状态检查（实际需用 JWT 验证）
function isLoggedIn(request) {
  // 从请求头或 Cookie 中获取 token 并验证
  // 这里简化为直接返回 true（仅测试用）
  return true;
}
