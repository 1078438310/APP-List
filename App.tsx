import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { ItemType, ItemStatus, MediaItem, SearchResult, Collection, UserCollection } from './types';
import { searchMedia } from './services/geminiService';
import { BookOpen, Film, Gamepad, Search, Plus, Star, ImageIcon, Trash2, Folder, Check, FolderPlus, Layers, Minus, Filter, X, Square, Power } from './components/Icons';
import { DetailModal } from './components/DetailModal';

// --- View Components ---

const StatusBadge = ({ status }: { status: ItemStatus }) => {
  const styles = {
    WANT_TO: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    IN_PROGRESS: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    COMPLETED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  };
  const labels = {
    WANT_TO: "Wishlist",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Done",
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-medium border rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

interface SearchResultCardProps {
    result: SearchResult;
    isAdded: boolean;
    userCollections: UserCollection[];
    onAdd: (result: SearchResult, collectionId?: string) => void;
    onRemove: (result: SearchResult) => void;
    onCreateCollection: (name: string) => string;
}

const SearchResultCard: React.FC<SearchResultCardProps> = ({ result, isAdded, userCollections, onAdd, onRemove, onCreateCollection }) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');
    const [menuAlignment, setMenuAlignment] = useState<'right-0' | 'left-0'>('right-0');
    
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    
    const relevantCollections = userCollections.filter(c => c.type === result.type);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
                setIsCreating(false);
                setNewCollectionName('');
            }
        };
        if (showDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showDropdown]);

    useLayoutEffect(() => {
        if (showDropdown && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const dropdownWidth = 240; // Approx width of w-60
            
            // If the right edge of the button minus the dropdown width is less than 0 (offscreen left),
            // or if the button is simply very close to the left edge, switch alignment.
            // Standard 'right-0' anchors the right side of dropdown to right side of button, expanding left.
            // If rect.right < dropdownWidth, expanding left will go offscreen.
            if (rect.right < dropdownWidth) {
                setMenuAlignment('left-0');
            } else {
                setMenuAlignment('right-0');
            }
        }
    }, [showDropdown]);

    const handleCreateAndAdd = () => {
        if (newCollectionName.trim()) {
            const newId = onCreateCollection(newCollectionName);
            onAdd(result, newId);
            setNewCollectionName('');
            setIsCreating(false);
            setShowDropdown(false);
        }
    };

    let Icon = BookOpen;
    if (result.type === 'MOVIE') Icon = Film;
    if (result.type === 'GAME') Icon = Gamepad;

    return (
        <div className="bg-surface border border-slate-700 rounded-lg p-5 flex flex-col sm:flex-row gap-5 items-start sm:items-center hover:border-slate-600 transition">
            <div className="w-12 h-16 bg-slate-800 rounded flex-shrink-0 flex items-center justify-center">
                <Icon className="text-slate-600"/>
            </div>
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-slate-100">{result.title}</h3>
                    <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-400 rounded border border-slate-700">{result.type}</span>
                </div>
                <p className="text-slate-400 text-sm mb-1">{result.creator} • {result.year}</p>
                <p className="text-slate-500 text-sm">{result.description}</p>
            </div>
            
            <div className="relative" ref={menuRef}>
                <button
                    ref={buttonRef}
                    onClick={() => {
                        if (isAdded) {
                            onRemove(result);
                        } else {
                            setShowDropdown(!showDropdown);
                        }
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition group ${
                        isAdded 
                        ? 'bg-emerald-500/10 text-emerald-500 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 border border-transparent' 
                        : 'bg-primary text-white hover:bg-primary/90'
                    }`}
                >
                    {isAdded ? (
                        <>
                            <span className="group-hover:hidden flex items-center gap-2"><Check className="w-4 h-4"/> Added</span>
                            <span className="hidden group-hover:flex items-center gap-2"><Trash2 className="w-4 h-4"/> Remove</span>
                        </>
                    ) : (
                        <>
                            <Plus className="w-4 h-4" /> Add
                        </>
                    )}
                </button>

                {showDropdown && !isAdded && (
                    <div className={`absolute top-full mt-2 w-60 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 overflow-hidden ${menuAlignment}`}>
                        <button
                            onClick={() => {
                                onAdd(result);
                                setShowDropdown(false);
                            }}
                            className="w-full text-left px-4 py-3 text-sm text-white hover:bg-slate-700 border-b border-slate-700 font-medium flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4 text-primary" />
                            Add to Library (Uncategorized)
                        </button>
                        
                        <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-900/50">
                            Add to collection
                        </div>
                        
                        <div className="max-h-48 overflow-y-auto custom-scrollbar border-b border-slate-700">
                            {relevantCollections.length === 0 && (
                                <div className="px-4 py-2 text-xs text-slate-500 italic">No existing collections</div>
                            )}
                            {relevantCollections.map(col => (
                                <button
                                    key={col.id}
                                    onClick={() => {
                                        onAdd(result, col.id);
                                        setShowDropdown(false);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
                                >
                                    <Folder className="w-4 h-4 text-slate-500" />
                                    <span className="truncate">{col.title}</span>
                                </button>
                            ))}
                        </div>

                        <div className="p-2 bg-slate-800">
                             {!isCreating ? (
                                <button 
                                    onClick={() => setIsCreating(true)}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-primary hover:bg-slate-700 rounded transition"
                                >
                                    <FolderPlus className="w-3 h-3" /> Create & Add
                                </button>
                              ) : (
                                  <div className="px-1">
                                      <input 
                                        autoFocus
                                        type="text"
                                        value={newCollectionName}
                                        onChange={(e) => setNewCollectionName(e.target.value)}
                                        placeholder="New collection name..."
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white mb-2 focus:border-primary focus:outline-none"
                                        onKeyDown={(e) => {
                                            if(e.key === 'Enter') handleCreateAndAdd();
                                        }}
                                      />
                                      <div className="flex gap-2">
                                        <button 
                                            onClick={handleCreateAndAdd}
                                            disabled={!newCollectionName.trim()}
                                            className="flex-1 bg-primary text-white text-xs py-1 rounded hover:bg-primary/90 disabled:opacity-50"
                                        >
                                            Create
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setIsCreating(false);
                                                setNewCollectionName('');
                                            }}
                                            className="px-2 bg-slate-700 text-slate-300 text-xs py-1 rounded hover:bg-slate-600"
                                        >
                                            Cancel
                                        </button>
                                      </div>
                                  </div>
                              )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

interface ItemCardProps {
  item: MediaItem;
  userCollections: UserCollection[];
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onUpdateCollections: (itemId: string, collectionIds: string[]) => void;
  onCreateCollection: (title: string) => void;
  deleteTooltip?: string;
  DeleteIcon?: React.ElementType;
}

const ItemCard: React.FC<ItemCardProps> = ({ item, userCollections, onClick, onDelete, onUpdateCollections, onCreateCollection, deleteTooltip, DeleteIcon }) => {
  const [showCollections, setShowCollections] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [menuAlignment, setMenuAlignment] = useState<'right-0' | 'left-0'>('right-0');
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowCollections(false);
        setIsCreating(false);
        setNewCollectionName('');
      }
    };
    if (showCollections) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCollections]);

  // Handle menu overflow detection
  useLayoutEffect(() => {
    if (showCollections && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const dropdownWidth = 240; 
        
        if (rect.right < dropdownWidth) {
            setMenuAlignment('left-0');
        } else {
            setMenuAlignment('right-0');
        }
    }
  }, [showCollections]);

  const getFallbackIconText = () => {
    if (item.type === 'BOOK') return 'Aa';
    if (item.type === 'MOVIE') return 'Play';
    return 'Game';
  };
  
  const memoryCount = item.memories ? item.memories.length : 0;
  const ActionIcon = DeleteIcon || Trash2;

  // Filter collections that match the item type
  const relevantCollections = userCollections.filter(c => c.type === item.type);

  const toggleCollection = (colId: string) => {
    const currentIds = item.collectionIds || [];
    let newIds;
    if (currentIds.includes(colId)) {
        newIds = currentIds.filter(id => id !== colId);
    } else {
        newIds = [...currentIds, colId];
    }
    onUpdateCollections(item.id, newIds);
  };

  const handleCreateCollection = () => {
      if (newCollectionName.trim()) {
          onCreateCollection(newCollectionName);
          setNewCollectionName('');
          setIsCreating(false);
      }
  };

  return (
    <div 
      className="group relative bg-surface border border-slate-700 rounded-xl overflow-visible hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5 h-full flex flex-col"
    >
      {/* Main Clickable Content */}
      <div onClick={onClick} className="cursor-pointer flex-1 flex flex-col">
        <div className="aspect-[2/3] w-full bg-slate-800 relative overflow-hidden rounded-t-xl shrink-0">
            {/* Fallback visual if no cover */}
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-slate-600 font-serif text-4xl opacity-20 select-none">
            {getFallbackIconText()}
            </div>
            <img 
            src={`https://placehold.co/400x600/1e293b/FFF?text=${encodeURIComponent(item.title.substring(0, 20))}`} 
            alt={item.title} 
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            />
            <div className="absolute top-2 right-2">
            <StatusBadge status={item.status} />
            </div>
        </div>
        <div className="p-4 flex-1 flex flex-col">
            <h3 className="font-serif font-bold text-lg text-slate-100 leading-tight mb-auto">{item.title}</h3>
            <div className="mt-2">
              <p className="text-sm text-slate-400 line-clamp-1">{item.creator}</p>
              
              {item.rating && (
              <div className="flex items-center gap-1 mt-2">
                  <Star className="w-3 h-3 text-yellow-400" fill={true} />
                  <span className="text-xs text-slate-300 font-medium">{item.rating}/5</span>
              </div>
              )}
              
              {memoryCount > 0 && (
              <div className="mt-3 text-xs text-slate-500 flex items-center gap-1">
                  <ImageIcon className="w-3 h-3 text-primary/80" />
                  <span>{memoryCount}</span>
              </div>
              )}
            </div>
        </div>
      </div>

      {/* Delete/Remove Button - Separated from clickable body */}
      <button 
        onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(e);
        }}
        className="absolute top-2 left-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all backdrop-blur-sm z-30"
        title={deleteTooltip || "Remove from Library"}
      >
        <ActionIcon className="w-4 h-4" />
      </button>

      {/* Collection Manager Button */}
      <div className="absolute bottom-3 right-3 z-20" ref={menuRef}>
          <button 
             ref={buttonRef}
             onClick={(e) => {
                 e.preventDefault();
                 e.stopPropagation();
                 setShowCollections(!showCollections);
             }}
             className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-primary rounded-full transition backdrop-blur-sm"
             title="Manage Collections"
          >
              <Folder className="w-4 h-4" />
          </button>

          {/* Popover Menu */}
          {showCollections && (
              <div 
                className={`absolute bottom-full mb-2 w-56 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-2 z-40 ${menuAlignment}`}
                onClick={(e) => e.stopPropagation()} // Prevent card click
              >
                  <div className="text-xs font-semibold text-slate-400 mb-2 px-2 uppercase tracking-wider">Add to Collection</div>
                  
                  <div className="max-h-40 overflow-y-auto space-y-1 mb-2 custom-scrollbar">
                    {relevantCollections.length === 0 && <p className="text-xs text-slate-500 px-2 italic">No collections yet</p>}
                    {relevantCollections.map(col => {
                        const isSelected = (item.collectionIds || []).includes(col.id);
                        return (
                            <button 
                                key={col.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleCollection(col.id);
                                }}
                                className={`w-full text-left px-2 py-1.5 text-sm rounded flex items-center justify-between group/btn ${isSelected ? 'bg-primary/20 text-white' : 'hover:bg-slate-700 text-slate-300'}`}
                            >
                                <span className="truncate">{col.title}</span>
                                {isSelected && <Check className="w-3 h-3 text-primary" />}
                            </button>
                        );
                    })}
                  </div>

                  <div className="border-t border-slate-700 pt-2">
                      {!isCreating ? (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsCreating(true);
                            }}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-primary hover:bg-slate-700 rounded transition"
                        >
                            <FolderPlus className="w-3 h-3" /> Create new collection
                        </button>
                      ) : (
                          <div className="px-1" onClick={(e) => e.stopPropagation()}>
                              <input 
                                autoFocus
                                type="text"
                                value={newCollectionName}
                                onChange={(e) => setNewCollectionName(e.target.value)}
                                placeholder="Name..."
                                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white mb-2 focus:border-primary focus:outline-none"
                                onKeyDown={(e) => {
                                    if(e.key === 'Enter') handleCreateCollection();
                                }}
                              />
                              <button 
                                onClick={handleCreateCollection}
                                disabled={!newCollectionName.trim()}
                                className="w-full bg-primary text-white text-xs py-1 rounded hover:bg-primary/90 disabled:opacity-50"
                              >
                                  Create
                              </button>
                          </div>
                      )}
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};

