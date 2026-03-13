import React, { useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg bg-white border border-slate-200 animate-in slide-in-from-top-2 fade-in duration-300">
      {type === 'success' ? (
        <CheckCircle className="text-emerald-500" size={20} />
      ) : (
        <XCircle className="text-red-500" size={20} />
      )}
      <p className="text-sm font-medium text-slate-800">{message}</p>
      <button 
        onClick={onClose}
        className="ml-2 text-slate-400 hover:text-slate-600 transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
}
