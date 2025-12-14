import { Request, Response } from 'express';
import { Collection } from '../models/Collection.js';
import { normalizeDoc, normalizeDocs } from '../utils/db.js';
import { createCollectionSchema, updateCollectionSchema, addEntrySchema, flagEntrySchema } from '../utils/validation.js';

export const getCollections = async (req: Request, res: Response) => {
  try {
    const collections = await Collection.find().sort({ createdAt: -1 });
    res.json(normalizeDocs(collections));
  } catch (error: any) {
    console.error('[Collections] Get collections error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getCollectionById = async (req: Request, res: Response) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) return res.status(404).json({ message: 'Collection not found' });
    res.json(normalizeDoc(collection));
  } catch (error: any) {
    console.error('[Collections] Get collection by ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createCollection = async (req: Request, res: Response) => {
  try {
    // Validate input
    const validationResult = createCollectionSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: validationResult.error.errors 
      });
    }

    const { name, description, creatorId, type } = validationResult.data;

    // Idempotency check: If creating a "General Bookmarks" private folder, check if it already exists
    if (type === 'private' && name.toLowerCase().trim() === 'general bookmarks') {
      const existingCollection = await Collection.findOne({
        creatorId,
        type: 'private',
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
      });

      if (existingCollection) {
        // Return existing collection instead of creating duplicate
        return res.status(200).json(normalizeDoc(existingCollection));
      }
    }

    const newCollection = await Collection.create({
      name,
      description: description || '',
      creatorId,
      type: type || 'public',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      followersCount: 0,
      entries: []
    });
    
    res.status(201).json(normalizeDoc(newCollection));
  } catch (error: any) {
    console.error('[Collections] Create collection error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateCollection = async (req: Request, res: Response) => {
  try {
    // Validate input
    const validationResult = updateCollectionSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: validationResult.error.errors 
      });
    }

    const collection = await Collection.findByIdAndUpdate(
      req.params.id,
      { ...validationResult.data, updatedAt: new Date().toISOString() },
      { new: true, runValidators: true }
    );
    
    if (!collection) return res.status(404).json({ message: 'Collection not found' });
    res.json(normalizeDoc(collection));
  } catch (error: any) {
    console.error('[Collections] Update collection error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteCollection = async (req: Request, res: Response) => {
  try {
    const collection = await Collection.findByIdAndDelete(req.params.id);
    if (!collection) return res.status(404).json({ message: 'Collection not found' });
    res.status(204).send();
  } catch (error: any) {
    console.error('[Collections] Delete collection error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const addEntry = async (req: Request, res: Response) => {
  try {
    // Validate input
    const validationResult = addEntrySchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: validationResult.error.errors 
      });
    }

    const { articleId, userId } = validationResult.data;
    
    // Use findOneAndUpdate with $addToSet to atomically add entry if it doesn't exist
    // $addToSet prevents duplicates based on the entire object match
    const collection = await Collection.findOneAndUpdate(
      { 
        _id: req.params.id,
        'entries.articleId': { $ne: articleId } // Only update if articleId doesn't exist
      },
      {
        $addToSet: {
          entries: {
            articleId,
            addedByUserId: userId,
            addedAt: new Date().toISOString(),
            flaggedBy: []
          }
        },
        $set: {
          updatedAt: new Date().toISOString()
        }
      },
      { 
        new: true, // Return updated document
        runValidators: true 
      }
    );
    
    if (!collection) {
      // Check if collection exists but entry already exists
      const existingCollection = await Collection.findById(req.params.id);
      if (!existingCollection) {
        return res.status(404).json({ message: 'Collection not found' });
      }
      // Entry already exists, return the collection as-is
      return res.json(normalizeDoc(existingCollection));
    }

    res.json(normalizeDoc(collection));
  } catch (error: any) {
    console.error('[Collections] Add entry error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const removeEntry = async (req: Request, res: Response) => {
  try {
    // Use findOneAndUpdate with $pull to atomically remove the entry
    const collection = await Collection.findOneAndUpdate(
      { _id: req.params.id },
      {
        $pull: {
          entries: { articleId: req.params.articleId }
        },
        $set: {
          updatedAt: new Date().toISOString()
        }
      },
      { 
        new: true, // Return updated document
        runValidators: true 
      }
    );
    
    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    res.json(normalizeDoc(collection));
  } catch (error: any) {
    console.error('[Collections] Remove entry error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const flagEntry = async (req: Request, res: Response) => {
  try {
    // Validate input
    const validationResult = flagEntrySchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: validationResult.error.errors 
      });
    }

    const { userId } = validationResult.data;
    const collection = await Collection.findById(req.params.id);
    
    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    const entry = collection.entries.find(
      (e: any) => e.articleId === req.params.articleId
    );

    if (entry && !entry.flaggedBy.includes(userId)) {
      entry.flaggedBy.push(userId);
      collection.updatedAt = new Date().toISOString();
      await collection.save();
    }

    res.json(normalizeDoc(collection));
  } catch (error: any) {
    console.error('[Collections] Flag entry error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
