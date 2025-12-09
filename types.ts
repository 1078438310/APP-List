
export type ItemType = 'BOOK' | 'MOVIE' | 'GAME';
export type ItemStatus = 'WANT_TO' | 'IN_PROGRESS' | 'COMPLETED';

export interface Memory {
  id: string;
  imageData: string; // Base64 data string
  caption: string;
  sourceLocation?: string; // Page number or Time code
  addedAt: string;
}

export interface MediaItem {
  id: string;
  title: string;
  originalTitle?: string;
  type: ItemType;
  creator: string; // Author or Director
  year: string;
  description: string;
  status: ItemStatus;
  rating?: number; // 0-10 or 0-5
  review?: string;
  memories: Memory[];
  addedAt: string;
  collectionIds: string[]; // IDs of UserCollections
  coverUrl?: string; // Optional URL for cover
  collaborators?: string[]; // Names of people who edited this card
}

export interface UserCollection {
    id: string;
    title: string;
    description?: string; // New description field
    type: ItemType;
    createdAt: string;
}

export interface Collection {
  id: string;
  title: string;
  description: string;
  author: string; // "Curated by AI" or User name
  items: MediaItem[]; // Simplified for this demo, usually would be IDs
  tags: string[];
}

export interface SearchResult {
  title: string;
  type: ItemType;
  creator: string;
  year: string;
  description: string;
}

export interface SharedCollectionPayload {
    title: string;
    type: ItemType;
    sharer?: string;
    items: Partial<MediaItem>[]; // Minimal item data to reconstruct
}

export interface SharedItemPayload {
    item: MediaItem;
    sharer: string;
}