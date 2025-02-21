document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chatContainer');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    let messages = [];

    // 添加消息到聊天界面
    function addMessage(content, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
        messageDiv.innerHTML = `
            <div class="message-content">${content}</div>
        `;
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // 发送消息
    async function sendMessage() {
        const content = userInput.value.trim();
        if (!content) return;

        // 添加用户消息
        addMessage(content, true);
        messages.push({ role: 'user', content });
        userInput.value = '';

        try {
            // 创建EventSource连接
            const response = await fetch('http://localhost:3000/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ messages })
            });

            let aiMessage = document.createElement('div');
            aiMessage.className = 'message ai-message';
            aiMessage.innerHTML = '<div class="message-content"></div>';
            chatContainer.appendChild(aiMessage);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                        const data = JSON.parse(line.slice(6));
                        if (data.content) {
                            aiMessage.querySelector('.message-content').textContent += data.content;
                            chatContainer.scrollTop = chatContainer.scrollHeight;
                        }
                    }
                }
            }

            // 保存AI回复
            messages.push({
                role: 'assistant',
                content: aiMessage.querySelector('.message-content').textContent
            });

        } catch (error) {
            console.error('Error:', error);
            addMessage('抱歉，发生了错误，请稍后重试。');
        }
    }

    // 事件监听
    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
});