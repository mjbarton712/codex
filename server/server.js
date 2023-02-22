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
        const response = await openai.createCompletion({
            model: "text-davinci-003", //several options here, including: text-ada-001, text-babbage-001, text-curie-001, text-davinci-003
            prompt: `${prompt}`,
            temperature: 0.2, //randomness - 1 is max, 0 is repetitive
            max_tokens: 1500, //there are around 4 characters per token
            top_p: 1,
            frequency_penalty: 0.5, //penalty for repeating the same answer to the same question
            presence_penalty: 0,
        })
        res.status(200).send({
            bot: response.data.choices[0].text
        })
    } catch (error) {
        console.log(error);
        res.status(500).send({ error });
    }
});

app.listen(5000, () => console.log('Server is running on port http://localhost:5000'));