
import { Request, Response } from 'express';

// Mock Config
const LEGAL_PAGES = [
  { id: 'about', title: 'About Us', slug: 'about', isEnabled: true, content: '# About Us\nWe are Nuggets.', lastUpdated: new Date().toISOString() },
  { id: 'terms', title: 'Terms', slug: 'terms', isEnabled: true, content: '# Terms\nBe nice.', lastUpdated: new Date().toISOString() },
  { id: 'privacy', title: 'Privacy', slug: 'privacy', isEnabled: true, content: '# Privacy\nWe respect it.', lastUpdated: new Date().toISOString() },
];

export const getLegalPages = async (req: Request, res: Response) => {
  res.json(LEGAL_PAGES);
};

export const getLegalPageBySlug = async (req: Request, res: Response) => {
  const page = LEGAL_PAGES.find(p => p.slug === req.params.slug);
  if (!page) return res.status(404).json({ message: 'Page not found' });
  res.json(page);
};