// --- Main App ---

type SortOption = 'DATE_NEWEST' | 'DATE_OLDEST' | 'TITLE' | 'RATING';

export default function App() {
  // Global Mode State
  const [activeType, setActiveType] = useState<ItemType>('BOOK');
  const [isExited, setIsExited] = useState(false);

  // View State
  const [view, setView] = useState<'LIBRARY' | 'SEARCH' | 'COLLECTIONS'>('LIBRARY');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [userCollections, setUserCollections] = useState<UserCollection[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Library State
  const [libraryTab, setLibraryTab] = useState<'ALL' | ItemStatus | string>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('DATE_NEWEST');
  const [showUncategorizedOnly, setShowUncategorizedOnly] = useState(false);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ matches: SearchResult[], similar: SearchResult[] }>({ matches: [], similar: [] });
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Collections State
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [newCollectionTitle, setNewCollectionTitle] = useState('');
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);

  // Modal State
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);

  // Load from local storage
  useEffect(() => {
    const savedItems = localStorage.getItem('muselist_items');
    if (savedItems) setItems(JSON.parse(savedItems));

    const savedCols = localStorage.getItem('muselist_collections');
    if (savedCols) setUserCollections(JSON.parse(savedCols));
  }, []);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('muselist_items', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('muselist_collections', JSON.stringify(userCollections));
  }, [userCollections]);

  // Reset states when switching types or views
  useEffect(() => {
    setSearchResults({ matches: [], similar: [] });
    setSearchQuery('');
    setActiveCollectionId(null);
    setSortBy('DATE_NEWEST');
    setShowUncategorizedOnly(false);
    
    // Cleanup pending search if view changes
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
        setLoading(false);
    }
  }, [activeType, view]);

  // --- Handlers ---

  const handleExit = () => {
    if (window.confirm("Are you sure you want to exit?")) {
        setIsExited(true);
        // Attempt to close, though usually blocked in browsers unless script-opened
        try {
            window.close();
        } catch(e) {}
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    // Cancel previous request if exists
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }

    // Create new controller
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setSearchResults({ matches: [], similar: [] }); // Clear previous results while loading

    try {
        const results = await searchMedia(searchQuery, activeType, controller.signal);
        setSearchResults(results);
    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.log('Search aborted');
            // Do not reset loading here, it is handled in cleanup or by the stop action
        } else {
            console.error('Search error:', error);
        }
    } finally {
        // Only set loading to false if this specific request finished (and wasn't just superseded)
        if (abortControllerRef.current === controller) {
            setLoading(false);
            abortControllerRef.current = null;
        }
    }
  };

  const handleStopSearch = () => {
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
          setLoading(false);
      }
  };

  const addToLibrary = (result: SearchResult, collectionId?: string) => {
    const newItem: MediaItem = {
      id: crypto.randomUUID(),
      ...result,
      status: 'WANT_TO',
      memories: [],
      addedAt: new Date().toISOString(),
      collectionIds: collectionId ? [collectionId] : []
    };
    setItems(prev => [newItem, ...prev]);
  };

  const handleRemoveFromSearch = (result: SearchResult) => {
      // Find items matching this search result and remove them
      setItems(prev => prev.filter(i => !(i.title === result.title && i.creator === result.creator && i.type === result.type)));
  };

  const handleUpdateItem = (updated: MediaItem) => {
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
    setSelectedItem(updated); // Keep modal in sync
  };

  const handleDeleteItem = (id: string) => {
      // Removing confirm dialog for immediate action
      setItems(prev => prev.filter(i => i.id !== id));
      setSelectedItem(null);
  };

  const handleItemCollectionUpdate = (itemId: string, collectionIds: string[]) => {
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, collectionIds } : i));
      if (selectedItem && selectedItem.id === itemId) {
          setSelectedItem({ ...selectedItem, collectionIds });
      }
  };

  const handleCreateCollection = (title: string, itemType: ItemType = activeType) => {
      const id = crypto.randomUUID();
      const newCol: UserCollection = {
          id,
          title,
          type: itemType,
          createdAt: new Date().toISOString()
      };
      setUserCollections(prev => [...prev, newCol]);
      setNewCollectionTitle('');
      setIsCreatingCollection(false);
      return id;
  };

  const handleDeleteCollection = (collectionId: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Removed confirm dialog to fix interactivity issues
      
      // 1. Remove collection ID from all items
      setItems(prev => prev.map(item => ({
          ...item,
          collectionIds: (item.collectionIds || []).filter(id => id !== collectionId)
      })));

      // 2. Remove the collection itself
      setUserCollections(prev => prev.filter(c => c.id !== collectionId));
      
      // If we were inside the collection, go back to list
      if(activeCollectionId === collectionId) {
          setActiveCollectionId(null);
      }
  };

  const getTypeName = () => {
      if (activeType === 'BOOK') return 'books';
      if (activeType === 'MOVIE') return 'movies';
      return 'games';
  };

  const getSortedItems = (items: MediaItem[]) => {
      return [...items].sort((a, b) => {
          switch (sortBy) {
              case 'DATE_NEWEST':
                  return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
              case 'DATE_OLDEST':
                  return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
              case 'TITLE':
                  return a.title.localeCompare(b.title);
              case 'RATING':
                  return (b.rating || 0) - (a.rating || 0);
              default:
                  return 0;
          }
      });
  };

  // --- Render Views ---

  // Filter items based on active module (Book/Movie/Game)
  const filteredItems = items.filter(i => i.type === activeType);
  const filteredCollections = userCollections.filter(c => c.type === activeType);

  const renderSortToolbar = () => (
      <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
          <div className="flex items-center gap-2 bg-surface border border-slate-700 rounded-lg px-3 py-1.5">
              <span className="text-slate-400">Sort by:</span>
              <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-transparent text-white focus:outline-none cursor-pointer"
              >
                  <option value="DATE_NEWEST" className="bg-slate-800">Newest Added</option>
                  <option value="DATE_OLDEST" className="bg-slate-800">Oldest Added</option>
                  <option value="TITLE" className="bg-slate-800">Title (A-Z)</option>
                  <option value="RATING" className="bg-slate-800">Rating</option>
              </select>
          </div>
          
          {view === 'LIBRARY' && libraryTab === 'ALL' && (
              <button 
                  onClick={() => setShowUncategorizedOnly(!showUncategorizedOnly)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition ${showUncategorizedOnly ? 'bg-primary/20 border-primary text-primary' : 'bg-surface border-slate-700 text-slate-400 hover:text-white'}`}
              >
                  <Filter className="w-4 h-4" />
                  Uncategorized
              </button>
          )}
      </div>
  );

  const renderLibrary = () => {
    const EmptyState = () => (
      <div className="text-center py-20 opacity-50">
        {activeType === 'BOOK' && <BookOpen className="w-12 h-12 mx-auto mb-4 text-slate-500" />}
        {activeType === 'MOVIE' && <Film className="w-12 h-12 mx-auto mb-4 text-slate-500" />}
        {activeType === 'GAME' && <Gamepad className="w-12 h-12 mx-auto mb-4 text-slate-500" />}
        
        <p>Your {activeType === 'BOOK' ? 'book' : (activeType === 'MOVIE' ? 'movie' : 'game')} library is empty. Start by searching.</p>
        <button onClick={() => setView('SEARCH')} className="mt-4 text-primary hover:underline">Go to Search</button>
      </div>
    );

    if (filteredItems.length === 0) return <EmptyState />;

    // Tabs logic
    const tabs: { id: 'ALL' | ItemStatus | string; label: string; isCollection?: boolean }[] = [
        { id: 'ALL', label: 'All Items' },
        { id: 'WANT_TO', label: 'Wishlist' },
        { id: 'IN_PROGRESS', label: 'In Progress' },
        { id: 'COMPLETED', label: 'Completed' },
    ];

    const getCount = (tabId: string) => {
        if (tabId === 'ALL') {
            if (showUncategorizedOnly) return filteredItems.filter(i => !i.collectionIds || i.collectionIds.length === 0).length;
            return filteredItems.length;
        }
        if (['WANT_TO', 'IN_PROGRESS', 'COMPLETED'].includes(tabId)) {
            return filteredItems.filter(i => i.status === tabId).length;
        }
        return 0;
    };

    let currentTabItems = filteredItems;
    
    // Apply Filters
    if (libraryTab !== 'ALL') {
        currentTabItems = filteredItems.filter(i => i.status === libraryTab);
    }

    // Apply "Uncategorized" filter (only applies when viewing ALL)
    if (libraryTab === 'ALL' && showUncategorizedOnly) {
        currentTabItems = currentTabItems.filter(i => !i.collectionIds || i.collectionIds.length === 0);
    }

    // Apply Sorting
    const sortedItems = getSortedItems(currentTabItems);

    return (
      <div className="pb-20">
        {/* Library Sub-navigation */}
        <div className="flex items-center gap-6 border-b border-slate-800 mb-6 overflow-x-auto no-scrollbar pb-1">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => {
                        setLibraryTab(tab.id);
                        if (tab.id !== 'ALL') setShowUncategorizedOnly(false); 
                    }}
                    className={`pb-3 text-sm font-medium transition border-b-2 flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
                        libraryTab === tab.id
                        ? 'border-primary text-white'
                        : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                >
                    {tab.label}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                        libraryTab === tab.id ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-500'
                    }`}>
                        {getCount(tab.id)}
                    </span>
                </button>
            ))}
        </div>

        {renderSortToolbar()}

        {libraryTab === 'ALL' && !showUncategorizedOnly ? (
             <div className="space-y-12">
                {/* We render categorized sections if user wants default view, but also respect Sort order? 
                    Actually, usually if sorting is enabled, grouped sections make less sense or need to be sorted internally.
                    For simplicity, if sorting is NOT default (Newest), we just show a grid. 
                    If sorting IS default, we show the nice sections. 
                */}
                
                {sortBy === 'DATE_NEWEST' ? (
                    <>
                        {sortedItems.some(i => i.status === 'IN_PROGRESS') && (
                        <section>
                            <h2 className="text-xl font-medium text-slate-200 mb-6 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span> In Progress
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {sortedItems.filter(i => i.status === 'IN_PROGRESS').map(item => (
                                <ItemCard 
                                    key={item.id} 
                                    item={item} 
                                    userCollections={userCollections}
                                    onClick={() => setSelectedItem(item)}
                                    onDelete={(e) => {
                                        e.stopPropagation();
                                        handleDeleteItem(item.id);
                                    }}
                                    onUpdateCollections={handleItemCollectionUpdate}
                                    onCreateCollection={(title) => handleCreateCollection(title)}
                                />
                            ))}
                            </div>
                        </section>
                        )}

                        {sortedItems.some(i => i.status === 'WANT_TO') && (
                        <section>
                            <h2 className="text-xl font-medium text-slate-200 mb-6 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span> Wishlist
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {sortedItems.filter(i => i.status === 'WANT_TO').map(item => (
                                <ItemCard 
                                    key={item.id} 
                                    item={item} 
                                    userCollections={userCollections}
                                    onClick={() => setSelectedItem(item)}
                                    onDelete={(e) => {
                                        e.stopPropagation();
                                        handleDeleteItem(item.id);
                                    }}
                                    onUpdateCollections={handleItemCollectionUpdate}
                                    onCreateCollection={(title) => handleCreateCollection(title)}
                                />
                            ))}
                            </div>
                        </section>
                        )}

                        {sortedItems.some(i => i.status === 'COMPLETED') && (
                        <section>
                            <h2 className="text-xl font-medium text-slate-200 mb-6 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Completed
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {sortedItems.filter(i => i.status === 'COMPLETED').map(item => (
                                <ItemCard 
                                    key={item.id} 
                                    item={item} 
                                    userCollections={userCollections}
                                    onClick={() => setSelectedItem(item)}
                                    onDelete={(e) => {
                                        e.stopPropagation();
                                        handleDeleteItem(item.id);
                                    }}
                                    onUpdateCollections={handleItemCollectionUpdate}
                                    onCreateCollection={(title) => handleCreateCollection(title)}
                                />
                            ))}
                            </div>
                        </section>
                        )}
                        
                        {/* Catch-all for anything else if logic drifts, or if empty sections */}
                        {sortedItems.length === 0 && (
                             <div className="py-20 text-center text-slate-500">
                                No items found.
                             </div>
                        )}
                    </>
                ) : (
                    // Flat Grid for custom sorts
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {sortedItems.map(item => (
                            <ItemCard 
                                key={item.id} 
                                item={item} 
                                userCollections={userCollections}
                                onClick={() => setSelectedItem(item)}
                                onDelete={(e) => {
                                    e.stopPropagation();
                                    handleDeleteItem(item.id);
                                }}
                                onUpdateCollections={handleItemCollectionUpdate}
                                onCreateCollection={(title) => handleCreateCollection(title)}
                            />
                        ))}
                    </div>
                )}
             </div>
        ) : (
             <div>
                 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {sortedItems.map(item => (
                            <ItemCard 
                                key={item.id} 
                                item={item} 
                                userCollections={userCollections}
                                onClick={() => setSelectedItem(item)}
                                onDelete={(e) => {
                                    e.stopPropagation();
                                    handleDeleteItem(item.id);
                                }}
                                onUpdateCollections={handleItemCollectionUpdate}
                                onCreateCollection={(title) => handleCreateCollection(title)}
                            />
                    ))}
                 </div>
                 {sortedItems.length === 0 && (
                     <div className="py-20 text-center text-slate-500">
                         No items found matching criteria.
                     </div>
                 )}
             </div>
        )}
      </div>
    );
  };

  const renderSearch = () => (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-serif mb-4">Add New {getTypeName()}</h2>
        <p className="text-slate-400 mb-6 text-sm">Type a title to create a new entry in your library.</p>
        <form onSubmit={handleSearch} className="relative max-w-lg mx-auto">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Enter title to add...`}
            className="w-full bg-surface border border-slate-700 rounded-full py-3 pl-12 pr-6 text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-slate-500"
          />
          <Plus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
          <button type="submit" className="hidden">Search</button>
        </form>
      </div>

      {loading ? (
        <div className="flex flex-col items-center py-20 gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <button 
            onClick={handleStopSearch}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full text-sm font-medium transition"
          >
              <Square className="w-4 h-4 fill-current" /> Stop Search
          </button>
        </div>
      ) : (
        <div>
            {/* Direct Matches */}
            <div className="space-y-4">
                {searchResults.matches.map((result, idx) => {
                    const isAdded = items.some(i => i.title === result.title && i.creator === result.creator);
                    return (
                        <div key={`match-${idx}`}>
                            <SearchResultCard 
                                result={result} 
                                isAdded={isAdded} 
                                userCollections={userCollections}
                                onAdd={addToLibrary}
                                onRemove={handleRemoveFromSearch}
                                onCreateCollection={handleCreateCollection}
                            />
                        </div>
                    );
                })}
            </div>

            {/* Divider and Recommendations if available */}
            {searchResults.similar.length > 0 && (
                <div className="mt-12 animate-fade-in">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="h-px bg-slate-700 flex-1"></div>
                        <div className="flex items-center gap-2 text-slate-400 text-sm font-medium uppercase tracking-wider">
                            <Star className="w-4 h-4" />
                            <span>You might also like</span>
                        </div>
                        <div className="h-px bg-slate-700 flex-1"></div>
                    </div>
                    
                    <div className="space-y-4">
                        {searchResults.similar.map((result, idx) => {
                            const isAdded = items.some(i => i.title === result.title && i.creator === result.creator);
                            return (
                                <div key={`similar-${idx}`}>
                                    <SearchResultCard 
                                        result={result} 
                                        isAdded={isAdded} 
                                        userCollections={userCollections}
                                        onAdd={addToLibrary}
                                        onRemove={handleRemoveFromSearch}
                                        onCreateCollection={handleCreateCollection}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            
            {!loading && searchResults.matches.length === 0 && searchResults.similar.length === 0 && searchQuery && (
                <div className="text-center py-10 text-slate-500">
                    Press Enter to generate a new item entry.
                </div>
            )}
        </div>
      )}
    </div>
  );

  const renderCollections = () => {
    // Detail View: Specific Collection
    if (activeCollectionId) {
        const collection = userCollections.find(c => c.id === activeCollectionId);
        if (!collection) return <div>Collection not found</div>;

        const collectionItems = items.filter(i => i.collectionIds && i.collectionIds.includes(collection.id));
        const sortedCollectionItems = getSortedItems(collectionItems);

        return (
            <div className="pb-20">
                <div className="mb-6">
                    <button 
                        onClick={() => {
                            setActiveCollectionId(null);
                        }}
                        className="text-slate-400 hover:text-white text-sm mb-4 flex items-center gap-1"
                    >
                        ← Back to Collections
                    </button>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-3xl font-serif font-bold text-white mb-2">{collection.title}</h2>
                            <p className="text-slate-400">{collectionItems.length} {getTypeName()} in this collection</p>
                        </div>
                    </div>
                </div>

                {renderSortToolbar()}

                {/* Items Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 mb-12">
                     {sortedCollectionItems.map(item => (
                        <ItemCard 
                            key={item.id} 
                            item={item} 
                            userCollections={userCollections}
                            onClick={() => setSelectedItem(item)}
                            onDelete={(e) => {
                                e.stopPropagation();
                                if (activeCollectionId) {
                                    // Remove ONLY from this collection
                                    const newIds = (item.collectionIds || []).filter(id => id !== activeCollectionId);
                                    handleItemCollectionUpdate(item.id, newIds);
                                }
                            }}
                            deleteTooltip="Remove from this collection"
                            DeleteIcon={Minus}
                            onUpdateCollections={handleItemCollectionUpdate}
                            onCreateCollection={(title) => handleCreateCollection(title)}
                        />
                      ))}
                      {/* Empty State / Add Place holder */}
                      <div 
                        onClick={() => setView('SEARCH')}
                        className="aspect-[2/3] border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:border-slate-500 hover:text-slate-300 hover:bg-slate-800/50 cursor-pointer transition"
                      >
                          <Plus className="w-8 h-8 mb-2" />
                          <span className="text-sm font-medium">Add Item</span>
                      </div>
                </div>
            </div>
        );
    }

    // List View: All Collections
    return (
      <div className="max-w-6xl mx-auto pb-20">
        <header className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-serif font-bold mb-2">My Collections</h2>
            <p className="text-slate-400">Organize your {getTypeName()} into personal lists.</p>
          </div>
          
          <button 
            onClick={() => setIsCreatingCollection(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition text-sm font-medium"
          >
              <FolderPlus className="w-4 h-4" /> New Collection
          </button>
        </header>

        {isCreatingCollection && (
            <div className="mb-8 bg-surface border border-slate-700 p-6 rounded-xl animate-fade-in">
                <h3 className="text-lg font-medium mb-4">Create New Collection</h3>
                <div className="flex gap-3">
                    <input 
                        autoFocus
                        type="text" 
                        value={newCollectionTitle}
                        onChange={(e) => setNewCollectionTitle(e.target.value)}
                        placeholder="e.g. Summer Favorites, Cyberpunk, Must Read..."
                        className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary focus:outline-none"
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateCollection(newCollectionTitle)}
                    />
                    <button 
                        onClick={() => handleCreateCollection(newCollectionTitle)}
                        disabled={!newCollectionTitle.trim()}
                        className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium"
                    >
                        Create
                    </button>
                    <button 
                        onClick={() => {
                            setIsCreatingCollection(false);
                            setNewCollectionTitle('');
                        }}
                        className="px-6 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-medium"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        )}
        
        {filteredCollections.length === 0 ? (
           <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-xl">
               <Layers className="w-12 h-12 mx-auto mb-4 text-slate-600" />
               <h3 className="text-xl font-medium text-slate-300 mb-2">No collections yet</h3>
               <p className="text-slate-500 mb-6">Create a collection to organize your favorite {getTypeName()}.</p>
               <button 
                  onClick={() => setIsCreatingCollection(true)}
                  className="text-primary hover:underline"
                >
                    Create your first collection
               </button>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCollections.map(col => {
                  const count = items.filter(i => i.collectionIds && i.collectionIds.includes(col.id)).length;
                  
                  return (
                    <div 
                        key={col.id} 
                        onClick={() => setActiveCollectionId(col.id)}
                        className="group relative bg-surface border border-slate-700 hover:border-primary/50 rounded-xl p-6 cursor-pointer transition shadow-sm hover:shadow-md"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-slate-800 rounded-lg group-hover:bg-primary/10 group-hover:text-primary transition-colors text-slate-400">
                                <Folder className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-medium bg-slate-800 px-2 py-1 rounded text-slate-400">{count} items</span>
                        </div>
                        <h3 className="text-xl font-serif font-bold text-slate-100 mb-1 group-hover:text-primary transition-colors pr-8">{col.title}</h3>
                        <p className="text-xs text-slate-500">Created {new Date(col.createdAt).toLocaleDateString()}</p>
                        
                        <button 
                            onClick={(e) => handleDeleteCollection(col.id, e)}
                            className="absolute bottom-4 right-4 p-2 text-slate-500 hover:text-red-500 hover:bg-slate-800 rounded-full transition opacity-0 group-hover:opacity-100 z-10"
                            title="Delete Collection"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                  );
              })}
          </div>
        )}
      </div>
    );
  };

  if (isExited) {
      return (
          <div className="min-h-screen bg-background flex flex-col items-center justify-center text-slate-400">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center text-white font-serif font-bold text-4xl mb-6 shadow-2xl">L</div>
              <h1 className="text-2xl font-serif text-white mb-2">Goodbye</h1>
              <p className="mb-8 text-sm">Your library has been saved locally.</p>
              <button 
                  onClick={() => setIsExited(false)}
                  className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"
              >
                  Open App
              </button>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-background text-slate-100 font-sans selection:bg-primary/30">
      
      {/* Top Navigation */}
      <nav className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-start">
             {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('LIBRARY')}>
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center text-white font-serif font-bold text-xl">L</div>
                <h1 className="text-xl font-serif font-bold tracking-tight hidden sm:block">List</h1>
            </div>

            {/* Mode Toggle */}
            <div className="bg-surface border border-slate-700 p-1 rounded-lg flex items-center">
                <button 
                    onClick={() => setActiveType('BOOK')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition ${activeType === 'BOOK' ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <BookOpen className="w-4 h-4" /> <span className="hidden sm:inline">Books</span>
                </button>
                <button 
                    onClick={() => setActiveType('MOVIE')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition ${activeType === 'MOVIE' ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <Film className="w-4 h-4" /> <span className="hidden sm:inline">Movies</span>
                </button>
                <button 
                    onClick={() => setActiveType('GAME')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition ${activeType === 'GAME' ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <Gamepad className="w-4 h-4" /> <span className="hidden sm:inline">Games</span>
                </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex gap-1 bg-surface/50 p-1 rounded-full border border-slate-800">
                <button 
                    onClick={() => setView('LIBRARY')} 
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${view === 'LIBRARY' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    My Library
                </button>
                <button 
                    onClick={() => setView('COLLECTIONS')} 
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${view === 'COLLECTIONS' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    My Collections
                </button>
                <button 
                    onClick={() => setView('SEARCH')}
                    className={`p-2 rounded-full transition ${view === 'SEARCH' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'}`}
                    title="Add Item"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>
            
            <button 
                onClick={handleExit}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-full transition"
                title="Exit App"
            >
                <Power className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {view === 'LIBRARY' && renderLibrary()}
        {view === 'SEARCH' && renderSearch()}
        {view === 'COLLECTIONS' && renderCollections()}
      </main>

      {/* Detail Modal */}
      {selectedItem && (
        <DetailModal 
            item={selectedItem} 
            isOpen={!!selectedItem} 
            onClose={() => setSelectedItem(null)}
            onUpdate={handleUpdateItem}
            onDelete={(id) => handleDeleteItem(id)}
        />
      )}
    </div>
  );
}