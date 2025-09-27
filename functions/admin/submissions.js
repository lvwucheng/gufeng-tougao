import { createClient } from '@supabase/supabase-js';

// 只保留一个onRequest函数！
export async function onRequest(context) {
  // 从环境变量读取Supabase配置
  const supabaseUrl = context.env.SUPABASE_URL;
  const supabaseKey = context.env.SUPABASE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 简单登录验证（测试阶段可暂时放行）
  if (!isLoggedIn(context.request)) {
    return new Response(JSON.stringify({ error: '请先登录' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // 从Supabase拉取投稿数据
    const { data, error } = await supabase
      .from('submissions') // 确保表名正确
      .select('*');

    if (error) throw error;

    // 格式化数据并返回
    const formattedData = data.map(item => ({
      id: item.id,
      title: item.title,
      author: item.author,
      category: item.category,
      content: item.content,
      timestamp: item.timestamp,
      status: item.status || '待审核',
      image: item.image,
      attachment: item.attachment
    }));

    return new Response(JSON.stringify(formattedData), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: '获取数据失败: ' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 登录状态检查函数
function isLoggedIn(request) {
  // 测试阶段暂时返回true，生产环境需替换为JWT验证
  return true;
}
