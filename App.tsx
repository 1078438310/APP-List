
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ItemType, ItemStatus, MediaItem, SearchResult, Collection, UserCollection, SharedCollectionPayload, SharedItemPayload } from './types';
import { searchMedia } from './services/geminiService';
import { BookOpen, Film, Gamepad, Search, Plus, Star, ImageIcon, Trash2, Folder, Check, FolderPlus, Layers, Minus, Filter, X, Square, Power, CheckSquare, Share, Download, ChevronDown, ChevronUp, Users, Globe, UserPlus, Mail, Clock, ArrowUp, ArrowDown, Edit, AlertCircle, CheckCircle } from './components/Icons';
import { DetailModal } from './components/DetailModal';

// --- Toast Component ---
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'info', onClose: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 2000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return createPortal(
        <div className="fixed top-[18.75rem] left-1/2 -translate-x-1/2 z-[100] animate-fade-in-down pointer-events-none">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl border ${
                type === 'error' ? 'bg-slate-800 border-red-500/50 text-red-200' : 
                type === 'success' ? 'bg-slate-800 border-emerald-500/50 text-emerald-200' :
                'bg-slate-800 border-slate-600 text-slate-200'
            }`}>
                {type === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                {type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                <span className="text-sm font-medium">{message}</span>
            </div>
        </div>,
        document.body
    );
};

// --- View Components ---

const StatusBadge = ({ status, onChange }: { status: ItemStatus, onChange?: (s: ItemStatus) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is outside both button and menu (portal)
      if (
          isOpen && 
          buttonRef.current && 
          !buttonRef.current.contains(event.target as Node) &&
          menuRef.current && 
          !menuRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    
    // Use capture to catch events early
    document.addEventListener('mousedown', handleClickOutside, true);
    // Also listen to window resize/scroll to close menu as it might detach
    window.addEventListener('resize', () => setIsOpen(false));
    window.addEventListener('scroll', () => setIsOpen(false), true);

    return () => {
        document.removeEventListener('mousedown', handleClickOutside, true);
        window.removeEventListener('resize', () => setIsOpen(false));
        window.removeEventListener('scroll', () => setIsOpen(false), true);
    };
  }, [isOpen]);

  const styles = {
    WANT_TO: "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20",
    IN_PROGRESS: "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20",
    COMPLETED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20",
  };
  const labels = {
    WANT_TO: "Wish",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Done",
  };

  const stopProp = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    if (e.nativeEvent) {
        e.nativeEvent.stopImmediatePropagation();
    }
  };

  const toggleMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      stopProp(e);
      
      if (!isOpen && buttonRef.current) {
          const rect = buttonRef.current.getBoundingClientRect();
          setMenuPosition({
              top: rect.bottom + 4, // 4px gap
              left: rect.left
          });
          setIsOpen(true);
      } else {
          setIsOpen(false);
      }
  };

  if (!onChange) {
      return (
        <span className={`px-2 py-0.5 text-xs font-medium border rounded-full ${styles[status].split(' hover')[0]}`}>
          {labels[status]}
        </span>
      );
  }

  return (
    <>
        <button
            ref={buttonRef}
            onClick={toggleMenu}
            onMouseDown={stopProp}
            onMouseUp={stopProp}
            onTouchStart={stopProp}
            onTouchEnd={stopProp}
            className={`px-2 py-0.5 text-xs font-medium border rounded-full transition flex items-center gap-1 cursor-pointer ${styles[status]}`}
        >
            {labels[status]}
            <ChevronDown className="w-3 h-3 opacity-50" />
        </button>

        {isOpen && createPortal(
            <div 
                ref={menuRef}
                style={{ 
                    position: 'fixed',
                    top: menuPosition.top,
                    left: menuPosition.left,
                    zIndex: 9999 
                }}
                className="w-32 bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden flex flex-col animate-fade-in"
                onClick={stopProp}
                onMouseDown={stopProp}
                onMouseUp={stopProp}
                onTouchStart={stopProp}
                onTouchEnd={stopProp}
            >
                {(Object.keys(labels) as ItemStatus[]).map((s) => (
                    <button
                        key={s}
                        onClick={(e) => {
                            e.preventDefault();
                            stopProp(e);
                            onChange(s);
                            setIsOpen(false);
                        }}
                        onMouseDown={stopProp}
                        onMouseUp={stopProp}
                        onTouchStart={stopProp}
                        onTouchEnd={stopProp}
                        className={`text-left px-3 py-2 text-xs hover:bg-slate-700 flex items-center justify-between transition-colors ${status === s ? 'text-white bg-slate-700' : 'text-slate-300'}`}
                    >
                        {labels[s]}
                        {status === s && <Check className="w-3 h-3 text-primary" />}
                    </button>
                ))}
            </div>,
            document.body
        )}
    </>
  );
};

interface SearchResultCardProps {
    result: SearchResult;
    isAdded: boolean;
    userCollections: UserCollection[];
    onAdd: (result: SearchResult, collectionId?: string) => void;
    onRemove: (result: SearchResult) => void;
    onCreateCollection: (name: string, description: string) => string | null;
}

const SearchResultCard: React.FC<SearchResultCardProps> = ({ result, isAdded, userCollections, onAdd, onRemove, onCreateCollection }) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');
    const [newCollectionDesc, setNewCollectionDesc] = useState('');
    const [menuAlignment, setMenuAlignment] = useState<'right-0' | 'left-0'>('right-0');
    const [verticalAlignment, setVerticalAlignment] = useState<'top' | 'bottom'>('top');
    
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    
    const relevantCollections = userCollections.filter(c => c.type === result.type);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
                setIsCreating(false);
                setNewCollectionName('');
                setNewCollectionDesc('');
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
            const dropdownHeight = 300; // Estimated height
            
            // Horizontal
            if (rect.right < dropdownWidth) {
                setMenuAlignment('left-0');
            } else {
                setMenuAlignment('right-0');
            }

            // Vertical
            const spaceBelow = window.innerHeight - rect.bottom;
            if (spaceBelow < dropdownHeight) {
                setVerticalAlignment('bottom');
            } else {
                setVerticalAlignment('top');
            }
        }
    }, [showDropdown]);

    const handleCreateAndAdd = () => {
        if (newCollectionName.trim()) {
            const newId = onCreateCollection(newCollectionName, newCollectionDesc);
            if (newId) {
                onAdd(result, newId);
                setNewCollectionName('');
                setNewCollectionDesc('');
                setIsCreating(false);
                setShowDropdown(false);
            }
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
                    <div className={`absolute ${verticalAlignment === 'top' ? 'top-full mt-2' : 'bottom-full mb-2'} w-60 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 overflow-hidden ${menuAlignment}`}>
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
                                  <div className="px-1 space-y-2">
                                      <input 
                                        autoFocus
                                        type="text"
                                        value={newCollectionName}
                                        onChange={(e) => setNewCollectionName(e.target.value)}
                                        placeholder="Name..."
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:border-primary focus:outline-none"
                                        onKeyDown={(e) => {
                                            if(e.key === 'Enter') handleCreateAndAdd();
                                        }}
                                      />
                                      <input 
                                        type="text"
                                        value={newCollectionDesc}
                                        onChange={(e) => setNewCollectionDesc(e.target.value)}
                                        placeholder="Description (optional)"
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:border-primary focus:outline-none"
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
                                                setNewCollectionDesc('');
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
  onDelete?: (e: React.MouseEvent) => void;
  onUpdateCollections: (itemId: string, collectionIds: string[]) => void;
  onUpdateItem?: (item: MediaItem) => void;
  onCreateCollection: (title: string, description: string) => string | null;
  deleteTooltip?: string;
  DeleteIcon?: React.ElementType;
  
  // Selection Props
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onLongPress?: () => void;
}

const ItemCard: React.FC<ItemCardProps> = ({ 
    item, userCollections, onClick, onDelete, onUpdateCollections, onUpdateItem, onCreateCollection, 
    deleteTooltip, DeleteIcon, selectable, selected, onToggleSelect, onLongPress 
}) => {
  const [showCollections, setShowCollections] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDesc, setNewCollectionDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [menuAlignment, setMenuAlignment] = useState<'right-0' | 'left-0'>('right-0');
  
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  // Long Press Refs
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowCollections(false);
        setIsCreating(false);
        setNewCollectionName('');
        setNewCollectionDesc('');
      }
    };
    if (showCollections) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCollections]);

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
          const id = onCreateCollection(newCollectionName, newCollectionDesc);
          if (id) {
            setNewCollectionName('');
            setNewCollectionDesc('');
            setIsCreating(false);
          }
      }
  };

  const startPress = () => {
    isLongPressRef.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPressRef.current = true;
      if (onLongPress) onLongPress();
    }, 500); // 500ms long press
  };

  const cancelPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleImageClick = (e: React.MouseEvent) => {
      if (isLongPressRef.current) return;

      if (selectable && onToggleSelect) {
          e.preventDefault();
          onToggleSelect();
      } else {
          onClick();
      }
  };

  const handleContentClick = (e: React.MouseEvent) => {
      if (isLongPressRef.current) return;

      if (selectable && onToggleSelect) {
          e.preventDefault();
          onToggleSelect();
      } else {
          // Now allows opening detail view from content click as well
          onClick();
      }
  };

  return (
    <div 
      className={`group relative bg-surface border rounded-xl overflow-visible transition-all flex flex-row h-36 sm:h-40
      ${selected ? 'border-primary ring-1 ring-primary shadow-lg shadow-primary/10' : 'border-slate-700 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5'}
      `}
    >
      {/* Wrapper - No Click Handler Here to isolate interactions */}
      <div 
        className="flex-1 flex flex-row relative overflow-visible rounded-xl select-none"
      >
        
        {/* Selection Overlay */}
        {selectable && (
            <div className="absolute top-2 left-2 z-30 transition-transform scale-100 pointer-events-none">
                <div className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${selected ? 'bg-primary border-primary' : 'bg-black/40 border-white/50'}`}>
                    {selected && <Check className="w-4 h-4 text-white" />}
                </div>
            </div>
        )}

        {/* Image / Sidebar - Handlers for Detail View */}
        <div 
            onClick={handleImageClick} 
            onMouseDown={startPress}
            onMouseUp={cancelPress}
            onMouseLeave={cancelPress}
            onTouchStart={startPress}
            onTouchEnd={cancelPress}
            className="w-24 sm:w-32 h-full bg-slate-800 relative overflow-hidden shrink-0 border-r border-slate-700 rounded-l-xl cursor-pointer"
        >
            {/* Fallback visual if no cover */}
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-slate-600 font-serif text-3xl opacity-20 select-none">
            {getFallbackIconText()}
            </div>
            <img 
            src={`https://placehold.co/400x600/1e293b/FFF?text=${encodeURIComponent(item.title.substring(0, 20))}`} 
            alt={item.title} 
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none"
            />
        </div>

        {/* Content Side - Handlers for Selection Only */}
        <div 
            onClick={handleContentClick}
            onMouseDown={startPress}
            onMouseUp={cancelPress}
            onMouseLeave={cancelPress}
            onTouchStart={startPress}
            onTouchEnd={cancelPress}
            className={`flex-1 p-3 sm:p-4 flex flex-col justify-between rounded-r-xl cursor-pointer`}
        >
            <div className="pr-8">
                <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-serif font-bold text-xl sm:text-2xl text-slate-100 leading-tight line-clamp-2">{item.title}</h3>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-400 mb-2">
                    <span className="line-clamp-1">{item.creator} • {item.year}</span>
                </div>
                {!selectable && (
                    <div className="flex flex-wrap gap-2 pointer-events-auto">
                        {/* StatusBadge Isolation Wrapper */}
                        <div 
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onMouseUp={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            onTouchEnd={(e) => e.stopPropagation()}
                        >
                            <StatusBadge 
                                status={item.status} 
                                onChange={(newStatus) => onUpdateItem && onUpdateItem({...item, status: newStatus})} 
                            />
                        </div>

                        {item.rating && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">
                                <Star className="w-3 h-3 text-yellow-400" fill={true} />
                                <span className="text-xs text-slate-300 font-medium">{item.rating}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex items-end justify-between mt-auto">
                <div className="flex gap-3">
                    {memoryCount > 0 && (
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                            <ImageIcon className="w-3 h-3 text-primary/80" />
                            <span>{memoryCount}</span>
                        </div>
                    )}
                    {item.collaborators && item.collaborators.length > 0 && (
                        <div className="text-xs text-slate-500 flex items-center gap-1" title={`Edited by ${item.collaborators.join(', ')}`}>
                            <Users className="w-3 h-3 text-accent/80" />
                            <span>{item.collaborators.length}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* Actions (Hidden in Selection Mode) */}
      {!selectable && (
          <div className="absolute top-2 right-2 flex flex-col gap-2 z-20">
            {onDelete && (
                <button 
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDelete(e);
                    }}
                    className="p-1.5 bg-slate-800 text-slate-400 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-all"
                    title={deleteTooltip || "Remove from Library"}
                >
                    <ActionIcon className="w-4 h-4" />
                </button>
            )}

            <div className="relative" ref={menuRef}>
                <button 
                    ref={buttonRef}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowCollections(!showCollections);
                    }}
                    className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-primary rounded-lg transition"
                    title="Manage Collections"
                >
                    <Folder className="w-4 h-4" />
                </button>

                {showCollections && (
                    <div 
                        className={`absolute top-full right-0 mt-2 w-56 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-2 z-40 ${menuAlignment}`}
                        onClick={(e) => e.stopPropagation()} 
                    >
                        {/* Remove from all option */}
                        {(item.collectionIds && item.collectionIds.length > 0) && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdateCollections(item.id, []);
                                }}
                                className="w-full text-left px-2 py-1.5 text-xs text-red-400 hover:bg-slate-700 hover:text-red-300 rounded flex items-center gap-2 mb-1 border-b border-slate-700/50"
                            >
                                <Minus className="w-3 h-3" />
                                Remove from all
                            </button>
                        )}

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
                                <div className="px-1 space-y-2" onClick={(e) => e.stopPropagation()}>
                                    <input 
                                        autoFocus
                                        type="text"
                                        value={newCollectionName}
                                        onChange={(e) => setNewCollectionName(e.target.value)}
                                        placeholder="Name..."
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:border-primary focus:outline-none"
                                        onKeyDown={(e) => {
                                            if(e.key === 'Enter') handleCreateCollection();
                                        }}
                                    />
                                    <input 
                                        type="text"
                                        value={newCollectionDesc}
                                        onChange={(e) => setNewCollectionDesc(e.target.value)}
                                        placeholder="Description..."
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:border-primary focus:outline-none"
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
      )}
    </div>
  );
};

