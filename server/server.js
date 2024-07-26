import express from 'express';
import * as dotenv from 'dotenv';
import cors from 'cors';
import multer from 'multer';
import { Configuration, OpenAIApi } from 'openai';
import fs from 'fs';
import path from 'path';

dotenv.config();

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

app.get('/', async (req, res) => {
    res.status(200).send({
        message: 'Hello from Codex',
    });
});

const conversationHistory = []; // Initialize an empty conversation history array
conversationHistory.push({ role: "system", content: "You are a helpful assistant." }); // Add system background - can customize later

//post to openai from a text model
//for pricing details, see - https://openai.com/api/pricing/#faq-fine-tuning-pricing-calculation
app.post('/', upload.single('image'), async (req, res) => {
    try {
        const gptModel = req.body.model || "gpt-4o-mini";
        const userMessage = req.body.prompt;

        conversationHistory.push({ role: "user", content: userMessage }); // Add user message to conversation history
        let imageContent = null;
        if (req.file) {
            const imagePath = path.resolve(req.file.path);
            const base64Image = fs.readFileSync(imagePath, { encoding: 'base64' });
            const mimeType = req.file.mimetype;
            imageContent = {
                type: "image_url",
                image_url: {
                    url: `data:${mimeType};base64,${base64Image}`
                }
            };
            fs.unlinkSync(imagePath);
        }
        const messages = imageContent
            ? [
                { role: "user", content: userMessage },
                { role: "user", content: imageContent }
            ]
            : conversationHistory;
        const response = await openai.createChatCompletion({
            model: gptModel,
            messages: messages,
        });
        // Add bot's response to convo history as well
        conversationHistory.push({ role: "assistant", content: response.data.choices[0].message.content });

        res.status(200).send({
            bot: response.data.choices[0].message.content
        });
    } catch (error) {
        if (error.response) {
            // The request was made and the server responded with a status code
            console.log(error.response.data);
            console.log(error.response.status);
            console.log(error.response.headers);
            res.status(error.response.status).send({ error: error.response.data });
        } else if (error.request) {
            // The request was made but no response was received
            console.log(error.request);
            res.status(500).send({ error: 'No response from the server' });
        } else {
            // Something happened in setting up the request that triggered an Error
            console.log('Error', error.message);
            res.status(500).send({ error: error.message });
        }
    }
});

app.listen(5000, () => console.log('Server is running on port http://localhost:5000'));

function logRoleAndContent(position, arrayOfObjects) {
    console.log(position);
    for (const item of arrayOfObjects) {
        if (item.hasOwnProperty('role') && item.hasOwnProperty('content')) {
            console.log(`Role: ${item.role}, Content: ${item.content}`);
        } else {
            console.log('Invalid item format:', item);
        }
    }
}
