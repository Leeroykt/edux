import React, { useState } from "react";
import { X, Image as ImageIcon, Upload, Check, Link as LinkIcon } from "lucide-react";

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
  const [tab, setTab] = useState<"preset" | "url">("preset");
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");

  const sampleImages = [
    {
      title: "Model Architecture Diagram",
      url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
      caption: "Figure 1: Benchmark comparative performance across sequence lengths.",
    },
    {
      title: "Evaluation Confusion Matrix",
      url: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=800&q=80",
      caption: "Figure 2: Stylometric classification distribution across genres.",
    },
    {
      title: "Loss Curves Graph",
      url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80",
      caption: "Figure 3: Training perplexity vs validation cross-entropy over epochs.",
    },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Insert Document Figure / Image
              </h3>
              <p className="text-xs text-slate-500">
                Word-compatible image element with protected captioning
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

        <div className="p-6 space-y-4">
          {/* Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-semibold gap-4 pb-2">
            <button
              onClick={() => setTab("preset")}
              className={`pb-1 border-b-2 transition-all ${
                tab === "preset"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Academic Diagrams
            </button>
            <button
              onClick={() => setTab("url")}
              className={`pb-1 border-b-2 transition-all ${
                tab === "url"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Image URL / Upload
            </button>
          </div>

          {tab === "preset" ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {sampleImages.map((img, i) => (
                <div
                  key={i}
                  onClick={() => {
                    onInsert(img.url, img.caption);
                    onClose();
                  }}
                  className="group cursor-pointer rounded-xl border border-slate-200 dark:border-slate-800 p-2 hover:border-indigo-500 hover:shadow-md transition-all text-left"
                >
                  <img
                    src={img.url}
                    alt={img.title}
                    className="w-full h-20 object-cover rounded-lg mb-2"
                  />
                  <div className="font-semibold text-xs text-slate-800 dark:text-slate-200 group-hover:text-indigo-600">
                    {img.title}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Image Web URL
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/figure.png"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Figure Caption
                </label>
                <input
                  type="text"
                  placeholder="Figure 1: Description of figure"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            Cancel
          </button>
          {tab === "url" && (
            <button
              onClick={() => {
                if (url) {
                  onInsert(url, caption);
                  onClose();
                }
              }}
              disabled={!url}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold disabled:opacity-50 transition-all"
            >
              Insert Image
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
