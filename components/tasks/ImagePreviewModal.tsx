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
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [initialIndex, isOpen]);

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

  const resetPosition = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
      resetPosition();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      resetPosition();
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    setZoom(prev => Math.min(Math.max(1, prev + delta), 4));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const currentImage = images[currentIndex];

  if (!isOpen || !currentImage) return null;

  // Cloudinary download helper
  const getDownloadUrl = (url: string) => {
    if (url.includes("cloudinary.com")) {
      return url.replace("/upload/", "/upload/fl_attachment/");
    }
    return url;
  };

  return (
    <div 
        className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-sm animate-in fade-in duration-300"
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-[110] flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex flex-col">
            <h4 className="text-text-primary text-sm font-bold truncate max-w-[200px] md:max-w-md">{currentImage.fileName}</h4>
            <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">{currentIndex + 1} of {images.length}</span>
        </div>
        <div className="flex items-center gap-3">
             <a
              href={getDownloadUrl(currentImage.url)}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full bg-card-bg hover:bg-hover-bg text-text-primary transition-all hover:scale-110"
              title="Download Image"
            >
              <Download size={20} />
            </a>
            <button
                onClick={onClose}
                className="p-2 rounded-full bg-card-bg hover:bg-red-500 text-text-primary transition-all hover:rotate-90"
            >
                <X size={20} />
            </button>
        </div>
      </div>

      {/* Main Viewing Area */}
      <div 
        className="flex-1 relative flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
      >
        {/* Navigation - Left */}
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="absolute left-4 z-[120] p-4 rounded-full bg-black/20 hover:bg-black/40 text-text-primary/50 hover:text-text-primary transition-all disabled:opacity-0"
        >
          <ChevronLeft size={32} />
        </button>

        {/* Navigation - Right */}
        <button
          onClick={handleNext}
          disabled={currentIndex === images.length - 1}
          className="absolute right-4 z-[120] p-4 rounded-full bg-black/20 hover:bg-black/40 text-text-primary/50 hover:text-text-primary transition-all disabled:opacity-0"
        >
          <ChevronRight size={32} />
        </button>

        {/* Image Display */}
        <div 
            className="relative transition-transform duration-200 ease-out select-none pointer-events-none"
            style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            }}
        >
            <img
                src={currentImage.url}
                alt={currentImage.fileName}
                className="max-w-[95vw] max-h-[85vh] object-contain shadow-2xl rounded-sm"
                draggable={false}
            />
        </div>
      </div>

      {/* Footer Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-6 bg-bg-secondary/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-border-color shadow-2xl transition-all">
          <div className="flex items-center gap-4 border-r border-border-color pr-6 mr-0">
            <button
                onClick={() => {
                    setZoom(prev => Math.max(1, prev - 0.5));
                    if (zoom <= 1.5) setOffset({ x: 0, y: 0 });
                }}
                disabled={zoom <= 1}
                className="p-1.5 rounded-lg hover:bg-hover-bg text-text-primary disabled:opacity-30 transition-colors"
            >
                <ZoomOut size={20} />
            </button>
            <span className="text-text-primary text-[11px] font-black w-10 text-center tabular-nums">
                {Math.round(zoom * 100)}%
            </span>
            <button
                onClick={() => setZoom(prev => Math.min(4, prev + 0.5))}
                disabled={zoom >= 4}
                className="p-1.5 rounded-lg hover:bg-hover-bg text-text-primary disabled:opacity-30 transition-colors"
            >
                <ZoomIn size={20} />
            </button>
          </div>

          <button
              onClick={resetPosition}
              className="text-[10px] font-black text-text-secondary hover:text-text-primary uppercase tracking-widest transition-colors"
          >
              Reset
          </button>

          {canDelete && onDelete && (
                <button
                    onClick={() => {
                        onDelete(currentImage.publicId);
                        onClose();
                    }}
                    className="ml-2 px-4 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500 border border-red-500/50 text-red-500 hover:text-text-primary text-[10px] font-black uppercase tracking-widest transition-all"
                >
                    Delete
                </button>
            )}
      </div>
    </div>
  );
}
