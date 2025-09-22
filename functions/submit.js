export async function onRequestPost(context) {
    try {
        const { request } = context;
        const data = await request.json(); // 接收网页端传来的所有数据（含文件）
        
        // 1. 验证基础数据（保留原有逻辑）
        if (!data.title || !data.content) {
            return new Response(JSON.stringify({ error: "标题和内容不能为空" }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 2. 【新增】处理文件上传（图片和附件）
        // 2.1 定义Supabase存储桶信息（使用已有的submission-files）
        const SUPABASE_URL = "https://ojfmwalxryldzcujehav.supabase.co";
        const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZm13YWx4cnlsZHpjdWplaGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3MjUwMzMsImV4cCI6MjA3MDMwMTAzM30.5LNX9PpYnqb5dVR5OKas7qr7zjd10IRSBZop4cuNryM";
        const BUCKET_NAME = "submission-files"; // 共用已有的存储桶

        // 2.2 【新增】工具函数：将Base64文件上传到Supabase存储桶
        const uploadFile = async (fileData) => {
            if (!fileData) return null; // 无文件则返回null
            
            try {
                // 转换Base64为二进制数据
                const binaryData = Uint8Array.from(atob(fileData.base64), c => c.charCodeAt(0));
                
                // 调用Supabase Storage API上传文件
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

                // 上传成功后，返回文件的公开访问URL
                return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${fileData.fileName}`;
            } catch (err) {
                console.error("文件上传错误:", err);
                throw new Error(`文件处理失败: ${err.message}`);
            }
        };

        // 2.3 【新增】并行上传图片和附件
        const [imageUrl, attachmentUrl] = await Promise.all([
            uploadFile(data.image),   // 处理图片
            uploadFile(data.attachment) // 处理附件
        ]);

        // 3. 【修改】存储到Supabase数据库（新增文件URL字段）
        const { supabaseData, error } = await storeInSupabase({
            ...data, // 保留原有文字数据
            image: imageUrl,    // 新增：图片URL
            file_url: attachmentUrl // 新增：附件URL
        });

        if (error) {
            throw new Error(error);
        }

        // 4. 保留原有逻辑：返回uniqueId
        const uniqueId = supabaseData?.[0]?.id;
        if (!uniqueId) {
            throw new Error('数据库存储成功，但未返回有效ID');
        }

        return new Response(JSON.stringify({ 
            success: true, 
            uniqueId 
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// 【修改】更新存储函数，支持接收文件URL并存入数据库
async function storeInSupabase(data) {
    const SUPABASE_URL = "https://ojfmwalxryldzcujehav.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZm13YWx4cnlsZHpjdWplaGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3MjUwMzMsImV4cCI6MjA3MDMwMTAzM30.5LNX9PpYnqb5dVR5OKas7qr7zjd10IRSBZop4cuNryM";
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/submissions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({
            title: data.title,
            category: data.category,
            author: data.author,
            content: data.content,
            created_at: new Date().toISOString(),
            images: data.image_url ? [data.image_url] : [],    // 新增：存储图片URL
            file_url: data.attachment_url // 新增：存储附件URL
        })
    });

    if (!response.ok) {
        const errorDetails = await response.text();
        return { error: `Supabase存储请求失败: ${errorDetails}` };
    }

    const supabaseData = await response.json();
    return { supabaseData, error: null };
}
