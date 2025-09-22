document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('submission-form');
    const successMessage = document.getElementById('success-message');
    const newSubmissionBtn = document.getElementById('new-submission');
    
    // 【新增】工具函数：生成唯一文件名（避免文件重名）
    function getUniqueFileName(originalName) {
        if (!originalName) return '';
        const timestamp = new Date().getTime(); // 时间戳确保唯一
        const randomStr = Math.random().toString(36).substring(2, 8); // 随机字符串
        const extension = originalName.split(".").pop() || ""; // 文件后缀
        return `${timestamp}-${randomStr}.${extension}`;
    }

    // 【新增】工具函数：将文件转为 Base64（传给 Cloudflare 再处理上传）
    // 原因：表单数据+文件需统一格式传给 /submit 接口，Base64 是兼容方案
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                resolve(null); // 无文件则返回 null
                return;
            }
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                // 返回：{ base64: 编码字符串, fileName: 唯一文件名, type: 文件类型 }
                resolve({
                    base64: reader.result.split(',')[1], // 去掉前缀（如 data:image/png;base64,）
                    fileName: getUniqueFileName(file.name),
                    type: file.type
                });
            };
            reader.onerror = (error) => reject(error);
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // 1. 获取表单基础数据（保留原有逻辑）
        const formData = {
            title: document.getElementById('title').value,
            category: document.getElementById('category').value,
            author: document.getElementById('author').value || '匿名',
            content: document.getElementById('content').value,
            timestamp: new Date().toISOString()
        };

        // 【新增】2. 获取上传的文件并转为 Base64
        const imageFile = document.getElementById('image').files[0];
        const attachmentFile = document.getElementById('attachment').files[0];
        
        try {
            // 并行处理两个文件（图片+附件），效率更高
            const [imageData, attachmentData] = await Promise.all([
                fileToBase64(imageFile),
                fileToBase64(attachmentFile)
            ]);

            // 【新增】3. 将文件数据添加到 formData（传给 Cloudflare）
            formData.image = imageData; // 图片信息（含 Base64、文件名、类型）
            formData.attachment = attachmentData; // 附件信息

            // 4. 显示加载状态（保留原有逻辑）
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.textContent = '提交中...';
            submitBtn.disabled = true;
            
            // 5. 发送到 Cloudflare 函数（保留原有逻辑，仅数据多了 image/attachment）
            const response = await fetch('/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData) // 包含文件数据的完整表单
            });
           // 关键：先判断响应是否正常，再解析JSON
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '提交失败');
    }

    const result = await response.json();
    if (result.success !== true) {
      throw new Error('提交结果异常，请重试');
    }

    // 到这里才是真正成功，显示提示
    form.classList.add('hidden');
    successMessage.classList.remove('hidden'); 
            if (!response.ok) {
                throw new Error('提交失败，请重试');
            }
    
        } catch (error) {
            // 错误处理（保留原有逻辑）
            alert(error.message);
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.textContent = '提交创作';
            submitBtn.disabled = false;
        }
    });
    
    // 新投稿按钮（保留原有逻辑）
    newSubmissionBtn.addEventListener('click', () => {
        form.reset();
        form.classList.remove('hidden');
        successMessage.classList.add('hidden');
    });
});