// --- Main App ---

type SortCriteria = 'DATE' | 'TITLE' | 'RATING';
type SortOrder = 'ASC' | 'DESC';
type ImportTab = 'FRIEND' | 'LINK';

export default function App() {
  // Global Mode State
  const [activeType, setActiveType] = useState<ItemType>('BOOK');
  const [isExited, setIsExited] = useState(false);

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // View State
  const [view, setView] = useState<'LIBRARY' | 'SEARCH' | 'COLLECTIONS'>('LIBRARY');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [userCollections, setUserCollections] = useState<UserCollection[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Library State
  const [libraryTab, setLibraryTab] = useState<'ALL' | ItemStatus | string>('ALL');
  const [sortCriteria, setSortCriteria] = useState<SortCriteria>('DATE');
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC');
  const [showUncategorizedOnly, setShowUncategorizedOnly] = useState(false);
  
  // Batch Operations State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Add from Library Modal State
  const [isAddFromLibraryOpen, setIsAddFromLibraryOpen] = useState(false);
  const [librarySelectionIds, setLibrarySelectionIds] = useState<Set<string>>(new Set());

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ matches: SearchResult[], similar: SearchResult[] }>({ matches: [], similar: [] });
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Collections State
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [newCollectionTitle, setNewCollectionTitle] = useState('');
  const [newCollectionDesc, setNewCollectionDesc] = useState('');
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [isEditingCollection, setIsEditingCollection] = useState(false);
  const [editCollectionTitle, setEditCollectionTitle] = useState('');
  const [editCollectionDesc, setEditCollectionDesc] = useState('');
  
  // Sharing & Import State
  const [sharingCollection, setSharingCollection] = useState<UserCollection | null>(null);
  const [pendingShare, setPendingShare] = useState<SharedCollectionPayload | null>(null); // For URL Params only
  const [pendingEdit, setPendingEdit] = useState<SharedItemPayload | null>(null);
  
  const [showImportInput, setShowImportInput] = useState(false);
  const [importTab, setImportTab] = useState<ImportTab>('FRIEND');
  const [importInputValue, setImportInputValue] = useState('');
  const [importPreview, setImportPreview] = useState<SharedCollectionPayload | null>(null);
  const [isImportPreviewExpanded, setIsImportPreviewExpanded] = useState(false);
  
  // Refs for click outside handling
  const importSectionRef = useRef<HTMLDivElement>(null);
  const newCollectionSectionRef = useRef<HTMLDivElement>(null);

  // Share Modal State
  const [sharerNameInput, setSharerNameInput] = useState('');

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

  // Click Outside Handler for Import/New Collection Sections
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (showImportInput && importSectionRef.current && !importSectionRef.current.contains(event.target as Node)) {
            setShowImportInput(false);
        }
        if (isCreatingCollection && newCollectionSectionRef.current && !newCollectionSectionRef.current.contains(event.target as Node)) {
            setIsCreatingCollection(false);
        }
    };

    if (showImportInput || isCreatingCollection) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showImportInput, isCreatingCollection]);


  // Handle Share URL Parameter on Load
  useEffect(() => {
      const searchParams = new URLSearchParams(window.location.search);
      const shareData = searchParams.get('share');
      const editData = searchParams.get('editItem');
      
      if (shareData) {
          try {
              const decoded = decodeURIComponent(atob(shareData));
              const payload: SharedCollectionPayload = JSON.parse(decoded);
              setPendingShare(payload);
              setView('COLLECTIONS'); // Force view to Collections so user sees the card
          } catch (e) {
              console.error("Failed to parse shared collection", e);
          }
      }

      if (editData) {
          try {
              const decoded = decodeURIComponent(atob(editData));
              const payload: SharedItemPayload = JSON.parse(decoded);
              setPendingEdit(payload);
          } catch (e) {
              console.error("Failed to parse edit item", e);
          }
      }
  }, []);

  // Reset states when switching types or views
  useEffect(() => {
    setSearchResults({ matches: [], similar: [] });
    setSearchQuery('');
    setActiveCollectionId(null);
    setSortCriteria('DATE');
    setSortOrder('DESC');
    setShowUncategorizedOnly(false);
    
    // Reset Selection Mode
    setIsSelectionMode(false);
    setSelectedIds(new Set());
    
    // Reset Library Picker
    setIsAddFromLibraryOpen(false);
    setLibrarySelectionIds(new Set());

    // Cleanup pending search if view changes
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
        setLoading(false);
    }
    
    // Reset UI toggles
    setShowImportInput(false);
    setImportPreview(null);
    setImportInputValue('');
    setIsCreatingCollection(false);
    setNewCollectionDesc('');
    setIsEditingCollection(false);
  }, [activeType, view]);

  // --- Handlers ---

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      setToast({ message, type });
  };

  const handleExit = () => {
    if (window.confirm("Are you sure you want to exit?")) {
        setIsExited(true);
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
        } else {
            console.error('Search error:', error);
        }
    } finally {
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
      collectionIds: collectionId ? [collectionId] : [],
    };
    setItems(prev => [newItem, ...prev]);
  };

  const handleRemoveFromSearch = (result: SearchResult) => {
      setItems(prev => prev.filter(i => !(i.title === result.title && i.creator === result.creator && i.type === result.type)));
  };

  const handleUpdateItem = (updated: MediaItem) => {
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
    // Only update selectedItem if it's currently open (to keep modal in sync), 
    // otherwise leave it null so we don't accidentally open the modal.
    setSelectedItem(prev => (prev && prev.id === updated.id ? updated : prev)); 
  };

  const handleDeleteItem = (id: string) => {
      setItems(prev => prev.filter(i => i.id !== id));
      setSelectedItem(null);
  };

  const handleItemCollectionUpdate = (itemId: string, collectionIds: string[]) => {
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, collectionIds } : i));
      if (selectedItem && selectedItem.id === itemId) {
          setSelectedItem({ ...selectedItem, collectionIds });
      }
  };

  const handleCreateCollection = (title: string, description: string, itemType: ItemType = activeType): string | null => {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) return null;

      // Check for duplicate name
      const exists = userCollections.some(c => c.type === itemType && c.title.toLowerCase() === trimmedTitle.toLowerCase());
      if (exists) {
          showToast('A collection with this name already exists.', 'error');
          return null;
      }

      const id = crypto.randomUUID();
      const newCol: UserCollection = {
          id,
          title: trimmedTitle,
          description,
          type: itemType,
          createdAt: new Date().toISOString()
      };
      setUserCollections(prev => [...prev, newCol]);
      
      return id;
  };

  const handleDeleteCollection = (collectionId: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setItems(prev => prev.map(item => ({
          ...item,
          collectionIds: (item.collectionIds || []).filter(id => id !== collectionId)
      })));
      setUserCollections(prev => prev.filter(c => c.id !== collectionId));
      if(activeCollectionId === collectionId) {
          setActiveCollectionId(null);
      }
  };

  const handleStartEditCollection = (collection: UserCollection) => {
      setEditCollectionTitle(collection.title);
      setEditCollectionDesc(collection.description || '');
      setIsEditingCollection(true);
  };

  const handleSaveCollection = () => {
      if(!activeCollectionId) return;

      const trimmedTitle = editCollectionTitle.trim();
      if (!trimmedTitle) return;

      // Check for duplicate name (excluding self)
      const exists = userCollections.some(c => 
          c.type === activeType && 
          c.id !== activeCollectionId &&
          c.title.toLowerCase() === trimmedTitle.toLowerCase()
      );
      if (exists) {
           showToast('A collection with this name already exists.', 'error');
           return;
      }

      setUserCollections(prev => prev.map(c => 
          c.id === activeCollectionId 
          ? { ...c, title: trimmedTitle, description: editCollectionDesc }
          : c
      ));
      setIsEditingCollection(false);
  };

  const handleInitiateShare = (collection: UserCollection, e?: React.MouseEvent) => {
      if(e) {
          e.preventDefault();
          e.stopPropagation();
      }
      setSharingCollection(collection);
      setSharerNameInput('');
  };

  const handleAddToCollectionFromLibrary = () => {
      if (!activeCollectionId) return;
      
      setItems(prev => prev.map(item => {
          if (librarySelectionIds.has(item.id)) {
              // Add collection ID if not present
              const currentCols = item.collectionIds || [];
              if (!currentCols.includes(activeCollectionId)) {
                  return { ...item, collectionIds: [...currentCols, activeCollectionId] };
              }
          }
          return item;
      }));
      
      setIsAddFromLibraryOpen(false);
      setLibrarySelectionIds(new Set());
      showToast('Items added to collection', 'success');
  };

  const toggleLibrarySelection = (id: string) => {
      const newSet = new Set(librarySelectionIds);
      if (newSet.has(id)) {
          newSet.delete(id);
      } else {
          newSet.add(id);
      }
      setLibrarySelectionIds(newSet);
  };

  const generateShareLink = (isPublic: boolean) => {
      if (!sharingCollection) return;

      const collectionItems = items.filter(i => i.collectionIds && i.collectionIds.includes(sharingCollection.id));
      
      const payload: SharedCollectionPayload = {
          title: sharingCollection.title,
          type: sharingCollection.type,
          sharer: isPublic ? undefined : (sharerNameInput.trim() || 'A Friend'),
          items: collectionItems.map(item => ({
              title: item.title,
              type: item.type,
              creator: item.creator,
              year: item.year,
              description: item.description,
              coverUrl: item.coverUrl
          }))
      };

      const jsonStr = JSON.stringify(payload);
      const encoded = btoa(encodeURIComponent(jsonStr));
      const url = `${window.location.origin}${window.location.pathname}?share=${encoded}`;
      
      navigator.clipboard.writeText(url).then(() => {
          showToast(`Link to "${sharingCollection.title}" copied!`, 'success');
          setSharingCollection(null);
      });
  };

  const handlePreviewLink = () => {
      if (!importInputValue.trim()) return;

      try {
          let payloadString = importInputValue.trim();
          
          // Check if it's a URL and extract the share param
          if (payloadString.includes('share=')) {
              try {
                const url = new URL(payloadString);
                const shareParam = url.searchParams.get('share');
                if (shareParam) payloadString = shareParam;
              } catch (e) {
                 const parts = payloadString.split('share=');
                 if (parts.length > 1) payloadString = parts[1];
              }
          }
          else if (payloadString.includes('editItem=')) {
               try {
                const url = new URL(payloadString);
                const editParam = url.searchParams.get('editItem');
                if (editParam) {
                    const decoded = decodeURIComponent(atob(editParam));
                    const payload: SharedItemPayload = JSON.parse(decoded);
                    setPendingEdit(payload);
                    setShowImportInput(false);
                    setImportInputValue('');
                    return;
                }
              } catch (e) {
                 const parts = payloadString.split('editItem=');
                 if (parts.length > 1) {
                    const decoded = decodeURIComponent(atob(parts[1]));
                    const payload: SharedItemPayload = JSON.parse(decoded);
                    setPendingEdit(payload);
                    setShowImportInput(false);
                    setImportInputValue('');
                    return;
                 }
              }
          }

          const decoded = decodeURIComponent(atob(payloadString));
          const payload: SharedCollectionPayload = JSON.parse(decoded);
          
          setImportPreview(payload);
          setImportInputValue('');
      } catch (e) {
          showToast("Invalid import link or code.", 'error');
      }
  };

  const handleCheckInbox = () => {
      setImportPreview(null);
      // Simulate network delay
      setTimeout(() => {
        // Mock data based on active type
        const mockData: Record<ItemType, SharedCollectionPayload> = {
            BOOK: {
                title: "Dystopian Classics",
                type: 'BOOK',
                sharer: "Sarah Connor",
                items: [
                    { title: "1984", creator: "George Orwell", year: "1949", type: 'BOOK', description: "Big Brother is watching you." },
                    { title: "Brave New World", creator: "Aldous Huxley", year: "1932", type: 'BOOK', description: "A futuristic World State." }
                ]
            },
            MOVIE: {
                title: "Mind Benders",
                type: 'MOVIE',
                sharer: "Nolan Fan",
                items: [
                    { title: "Inception", creator: "Christopher Nolan", year: "2010", type: 'MOVIE', description: "A thief who steals corporate secrets through the use of dream-sharing technology." },
                    { title: "Memento", creator: "Christopher Nolan", year: "2000", type: 'MOVIE', description: "A man creates a strange system to help him remember things." }
                ]
            },
            GAME: {
                title: "Indie Gems",
                type: 'GAME',
                sharer: "GamerPro",
                items: [
                    { title: "Hollow Knight", creator: "Team Cherry", year: "2017", type: 'GAME', description: "Forging your own path in Hallownest." },
                    { title: "Celeste", creator: "Maddy Makes Games", year: "2018", type: 'GAME', description: "Help Madeline survive her inner demons." }
                ]
            }
        };

        setImportPreview(mockData[activeType]);
      }, 500);
  };

  const handleImportCollection = (payload: SharedCollectionPayload) => {
      // Logic to find a unique name if duplicate exists
      let baseTitle = `${payload.title} ${payload.sharer ? `(Shared by ${payload.sharer})` : '(Imported)'}`;
      let titleToUse = baseTitle;
      let counter = 1;
      
      // Check duplicate against current collections
      while (userCollections.some(c => c.type === payload.type && c.title.toLowerCase() === titleToUse.toLowerCase())) {
          titleToUse = `${baseTitle} (${counter})`;
          counter++;
      }

      const newCollectionId = handleCreateCollection(titleToUse, '', payload.type);
      // Since we force uniqueness above, this should generally succeed unless other errors occur
      if (!newCollectionId) return;
      
      // Add items if they don't exist, or link if they do
      const newItems: MediaItem[] = [];
      
      payload.items.forEach(sharedItem => {
          // Check for exact duplicate in library
          const existingItem = items.find(i => 
              i.title === sharedItem.title && 
              i.creator === sharedItem.creator && 
              i.type === sharedItem.type
          );

          if (existingItem) {
              // Item exists, just link it to the new collection
              const updatedCollectionIds = [...(existingItem.collectionIds || []), newCollectionId];
              handleItemCollectionUpdate(existingItem.id, updatedCollectionIds);
          } else {
              // Create new item
              const newItem: MediaItem = {
                  id: crypto.randomUUID(),
                  title: sharedItem.title || 'Unknown',
                  type: sharedItem.type || payload.type,
                  creator: sharedItem.creator || 'Unknown',
                  year: sharedItem.year || '',
                  description: sharedItem.description || '',
                  coverUrl: sharedItem.coverUrl,
                  status: 'WANT_TO',
                  addedAt: new Date().toISOString(),
                  memories: [],
                  collectionIds: [newCollectionId]
              };
              newItems.push(newItem);
          }
      });

      if (newItems.length > 0) {
          setItems(prev => [...newItems, ...prev]);
      }
      
      // Clear URL param if came from there
      if (pendingShare) {
        window.history.replaceState({}, '', window.location.pathname);
        setPendingShare(null);
      }
      
      // Reset Import UI
      setImportPreview(null);
      setShowImportInput(false);
      
      setActiveCollectionId(newCollectionId);
      setView('COLLECTIONS');
      showToast('Collection imported successfully!', 'success');
  };

  const handleAcceptEdit = () => {
      if (!pendingEdit) return;
      
      const { item, sharer } = pendingEdit;
      const collaborators = new Set(item.collaborators || []);
      collaborators.add(sharer);
      
      const updatedItem: MediaItem = {
          ...item,
          collaborators: Array.from(collaborators)
      };

      const existingIndex = items.findIndex(i => i.id === item.id);
      
      if (existingIndex >= 0) {
          // Update existing
          setItems(prev => {
              const next = [...prev];
              next[existingIndex] = updatedItem;
              return next;
          });
      } else {
          // Add new
          setItems(prev => [updatedItem, ...prev]);
      }
      
      // Clear URL param
      window.history.replaceState({}, '', window.location.pathname);
      setPendingEdit(null);
      setSelectedItem(updatedItem); // Open detail view
      showToast('Card updated from shared edit.', 'success');
  };

  // Batch Operations
  const toggleSelection = (id: string) => {
      const newSelected = new Set(selectedIds);
      if (newSelected.has(id)) {
          newSelected.delete(id);
      } else {
          newSelected.add(id);
      }
      setSelectedIds(newSelected);
  };
  
  const handleLongPress = (id: string) => {
      setIsSelectionMode(true);
      setSelectedIds(new Set([id]));
  };

  const toggleSelectAll = (filteredItems: MediaItem[]) => {
      if (selectedIds.size === filteredItems.length) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(filteredItems.map(i => i.id)));
      }
  };

  const handleBatchDelete = () => {
      if (view === 'COLLECTIONS' && activeCollectionId) {
          // In collection view: Remove from collection
          setItems(prev => prev.map(item => {
              if (selectedIds.has(item.id)) {
                  return {
                      ...item,
                      collectionIds: (item.collectionIds || []).filter(id => id !== activeCollectionId)
                  };
              }
              return item;
          }));
          showToast(`Removed ${selectedIds.size} items from collection.`, 'info');
      } else {
          // In Library view: Delete permanently
          setItems(prev => prev.filter(item => !selectedIds.has(item.id)));
          showToast(`Deleted ${selectedIds.size} items.`, 'info');
      }
      setSelectedIds(new Set());
      setIsSelectionMode(false);
  };

  const handleBatchStatus = (status: ItemStatus) => {
      setItems(prev => prev.map(item => {
          if (selectedIds.has(item.id)) {
              return { ...item, status };
          }
          return item;
      }));
      setSelectedIds(new Set());
      setIsSelectionMode(false);
      showToast('Status updated for selected items.', 'success');
  };

  const getTypeName = () => {
      if (activeType === 'BOOK') return 'books';
      if (activeType === 'MOVIE') return 'movies';
      return 'games';
  };

  const getSortedItems = (items: MediaItem[]) => {
      return [...items].sort((a, b) => {
          let comparison = 0;
          switch (sortCriteria) {
              case 'DATE':
                  comparison = new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
                  break;
              case 'TITLE':
                  comparison = a.title.localeCompare(b.title);
                  break;
              case 'RATING':
                  comparison = (a.rating || 0) - (b.rating || 0);
                  break;
          }
          return sortOrder === 'ASC' ? comparison : -comparison;
      });
  };

  // --- Render Views ---

  const filteredItems = items.filter(i => i.type === activeType);
  const filteredCollections = userCollections.filter(c => c.type === activeType);

  const renderBatchToolbar = () => {
      if (!isSelectionMode || selectedIds.size === 0) return null;

      return (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-600 rounded-full shadow-2xl z-50 px-6 py-3 flex items-center gap-6 animate-fade-in-up">
              <span className="text-white font-medium text-sm whitespace-nowrap">{selectedIds.size} Selected</span>
              
              <div className="h-6 w-px bg-slate-600"></div>
              
              <div className="flex items-center gap-2">
                  <button onClick={() => handleBatchStatus('WANT_TO')} className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition text-xs font-medium" title="Mark as Wish">Wish</button>
                  <button onClick={() => handleBatchStatus('IN_PROGRESS')} className="p-2 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-white transition text-xs font-medium" title="Mark as In Progress">Prog</button>
                  <button onClick={() => handleBatchStatus('COMPLETED')} className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition text-xs font-medium" title="Mark as Done">Done</button>
              </div>

              <div className="h-6 w-px bg-slate-600"></div>

              <button 
                  onClick={handleBatchDelete}
                  className="p-2 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition"
                  title={view === 'COLLECTIONS' && activeCollectionId ? "Remove from Collection" : "Delete Permanently"}
              >
                  <Trash2 className="w-5 h-5" />
              </button>
          </div>
      );
  };

  // Reusable Sort Controls (Order + Dropdown)
  const SortControls = () => (
      <div className="flex items-center">
        <button
            onClick={() => setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC')}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title={sortOrder === 'ASC' ? "Ascending" : "Descending"}
        >
            {sortOrder === 'ASC' ? <ArrowUp className="w-4 h-4"/> : <ArrowDown className="w-4 h-4"/>}
        </button>

        <div className="flex items-center gap-2 bg-surface border border-slate-700 rounded-lg px-3 py-1.5 ml-1">
            <span className="text-slate-400 hidden sm:inline">Sort by:</span>
            <span className="text-slate-400 sm:hidden">Sort:</span>
            <select 
                value={sortCriteria}
                onChange={(e) => setSortCriteria(e.target.value as SortCriteria)}
                className="bg-transparent text-white focus:outline-none cursor-pointer"
            >
                <option value="DATE" className="bg-slate-800">Date Added</option>
                <option value="TITLE" className="bg-slate-800">Title</option>
                <option value="RATING" className="bg-slate-800">Rating</option>
            </select>
        </div>
      </div>
  );

  // Reusable Batch Controls
  const BatchControls = ({ currentItems }: { currentItems: MediaItem[] }) => {
      if (!isSelectionMode) return null;
      return (
        <div className="flex items-center gap-2 border-l border-slate-700 pl-4 ml-2">
            <button 
                onClick={() => toggleSelectAll(currentItems)}
                className="text-xs text-slate-400 hover:text-white px-2"
            >
                {selectedIds.size === currentItems.length ? 'Deselect' : 'All'}
            </button>
            <button 
                onClick={() => {
                    setIsSelectionMode(false);
                    setSelectedIds(new Set());
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-primary text-white border-primary transition"
            >
                <CheckSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Done</span>
            </button>
        </div>
      );
  };

  const renderLibraryPicker = () => {
      if (!isAddFromLibraryOpen || !activeCollectionId) return null;

      // Filter items: Correct Type AND Not already in this collection
      const candidates = items.filter(i => 
          i.type === activeType && 
          !(i.collectionIds || []).includes(activeCollectionId)
      );

      return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <div className="bg-surface w-full max-w-3xl rounded-xl shadow-2xl border border-slate-700 flex flex-col max-h-[85vh]">
                  <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                      <h3 className="text-xl font-bold text-white">Add from Library</h3>
                      <button onClick={() => setIsAddFromLibraryOpen(false)} className="text-slate-400 hover:text-white">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  
                  <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                      {candidates.length === 0 ? (
                          <div className="text-center py-10 text-slate-500">
                              <p>No other items available in your library.</p>
                          </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {candidates.map(item => {
                                const isSelected = librarySelectionIds.has(item.id);
                                return (
                                    <div 
                                        key={item.id}
                                        onClick={() => toggleLibrarySelection(item.id)}
                                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${isSelected ? 'bg-primary/20 border-primary' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}
                                    >
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-slate-500'}`}>
                                            {isSelected && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold text-white truncate">{item.title}</h4>
                                            <p className="text-xs text-slate-400 truncate">{item.creator}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                      )}
                  </div>

                  <div className="p-4 border-t border-slate-700 flex justify-end gap-3 bg-slate-900 rounded-b-xl">
                        <button 
                            onClick={() => setIsAddFromLibraryOpen(false)}
                            className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-medium text-sm"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleAddToCollectionFromLibrary}
                            disabled={librarySelectionIds.size === 0}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium text-sm disabled:opacity-50"
                        >
                            Add {librarySelectionIds.size > 0 ? `${librarySelectionIds.size} Items` : ''}
                        </button>
                  </div>
              </div>
          </div>
      );
  };

  const renderLibrary = () => {
    const EmptyState = () => (
      <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-xl">
        {activeType === 'BOOK' && <BookOpen className="w-12 h-12 mx-auto mb-4 text-slate-600" />}
        {activeType === 'MOVIE' && <Film className="w-12 h-12 mx-auto mb-4 text-slate-600" />}
        {activeType === 'GAME' && <Gamepad className="w-12 h-12 mx-auto mb-4 text-slate-600" />}
        
        <h3 className="text-xl font-medium text-slate-300 mb-2">Your {activeType === 'BOOK' ? 'book' : (activeType === 'MOVIE' ? 'movie' : 'game')} library is empty</h3>
        <p className="text-slate-500 mb-6">Start building your collection by searching for titles.</p>
        <button onClick={() => setView('SEARCH')} className="text-primary hover:underline font-medium">Go to Search</button>
      </div>
    );

    if (filteredItems.length === 0) return <EmptyState />;

    // Tabs logic
    const tabs: { id: 'ALL' | ItemStatus | string; label: string; isCollection?: boolean }[] = [
        { id: 'ALL', label: 'All' },
        { id: 'WANT_TO', label: 'Wish' },
        { id: 'IN_PROGRESS', label: 'In Progress' },
        { id: 'COMPLETED', label: 'Done' },
    ];

    const getCount = (tabId: string) => {
        let baseItems = filteredItems;
        if (showUncategorizedOnly) {
            baseItems = baseItems.filter(i => !i.collectionIds || i.collectionIds.length === 0);
        }

        if (tabId === 'ALL') {
            return baseItems.length;
        }
        if (['WANT_TO', 'IN_PROGRESS', 'COMPLETED'].includes(tabId)) {
            return baseItems.filter(i => i.status === tabId).length;
        }
        return 0;
    };

    let currentTabItems = filteredItems;
    if (libraryTab !== 'ALL') {
        currentTabItems = filteredItems.filter(i => i.status === libraryTab);
    }
    
    // Apply uncategorized filter regardless of tab
    if (showUncategorizedOnly) {
        currentTabItems = currentTabItems.filter(i => !i.collectionIds || i.collectionIds.length === 0);
    }

    const sortedItems = getSortedItems(currentTabItems);

    return (
      <div className="pb-24">
        {/* Library Sub-navigation */}
        <div className="flex items-center gap-6 border-b border-slate-800 mb-6 overflow-x-auto no-scrollbar pb-1">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => {
                        setLibraryTab(tab.id);
                    }}
                    className={`pb-3 text-sm font-medium transition border-b-2 flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
                        libraryTab === tab.id
                        ? 'border-primary text-white'
                        : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                >
                    {tab.label}
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-500">
                        {getCount(tab.id)}
                    </span>
                </button>
            ))}
        </div>

        {/* Toolbar: Uncategorized (Left) | Sort + Batch (Right) */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 text-sm">
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => setShowUncategorizedOnly(!showUncategorizedOnly)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition ${showUncategorizedOnly ? 'bg-primary/20 border-primary text-primary' : 'bg-surface border-slate-700 text-slate-400 hover:text-white'}`}
                >
                    <Filter className="w-4 h-4" />
                    <span className="hidden sm:inline">Uncategorized</span>
                    <span className="sm:hidden">Uncategorized</span>
                </button>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
                <SortControls />
                <BatchControls currentItems={sortedItems} />
            </div>
        </div>

        {renderBatchToolbar()}

        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
                        onUpdateItem={handleUpdateItem}
                        onCreateCollection={(title, desc) => handleCreateCollection(title, desc)}
                        selectable={isSelectionMode}
                        selected={selectedIds.has(item.id)}
                        onToggleSelect={() => toggleSelection(item.id)}
                        onLongPress={() => handleLongPress(item.id)}
                    />
            ))}
            </div>
            {sortedItems.length === 0 && (
                <div className="py-20 text-center text-slate-500">
                    No items found matching criteria.
                </div>
            )}
        </div>
      </div>
    );
  };

  const renderSearch = () => (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="mb-10 text-center">
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
            <div className="pb-24">
                <div className="mb-6">
                    <button 
                        onClick={() => {
                            setActiveCollectionId(null);
                            setIsEditingCollection(false);
                        }}
                        className="text-slate-400 hover:text-white text-sm mb-4 flex items-center gap-1"
                    >
                        ← Back to Collections
                    </button>
                    
                    {isEditingCollection ? (
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Edit Collection</h3>
                            <div className="flex flex-col gap-3">
                                <input 
                                    type="text"
                                    value={editCollectionTitle}
                                    onChange={(e) => setEditCollectionTitle(e.target.value)}
                                    placeholder="Collection Name"
                                    className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white font-serif font-bold text-xl focus:border-primary focus:outline-none"
                                />
                                <textarea
                                    value={editCollectionDesc}
                                    onChange={(e) => setEditCollectionDesc(e.target.value)}
                                    placeholder="Description..."
                                    className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-primary focus:outline-none resize-none h-20"
                                />
                                <div className="flex gap-2 justify-end">
                                    <button 
                                        onClick={() => {
                                            setIsEditingCollection(false);
                                        }}
                                        className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 text-sm font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleSaveCollection}
                                        disabled={!editCollectionTitle.trim()}
                                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium disabled:opacity-50"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div>
                             <h2 className="text-3xl font-serif font-bold text-white mb-2">{collection.title}</h2>
                             {collection.description && <p className="text-slate-400 mb-2">{collection.description}</p>}
                             <p className="text-slate-500 text-sm">{collectionItems.length} {getTypeName()} in this collection</p>
                        </div>
                    )}
                </div>

                {/* Toolbar: Sort (Left) | Actions (Right) */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6 text-sm">
                    {/* Left: Sort */}
                    <div className="flex items-center gap-2">
                        <SortControls />
                    </div>

                    {/* Right: Actions & Batch */}
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="flex items-center gap-1">
                             <button
                                onClick={() => handleStartEditCollection(collection)}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                                title="Edit Collection"
                            >
                                <Edit className="w-4 h-4" />
                            </button>
                            <button
                                onClick={(e) => handleInitiateShare(collection, e)}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                                title="Share Collection"
                            >
                                <Share className="w-4 h-4" />
                            </button>
                            <button
                                onClick={(e) => handleDeleteCollection(collection.id, e)}
                                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                                title="Delete Collection"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        <BatchControls currentItems={sortedCollectionItems} />
                    </div>
                </div>

                {renderBatchToolbar()}

                {/* Items Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-12">
                     {sortedCollectionItems.map(item => (
                        <ItemCard 
                            key={item.id} 
                            item={item} 
                            userCollections={userCollections}
                            onClick={() => setSelectedItem(item)}
                            // Omitted onDelete to remove individual remove button, encouraging batch use via long press
                            onUpdateCollections={handleItemCollectionUpdate}
                            onUpdateItem={handleUpdateItem}
                            onCreateCollection={(title, desc) => handleCreateCollection(title, desc)}
                            selectable={isSelectionMode}
                            selected={selectedIds.has(item.id)}
                            onToggleSelect={() => toggleSelection(item.id)}
                            onLongPress={() => handleLongPress(item.id)}
                        />
                      ))}
                      
                      {!isSelectionMode && (
                          <>
                            {/* Card: Add from Library */}
                            <div 
                                onClick={() => setIsAddFromLibraryOpen(true)}
                                className="h-36 sm:h-40 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:border-slate-500 hover:text-slate-300 hover:bg-slate-800/50 cursor-pointer transition"
                            >
                                <BookOpen className="w-8 h-8 mb-2" />
                                <span className="text-sm font-medium">Add from Library</span>
                            </div>

                            {/* Card: Add New (Search) */}
                            <div 
                                onClick={() => setView('SEARCH')}
                                className="h-36 sm:h-40 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:border-slate-500 hover:text-slate-300 hover:bg-slate-800/50 cursor-pointer transition"
                            >
                                <Plus className="w-8 h-8 mb-2" />
                                <span className="text-sm font-medium">Add New Item</span>
                            </div>
                          </>
                      )}
                </div>
            </div>
        );
    }

    // List View: All Collections
    return (
      <div className="max-w-6xl mx-auto pb-20 relative">
        <header className="mb-8 flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-serif font-bold mb-2">My Collections</h2>
            <p className="text-slate-400">Organize your {getTypeName()} into personal lists.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
                onClick={() => {
                    setShowImportInput(!showImportInput);
                    setImportPreview(null);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition text-sm font-medium ${showImportInput ? 'bg-primary text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
                <Download className="w-4 h-4" /> Import
            </button>
            <button 
                onClick={() => setIsCreatingCollection(!isCreatingCollection)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition text-sm font-medium ${isCreatingCollection ? 'bg-primary text-white' : 'bg-primary/80 text-white hover:bg-primary/90'}`}
            >
                <FolderPlus className="w-4 h-4" /> New Collection
            </button>
          </div>
        </header>

        {/* Floating Action Panels */}
        <div className="relative z-30">
            {showImportInput && (
                <div ref={importSectionRef} className="absolute top-0 left-0 right-0 bg-slate-900 border border-slate-700 rounded-xl animate-fade-in shadow-2xl overflow-hidden">
                    {/* Header & Tabs */}
                    <div className="bg-slate-900 border-b border-slate-700 px-6 pt-4">
                        <h3 className="text-lg font-medium mb-4">Import Collection</h3>
                        <div className="flex w-full">
                            <button 
                                onClick={() => {
                                    setImportTab('FRIEND');
                                    setImportPreview(null);
                                }}
                                className={`flex-1 justify-center pb-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${importTab === 'FRIEND' ? 'border-primary text-white' : 'border-transparent text-slate-400 hover:text-white'}`}
                            >
                                <Users className="w-4 h-4" /> Friend Inbox
                            </button>
                            <button 
                                onClick={() => {
                                    setImportTab('LINK');
                                    setImportPreview(null);
                                }}
                                className={`flex-1 justify-center pb-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${importTab === 'LINK' ? 'border-primary text-white' : 'border-transparent text-slate-400 hover:text-white'}`}
                            >
                                <Globe className="w-4 h-4" /> Link / Code
                            </button>
                        </div>
                    </div>

                    <div className="p-6">
                        {/* Tab Content: Link */}
                        {importTab === 'LINK' && !importPreview && (
                            <div className="animate-fade-in">
                                <p className="text-xs text-slate-400 mb-4">Paste a shared collection code or link below:</p>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input 
                                        autoFocus
                                        type="text" 
                                        value={importInputValue}
                                        onChange={(e) => setImportInputValue(e.target.value)}
                                        placeholder="Paste link here..."
                                        className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary focus:outline-none font-mono text-sm w-full"
                                        onKeyDown={(e) => e.key === 'Enter' && handlePreviewLink()}
                                    />
                                    <button 
                                        onClick={handlePreviewLink}
                                        disabled={!importInputValue.trim()}
                                        className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium whitespace-nowrap"
                                    >
                                        Preview
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Tab Content: Friend Inbox */}
                        {importTab === 'FRIEND' && !importPreview && (
                            <div className="animate-fade-in text-center py-6 border-2 border-dashed border-slate-800 rounded-lg">
                                <div className="bg-slate-800 p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3 text-slate-400">
                                    <Mail className="w-6 h-6" />
                                </div>
                                <h4 className="text-slate-300 font-medium mb-1">Check for new shares</h4>
                                <p className="text-xs text-slate-500 mb-4">Simulate checking your inbox for collections shared by friends.</p>
                                <button 
                                    onClick={handleCheckInbox}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-primary rounded-lg text-sm font-medium transition"
                                >
                                    Simulate Incoming Message
                                </button>
                            </div>
                        )}

                        {/* Preview Card (Shared between tabs) */}
                        {importPreview && (
                            <div className="animate-fade-in bg-slate-900/40 border border-primary/30 rounded-lg overflow-hidden">
                                <div className="p-4 border-b border-slate-700/50 flex items-start justify-between bg-primary/5">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${importPreview.sharer ? 'text-primary bg-primary/10' : 'text-slate-400 bg-slate-800'}`}>
                                                {importPreview.sharer ? 'Friend Share' : 'Public Link'}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold text-white">{importPreview.title}</h3>
                                        {importPreview.sharer && <p className="text-xs text-slate-400">Shared by <span className="text-slate-200">{importPreview.sharer}</span></p>}
                                    </div>
                                    <button onClick={() => setImportPreview(null)} className="text-slate-400 hover:text-white p-1">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                
                                <div className="p-4 bg-slate-900/20">
                                    <div 
                                        onClick={() => setIsImportPreviewExpanded(!isImportPreviewExpanded)}
                                        className="flex items-center gap-2 text-xs text-slate-400 hover:text-white cursor-pointer select-none mb-3"
                                    >
                                        <Layers className="w-3 h-3" />
                                        <span>{importPreview.items.length} items included</span>
                                        {isImportPreviewExpanded ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
                                    </div>
                                    
                                    {isImportPreviewExpanded && (
                                        <ul className="text-xs text-slate-400 space-y-1.5 mb-4 pl-2 border-l-2 border-slate-700">
                                            {importPreview.items.map((i, idx) => (
                                                <li key={idx} className="flex justify-between">
                                                    <span>{i.title}</span>
                                                    <span className="text-slate-600">{i.creator}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    <div className="flex gap-3 mt-2">
                                        <button 
                                            onClick={() => handleImportCollection(importPreview)}
                                            className="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition"
                                        >
                                            Save to Library
                                        </button>
                                        <button 
                                            onClick={() => setImportPreview(null)}
                                            className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-700 transition"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isCreatingCollection && (
                <div ref={newCollectionSectionRef} className="absolute top-0 left-0 right-0 bg-slate-900 border border-slate-700 p-6 rounded-xl animate-fade-in shadow-2xl">
                    <h3 className="text-lg font-medium mb-1">Create New Collection</h3>
                    <p className="text-xs text-slate-400 mb-4">Enter details for your new list:</p>
                    <div className="flex flex-col gap-3">
                        <input 
                            autoFocus
                            type="text" 
                            value={newCollectionTitle}
                            onChange={(e) => setNewCollectionTitle(e.target.value)}
                            placeholder="Collection Name (e.g. Summer Favorites)"
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary focus:outline-none text-sm"
                            onKeyDown={(e) => {
                                if(e.key === 'Enter') {
                                    const id = handleCreateCollection(newCollectionTitle, newCollectionDesc);
                                    if(id) {
                                        setNewCollectionTitle('');
                                        setNewCollectionDesc('');
                                        setIsCreatingCollection(false);
                                    }
                                }
                            }}
                        />
                         <input 
                            type="text" 
                            value={newCollectionDesc}
                            onChange={(e) => setNewCollectionDesc(e.target.value)}
                            placeholder="Description (Optional)"
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary focus:outline-none text-sm"
                            onKeyDown={(e) => {
                                if(e.key === 'Enter') {
                                    const id = handleCreateCollection(newCollectionTitle, newCollectionDesc);
                                    if(id) {
                                        setNewCollectionTitle('');
                                        setNewCollectionDesc('');
                                        setIsCreatingCollection(false);
                                    }
                                }
                            }}
                        />
                        <div className="flex flex-col sm:flex-row gap-3 mt-1">
                            <button 
                                onClick={() => {
                                    const id = handleCreateCollection(newCollectionTitle, newCollectionDesc);
                                    if(id) {
                                        setNewCollectionTitle('');
                                        setNewCollectionDesc('');
                                        setIsCreatingCollection(false);
                                    }
                                }}
                                disabled={!newCollectionTitle.trim()}
                                className="flex-1 sm:flex-none px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium whitespace-nowrap"
                            >
                                Create
                            </button>
                            <button 
                                onClick={() => {
                                    setIsCreatingCollection(false);
                                    setNewCollectionTitle('');
                                    setNewCollectionDesc('');
                                }}
                                className="flex-1 sm:flex-none px-6 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-medium whitespace-nowrap"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Pending Edit Card */}
        {pendingEdit && (
            <div className="mb-8 group relative bg-slate-900/40 border border-accent/50 hover:border-accent rounded-xl p-6 shadow-sm flex flex-col animate-fade-in">
                 <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-accent/20 rounded-lg text-accent">
                        <UserPlus className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded text-accent bg-accent/10">
                        Edit Request
                    </span>
                </div>
                
                <h3 className="text-xl font-serif font-bold text-white mb-1">Update: {pendingEdit.item.title}</h3>
                <p className="text-sm text-slate-400 mb-4">
                    <span className="text-slate-200 font-medium">{pendingEdit.sharer}</span> has sent you an updated version of this card.
                </p>

                <div className="bg-black/30 p-3 rounded mb-4 text-xs text-slate-400 font-mono">
                     <p>Status: {pendingEdit.item.status}</p>
                     <p>Rating: {pendingEdit.item.rating || '-'}/5</p>
                     <p>Review: {pendingEdit.item.review ? 'Has review' : 'No review'}</p>
                     <p>Memories: {pendingEdit.item.memories?.length || 0}</p>
                </div>
                
                <div className="flex gap-2 mt-auto">
                    <button 
                        onClick={handleAcceptEdit}
                        className="flex-1 bg-accent text-white text-sm font-medium py-2 rounded-lg hover:bg-accent/90 transition"
                    >
                        Accept Update
                    </button>
                    <button 
                        onClick={() => {
                            setPendingEdit(null);
                            window.history.replaceState({}, '', window.location.pathname);
                        }}
                        className="px-3 py-2 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
                        title="Dismiss"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>
        )}

        {/* Incoming/Pending Share Card (Fallback for URL params) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingShare && (
                <div className={`group relative border-2 border-dashed rounded-xl p-6 shadow-sm flex flex-col h-full animate-fade-in ${pendingShare.sharer ? 'bg-slate-900/40 border-primary/50 hover:border-primary shadow-primary/5' : 'bg-slate-900/20 border-slate-600 hover:border-slate-400'}`}>
                     <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-lg ${pendingShare.sharer ? 'bg-primary/20 text-primary' : 'bg-slate-700 text-slate-300'}`}>
                            {pendingShare.sharer ? <Users className="w-6 h-6" /> : <Globe className="w-6 h-6" />}
                        </div>
                        <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${pendingShare.sharer ? 'text-primary bg-primary/10' : 'text-slate-400 bg-slate-800'}`}>
                            {pendingShare.sharer ? 'Friend Share' : 'Public Import'}
                        </span>
                    </div>
                    
                    <h3 className="text-xl font-serif font-bold text-white mb-1">{pendingShare.title}</h3>
                    
                    {pendingShare.sharer ? (
                        <p className="text-sm text-slate-400 mb-4">
                            Shared by <span className="text-slate-200 font-medium">{pendingShare.sharer}</span>
                        </p>
                    ) : (
                         <p className="text-sm text-slate-500 mb-4 italic">Public Collection</p>
                    )}

                    <div className="flex-1">
                        <div 
                             onClick={() => setIsImportPreviewExpanded(!isImportPreviewExpanded)}
                             className="flex items-center gap-2 text-xs text-slate-400 hover:text-white cursor-pointer mb-2 select-none"
                        >
                            <Layers className="w-3 h-3" />
                            <span>{pendingShare.items.length} items</span>
                            {isImportPreviewExpanded ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
                        </div>
                        
                        {isImportPreviewExpanded && (
                            <ul className="text-xs text-slate-500 space-y-1 mb-4 max-h-32 overflow-y-auto custom-scrollbar border-l-2 border-slate-700 pl-2">
                                {pendingShare.items.map((i, idx) => (
                                    <li key={idx} className="line-clamp-1">{i.title}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                    
                    <div className="flex gap-2 mt-4 pt-4 border-t border-slate-700/50">
                        <button 
                            onClick={() => handleImportCollection(pendingShare)}
                            className={`flex-1 text-white text-sm font-medium py-2 rounded-lg transition ${pendingShare.sharer ? 'bg-primary hover:bg-primary/90' : 'bg-slate-700 hover:bg-slate-600'}`}
                        >
                            Import
                        </button>
                        <button 
                            onClick={() => {
                                setPendingShare(null);
                                window.history.replaceState({}, '', window.location.pathname);
                            }}
                            className="px-3 py-2 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
                            title="Dismiss"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}
        
            {filteredCollections.length === 0 && !pendingShare && !pendingEdit && (
                <div className="col-span-full text-center py-20 border-2 border-dashed border-slate-800 rounded-xl">
                    <Layers className="w-12 h-12 mx-auto mb-4 text-slate-600" />
                    <h3 className="text-xl font-medium text-slate-300 mb-2">No collections yet</h3>
                    <p className="text-slate-500 mb-6">Create a collection to organize your favorite {getTypeName()}.</p>
                    <button
                        onClick={() => setIsCreatingCollection(true)}
                        className="text-primary hover:underline font-medium"
                        >
                            Create your first collection
                    </button>
                </div>
            )}
            
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
                        {col.description && <p className="text-xs text-slate-400 mb-2 line-clamp-1">{col.description}</p>}
                        <p className="text-xs text-slate-500">Created {new Date(col.createdAt).toLocaleDateString()}</p>
                        
                        <div className="absolute bottom-4 right-4 flex gap-2 z-10">
                            <button 
                                onClick={(e) => handleInitiateShare(col, e)}
                                className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-full transition"
                                title="Share Collection"
                            >
                                <Share className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={(e) => handleDeleteCollection(col.id, e)}
                                className="p-2 text-slate-500 hover:text-red-500 hover:bg-slate-800 rounded-full transition"
                                title="Delete Collection"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
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
    <div className="h-screen bg-background text-slate-100 font-sans selection:bg-primary/30 flex flex-col overflow-hidden">
      
      {/* Toast Container */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Top Navigation - Fixed at top */}
      <nav className="shrink-0 bg-background/80 backdrop-blur border-b border-slate-800 px-6 py-4 z-40">
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

      {/* Main Content Area - Scrollable with stable gutter */}
      <main className="flex-1 overflow-y-auto w-full [scrollbar-gutter:stable] custom-scrollbar">
          <div className="max-w-7xl mx-auto px-6 py-8 min-h-full">
            {view === 'LIBRARY' && renderLibrary()}
            {view === 'SEARCH' && renderSearch()}
            {view === 'COLLECTIONS' && renderCollections()}
          </div>
      </main>

      {/* Detail Modal */}
      {selectedItem && (
        <DetailModal 
            item={selectedItem} 
            isOpen={!!selectedItem} 
            onClose={() => setSelectedItem(null)}
            onUpdate={handleUpdateItem}
            onDelete={(id) => handleDeleteItem(id)}
            onShowToast={showToast}
        />
      )}

      {/* Add from Library Modal */}
      {renderLibraryPicker()}

      {/* Share Options Modal */}
      {sharingCollection && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-surface w-full max-w-lg rounded-xl shadow-2xl border border-slate-700 overflow-hidden animate-fade-in-up">
                <div className="p-6 border-b border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xl font-serif font-bold text-white">Share Collection</h2>
                        <button onClick={() => setSharingCollection(null)} className="text-slate-400 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-slate-400 text-sm">Choose how you want to share <span className="text-white font-medium">{sharingCollection.title}</span>.</p>
                </div>
                
                <div className="p-6 grid gap-4">
                    {/* Option 1: Public */}
                    <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 hover:border-slate-500 transition">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-slate-800 rounded-lg text-slate-300">
                                <Globe className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-white font-medium">Public Share</h3>
                                <p className="text-xs text-slate-500">Anonymous link. No personal info attached.</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => generateShareLink(true)}
                            className="w-full mt-2 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 py-2 rounded-lg text-sm font-medium transition"
                        >
                            Copy Public Link
                        </button>
                    </div>

                    {/* Option 2: Friend */}
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 hover:border-primary/40 transition">
                         <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-primary/20 rounded-lg text-primary">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-white font-medium">Friend Share</h3>
                                <p className="text-xs text-slate-400">Personalized link showing your name.</p>
                            </div>
                        </div>
                        <div className="mt-3">
                            <input 
                                type="text"
                                value={sharerNameInput}
                                onChange={(e) => setSharerNameInput(e.target.value)}
                                placeholder="Enter your name (e.g. Alex)"
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary mb-2"
                            />
                            <button 
                                onClick={() => generateShareLink(false)}
                                disabled={!sharerNameInput.trim()}
                                className="w-full bg-primary text-white hover:bg-primary/90 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Copy Friend Link
                            </button>
                        </div>
                    </div>
                </div>
            </div>
          </div>
      )}
    </div>
  );
}
