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

//post to openai from a text model
//for pricing details, see - https://openai.com/api/pricing/#faq-fine-tuning-pricing-calculation
app.post('/', async (req, res) => {
    try {
        const prompt = req.body.prompt;
        const response = await openai.createChatCompletion({
            model: "gpt-3.5-turbo", //see GPT models here: https://platform.openai.com/docs/api-reference/chat/create
            messages: [
                {role: "system", content: "You are a helpful assistant who answers any question comprehensively."},
                {role: "user", content: `${prompt}`}],
        })
        res.status(200).send({
            bot: response.data.choices[0].message.content
        })
    } catch (error) {
        console.log(error);
        res.status(500).send({ error });
    }
});

app.listen(5000, () => console.log('Server is running on port http://localhost:5000'));