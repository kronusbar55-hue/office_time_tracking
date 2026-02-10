"use client";

import { useState } from "react";
import { X } from "lucide-react";
import ImagePreviewModal from "./ImagePreviewModal";

interface Attachment {
  _id?: string;
  url: string;
  publicId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy?: any;
  uploadedAt?: Date;
}

interface ImageGalleryProps {
  attachments: Attachment[];
  onDelete?: (publicId: string) => Promise<void>;
  canDelete?: boolean;
  isLoading?: boolean;
}

export default function ImageGallery({
  attachments,
  onDelete,
  canDelete = false,
  isLoading = false
}: ImageGalleryProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (attachments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-slate-800/40 bg-slate-900/20 p-12">
        <div className="text-center">
          <div className="mb-2 text-3xl">🖼️</div>
          <p className="text-sm text-slate-400 font-medium">No attachments uploaded.</p>
          <p className="text-xs text-slate-500 mt-1">Add images to this task to view them here.</p>
        </div>
      </div>
    );
  }

  const handleDeleteClick = async (publicId: string) => {
    if (!onDelete) return;
    
    setDeletingId(publicId);
    try {
      await onDelete(publicId);
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Gallery Grid */}
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {attachments.map((attachment, index) => (
            <div
              key={attachment.publicId}
              className="group relative aspect-square overflow-hidden rounded-lg border border-slate-800/40 bg-slate-900/40 hover:border-slate-700 transition-all"
            >
              {/* Image Thumbnail */}
              <button
                onClick={() => {
                  setPreviewIndex(index);
                  setPreviewOpen(true);
                }}
                disabled={isLoading || deletingId === attachment.publicId}
                className="absolute inset-0 overflow-hidden rounded-lg cursor-pointer disabled:opacity-50 w-full h-full"
              >
                <img
                  src={attachment.url}
                  alt={attachment.fileName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="text-white text-sm font-medium">View</span>
                </div>
              </button>

              {/* Image Counter */}
              <div className="absolute top-2 left-2 bg-slate-900/80 rounded px-2 py-1 text-xs font-medium text-slate-300">
                {index + 1} / {attachments.length}
              </div>

              {/* Delete Button */}
              {canDelete && onDelete && (
                <button
                  onClick={() => handleDeleteClick(attachment.publicId)}
                  disabled={isLoading || deletingId === attachment.publicId}
                  className="absolute top-2 right-2 rounded-lg p-1.5 bg-red-600/80 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {deletingId === attachment.publicId ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </button>
              )}

              {/* Loading Overlay */}
              {deletingId === attachment.publicId && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              )}

              {/* Filename Tooltip */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-xs text-white truncate">{attachment.fileName}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Image Info & Stats */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="font-medium">
          {attachments.length} {attachments.length === 1 ? "attachment" : "attachments"}
        </span>
        {attachments.reduce((acc, a) => acc + (a.fileSize || 0), 0) > 0 && (
          <span>
            Total size: {(attachments.reduce((acc, a) => acc + (a.fileSize || 0), 0) / (1024 * 1024)).toFixed(2)} MB
          </span>
        )}
      </div>

      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={previewOpen}
        images={attachments}
        initialIndex={previewIndex}
        onClose={() => setPreviewOpen(false)}
        onDelete={canDelete ? handleDeleteClick : undefined}
        canDelete={canDelete}
      />
    </div>
  );
}
