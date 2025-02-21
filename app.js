// 导入所需模块
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const port = 3000;

// 配置中间件
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// API配置
const API_KEY = process.env.API_KEY;
const API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

// 检查API密钥是否存在
if (!API_KEY) {
    console.error('错误：未设置API_KEY环境变量');
    process.exit(1);
}

// 处理聊天请求
app.post('/chat', async (req, res) => {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: 'deepseek-r1-250120',
                messages: [
                    {
                        role: 'system',
                        content: '你是deepseek，是由字节跳动开发的 AI 人工智能助手.'
                    },
                    ...req.body.messages
                ],
                stream: true
            })
        });

        // 设置SSE响应头
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // 处理流式响应
        const textStream = response.body;
        const decoder = new TextDecoder();

        for await (const chunk of textStream) {
            const text = decoder.decode(chunk);
            const lines = text.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    if (line === 'data: [DONE]') {
                        res.write('data: [DONE]\n\n');
                        continue;
                    }
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.choices && data.choices[0]) {
                            const choice = data.choices[0];
                            if (choice.delta && choice.delta.content) {
                                const content = choice.delta.content;
                                res.write(`data: ${JSON.stringify({content})}\n\n`);
                            } else if (choice.message && choice.message.content) {
                                const content = choice.message.content;
                                res.write(`data: ${JSON.stringify({content})}\n\n`);
                            }
                        }
                    } catch (parseError) {
                        console.error('Parse error:', parseError, '\nLine:', line);
                        continue;
                    }
                }
            }
        }

        res.write('data: [DONE]\n\n');
        res.end();
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 启动服务器
app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
});