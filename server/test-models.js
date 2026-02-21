// Test which Gemini models our API key can access
const { GoogleGenerativeAI } = require('./node_modules/@google/generative-ai');
require('./node_modules/dotenv').config();

const key = process.env.GEMINI_API_KEY;
console.log('API key last 6 chars:', key ? key.slice(-6) : 'NOT SET');

const genAI = new GoogleGenerativeAI(key);

const modelsToTest = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
];

async function testModel(name) {
    try {
        const model = genAI.getGenerativeModel({ model: name });
        const result = await model.generateContent('Say "ok" in one word.');
        const text = result.response.text();
        console.log(`✅ ${name}: "${text.trim().substring(0, 30)}"`);
        return true;
    } catch (e) {
        console.log(`❌ ${name}: ${e.message?.substring(0, 80)}`);
        return false;
    }
}

async function main() {
    for (const m of modelsToTest) {
        const ok = await testModel(m);
        if (ok) {
            console.log(`\n>>> RECOMMENDED MODEL: "${m}"`);
            break;
        }
    }
}

main().catch(console.error);
