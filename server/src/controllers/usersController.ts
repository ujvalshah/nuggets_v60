
import { Request, Response } from 'express';

// Mock Data - In a real app, import User model
let USERS_DB = [
  {
    id: 'u1',
    name: 'Akash Solanki',
    email: 'akash@example.com',
    role: 'admin',
    status: 'active',
    joinedAt: '2025-01-15T10:00:00Z',
    preferences: {
        interestedCategories: ['Tech', 'Business', 'Finance']
    },
    lastFeedVisit: new Date(Date.now() - 86400000 * 2).toISOString() 
  },
  {
    id: 'u2',
    name: 'Hemant Sharma',
    email: 'hemant@example.com',
    role: 'user',
    status: 'active',
    joinedAt: '2025-02-20T14:30:00Z',
    preferences: {
        interestedCategories: ['Design', 'Lifestyle']
    },
    lastFeedVisit: new Date().toISOString()
  }
];

export const getUsers = async (req: Request, res: Response) => {
  res.json(USERS_DB);
};

export const getUserById = async (req: Request, res: Response) => {
  const user = USERS_DB.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
};

export const updateUser = async (req: Request, res: Response) => {
  const index = USERS_DB.findIndex(u => u.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'User not found' });
  
  USERS_DB[index] = { ...USERS_DB[index], ...req.body };
  res.json(USERS_DB[index]);
};

export const deleteUser = async (req: Request, res: Response) => {
  USERS_DB = USERS_DB.filter(u => u.id !== req.params.id);
  res.status(204).send();
};

export const getPersonalizedFeed = async (req: Request, res: Response) => {
  // Mock logic: In real app, perform aggregation query on Articles based on User prefs
  // For now, just return empty list as placeholder or implement simple filter if articles DB was shared
  res.json({ articles: [], newCount: 0 });
};
