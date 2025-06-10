import React, { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const Modal = ({ isOpen, onClose, title, children, size = 'lg' }: ModalProps) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full md:max-w-3xl lg:max-w-5xl' // Ajuste conforme necessidade
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop:blur-2xl bg-opacity-60 backdrop-blur-sm p-4">
      <div 
        className={`bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full ${sizeClasses[size]} flex flex-col max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 rounded-t-xl">
          <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X size={24} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-grow">
          {children}
        </div>
        <div className="flex justify-end p-4 border-t border-slate-200 dark:border-slate-700 sticky bottom-0 bg-white dark:bg-slate-800 rounded-b-xl">
            <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 dark:text-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-md transition-colors"
            >
                Fechar
            </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;