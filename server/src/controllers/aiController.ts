
import { Request, Response } from 'express';
import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini Client
// Ensure process.env.API_KEY is set in your .env file
const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const summarizeText = async (req: Request, res: Response) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ message: 'Text is required' });
  }

  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are an expert news editor. Condense the following text into a "Nugget" - a bite-sized, high-value piece of information.
      
      Input: "${text.substring(0, 10000)}"
      
      Output JSON with:
      - title: max 60 chars, catchy
      - excerpt: max 280 chars, key insight
      - tags: array of strings (max 3)`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            excerpt: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("Empty response from AI");
    
    res.json(JSON.parse(resultText));

  } catch (error) {
    console.error("AI Summarize Error:", error);
    res.status(500).json({ message: 'Failed to generate summary' });
  }
};

export const generateTakeaways = async (req: Request, res: Response) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ message: 'Text is required' });
  }

  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze the text and provide 3-5 concise takeaways formatted as a Markdown list.
      
      Text: "${text.substring(0, 15000)}"`,
      config: {
        thinkingConfig: { thinkingBudget: 1024 }
      }
    });

    res.json({ takeaway: response.text });
  } catch (error) {
    console.error("AI Takeaways Error:", error);
    res.status(500).json({ message: 'Failed to generate takeaways' });
  }
};
