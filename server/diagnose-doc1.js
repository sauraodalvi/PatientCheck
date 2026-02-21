const mammoth = require('./node_modules/mammoth');
const fs = require('fs');

const filePath = 'C:/git_projects/patientcheck/Test/DOC1_ClaimChart.docx';
const buf = fs.readFileSync(filePath);

mammoth.extractRawText({ buffer: buf }).then(result => {
    fs.writeFileSync('C:/git_projects/patientcheck/Test/doc1_text.txt', result.value);
    console.log('Saved. Length:', result.value.length);
    console.log('First 500 chars:', result.value.substring(0, 500));
});
