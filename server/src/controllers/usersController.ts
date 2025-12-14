import { Request, Response } from 'express';
import { User } from '../models/User.js';
import { normalizeDoc, normalizeDocs } from '../utils/db.js';
import { Article } from '../models/Article.js';
import { updateUserSchema } from '../utils/validation.js';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select('-password'); // Exclude password field
    res.json(normalizeDocs(users));
  } catch (error: any) {
    console.error('[Users] Get users error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(normalizeDoc(user));
  } catch (error: any) {
    console.error('[Users] Get user by ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    // Validate input
    const validationResult = updateUserSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: validationResult.error.errors 
      });
    }

    // Don't allow password updates through this endpoint (use separate change password endpoint)
    const { password, ...updateData } = validationResult.data;
    
    // Build update object for nested structure
    const updateObj: any = {};
    
    // Handle flat fields that map to nested structure (for backward compatibility)
    if (updateData.name) {
      updateObj['profile.displayName'] = updateData.name;
    }
    if (updateData.email) {
      updateObj['auth.email'] = updateData.email.toLowerCase();
      updateObj['auth.updatedAt'] = new Date().toISOString();
    }
    if (updateData.role !== undefined) {
      updateObj.role = updateData.role;
    }
    if (updateData.preferences) {
      updateObj['preferences.interestedCategories'] = updateData.preferences.interestedCategories;
    }
    if (updateData.lastFeedVisit) {
      updateObj['appState.lastLoginAt'] = updateData.lastFeedVisit;
    }
    
    // Handle direct nested updates if provided
    if (updateData.profile) {
      Object.assign(updateObj, Object.keys(updateData.profile).reduce((acc, key) => {
        acc[`profile.${key}`] = (updateData.profile as any)[key];
        return acc;
      }, {} as any));
    }
    if (updateData.preferences && typeof updateData.preferences === 'object') {
      Object.keys(updateData.preferences).forEach(key => {
        if (key === 'notifications') {
          Object.keys((updateData.preferences as any).notifications || {}).forEach(nKey => {
            updateObj[`preferences.notifications.${nKey}`] = (updateData.preferences as any).notifications[nKey];
          });
        } else {
          updateObj[`preferences.${key}`] = (updateData.preferences as any)[key];
        }
      });
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateObj },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(normalizeDoc(user));
  } catch (error: any) {
    console.error('[Users] Update user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(204).send();
  } catch (error: any) {
    console.error('[Users] Delete user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getPersonalizedFeed = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's interested categories from nested preferences
    const categories = user.preferences?.interestedCategories || [];
    const lastVisit = user.appState?.lastLoginAt 
      ? new Date(user.appState.lastLoginAt) 
      : new Date(0);
    
    // Build MongoDB query for articles matching user's interests
    const articleQuery: any = {
      $or: [
        { categories: { $in: categories } },
        { category: { $in: categories } },
        { visibility: 'public' }
      ]
    };
    
    // Find articles matching user's interests
    const articles = await Article.find(articleQuery)
      .sort({ publishedAt: -1 })
      .limit(50); // Limit to 50 articles

    // Count new articles since last feed visit using MongoDB query (more efficient)
    const newCount = await Article.countDocuments({
      ...articleQuery,
      publishedAt: { $gt: lastVisit.toISOString() }
    });

    // Update last feed visit using findByIdAndUpdate (atomic operation)
    await User.findByIdAndUpdate(
      userId,
      { $set: { 'appState.lastLoginAt': new Date().toISOString() } },
      { new: false } // Don't need to return updated document
    );

    res.json({ 
      articles: normalizeDocs(articles), 
      newCount 
    });
  } catch (error: any) {
    console.error('[Users] Get personalized feed error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
