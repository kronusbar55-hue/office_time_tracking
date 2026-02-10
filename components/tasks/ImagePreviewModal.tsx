"use client";

import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from "lucide-react";

interface ImagePreviewModalProps {
  isOpen: boolean;
  images: any[];
  initialIndex: number;
  onClose: () => void;
  onDelete?: (publicId: string) => void;
  canDelete?: boolean;
}

export default function ImagePreviewModal({
  isOpen,
  images,
  initialIndex,
  onClose,
  onDelete,
  canDelete = false
}: ImagePreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrevious();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, images.length]);

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setZoom(1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setZoom(1);
    }
  };

  const currentImage = images[currentIndex];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95">
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-lg p-2 hover:bg-white/10 transition"
      >
        <X className="h-6 w-6 text-white" />
      </button>

      {/* Navigation */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="rounded-lg p-2 hover:bg-white/10 transition disabled:opacity-50"
        >
          <ChevronLeft className="h-6 w-6 text-white" />
        </button>
        <button
          onClick={handleNext}
          disabled={currentIndex === images.length - 1}
          className="rounded-lg p-2 hover:bg-white/10 transition disabled:opacity-50"
        >
          <ChevronRight className="h-6 w-6 text-white" />
        </button>
      </div>

      {/* Main Image */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-lg">
          <img
            src={currentImage.url}
            alt={currentImage.fileName}
            style={{
              transform: `scale(${zoom})`,
              transition: "transform 0.2s ease-out"
            }}
            className="max-w-full max-h-[90vh] object-contain"
          />
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6">
        {/* Zoom Controls */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            onClick={() => setZoom(Math.max(1, zoom - 0.2))}
            disabled={zoom <= 1}
            className="rounded-lg p-2 hover:bg-white/10 transition disabled:opacity-50"
          >
            <ZoomOut className="h-5 w-5 text-white" />
          </button>
          <span className="text-white text-sm w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(Math.min(3, zoom + 0.2))}
            disabled={zoom >= 3}
            className="rounded-lg p-2 hover:bg-white/10 transition disabled:opacity-50"
          >
            <ZoomIn className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Image Info and Actions */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-300">
            <p className="font-medium text-white mb-1">{currentImage.fileName}</p>
            <p>
              {currentIndex + 1} / {images.length}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={currentImage.url}
              download={currentImage.fileName}
              className="rounded-lg p-2 hover:bg-white/10 transition"
            >
              <Download className="h-5 w-5 text-white" />
            </a>
            {canDelete && onDelete && (
              <button
                onClick={() => {
                  onDelete(currentImage.publicId);
                  onClose();
                }}
                className="rounded-lg px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm transition"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
