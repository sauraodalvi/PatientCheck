const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

const BASE = 'http://localhost:5000/api';
const DOCS = 'C:/git_projects/patientcheck/Test';

async function uploadChart(filename) {
    const form = new FormData();
    form.append('file', fs.createReadStream(path.join(DOCS, filename)), filename);
    const res = await axios.post(`${BASE}/upload`, form, { headers: form.getHeaders() });
    return res.data;
}

async function uploadContext(filename) {
    const form = new FormData();
    form.append('file', fs.createReadStream(path.join(DOCS, filename)), filename);
    const res = await axios.post(`${BASE}/upload-context`, form, { headers: form.getHeaders() });
    return res.data;
}

async function main() {
    console.log('=== Parsing DOC1 (claim chart) ===');
    const doc1 = await uploadChart('DOC1_ClaimChart.docx');
    console.log('DOC1 elements count:', doc1.elements?.length);
    console.log('DOC1 elements:', JSON.stringify(doc1.elements, null, 2));

    console.log('\n=== Extracting DOC2 (TechSpec) ===');
    const doc2 = await uploadContext('DOC2_TechSpec.docx');
    console.log('DOC2 name:', doc2.doc?.name, '| text length:', doc2.doc?.text?.length);
    console.log('DOC2 text preview:', doc2.doc?.text?.substring(0, 300));

    console.log('\n=== Extracting DOC3 (Marketing) ===');
    const doc3 = await uploadContext('DOC3_Marketing.docx');
    console.log('DOC3 name:', doc3.doc?.name, '| text length:', doc3.doc?.text?.length);

    console.log('\n=== Extracting DOC4 (APIReference) ===');
    const doc4 = await uploadContext('DOC4_APIReference.docx');
    console.log('DOC4 name:', doc4.doc?.name, '| text length:', doc4.doc?.text?.length);

    console.log('\n=== Extracting DOC5 (WrongVersionSpec) ===');
    const doc5 = await uploadContext('DOC5_WrongVersionSpec.docx');
    console.log('DOC5 name:', doc5.doc?.name, '| text length:', doc5.doc?.text?.length);

    // Write the output for browser injection
    const output = {
        elements: doc1.elements,
        doc2: doc2.doc,
        doc3: doc3.doc,
        doc4: doc4.doc,
        doc5: doc5.doc
    };
    fs.writeFileSync('C:/git_projects/patientcheck/Test/parsed_data.json', JSON.stringify(output, null, 2));
    console.log('\n=== Saved to parsed_data.json ===');
}

main().catch(err => {
    console.error('ERROR:', err.message);
    if (err.response) console.error('Response:', err.response.data);
});
