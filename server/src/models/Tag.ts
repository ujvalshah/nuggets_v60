import mongoose, { Schema, Document } from 'mongoose';

export interface ITag extends Document {
  name: string;
  usageCount: number;
  type: 'category' | 'tag';
  status: 'active' | 'pending' | 'deprecated';
  isOfficial: boolean;
}

const TagSchema = new Schema<ITag>({
  name: { type: String, required: true, unique: true, trim: true },
  usageCount: { type: Number, default: 0 },
  type: { 
    type: String, 
    enum: ['category', 'tag'], 
    default: 'tag',
    index: true
  },
  status: { 
    type: String, 
    enum: ['active', 'pending', 'deprecated'], 
    default: 'active',
    index: true
  },
  isOfficial: { type: Boolean, default: false, index: true }
}, {
  timestamps: false
});

// Index for efficient queries
TagSchema.index({ status: 1, type: 1 });

export const Tag = mongoose.model<ITag>('Tag', TagSchema);

