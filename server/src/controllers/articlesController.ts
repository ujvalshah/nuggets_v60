import { Request, Response } from 'express';

// Mock Data - In a real app, import Article model
let ARTICLES_DB: any[] = [
  {
    id: '1',
    title: 'India\'s Economic Growth Hits 8%',
    content: 'India\'s economy has shown remarkable growth...',
    authorId: 'u1',
    authorName: 'Akash Solanki',
    category: 'Business',
    publishedAt: '2025-10-01T08:00:00Z',
    tags: ['India', 'Economy', 'Growth']
  },
  {
    id: '2',
    title: 'Tech Innovation in Bangalore',
    content: 'Bangalore continues to lead in tech innovation...',
    authorId: 'u1',
    authorName: 'Akash Solanki',
    category: 'Tech',
    publishedAt: '2025-10-02T09:30:00Z',
    tags: ['Tech', 'Innovation', 'Bangalore']
  },
  {
    id: '3',
    title: 'Sustainable Development Goals',
    content: 'India\'s progress on SDGs...',
    authorId: 'u2',
    authorName: 'Hemant Sharma',
    category: 'Lifestyle',
    publishedAt: '2025-10-03T10:15:00Z',
    tags: ['Sustainability', 'Development']
  },
  {
    id: '4',
    title: 'Startup Ecosystem Expansion',
    content: 'India\'s startup ecosystem continues to expand...',
    authorId: 'u2',
    authorName: 'Hemant Sharma',
    category: 'Business',
    publishedAt: '2025-10-04T11:00:00Z',
    tags: ['Startups', 'Business', 'India']
  }
];

export const getArticles = async (req: Request, res: Response) => {
  const { authorId } = req.query;
  let articles = ARTICLES_DB;
  
  if (authorId) {
    articles = articles.filter(a => a.authorId === authorId);
  }
  
  res.json(articles);
};

export const getArticleById = async (req: Request, res: Response) => {
  const article = ARTICLES_DB.find(a => a.id === req.params.id);
  if (!article) return res.status(404).json({ message: 'Article not found' });
  res.json(article);
};

export const createArticle = async (req: Request, res: Response) => {
  const newArticle = {
    ...req.body,
    id: Date.now().toString(),
    publishedAt: new Date().toISOString()
  };
  ARTICLES_DB.unshift(newArticle);
  res.status(201).json(newArticle);
};

export const updateArticle = async (req: Request, res: Response) => {
  const index = ARTICLES_DB.findIndex(a => a.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'Article not found' });
  
  ARTICLES_DB[index] = { ...ARTICLES_DB[index], ...req.body };
  res.json(ARTICLES_DB[index]);
};

export const deleteArticle = async (req: Request, res: Response) => {
  const index = ARTICLES_DB.findIndex(a => a.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'Article not found' });
  
  ARTICLES_DB = ARTICLES_DB.filter(a => a.id !== req.params.id);
  res.status(204).send();
};

