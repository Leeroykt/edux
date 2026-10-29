import React, { useState } from "react";
import { X, UploadCloud, FileText, CheckCircle2, AlertCircle, Sparkles, ArrowRight } from "lucide-react";

interface UploadDocxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentLoaded: (docName: string, paragraphsCount: number) => void;
}

export const UploadDocxModal: React.FC<UploadDocxModalProps> = ({
  isOpen,
  onClose,
  onDocumentLoaded,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<number>(0);
  const [isOwnPaper, setIsOwnPaper] = useState(true);

  if (!isOpen) return null;

  const handleSimulatedUpload = (name: string) => {
    setFileName(name);
    setIsProcessing(true);
    setStep(1);

    setTimeout(() => {
      setStep(2);
      setTimeout(() => {
        setStep(3);
        setTimeout(() => {
          setIsProcessing(false);
          onDocumentLoaded(name, 14);
          onClose();
        }, 800);
      }, 700);
    }, 600);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSimulatedUpload(e.dataTransfer.files[0].name);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Upload Word Document (.docx)
              </h3>
              <p className="text-xs text-slate-500">
                Ready to detect machine phrasing and humanise line by line
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {!isProcessing ? (
            <>
              {/* Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                className={`p-8 rounded-2xl border-2 border-dashed transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
                  dragActive
                    ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30"
                    : "border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
                onClick={() => handleSimulatedUpload("My_Research_Paper_Draft.docx")}
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  Drop your .docx document here
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  or <span className="text-indigo-600 dark:text-indigo-400 font-semibold underline">click to browse</span> files on your computer
                </p>
                <span className="text-[11px] text-slate-400 mt-3 font-mono">
                  Supported formats: Microsoft Word (.docx, .dotx) up to 50 MB
                </span>
              </div>

              {/* Sample Files for Quick Demo */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Or load demo paper immediately:
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => handleSimulatedUpload("Transformer_Architectures_Paper.docx")}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 text-left transition-all group"
                  >
                    <div className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 flex items-center justify-between">
                      <span>Academic Thesis</span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      3,840 words • Has AI flags & citations
                    </span>
                  </button>

                  <button
                    onClick={() => handleSimulatedUpload("Economics_Essay_Undergrad.docx")}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 text-left transition-all group"
                  >
                    <div className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 flex items-center justify-between">
                      <span>Student Essay</span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      1,950 words • Turnitin match demo
                    </span>
                  </button>
                </div>
              </div>

              {/* License Declaration Checkbox */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-2.5 text-xs">
                <input
                  type="checkbox"
                  id="confirmOwn"
                  checked={isOwnPaper}
                  onChange={(e) => setIsOwnPaper(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 mt-0.5 cursor-pointer"
                />
                <label htmlFor="confirmOwn" className="text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                  <strong>Personal authorship declaration:</strong> I confirm this is my own writing or that I hold authorization to revise this document.
                </label>
              </div>
            </>
          ) : (
            /* Scanning Progress State */
            <div className="py-8 px-4 text-center space-y-5">
              <div className="w-14 h-14 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center mx-auto">
                <Sparkles className="w-7 h-7 animate-spin" />
              </div>

              <div>
                <h4 className="font-bold text-base text-slate-800 dark:text-slate-100">
                  {step === 1 && "Parsing Word OOXML Structure..."}
                  {step === 2 && "Locking Equations, Citations & Tables..."}
                  {step === 3 && "Analyzing Sentence Cadence & AI Signals..."}
                </h4>
                <p className="text-xs text-slate-500 mt-1 font-mono">
                  {fileName}
                </p>
              </div>

              {/* Progress Steps */}
              <div className="space-y-2 max-w-sm mx-auto text-left text-xs">
                <div className={`flex items-center gap-2 ${step >= 1 ? "text-indigo-600 font-semibold" : "text-slate-400"}`}>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>1. Extracting runs without HTML conversion</span>
                </div>
                <div className={`flex items-center gap-2 ${step >= 2 ? "text-indigo-600 font-semibold" : "text-slate-400"}`}>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>2. Protected atoms tokenized losslessly</span>
                </div>
                <div className={`flex items-center gap-2 ${step >= 3 ? "text-indigo-600 font-semibold" : "text-slate-400"}`}>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>3. Sentence-level mapping & scoring ready</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
