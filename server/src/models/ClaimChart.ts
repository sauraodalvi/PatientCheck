import mongoose, { Schema, Document } from 'mongoose';

export interface IClaimChart extends Document {
    title: string;
    elements: {
        id: string;
        element: string;
        evidence: string;
        reasoning: string;
        confidence: number;
        flags: string[];
    }[];
    createdAt: Date;
    updatedAt: Date;
}

const ClaimChartSchema: Schema = new Schema({
    title: { type: String, required: true },
    elements: [{
        id: { type: String, required: true },
        element: { type: String, required: true },
        evidence: { type: String, default: '' },
        reasoning: { type: String, default: '' },
        confidence: { type: Number, default: 100 },
        flags: [{ type: String }]
    }]
}, { timestamps: true });

export default mongoose.model<IClaimChart>('ClaimChart', ClaimChartSchema);
