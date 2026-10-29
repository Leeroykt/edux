"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Crop, ZoomIn, ZoomOut, RotateCcw, Check, Move } from "lucide-react";

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onSaveCrop: (croppedDataUrl: string) => void;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  onSaveCrop,
}) => {
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<"free" | "16:9" | "4:3" | "1:1" | "3:2">("3:2");
  const [cropBoxWidth, setCropBoxWidth] = useState(80); // percentage 20 - 100
  const [cropBoxHeight, setCropBoxHeight] = useState(70); // percentage 20 - 100
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (aspectRatio === "16:9") {
      setCropBoxWidth(85);
      setCropBoxHeight(48);
    } else if (aspectRatio === "4:3") {
      setCropBoxWidth(80);
      setCropBoxHeight(60);
    } else if (aspectRatio === "1:1") {
      setCropBoxWidth(70);
      setCropBoxHeight(70);
    } else if (aspectRatio === "3:2") {
      setCropBoxWidth(85);
      setCropBoxHeight(56);
    }
  }, [aspectRatio]);

  if (!isOpen || !imageUrl) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanX(e.clientX - dragStart.x);
    setPanY(e.clientY - dragStart.y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleApplyCrop = () => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Calculate crop dimensions relative to image natural size
      const targetW = (img.naturalWidth * cropBoxWidth) / 100 / zoom;
      const targetH = (img.naturalHeight * cropBoxHeight) / 100 / zoom;

      canvas.width = Math.max(100, Math.round(targetW));
      canvas.height = Math.max(100, Math.round(targetH));

      // Calculate source offsets
      const srcX = Math.max(0, (img.naturalWidth - targetW) / 2 - (panX * (img.naturalWidth / 400)));
      const srcY = Math.max(0, (img.naturalHeight - targetH) / 2 - (panY * (img.naturalHeight / 300)));

      ctx.drawImage(
        img,
        srcX,
        srcY,
        targetW,
        targetH,
        0,
        0,
        canvas.width,
        canvas.height
      );

      try {
        const croppedUrl = canvas.toDataURL("image/png", 0.95);
        onSaveCrop(croppedUrl);
        onClose();
      } catch (err) {
        console.error("Canvas export failed (likely CORS on remote image):", err);
        // Fallback: use current image URL if cross-origin canvas is tainted
        onSaveCrop(imageUrl);
        onClose();
      }
    };
    img.src = imageUrl;
  };

  const handleReset = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
    setAspectRatio("3:2");
    setCropBoxWidth(85);
    setCropBoxHeight(56);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-elite-50 dark:bg-elite-950 text-elite-600 dark:text-elite-400">
              <Crop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Crop & Frame Figure
              </h3>
              <p className="text-xs text-slate-500">
                Drag image to pan • Adjust zoom & aspect ratios for academic publication
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Interactive Viewport */}
        <div className="flex-1 bg-slate-950 p-6 flex items-center justify-center overflow-hidden relative">
          <div
            className="relative w-[380px] h-[260px] flex items-center justify-center overflow-hidden rounded-lg cursor-grab active:cursor-grabbing border-2 border-dashed border-elite-400/80 shadow-2xl bg-black"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Visual Crop Box Overlay */}
            <div
              className="absolute pointer-events-none border-2 border-white rounded shadow-sm z-20 transition-all duration-75"
              style={{
                width: `${cropBoxWidth}%`,
                height: `${cropBoxHeight}%`,
                boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.65)",
              }}
            >
              {/* Corner handles */}
              <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border border-elite-600 rounded-xs" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border border-elite-600 rounded-xs" />
              <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border border-elite-600 rounded-xs" />
              <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-elite-600 rounded-xs" />

              {/* Center crosshair */}
              <div className="absolute inset-0 flex items-center justify-center opacity-30">
                <Move className="w-5 h-5 text-white" />
              </div>
            </div>

            {/* Scaled & Panned Image */}
            <img
              src={imageUrl}
              alt="Crop target"
              draggable={false}
              className="max-w-none transition-transform duration-75 select-none"
              style={{
                transform: `scale(${zoom}) translate(${panX / zoom}px, ${panY / zoom}px)`,
                maxHeight: "240px",
              }}
            />
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 space-y-3.5">
          {/* Aspect Ratio Buttons */}
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">Aspect Ratio:</span>
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              {(
                [
                  { id: "3:2", label: "3:2 (Figure)" },
                  { id: "16:9", label: "16:9" },
                  { id: "4:3", label: "4:3" },
                  { id: "1:1", label: "1:1 (Square)" },
                  { id: "free", label: "Freeform" },
                ] as const
              ).map((ar) => (
                <button
                  key={ar.id}
                  onClick={() => setAspectRatio(ar.id)}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    aspectRatio === ar.id
                      ? "bg-elite-600 text-white font-bold shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {ar.label}
                </button>
              ))}
            </div>
          </div>

          {/* Zoom Slider */}
          <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
            <ZoomOut className="w-4 h-4 shrink-0" />
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-elite-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg"
            />
            <ZoomIn className="w-4 h-4 shrink-0" />
            <span className="w-12 font-mono text-[11px] text-right font-bold text-slate-700 dark:text-slate-300">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {aspectRatio === "free" && (
            <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-400 pt-1">
              <div className="flex items-center gap-2">
                <span>Width:</span>
                <input
                  type="range"
                  min="30"
                  max="100"
                  value={cropBoxWidth}
                  onChange={(e) => setCropBoxWidth(parseInt(e.target.value))}
                  className="flex-1 accent-elite-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg"
                />
                <span className="w-8 font-mono text-[11px]">{cropBoxWidth}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Height:</span>
                <input
                  type="range"
                  min="30"
                  max="100"
                  value={cropBoxHeight}
                  onChange={(e) => setCropBoxHeight(parseInt(e.target.value))}
                  className="flex-1 accent-elite-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg"
                />
                <span className="w-8 font-mono text-[11px]">{cropBoxHeight}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Crop
          </button>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyCrop}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-elite-600 hover:bg-elite-700 text-white text-xs font-bold shadow-md shadow-elite-600/20 active:scale-95 transition-all"
            >
              <Check className="w-4 h-4" /> Apply Crop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};