// 获取DOM元素
const messagesContainer = document.getElementById('messages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');

// 添加消息到聊天界面
function addMessage(content, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'ai'}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    
    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);
    
    // 滚动到最新消息
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 设置发送按钮状态
function setButtonState(isLoading) {
    sendButton.disabled = isLoading;
    sendButton.textContent = isLoading ? '发送中...' : '发送';
    userInput.disabled = isLoading;
}

// 发送消息到服务器
async function sendMessage(message) {
    try {
        // 设置加载状态
        setButtonState(true);
        
        // 添加用户消息到界面
        addMessage(message, true);
        
        // 清空输入框
        userInput.value = '';
        userInput.style.height = 'auto';
        
        // 发送请求到服务器
        const response = await fetch('http://localhost:3000/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // 创建新的AI消息容器
        const aiMessageDiv = document.createElement('div');
        aiMessageDiv.className = 'message ai';
        const aiContentDiv = document.createElement('div');
        aiContentDiv.className = 'message-content';
        aiMessageDiv.appendChild(aiContentDiv);
        messagesContainer.appendChild(aiMessageDiv);
        
        // 处理流式响应
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim() !== '');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;
                    
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.content) {
                            accumulatedContent += parsed.content;
                            aiContentDiv.textContent = accumulatedContent;
                            messagesContainer.scrollTop = messagesContainer.scrollHeight;
                        }
                    } catch (e) {
                        console.error('解析响应数据失败:', e);
                    }
                }
            }
        }
    } catch (error) {
        console.error('发送消息失败:', error);
        let errorMessage = '抱歉，发生了一些错误，请稍后重试。';
        if (error.response) {
            try {
                const errorData = await error.response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (e) {
                console.error('解析错误响应失败:', e);
            }
        }
        addMessage(errorMessage, false);
    } finally {
        // 恢复按钮状态
        setButtonState(false);
    }
}

// 自动调整输入框高度
function adjustTextareaHeight() {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 200) + 'px';
}

// 事件监听器
sendButton.addEventListener('click', () => {
    const message = userInput.value.trim();
    if (message) {
        sendMessage(message);
    }
});

// 监听输入框事件
userInput.addEventListener('input', adjustTextareaHeight);

userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const message = userInput.value.trim();
        if (message) {
            sendMessage(message);
        }
    }
});

// 初始化
adjustTextareaHeight();
userInput.focus();