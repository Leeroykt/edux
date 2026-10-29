"use client";

import React, { useState, useRef } from "react";
import {
  X,
  Image as ImageIcon,
  Upload,
  Check,
  Link as LinkIcon,
  Crop,
  FolderOpen,
  Sparkles
} from "lucide-react";
import { ImageCropModal } from "./ImageCropModal";

interface InsertImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (imageUrl: string, caption?: string) => void;
}

export const InsertImageModal: React.FC<InsertImageModalProps> = ({
  isOpen,
  onClose,
  onInsert,
}) => {
  const [tab, setTab] = useState<"local" | "preset" | "url">("local");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [caption, setCaption] = useState<string>("Figure 1: Comparative architecture diagram.");
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const sampleImages = [
    {
      title: "Model Architecture Diagram",
      url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
      caption: "Figure 1: Benchmark comparative performance across sequence lengths.",
    },
    {
      title: "Stylometric Confusion Matrix",
      url: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=800&q=80",
      caption: "Figure 2: Stylometric classification distribution across academic genres.",
    },
    {
      title: "Perplexity Loss Curve",
      url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80",
      caption: "Figure 3: Training perplexity vs validation cross-entropy over 100 epochs.",
    },
  ];

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loadLocalFile(file);
  };

  const loadLocalFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        setImageUrl(event.target.result);
        setCaption(`Figure: ${file.name.replace(/\.[^/.]+$/, "")}`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      loadLocalFile(file);
    }
  };

  const handleInsert = () => {
    if (!imageUrl) return;
    onInsert(imageUrl, caption);
    handleCloseModal();
  };

  const handleCloseModal = () => {
    setImageUrl("");
    setFileName("");
    setCaption("Figure 1: Comparative architecture diagram.");
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
        <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-elite-50 dark:bg-elite-950 text-elite-600 dark:text-elite-400">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Insert Academic Figure / Image
                </h3>
                <p className="text-xs text-slate-500">
                  Choose local device files, crop, and place into Word canvas
                </p>
              </div>
            </div>
            <button
              onClick={handleCloseModal}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-bold px-6 pt-3 gap-6 bg-slate-50/50 dark:bg-slate-950/40">
            <button
              onClick={() => setTab("local")}
              className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-all ${
                tab === "local"
                  ? "border-elite-600 text-elite-600 dark:text-elite-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              <FolderOpen className="w-4 h-4" /> From This Computer
            </button>
            <button
              onClick={() => setTab("preset")}
              className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-all ${
                tab === "preset"
                  ? "border-elite-600 text-elite-600 dark:text-elite-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              <Sparkles className="w-4 h-4" /> Academic Samples
            </button>
            <button
              onClick={() => setTab("url")}
              className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-all ${
                tab === "url"
                  ? "border-elite-600 text-elite-600 dark:text-elite-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              <LinkIcon className="w-4 h-4" /> Web URL
            </button>
          </div>

          {/* Tab Contents */}
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* TAB 1: FROM LOCAL COMPUTER */}
            {tab === "local" && (
              <div className="space-y-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
                  className="hidden"
                />

                {!imageUrl ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingFile(true);
                    }}
                    onDragLeave={() => setIsDraggingFile(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      isDraggingFile
                        ? "border-elite-500 bg-elite-50/50 dark:bg-elite-950/50"
                        : "border-slate-300 dark:border-slate-700 hover:border-elite-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-elite-100 dark:bg-elite-950 text-elite-600 dark:text-elite-400 flex items-center justify-center mb-3 shadow-inner">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">
                      Click to choose image or drag & drop here
                    </div>
                    <div className="text-xs text-slate-500">
                      PNG, JPG, SVG, WebP, GIF up to 25 MB
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 p-2 bg-slate-50 dark:bg-slate-950/60 flex flex-col items-center group">
                      <img
                        src={imageUrl}
                        alt="Local upload preview"
                        className="max-h-48 object-contain rounded-lg"
                      />
                      <div className="mt-2.5 flex items-center gap-2">
                        <button
                          onClick={() => setIsCropOpen(true)}
                          className="px-3 py-1.5 rounded-lg bg-elite-600 hover:bg-elite-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                        >
                          <Crop className="w-3.5 h-3.5" /> Crop / Frame Image
                        </button>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all"
                        >
                          Change File
                        </button>
                      </div>
                      {fileName && (
                        <div className="text-[11px] text-slate-400 font-mono mt-1">
                          {fileName}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: ACADEMIC SAMPLES */}
            {tab === "preset" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {sampleImages.map((img, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setImageUrl(img.url);
                      setCaption(img.caption);
                      setTab("local"); // switch to preview view with crop
                    }}
                    className={`group cursor-pointer rounded-xl border p-2 transition-all text-left ${
                      imageUrl === img.url
                        ? "border-elite-500 ring-2 ring-elite-400 bg-elite-50/30"
                        : "border-slate-200 dark:border-slate-800 hover:border-elite-400 hover:shadow-md"
                    }`}
                  >
                    <img
                      src={img.url}
                      alt={img.title}
                      className="w-full h-20 object-cover rounded-lg mb-2"
                    />
                    <div className="font-bold text-xs text-slate-800 dark:text-slate-200 group-hover:text-elite-600 line-clamp-1">
                      {img.title}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 3: WEB URL */}
            {tab === "url" && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Image Direct URL
                  </label>
                  <input
                    type="text"
                    placeholder="https://example.com/figure.png"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-elite-500 outline-none"
                  />
                </div>
                {imageUrl && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => setIsCropOpen(true)}
                      className="px-3 py-1.5 rounded-lg bg-elite-50 dark:bg-elite-950 text-elite-600 dark:text-elite-400 border border-elite-200 dark:border-elite-800 hover:bg-elite-100 text-xs font-bold flex items-center gap-1.5 transition-all"
                    >
                      <Crop className="w-3.5 h-3.5" /> Crop / Frame this Image
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Caption Input */}
            {imageUrl && (
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Figure Caption & Numbering
                </label>
                <input
                  type="text"
                  placeholder="Figure 1: Description of figure"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-elite-500 outline-none"
                />
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={handleCloseModal}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              onClick={handleInsert}
              disabled={!imageUrl}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-elite-600 hover:bg-elite-700 text-white text-xs font-bold shadow-md shadow-elite-600/20 active:scale-95 disabled:opacity-40 transition-all"
            >
              <Check className="w-4 h-4" /> Insert into Document
            </button>
          </div>
        </div>
      </div>

      {/* Standalone Crop Modal */}
      {isCropOpen && (
        <ImageCropModal
          isOpen={isCropOpen}
          imageUrl={imageUrl}
          onClose={() => setIsCropOpen(false)}
          onSaveCrop={(croppedUrl) => {
            setImageUrl(croppedUrl);
            setIsCropOpen(false);
          }}
        />
      )}
    </>
  );
};