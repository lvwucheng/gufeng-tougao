import { createClient } from '@supabase/supabase-js';

// Supabase 配置（建议用环境变量，避免硬编码）
export async function onRequest(context) {
const supabaseUrl = context.env.SUPABASE_URL;
  const supabaseKey = context.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
}
export async function onRequest(context) {
  // 简单登录验证（实际需结合 JWT，这里简化）
  if (!isLoggedIn(context.request)) {
    return new Response(JSON.stringify({ error: '请先登录' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // 从 Supabase 数据库拉取投稿表数据
    const { data, error } = await supabase
      .from('submissions') // 投稿表名，需与前端提交时一致
      .select('*'); // 拉取所有字段

    if (error) throw error;

    // 格式化后返回给前端
    const formattedData = data.map(item => ({
      id: item.id,
      title: item.title,
      author: item.author,
      category: item.category,
      content: item.content,
      timestamp: item.timestamp, // 新增：显示投稿时间
      status: item.status || '待审核', // 新增：默认待审核
      image: item.image, // 封面图数据
      attachment: item.attachment // 附件数据
    }));

    return new Response(JSON.stringify(formattedData), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: '获取数据失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 简化的登录状态检查（实际需用 JWT 验证）
function isLoggedIn(request) {
  return true; // 测试阶段暂时放行，生产需替换为真实验证
}
