
import React, { useState, useRef } from 'react';
import { MediaItem, ItemStatus, Memory, SharedItemPayload } from '../types';
import { X, Star, ImageIcon, Trash2, Plus, UserPlus, Clock, Hash, Send } from './Icons';

interface DetailModalProps {
  item: MediaItem;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedItem: MediaItem) => void;
  onDelete: (id: string) => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({ item, isOpen, onClose, onUpdate, onDelete, onShowToast }) => {
  const [captionText, setCaptionText] = useState('');
  const [locationText, setLocationText] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  if (!isOpen) return null;

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate({ ...item, status: e.target.value as ItemStatus });
  };

  const handleRating = (rating: number) => {
    onUpdate({ ...item, rating });
  };

  const handleReviewChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate({ ...item, review: e.target.value });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddMemory = () => {
    if (!previewImage) return;
    
    const newMemory: Memory = {
      id: crypto.randomUUID(),
      imageData: previewImage,
      caption: captionText,
      sourceLocation: locationText,
      addedAt: new Date().toISOString()
    };
    
    onUpdate({ ...item, memories: [newMemory, ...(item.memories || [])] });
    setCaptionText('');
    setLocationText('');
    setPreviewImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteMemory = (memoryId: string) => {
    onUpdate({ ...item, memories: item.memories.filter(m => m.id !== memoryId) });
  };

  const mockFriends = [
    { id: '1', name: 'Alice', color: 'bg-red-500' },
    { id: '2', name: 'Bob', color: 'bg-blue-500' },
    { id: '3', name: 'Charlie', color: 'bg-green-500' },
    { id: '4', name: 'David', color: 'bg-yellow-500' },
    { id: '5', name: 'Emma', color: 'bg-purple-500' },
  ];

  const handleInviteFriend = (friendName: string) => {
      onShowToast(`Invitation sent to ${friendName}!`, 'success');
      setShowInvite(false);
  };

  const getStatusText = (statusType: 'WANT' | 'PROGRESS') => {
      if (statusType === 'WANT') {
          if (item.type === 'BOOK') return 'Read';
          if (item.type === 'MOVIE') return 'Watch';
          return 'Play';
      } else {
          if (item.type === 'BOOK') return 'Reading';
          if (item.type === 'MOVIE') return 'Watching';
          return 'Playing';
      }
  };

  const getLocationPlaceholder = () => {
      if (item.type === 'BOOK') return 'Page No. (e.g. 42)';
      return 'Timestamp (e.g. 1:30:45)';
  };

  const memories = item.memories || [];
  const collaborators = item.collaborators || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-surface w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl border border-slate-700 relative">
        
        {/* Header Image & Close */}
        <div className="relative h-48 bg-gradient-to-r from-slate-800 to-slate-900 flex items-end p-6">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-30">
               {/* Generative placeholder */}
               <img src={`https://placehold.co/800x400/1e293b/FFF?text=${encodeURIComponent(item.title)}`} className="w-full h-full object-cover" alt="cover"/>
            </div>
            <div className="relative z-10 w-full pr-12">
                <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-3xl font-serif font-bold text-white">{item.title}</h2>
                </div>
                <p className="text-slate-300">{item.creator} • {item.year}</p>
                
                {collaborators.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-slate-400">Co-edited by:</span>
                        <div className="flex gap-1">
                            {collaborators.map((name, i) => (
                                <span key={i} className="px-1.5 py-0.5 bg-primary/20 text-primary text-xs rounded border border-primary/30">{name}</span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            
            <div className="absolute top-4 right-4 flex gap-2">
                <button 
                    onClick={() => setShowInvite(!showInvite)}
                    className="p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition"
                    title="Invite friend to co-edit"
                >
                    <UserPlus className="w-5 h-5" />
                </button>
                <button onClick={onClose} className="p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition">
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>

        {/* Invite Popup */}
        {showInvite && (
            <div className="bg-slate-800 border-b border-slate-700 p-4 animate-fade-in absolute z-20 w-full top-48 left-0 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-white">Select Friend to Invite</h3>
                    <button onClick={() => setShowInvite(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4"/></button>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                    Choose a friend to send a co-editing invitation for this card.
                </p>
                <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-2">
                    {mockFriends.map(friend => (
                        <div key={friend.id} className="flex items-center justify-between p-2 rounded hover:bg-slate-700 transition group">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full ${friend.color} flex items-center justify-center text-white text-xs font-bold`}>
                                    {friend.name.charAt(0)}
                                </div>
                                <span className="text-sm text-slate-200">{friend.name}</span>
                            </div>
                            <button 
                                onClick={() => handleInviteFriend(friend.name)}
                                className="p-1.5 bg-primary text-white rounded opacity-0 group-hover:opacity-100 transition hover:bg-primary/90"
                                title="Send Invite"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <div className="p-6 space-y-6">
            {/* Work Info Section */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                     <span className="text-sm font-bold text-slate-100 uppercase tracking-wide">About this {item.type.toLowerCase()}</span>
                </div>
                <div className="flex flex-col gap-3">
                    <p className="text-slate-300 leading-relaxed text-sm sm:text-base">
                        {item.description}
                    </p>
                    <div className="flex gap-2 mt-1">
                         <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-400 text-xs font-medium rounded">{item.type}</span>
                         <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-400 text-xs font-medium rounded">{item.year}</span>
                    </div>
                </div>
            </div>

            <div className="h-px bg-slate-700/50"></div>

            {/* Status & Rating */}
            <div className="flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center p-4 bg-slate-800/50 rounded-lg">
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-slate-400">Status</label>
                    <select 
                        value={item.status} 
                        onChange={handleStatusChange}
                        className="bg-slate-900 border border-slate-700 text-white text-sm rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
                    >
                        <option value="WANT_TO">Want to {getStatusText('WANT')}</option>
                        <option value="IN_PROGRESS">{getStatusText('PROGRESS')}</option>
                        <option value="COMPLETED">Done</option>
                    </select>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-slate-400">Rating</label>
                    <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button key={star} onClick={() => handleRating(star)} className="focus:outline-none transition-transform hover:scale-110">
                                <Star 
                                    className={`w-6 h-6 ${item.rating && item.rating >= star ? 'text-yellow-400' : 'text-slate-600'}`} 
                                    fill={item.rating && item.rating >= star ? true : false} 
                                />
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Review */}
            <div>
                <h3 className="text-lg font-medium text-white mb-2">Personal Review</h3>
                <textarea 
                    value={item.review || ''} 
                    onChange={handleReviewChange}
                    placeholder="Write your thoughts..."
                    className="w-full h-32 bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-primary focus:outline-none resize-none"
                />
            </div>

            {/* Memories & Snapshots */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <ImageIcon className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-medium text-white">Memories & Snapshots</h3>
                </div>
                
                {/* Upload Section */}
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 mb-6">
                    {!previewImage ? (
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-600 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800 hover:border-slate-500 transition"
                        >
                            <ImageIcon className="w-8 h-8 text-slate-400 mb-2" />
                            <p className="text-sm text-slate-300 font-medium">Click to upload an image</p>
                            <p className="text-xs text-slate-500">Supports JPG, PNG</p>
                        </div>
                    ) : (
                        <div className="relative rounded-lg overflow-hidden bg-black mb-4 group">
                             <img src={previewImage} alt="Preview" className="max-h-48 w-full object-contain mx-auto" />
                             <button 
                                onClick={() => setPreviewImage(null)}
                                className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-red-500/80 transition"
                             >
                                 <X className="w-4 h-4"/>
                             </button>
                        </div>
                    )}
                    
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden" 
                        accept="image/*"
                        onChange={handleFileSelect}
                    />

                    <div className="flex flex-col sm:flex-row gap-2 mt-4">
                        {/* Location Input */}
                        <div className="sm:w-1/3">
                            <input
                                type="text"
                                value={locationText}
                                onChange={(e) => setLocationText(e.target.value)}
                                placeholder={getLocationPlaceholder()}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary placeholder-slate-500"
                            />
                        </div>
                        
                        {/* Caption Input */}
                        <div className="flex-1">
                            <input 
                                type="text" 
                                value={captionText}
                                onChange={(e) => setCaptionText(e.target.value)}
                                placeholder="Add a caption..."
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary placeholder-slate-500"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddMemory()}
                            />
                        </div>
                        
                        <button 
                            onClick={handleAddMemory}
                            disabled={!previewImage}
                            className={`px-4 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 text-sm whitespace-nowrap ${previewImage ? 'bg-primary hover:bg-primary/90 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
                        >
                            <Plus className="w-4 h-4" /> Save
                        </button>
                    </div>
                </div>

                {/* Gallery Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {memories.length === 0 && (
                        <p className="text-slate-500 text-sm italic col-span-full text-center py-4">No memories added yet.</p>
                    )}
                    {memories.map((memory) => (
                        <div key={memory.id} className="group relative bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
                            {/* Location Badge */}
                            {memory.sourceLocation && (
                                <div className="absolute top-2 left-2 z-10 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-xs text-white flex items-center gap-1 border border-white/10 shadow-sm">
                                    {item.type === 'BOOK' ? <Hash className="w-3 h-3 text-slate-300"/> : <Clock className="w-3 h-3 text-slate-300"/>}
                                    <span className="font-mono">{memory.sourceLocation}</span>
                                </div>
                            )}

                            <div className="aspect-video bg-black flex items-center justify-center overflow-hidden">
                                <img src={memory.imageData} alt="Memory" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition" />
                            </div>
                            <div className="p-3">
                                <p className="text-slate-300 text-sm font-medium">{memory.caption || "No caption"}</p>
                                <p className="text-slate-500 text-xs mt-1">{new Date(memory.addedAt).toLocaleDateString()}</p>
                            </div>
                            <button 
                                onClick={() => handleDeleteMemory(memory.id)}
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 bg-black/60 text-white hover:bg-red-500 rounded-full transition backdrop-blur-sm z-10"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="border-t border-slate-700 pt-6 flex justify-end">
                <button 
                    onClick={() => {
                        onDelete(item.id);
                        onClose();
                    }}
                    className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1"
                >
                    <Trash2 className="w-4 h-4" /> Remove from Library
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
