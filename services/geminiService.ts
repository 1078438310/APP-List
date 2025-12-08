import { SearchResult, ItemType, Collection } from "../types";

// NOTE: This service has been stripped of AI functionality to run locally without an API key.
// "Search" now functions as a "Create/Add" placeholder generator.

export const searchMedia = async (query: string, type: ItemType, signal?: AbortSignal): Promise<{ matches: SearchResult[], similar: SearchResult[] }> => {
  return new Promise((resolve, reject) => {
    // Simulate a longer network delay (1.5s) to allow for manual cancellation
    const timer = setTimeout(() => {
        if (signal?.aborted) {
            reject(new DOMException('Aborted', 'AbortError'));
            return;
        }
        
        // Return a placeholder result based on the user's input
        resolve({
            matches: [
            {
                title: query,
                type: type,
                creator: "Unknown Creator", // Placeholder to be edited by user
                year: new Date().getFullYear().toString(),
                description: "Custom entry. Add to library to edit details.",
            }
            ],
            similar: []
        });
    }, 1500);

    if (signal) {
        signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new DOMException('Aborted', 'AbortError'));
        });
    }
  });
};

// Disabled AI features return empty arrays
export const getRecommendationsForCollection = async (
  collectionName: string, 
  items: { title: string, creator: string }[], 
  type: ItemType
): Promise<SearchResult[]> => {
  return [];
};

export const generateFeaturedCollections = async (type: ItemType): Promise<Collection[]> => {
  return [];
};
