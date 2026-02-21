const { GoogleGenerativeAI } = require('./node_modules/@google/generative-ai');
require('./node_modules/dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const prompt = `You are a patent analyst. 

Element: A temperature sensor array with accuracy of ±0.1°C.
Evidence: TechSpec §3.1 shows ±0.05°C accuracy.
Reasoning: Good reasoning.

Analyst asks: "Is this element strong?"

Respond with JSON:
{"refinedReasoning":"","refinedEvidence":"","confidence":90,"flags":[],"explanation":"explanation here","proposedChange":false,"noChangeNeeded":true}`;

async function main() {
    console.log('Testing generateContent with gemini-2.5-flash...');
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        console.log('SUCCESS! Response:');
        console.log(text.substring(0, 500));
    } catch (e) {
        console.error('FAILED:', e.message);
        console.error('Full error:', JSON.stringify(e, null, 2));
    }
}

main();
