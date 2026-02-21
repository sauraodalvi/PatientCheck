// Extract text from all reference docs and save for browser injection
const mammoth = require('./node_modules/mammoth');
const fs = require('fs');

const docs = [
    { filename: 'DOC2_TechSpec.docx', key: 'doc2' },
    { filename: 'DOC3_Marketing.docx', key: 'doc3' },
    { filename: 'DOC4_APIReference.docx', key: 'doc4' },
    { filename: 'DOC5_WrongVersionSpec.docx', key: 'doc5' },
];

async function main() {
    const output = {};
    for (const doc of docs) {
        const buf = fs.readFileSync(`C:/git_projects/patientcheck/Test/${doc.filename}`);
        const result = await mammoth.extractRawText({ buffer: buf });
        output[doc.key] = { name: doc.filename, text: result.value };
        console.log(`${doc.filename}: ${result.value.length} chars`);
        console.log('Preview:', result.value.substring(0, 200));
        console.log('---');
    }
    fs.writeFileSync('C:/git_projects/patientcheck/Test/context_docs.json', JSON.stringify(output, null, 2));
    console.log('Saved to context_docs.json');
}
main().catch(console.error);
