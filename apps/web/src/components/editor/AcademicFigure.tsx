"use client";

import React, { useState } from "react";
import {
  Crop,
  ArrowUp,
  ArrowDown,
  Trash2,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Maximize2,
  Move
} from "lucide-react";
import { ImageCropModal } from "./ImageCropModal";

interface AcademicFigureProps {
  id: string;
  url: string;
  caption?: string;
  align?: "left" | "center" | "right" | "full";
  widthPercent?: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onUpdateImage: (newUrl: string) => void;
  onUpdateCaption: (newCaption: string) => void;
  onUpdateAlign: (align: "left" | "center" | "right" | "full") => void;
  onUpdateWidth: (width: number) => void;
  onDelete: () => void;
}

export const AcademicFigure: React.FC<AcademicFigureProps> = ({
  id,
  url,
  caption,
  align = "center",
  widthPercent = 75,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  onUpdateImage,
  onUpdateCaption,
  onUpdateAlign,
  onUpdateWidth,
  onDelete,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [captionText, setCaptionText] = useState(caption || "Figure 1: Document image illustration.");

  // Alignment container classes
  let containerClasses = "relative group select-none transition-all duration-200 my-4 ";
  if (align === "left") {
    containerClasses += "float-left mr-6 mb-4 max-w-[50%]";
  } else if (align === "right") {
    containerClasses += "float-right ml-6 mb-4 max-w-[50%]";
  } else if (align === "center") {
    containerClasses += "mx-auto block text-center clear-both";
  } else {
    containerClasses += "w-full block clear-both";
  }

  return (
    <>
      <figure
        contentEditable={false}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={containerClasses}
        style={{
          width: align === "full" ? "100%" : `${widthPercent}%`,
        }}
      >
        {/* Floating Action Toolbar */}
        <div
          className={`absolute -top-3.5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-slate-900/90 text-white backdrop-blur-md px-2 py-1 rounded-xl shadow-xl border border-slate-700/60 transition-all duration-150 ${
            isHovered ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
          }`}
        >
          {/* Move Up */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            disabled={!canMoveUp}
            className="p-1 rounded-md hover:bg-white/20 disabled:opacity-30 transition-colors"
            title="Move Figure Up in Document"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>

          {/* Move Down */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            disabled={!canMoveDown}
            className="p-1 rounded-md hover:bg-white/20 disabled:opacity-30 transition-colors"
            title="Move Figure Down in Document"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-3.5 bg-slate-700 mx-0.5" />

          {/* Alignment */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdateAlign("left");
            }}
            className={`p-1 rounded-md hover:bg-white/20 transition-colors ${
              align === "left" ? "bg-elite-600 text-white" : "text-slate-300"
            }`}
            title="Align Left (Wrap Text)"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdateAlign("center");
            }}
            className={`p-1 rounded-md hover:bg-white/20 transition-colors ${
              align === "center" ? "bg-elite-600 text-white" : "text-slate-300"
            }`}
            title="Align Center"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdateAlign("right");
            }}
            className={`p-1 rounded-md hover:bg-white/20 transition-colors ${
              align === "right" ? "bg-elite-600 text-white" : "text-slate-300"
            }`}
            title="Align Right (Wrap Text)"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdateAlign("full");
            }}
            className={`p-1 rounded-md hover:bg-white/20 transition-colors ${
              align === "full" ? "bg-elite-600 text-white" : "text-slate-300"
            }`}
            title="Full Width Figure"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-3.5 bg-slate-700 mx-0.5" />

          {/* Crop Tool Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsCropOpen(true);
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-elite-600 hover:bg-elite-500 text-white text-[11px] font-bold shadow-xs transition-all active:scale-95"
            title="Crop & Reframe Image"
          >
            <Crop className="w-3 h-3" />
            <span>Crop</span>
          </button>

          <div className="w-px h-3.5 bg-slate-700 mx-0.5" />

          {/* Width Pills */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdateWidth(50);
            }}
            className={`text-[10px] px-1 py-0.5 rounded ${widthPercent === 50 ? "bg-white/30 font-bold" : "text-slate-400"}`}
          >
            50%
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdateWidth(75);
            }}
            className={`text-[10px] px-1 py-0.5 rounded ${widthPercent === 75 ? "bg-white/30 font-bold" : "text-slate-400"}`}
          >
            75%
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdateWidth(100);
            }}
            className={`text-[10px] px-1 py-0.5 rounded ${widthPercent === 100 ? "bg-white/30 font-bold" : "text-slate-400"}`}
          >
            100%
          </button>

          <div className="w-px h-3.5 bg-slate-700 mx-0.5" />

          {/* Delete Figure */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 rounded-md text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors"
            title="Delete Figure"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Image Container with Border & Handles */}
        <div className="relative rounded border border-slate-200 dark:border-slate-700/80 p-1 bg-white dark:bg-slate-900 group-hover:border-elite-400 group-hover:shadow-md transition-all">
          <img
            src={url}
            alt={captionText}
            className="w-full h-auto object-contain rounded-xs max-h-[380px] mx-auto"
          />
        </div>

        {/* Caption */}
        <figcaption className="mt-2 text-center">
          {isEditingCaption ? (
            <input
              type="text"
              value={captionText}
              autoFocus
              onBlur={() => {
                setIsEditingCaption(false);
                onUpdateCaption(captionText);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setIsEditingCaption(false);
                  onUpdateCaption(captionText);
                }
              }}
              onChange={(e) => setCaptionText(e.target.value)}
              className="text-xs font-serif italic text-slate-600 dark:text-slate-300 bg-transparent border-b border-elite-500 text-center w-full outline-none py-0.5"
            />
          ) : (
            <span
              onClick={() => setIsEditingCaption(true)}
              className="text-xs font-serif italic text-slate-500 dark:text-slate-400 hover:text-elite-600 cursor-pointer inline-block"
              title="Click to edit caption"
            >
              {captionText}
            </span>
          )}
        </figcaption>
      </figure>

      {/* Re-Crop Modal */}
      {isCropOpen && (
        <ImageCropModal
          isOpen={isCropOpen}
          imageUrl={url}
          onClose={() => setIsCropOpen(false)}
          onSaveCrop={(croppedUrl) => {
            onUpdateImage(croppedUrl);
            setIsCropOpen(false);
          }}
        />
      )}
    </>
  );
};