import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Plus, Image, Check, Loader2 } from 'lucide-react';

interface PhotoUploadProps {
  gameId: string;
  onUpload: (gameId: string, file: File, title: string, hints: string[], category: string) => Promise<void>;
}

interface FileEntry {
  id: string;
  file: File;
  preview: string;
  title: string;
  hints: string[];
  category: string;
  uploading: boolean;
  uploaded: boolean;
  error: string | null;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif', 'image/avif'];

export default function PhotoUpload({ gameId, onUpload }: PhotoUploadProps) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => ACCEPTED_TYPES.includes(f.type));
    const newEntries: FileEntry[] = fileArray.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      file,
      preview: URL.createObjectURL(file),
      title: '',
      hints: ['', '', ''],
      category: '',
      uploading: false,
      uploaded: false,
      error: null,
    }));
    setEntries((prev) => [...prev, ...newEntries]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = '';
    }
  };

  const updateEntry = (id: string, updates: Partial<FileEntry>) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  };

  const updateHint = (id: string, index: number, value: string) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const hints = [...e.hints];
        hints[index] = value;
        return { ...e, hints };
      })
    );
  };

  const removeEntry = (id: string) => {
    setEntries((prev) => {
      const entry = prev.find((e) => e.id === id);
      if (entry) URL.revokeObjectURL(entry.preview);
      return prev.filter((e) => e.id !== id);
    });
  };

  const handleUpload = async (entry: FileEntry) => {
    if (!entry.title.trim()) {
      updateEntry(entry.id, { error: 'Title/answer is required' });
      return;
    }
    updateEntry(entry.id, { uploading: true, error: null });
    try {
      const filteredHints = entry.hints.filter((h) => h.trim() !== '');
      await onUpload(gameId, entry.file, entry.title.trim(), filteredHints, entry.category.trim());
      updateEntry(entry.id, { uploading: false, uploaded: true });
    } catch {
      updateEntry(entry.id, { uploading: false, error: 'Upload failed. Please try again.' });
    }
  };

  const handleUploadAll = async () => {
    const pendingEntries = entries.filter((e) => !e.uploaded && !e.uploading);
    for (const entry of pendingEntries) {
      await handleUpload(entry);
    }
  };

  const pendingCount = entries.filter((e) => !e.uploaded).length;

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
          isDragOver
            ? 'border-gaming-purple bg-gaming-purple/10 scale-[1.02]'
            : 'border-white/20 hover:border-gaming-purple/50 hover:bg-white/5'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.svg,.gif,.avif"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        <motion.div
          animate={isDragOver ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <Upload className="w-16 h-16 mx-auto mb-4 text-gaming-purple/70" />
          <p className="text-lg font-semibold text-white/80">
            Drag & drop photos here or click to browse
          </p>
          <p className="text-sm text-white/40 mt-2">Accepts JPG, PNG, WEBP, SVG • Multiple files supported</p>
        </motion.div>
      </motion.div>

      {/* Upload All Button */}
      {pendingCount > 1 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex justify-end"
        >
          <button onClick={handleUploadAll} className="btn-primary flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Upload All ({pendingCount})
          </button>
        </motion.div>
      )}

      {/* File Entries */}
      <AnimatePresence mode="popLayout">
        {entries.map((entry) => (
          <motion.div
            key={entry.id}
            layout
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`card relative overflow-hidden ${
              entry.uploaded ? 'border-gaming-green/30 bg-gaming-green/5' : ''
            }`}
          >
            {/* Uploaded overlay */}
            {entry.uploaded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-gaming-green/5 flex items-center justify-center z-10"
              >
                <div className="flex items-center gap-2 text-gaming-green font-semibold text-lg">
                  <Check className="w-6 h-6" />
                  Uploaded Successfully
                </div>
              </motion.div>
            )}

            <div className={`flex gap-6 ${entry.uploaded ? 'opacity-30' : ''}`}>
              {/* Preview */}
              <div className="flex-shrink-0 w-40 h-40 rounded-xl overflow-hidden bg-navy-900 border border-white/5">
                <img
                  src={entry.preview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Form */}
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-white/50">
                    <Image className="w-4 h-4" />
                    {entry.file.name}
                  </div>
                  <button
                    onClick={() => removeEntry(entry.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Title */}
                <input
                  type="text"
                  placeholder="Title / Correct Answer *"
                  value={entry.title}
                  onChange={(e) => updateEntry(entry.id, { title: e.target.value })}
                  className="input-field text-sm"
                  disabled={entry.uploading || entry.uploaded}
                />

                {/* Category */}
                <input
                  type="text"
                  placeholder="Category (e.g., Movies, Animals)"
                  value={entry.category}
                  onChange={(e) => updateEntry(entry.id, { category: e.target.value })}
                  className="input-field text-sm"
                  disabled={entry.uploading || entry.uploaded}
                />

                {/* Hints */}
                <div className="grid grid-cols-3 gap-2">
                  {entry.hints.map((hint, i) => (
                    <input
                      key={i}
                      type="text"
                      placeholder={`Hint ${i + 1}`}
                      value={hint}
                      onChange={(e) => updateHint(entry.id, i, e.target.value)}
                      className="input-field text-sm"
                      disabled={entry.uploading || entry.uploaded}
                    />
                  ))}
                </div>

                {/* Error */}
                {entry.error && (
                  <p className="text-sm text-red-400">{entry.error}</p>
                )}

                {/* Upload Button */}
                {!entry.uploaded && (
                  <button
                    onClick={() => handleUpload(entry)}
                    disabled={entry.uploading}
                    className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
                  >
                    {entry.uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Upload Photo
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
