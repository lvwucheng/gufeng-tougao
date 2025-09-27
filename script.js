document.addEventListener('DOMContentLoaded', () => {
    // 投稿表单相关元素
    const form = document.getElementById('submission-form');
    const successMessage = document.getElementById('successMessage');
    const newSubmissionBtn = document.getElementById('new-submission');
    
    // 管理员登录表单相关元素
    const adminForm = document.getElementById('adminLoginForm');
    
    // 工具函数：生成唯一文件名（避免文件重名）
    function getUniqueFileName(originalName) {
        if (!originalName) return '';
        const timestamp = new Date().getTime(); // 时间戳确保唯一
        const randomStr = Math.random().toString(36).substring(2, 8); // 随机字符串
        const extension = originalName.split(".").pop() || ""; // 文件后缀
        return `${timestamp}-${randomStr}.${extension}`;
    }

    // 工具函数：将文件转为 Base64（增加图片格式验证）
    function fileToBase64(file) {
        return new Promise((resolve) => { // 改为只resolve，避免reject阻断流程
            if (!file) {
                resolve(null);
                return;
            }
            
            // 图片格式验证
            if (file.type.startsWith('image/') && 
                !['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
                alert('图片格式不支持，仅允许jpg、png、gif、webp');
                resolve(null);
                return;
            }
            
            // 附件大小限制（10MB以内）
            if (file.size > 10 * 1024 * 1024) {
                alert('文件过大，最大支持10MB');
                resolve(null);
                return;
            }

            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                resolve({
                    base64: reader.result.split(',')[1],
                    fileName: getUniqueFileName(file.name),
                    type: file.type
                });
            };
            reader.onerror = () => {
                alert('文件读取失败，请重试');
                resolve(null);
            };
        });
    }

    // 投稿表单提交逻辑（原有功能保持不变）
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // 获取表单基础数据
            const formData = {
                title: document.getElementById('title').value,
                category: document.getElementById('category').value,
                author: document.getElementById('author').value || '匿名',
                content: document.getElementById('content').value,
                timestamp: new Date().toISOString()
            };

            // 获取上传的文件并转为 Base64
            const imageFile = document.getElementById('image').files[0];
            const attachmentFile = document.getElementById('attachment').files[0];
            
            try {
                // 并行处理两个文件
                const [imageData, attachmentData] = await Promise.all([
                    fileToBase64(imageFile),
                    fileToBase64(attachmentFile)
                ]);

                // 添加文件数据到表单
                formData.image = imageData || null;
                formData.attachment = attachmentData || null;

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

                // 成功判断：状态码2xx视为成功
                if (response.ok) {
                    // 显示成功提示
                    if (successMessage) {
                        successMessage.classList.remove('hidden');
                        // 点击“确定”跳转到首页
                        const closeBtn = successMessage.querySelector('#closeSuccess');
                        if (closeBtn) {
                            closeBtn.onclick = () => {
                                successMessage.classList.add('hidden');
                                window.location.href = '#home'; // 跳转到首页锚点
                            };
                        }
                    }
                    return;
                }

                // 状态码错误时的处理
                const errorData = await response.json().catch(() => ({ error: '提交失败' }));
                throw new Error(errorData.error || '提交失败，请重试');
                
            } catch (error) {
                alert(error.message);
                const submitBtn = form.querySelector('button[type="submit"]');
                submitBtn.textContent = '提交创作';
                submitBtn.disabled = false;
            }
        });
    }
    
    // 新投稿按钮逻辑（原有功能保持不变）
    if (newSubmissionBtn) {
        newSubmissionBtn.addEventListener('click', () => {
            form.reset();
            form.classList.remove('hidden');
            if (successMessage) successMessage.classList.add('hidden');
            // 重置文件输入框
            document.getElementById('image').value = '';
            document.getElementById('attachment').value = '';
            // 滚动到顶部
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // 新增：管理员登录逻辑
    if (adminForm) {
        adminForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // 获取用户名和密码
            const username = document.getElementById('adminUsername').value;
            const password = document.getElementById('adminPassword').value;

            // 显示加载状态
            const loginBtn = adminForm.querySelector('button[type="submit"]');
            loginBtn.textContent = '登录中...';
            loginBtn.disabled = true;

            try {
                // 发送登录请求到 Cloudflare Pages Functions 接口
                const response = await fetch('/admin/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });

                // 处理登录结果
                if (response.ok) {
                    // 登录成功，跳转到管理后台页面
                    window.location.href = 'admin.html';
                } else {
                    // 登录失败，显示错误信息
                    const errorData = await response.json().catch(() => ({ error: '登录失败' }));
                    alert(errorData.error || '用户名或密码错误');
                }
            } catch (error) {
                // 网络错误等异常处理
                alert('登录时发生错误，请重试');
                console.error('登录错误:', error);
            } finally {
                // 恢复按钮状态
                loginBtn.textContent = '登录管理后台';
                loginBtn.disabled = false;
            }
        });
    }
});

