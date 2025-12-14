
import { Request, Response } from 'express';

let COLLECTIONS_DB = [
  {
    id: 'col_general_bookmarks_u1',
    name: 'General Bookmarks',
    description: 'Auto-saved bookmarks.',
    creatorId: 'u1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    followersCount: 0,
    entries: [],
    type: 'private'
  },
  {
    id: 'col_india_growth',
    name: 'The India Growth Story',
    description: 'A curated list of nuggets tracking India\'s economic rise.',
    creatorId: 'u1',
    createdAt: '2025-10-01T10:00:00Z',
    updatedAt: '2025-10-02T11:30:00Z',
    followersCount: 15420,
    entries: [
        { articleId: '1', addedByUserId: 'u1', addedAt: '2025-10-01T10:00:00Z', flaggedBy: [] },
        { articleId: '4', addedByUserId: 'u2', addedAt: '2025-10-02T11:30:00Z', flaggedBy: [] },
    ],
    type: 'public'
  }
];

export const getCollections = async (req: Request, res: Response) => {
  res.json(COLLECTIONS_DB);
};

export const getCollectionById = async (req: Request, res: Response) => {
  const col = COLLECTIONS_DB.find(c => c.id === req.params.id);
  if (!col) return res.status(404).json({ message: 'Collection not found' });
  res.json(col);
};

export const createCollection = async (req: Request, res: Response) => {
  const newCol = {
    ...req.body,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    followersCount: 0,
    entries: []
  };
  COLLECTIONS_DB.unshift(newCol);
  res.status(201).json(newCol);
};

export const updateCollection = async (req: Request, res: Response) => {
  const index = COLLECTIONS_DB.findIndex(c => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'Collection not found' });
  
  COLLECTIONS_DB[index] = { 
    ...COLLECTIONS_DB[index], 
    ...req.body, 
    updatedAt: new Date().toISOString() 
  };
  res.json(COLLECTIONS_DB[index]);
};

export const deleteCollection = async (req: Request, res: Response) => {
  COLLECTIONS_DB = COLLECTIONS_DB.filter(c => c.id !== req.params.id);
  res.status(204).send();
};

export const addEntry = async (req: Request, res: Response) => {
  const { articleId, userId } = req.body;
  const col = COLLECTIONS_DB.find(c => c.id === req.params.id);
  if (!col) return res.status(404).json({ message: 'Collection not found' });

  if (!col.entries.some((e: any) => e.articleId === articleId)) {
    col.entries.push({
      articleId,
      addedByUserId: userId,
      addedAt: new Date().toISOString(),
      flaggedBy: []
    });
    col.updatedAt = new Date().toISOString();
  }
  res.json(col);
};

export const removeEntry = async (req: Request, res: Response) => {
  const col = COLLECTIONS_DB.find(c => c.id === req.params.id);
  if (!col) return res.status(404).json({ message: 'Collection not found' });

  col.entries = col.entries.filter((e: any) => e.articleId !== req.params.articleId);
  col.updatedAt = new Date().toISOString();
  res.json(col);
};

export const flagEntry = async (req: Request, res: Response) => {
  const { userId } = req.body;
  const col = COLLECTIONS_DB.find(c => c.id === req.params.id);
  if (!col) return res.status(404).json({ message: 'Collection not found' });

  const entry = col.entries.find((e: any) => e.articleId === req.params.articleId);
  if (entry) {
    if (!entry.flaggedBy.includes(userId)) {
      entry.flaggedBy.push(userId);
    }
  }
  res.json(col);
};
