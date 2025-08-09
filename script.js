document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('submission-form');
    const successMessage = document.getElementById('success-message');
    const newSubmissionBtn = document.getElementById('new-submission');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // 获取表单数据
        const formData = {
            title: document.getElementById('title').value,
            category: document.getElementById('category').value,
            author: document.getElementById('author').value || '匿名',
            content: document.getElementById('content').value,
            timestamp: new Date().toISOString()
        };
        
        try {
            // 显示加载状态
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.textContent = '提交中...';
            submitBtn.disabled = true;
            
            // 发送到Cloudflare函数
            const response = await fetch('/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                throw new Error('提交失败，请重试');
            }
            
            // 显示成功消息
            form.classList.add('hidden');
            successMessage.classList.remove('hidden');
            
        } catch (error) {
            alert(error.message);
            submitBtn.textContent = '提交创作';
            submitBtn.disabled = false;
        }
    });
    
    // 新投稿按钮
    newSubmissionBtn.addEventListener('click', () => {
        form.reset();
        form.classList.remove('hidden');
        successMessage.classList.add('hidden');
    });
});
