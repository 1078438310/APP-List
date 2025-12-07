import { GoogleGenAI, Type } from "@google/genai";
import { SearchResult, ItemType, Collection } from "../types";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const modelName = "gemini-2.5-flash";

const getTypeLabel = (type: ItemType) => {
    if (type === 'BOOK') return 'books';
    if (type === 'MOVIE') return 'movies';
    return 'video games';
};

const getCreatorLabel = (type: ItemType) => {
    if (type === 'BOOK') return 'Author';
    if (type === 'MOVIE') return 'Director';
    return 'Developer/Studio';
};

// Define the item schema once to reuse
const itemSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    type: { type: Type.STRING }, // enum handled in prompt mostly, but schema can be loose here to avoid validation errors if AI hallucinates case
    creator: { type: Type.STRING },
    year: { type: Type.STRING },
    description: { type: Type.STRING },
  },
  required: ["title", "type", "creator", "year", "description"],
};

export const searchMedia = async (query: string, type: ItemType): Promise<{ matches: SearchResult[], similar: SearchResult[] }> => {
  const typeLabel = getTypeLabel(type);
  const creatorLabel = getCreatorLabel(type);
  
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: `Search for ${typeLabel} based on the query: "${query}". 
      
      You must return the results split into two categories:
      1. "matches": Items that directly match the title, specific series, or strictly fit the specific search criteria found in the query.
      2. "similar": Items that are associative recommendations, similar vibes, same author, or stylistically related, but not a direct search match.

      The 'type' field for all items must be strictly '${type}'.
      Ensure the description is concise (under 30 words).
      Limit "matches" to top 3-4 results.
      Limit "similar" to top 3-4 results.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matches: {
              type: Type.ARRAY,
              items: {
                  ...itemSchema,
                  properties: {
                      ...itemSchema.properties,
                      type: { type: Type.STRING, enum: [type] },
                      creator: { type: Type.STRING, description: creatorLabel }
                  }
              }
            },
            similar: {
              type: Type.ARRAY,
              items: {
                  ...itemSchema,
                  properties: {
                      ...itemSchema.properties,
                      type: { type: Type.STRING, enum: [type] },
                      creator: { type: Type.STRING, description: creatorLabel }
                  }
              }
            }
          },
          required: ["matches", "similar"],
        },
      },
    });

    const jsonText = response.text || '{"matches": [], "similar": []}';
    return JSON.parse(jsonText) as { matches: SearchResult[], similar: SearchResult[] };
  } catch (error) {
    console.error("Gemini Search Error:", error);
    return { matches: [], similar: [] };
  }
};

export const getRecommendationsForCollection = async (
  collectionName: string, 
  items: { title: string, creator: string }[], 
  type: ItemType
): Promise<SearchResult[]> => {
  const typeLabel = getTypeLabel(type);
  const creatorLabel = getCreatorLabel(type);

  if (items.length === 0) {
      // Fallback for empty collection
      const results = await searchMedia(`Best ${typeLabel} for ${collectionName}`, type);
      return [...results.matches, ...results.similar].slice(0, 5);
  }

  const itemsList = items.map(i => `"${i.title}" by ${i.creator}`).join(", ");

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: `I have a collection named "${collectionName}" containing the following ${typeLabel}: ${itemsList}.
      Please recommend 5 new ${typeLabel} that would fit perfectly into this collection.
      Do not include items already in the list.
      The 'type' field must be strictly '${type}'.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              type: { type: Type.STRING, enum: [type] },
              creator: { type: Type.STRING, description: creatorLabel },
              year: { type: Type.STRING },
              description: { type: Type.STRING },
            },
            required: ["title", "type", "creator", "year", "description"],
          },
        },
      },
    });

    const jsonText = response.text || "[]";
    return JSON.parse(jsonText) as SearchResult[];
  } catch (error) {
    console.error("Gemini Recommendation Error:", error);
    return [];
  }
};

export const generateFeaturedCollections = async (type: ItemType): Promise<Collection[]> => {
  const typeLabel = getTypeLabel(type);
  
  let examples = '';
  if (type === 'BOOK') {
    examples = '"Cyberpunk Classics", "Rainy Day Reads", "Philosophy 101"';
  } else if (type === 'MOVIE') {
    examples = '"Mind-Bending Cinema", "90s Action", "Ghibli Magic"';
  } else {
    examples = '"Indie Gems", "Best RPGs of All Time", "Co-op Favorites"';
  }

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: `Generate 3 distinct, interesting cultural collections strictly consisting of ${typeLabel}. 
      Examples of themes: ${examples}.
      Each collection should have 3-4 items.
      All items in the collection MUST be of type '${type}'.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              author: { type: Type.STRING },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    type: { type: Type.STRING, enum: [type] },
                    creator: { type: Type.STRING },
                    year: { type: Type.STRING },
                    description: { type: Type.STRING },
                  },
                  required: ["title", "type", "creator", "year", "description"],
                }
              }
            },
            required: ["id", "title", "description", "author", "items", "tags"],
          },
        },
      },
    });

    const jsonText = response.text || "[]";
    const rawCollections = JSON.parse(jsonText);
    
    // Transform to match our internal MediaItem structure roughly (adding missing fields)
    return rawCollections.map((col: any) => ({
      ...col,
      items: col.items.map((item: any) => ({
        id: crypto.randomUUID(),
        ...item,
        status: 'WANT_TO',
        memories: [],
        addedAt: new Date().toISOString()
      }))
    }));

  } catch (error) {
    console.error("Gemini Collection Error:", error);
    return [];
  }
};