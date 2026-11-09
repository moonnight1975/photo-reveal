import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, ChevronUp, ChevronDown, Image, Lightbulb, Layers } from 'lucide-react';
import type { Photo } from '../../types';

interface PhotoListProps {
  photos: Photo[];
  gameId: string;
  onDelete: (gameId: string, photoId: string) => void;
  onReorder: (gameId: string, photoIds: string[]) => void;
  currentPhotoIndex: number;
}

export default function PhotoList({ photos = [], gameId, onDelete, onReorder, currentPhotoIndex = 0 }: PhotoListProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = (photoId: string) => {
    if (confirmDeleteId === photoId) {
      onDelete(gameId, photoId);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(photoId);
      // Auto-cancel confirmation after 3s
      setTimeout(() => setConfirmDeleteId((prev) => (prev === photoId ? null : prev)), 3000);
    }
  };

  const movePhoto = (index: number, direction: 'up' | 'down') => {
    const newPhotos = [...photos];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newPhotos.length) return;

    [newPhotos[index], newPhotos[targetIndex]] = [newPhotos[targetIndex], newPhotos[index]];
    const photoIds = newPhotos.map((p) => p.id);
    onReorder(gameId, photoIds);
  };

  if (photos.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="card text-center py-16"
      >
        <Image className="w-20 h-20 mx-auto mb-4 text-white/10" />
        <p className="text-xl font-semibold text-white/30">No photos yet</p>
        <p className="text-sm text-white/20 mt-2">Upload photos to get started with your game</p>
      </motion.div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white/80 flex items-center gap-2">
          <Layers className="w-5 h-5 text-gaming-purple" />
          Photos ({photos.length})
        </h3>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {photos.map((photo, index) => {
            const isActive = index === currentPhotoIndex;
            const isConfirming = confirmDeleteId === photo.id;

            return (
              <motion.div
                key={photo.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className={`card relative overflow-hidden group ${
                  isActive ? 'glow-border active-glow ring-2 ring-gaming-purple/50' : ''
                }`}
              >
                {/* Sort order badge */}
                <div className="absolute top-3 left-3 z-10 w-7 h-7 rounded-lg bg-navy-900/90 backdrop-blur flex items-center justify-center text-xs font-bold text-white/70 border border-white/10">
                  {index + 1}
                </div>

                {/* Active indicator */}
                {isActive && (
                  <div className="absolute top-3 right-3 z-10 px-2 py-0.5 rounded-full bg-gaming-purple text-[10px] font-bold uppercase tracking-wider">
                    Active
                  </div>
                )}

                {/* Thumbnail */}
                <div className="aspect-[4/3] rounded-xl overflow-hidden bg-navy-900 mb-3 border border-white/5">
                  <img
                    src={photo.filePath?.startsWith('/') ? photo.filePath : `/${photo.filePath}`}
                    alt={photo.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                {/* Info */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-white truncate" title={photo.title}>
                    {photo.title}
                  </h4>

                  <div className="flex items-center gap-2 flex-wrap">
                    {photo.category && (
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-electric-500/20 text-electric-400 font-medium">
                        {photo.category}
                      </span>
                    )}
                    {(photo.hints || []).length > 0 && (
                      <span className="text-[10px] flex items-center gap-1 text-white/40">
                        <Lightbulb className="w-3 h-3" />
                        {photo.hints.length} hint{photo.hints.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                  {/* Reorder */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => movePhoto(index, 'up')}
                      disabled={index === 0}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors disabled:opacity-20 disabled:hover:bg-transparent"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => movePhoto(index, 'down')}
                      disabled={index === photos.length - 1}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors disabled:opacity-20 disabled:hover:bg-transparent"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(photo.id)}
                    className={`p-1.5 rounded-lg transition-all text-sm flex items-center gap-1.5 ${
                      isConfirming
                        ? 'bg-red-500/20 text-red-400 px-3'
                        : 'hover:bg-red-500/10 text-white/30 hover:text-red-400'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                    {isConfirming && <span className="text-xs font-medium">Confirm?</span>}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
