// 管理员登录接口：/admin/login
export async function onRequest(context) {
  // 只允许 POST 请求
  if (context.request.method !== 'POST') {
    return new Response(JSON.stringify({ error: '只支持 POST 请求' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // 解析请求体中的用户名和密码
    const { username, password } = await context.request.json();

    // 【重要】实际项目中，这里应该从数据库或环境变量中验证账号密码
    // 示例：硬编码一个管理员账号（仅测试用，生产环境必须替换）
    const validUsername = 'admin';
    const validPassword = '123456'; // 建议在 Pages 控制台配置为环境变量

    if (username === validUsername && password === validPassword) {
      // 登录成功：可以生成 JWT token 并返回（这里简化处理）
      return new Response(JSON.stringify({
        success: true,
        message: '登录成功'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // 账号密码错误
      return new Response(JSON.stringify({
        error: '用户名或密码错误'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    // 处理解析错误等异常
    return new Response(JSON.stringify({
      error: '请求处理失败'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
