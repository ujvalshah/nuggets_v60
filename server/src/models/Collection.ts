import mongoose, { Schema, Document } from 'mongoose';

export interface ICollectionEntry {
  articleId: string;
  addedByUserId: string;
  addedAt: string;
  flaggedBy: string[];
}

export interface ICollection extends Document {
  name: string;
  description: string;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  followersCount: number;
  followers: string[]; // Array of userIds who follow this collection
  entries: ICollectionEntry[];
  validEntriesCount?: number; // Validated count of entries (computed, may be undefined for legacy data)
  type: 'private' | 'public';
}

const CollectionEntrySchema = new Schema<ICollectionEntry>({
  articleId: { type: String, required: true },
  addedByUserId: { type: String, required: true },
  addedAt: { type: String, required: true },
  flaggedBy: { type: [String], default: [] }
}, { _id: false });

const CollectionSchema = new Schema<ICollection>({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  creatorId: { type: String, required: true },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true },
  followersCount: { type: Number, default: 0 },
  followers: { type: [String], default: [] }, // Array of userIds
  entries: { type: [CollectionEntrySchema], default: [] },
  validEntriesCount: { type: Number }, // Optional validated count (computed field)
  type: { type: String, enum: ['private', 'public'], default: 'public' }
}, {
  timestamps: false
});

// Compound index for efficient filtering by creator and type
CollectionSchema.index({ creatorId: 1, type: 1 });

export const Collection = mongoose.model<ICollection>('Collection', CollectionSchema);


