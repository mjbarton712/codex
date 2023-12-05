import express from 'express';
import * as dotenv from 'dotenv';
import cors from 'cors';
import { Configuration, OpenAIApi } from 'openai';

dotenv.config();

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', async (req, res) => {
    res.status(200).send({
        message: 'Hello from Codex',
    })
});

const conversationHistory = []; // Initialize an empty conversation history array
conversationHistory.push({ role: "system", content: "You are a helpful assistant." }); // Add system background - can customize later

//post to openai from a text model
//for pricing details, see - https://openai.com/api/pricing/#faq-fine-tuning-pricing-calculation
app.post('/', async (req, res) => {
    try {
        const gptModel = req.body.model || "gpt-3.5-turbo";
        const userMessage = req.body.prompt;
        console.log(gptModel);

        conversationHistory.push({ role: "user", content: userMessage }); // Add user message to conversation history
        const response = await openai.createChatCompletion({
            model: gptModel, //see GPT models here: https://platform.openai.com/docs/api-reference/chat/create
            messages: 
            conversationHistory, // Using entire conversation history in API call so that we can have convos
        })

        // Add bot's response to convo history as well
        conversationHistory.push({ role: "assistant", content: response.data.choices[0].message.content });

        res.status(200).send({
            bot: response.data.choices[0].message.content
        })
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
