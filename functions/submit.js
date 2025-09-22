export async function onRequestPost(context) {
    try {
        const { request } = context;
        const data = await request.json(); // 接收网页端数据（含文件）
        
        // 验证基础数据
        if (!data.title || !data.content) {
            return new Response(JSON.stringify({ error: "标题和内容不能为空" }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Supabase配置信息
        const SUPABASE_URL = "https://ojfmwalxryldzcujehav.supabase.co";
        const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZm13YWx4cnlsZHpjdWplaGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3MjUwMzMsImV4cCI6MjA3MDMwMTAzM30.5LNX9PpYnqb5dVR5OKas7qr7zjd10IRSBZop4cuNryM";
        const BUCKET_NAME = "submission-files"; // 已有的存储桶

        // 文件上传工具函数
        const uploadFile = async (fileData) => {
            if (!fileData) return null; // 无文件则返回null
            
            try {
                // Base64转二进制
                const binaryData = Uint8Array.from(atob(fileData.base64), c => c.charCodeAt(0));
                
                // 上传到Supabase存储桶
                const uploadResponse = await fetch(
                    `${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${fileData.fileName}`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': fileData.type || 'application/octet-stream',
                            'apikey': SUPABASE_KEY,
                            'Authorization': `Bearer ${SUPABASE_KEY}`,
                        },
                        body: binaryData
                    }
                );

                if (!uploadResponse.ok) {
                    const errorDetails = await uploadResponse.text();
                    throw new Error(`文件上传失败: ${errorDetails}`);
                }

                // 返回公开访问URL
                return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${fileData.fileName}`;
            } catch (err) {
                console.error("文件上传错误:", err);
                throw new Error(`文件处理失败: ${err.message}`);
            }
        };

        // 并行上传图片和附件
        const [imageUrl, attachmentUrl] = await Promise.all([
            uploadFile(data.image),
            uploadFile(data.attachment)
        ]);

        // 准备存入数据库的数据（与数据库字段严格匹配）
        const dbData = {
            title: data.title,
            category: data.category,
            author: data.author,
            content: data.content,
            created_at: new Date().toISOString(),
            images: imageUrl ? [imageUrl] : [], // 图片URL存入images数组（jsonb类型）
            file_url: attachmentUrl // 附件URL存入file_url（text类型）
        };

        // 存入Supabase数据库
        const dbResponse = await fetch(`${SUPABASE_URL}/rest/v1/submissions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Prefer': 'return=representation' // 要求返回插入的数据
            },
            body: JSON.stringify(dbData)
        });

        if (!dbResponse.ok) {
            const errorDetails = await dbResponse.text();
            throw new Error(`数据库存储失败: ${errorDetails}`);
        }

        // 获取返回的记录ID
        const supabaseData = await dbResponse.json();
        const uniqueId = supabaseData?.[0]?.id;
        if (!uniqueId) {
            throw new Error('数据库存储成功，但未返回有效ID');
        }

        // 返回成功响应（供前端判断）
        return new Response(JSON.stringify({ 
            success: true, 
            uniqueId 
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        // 错误处理
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
    
