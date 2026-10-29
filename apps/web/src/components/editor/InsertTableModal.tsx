import React, { useState } from "react";
import { X, Table as TableIcon, Check } from "lucide-react";

interface InsertTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertTable: (rows: number, cols: number) => void;
}

export const InsertTableModal: React.FC<InsertTableModalProps> = ({
  isOpen,
  onClose,
  onInsertTable,
}) => {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [hoverRow, setHoverRow] = useState(3);
  const [hoverCol, setHoverCol] = useState(3);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <TableIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Insert Word Table
              </h3>
              <p className="text-xs text-slate-500">
                Grid dimensions: {hoverRow} × {hoverCol}
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

        <div className="p-6 flex flex-col items-center space-y-4">
          {/* Interactive Grid Selector */}
          <div className="grid grid-cols-6 gap-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            {Array.from({ length: 6 }).map((_, r) =>
              Array.from({ length: 6 }).map((_, c) => {
                const isActive = r < hoverRow && c < hoverCol;
                return (
                  <div
                    key={`${r}-${c}`}
                    onMouseEnter={() => {
                      setHoverRow(r + 1);
                      setHoverCol(c + 1);
                    }}
                    onClick={() => {
                      setRows(r + 1);
                      setCols(c + 1);
                      onInsertTable(r + 1, c + 1);
                      onClose();
                    }}
                    className={`w-6 h-6 rounded border cursor-pointer transition-all ${
                      isActive
                        ? "bg-indigo-500 border-indigo-600 shadow-2xs"
                        : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:border-indigo-400"
                    }`}
                  />
                );
              })
            )}
          </div>

          <span className="text-xs text-slate-500 font-mono">
            Click to insert a {hoverRow} row × {hoverCol} column table
          </span>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-3 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onInsertTable(hoverRow, hoverCol);
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all"
          >
            Insert Table
          </button>
        </div>
      </div>
    </div>
  );
};
