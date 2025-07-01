import express from 'express';
import * as dotenv from 'dotenv';
import cors from 'cors';
import OpenAI from 'openai';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', async (req, res) => {
    res.status(200).send({
        message: 'Hello from Codex',
    })
});

app.post('/', async (req, res) => {
    try {
        const { model, messages } = req.body;
        const gptModel = model || "gpt-4o-mini";

        if (!messages || messages.length === 0) {
            return res.status(400).send({ error: "No messages provided." });
        }

        // Set headers for Server-Sent Events (SSE)
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        // Use the new API method and handle the stream with a for-await-of loop
        const stream = await openai.chat.completions.create({
            model: gptModel,
            messages: messages,
            stream: true,
        });

        // The client-side code is expecting the stream chunks in SSE format ('data: {...}\n\n').
        // The v4 SDK stream provides JSON objects directly. We must format them before sending.
        for await (const chunk of stream) {
            // The chunk is a JSON object. Stringify it and format it as an SSE message.
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }

        // After the loop finishes, the stream is done.
        // We must send a final [DONE] message so the client knows to stop listening.
        res.write('data: [DONE]\n\n');
        res.end();

    } catch (error) {
        console.error('API Error:', error);
        // Ensure we don't try to send a response if headers are already sent
        if (!res.headersSent) {
             res.status(500).json({ error: 'An internal server error occurred.' });
        } else if (!res.writableEnded) {
            // If stream is open, just end it.
            res.end();
        }
    }
});

app.listen(5000, () => console.log('Server is running on port http://localhost:5000'));