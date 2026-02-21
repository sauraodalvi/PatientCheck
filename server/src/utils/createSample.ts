import { Document, Packer, Paragraph, Table, TableCell, TableRow } from 'docx';
import fs from 'fs';

const doc = new Document({
    sections: [{
        children: [
            new Paragraph({ text: "Demo Chart: NexaTherm Pro NXT-2000", heading: "Heading1" }),
            new Paragraph({ text: "This demo shows how Lumenci AI analyzes patent claims against real products (like the NexaTherm Pro smart thermostat)." }),
            new Table({
                rows: [
                    // Case 1: Strong Match (1.a)
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph("1.a")] }),
                            new TableCell({ children: [new Paragraph("A temperature measurement system comprising a digital sensor array configured to detect ambient temperature with accuracy of ±0.1°C or better.")] }),
                            new TableCell({ children: [new Paragraph("NexaTherm TechSpec v4.2 §3.1: 'The NexaTherm Pro incorporates a 16-element MEMS thermopile array providing accuracy of ±0.05°C.'")] }),
                            new TableCell({ children: [new Paragraph("NexaTherm's 16-element array directly satisfies the 'digital sensor array' limitation. The documented ±0.05°C accuracy exceeds the claimed ±0.1°C threshold.")] }),
                        ],
                    }),
                    // Case 2: Weak Reasoning (1.b)
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph("1.b")] }),
                            new TableCell({ children: [new Paragraph("A wireless communication module implementing IEEE 802.15.4 protocol for mesh network topology.")] }),
                            new TableCell({ children: [new Paragraph("API Reference v3.0 §7.3: 'Radio: IEEE 802.15.4-2015 compliant. Supports Thread mesh networking.'")] }),
                            new TableCell({ children: [new Paragraph("NexaTherm has wireless. This probably meets the claim element for wireless communication since the product connects wirelessly.")] }),
                        ],
                    }),
                    // Case 3: Conflicting Evidence (1.e)
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph("1.e")] }),
                            new TableCell({ children: [new Paragraph("An occupancy detection module comprising a passive infrared sensor with a detection range of at least 5 meters.")] }),
                            new TableCell({ children: [new Paragraph("[CONFLICTING SOURCES] Source A: PIR range = 8 meters | Source B: PIR range = 3 meters")] }),
                            new TableCell({ children: [new Paragraph("Evidence conflict prevents definitive reasoning. If 8m range applies (Source A): literal infringement established. If 3m range applies (Source B): infringement NOT established.")] }),
                        ],
                    }),
                    // Case 4: No Evidence (1.d)
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph("1.d")] }),
                            new TableCell({ children: [new Paragraph("A humidity sensor configured to measure relative humidity with accuracy of ±2% RH or better.")] }),
                            new TableCell({ children: [new Paragraph("[NO EVIDENCE FOUND]")] }),
                            new TableCell({ children: [new Paragraph("No mention of a humidity sensor was found in the technical documentation for the NexaTherm Pro.")] }),
                        ],
                    }),
                ],
            }),
        ],
    }],
});

Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync('sample_patent.docx', buffer);
    console.log('Sample DOCX created.');
});
