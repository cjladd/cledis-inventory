'use client';

import { useState, useEffect, useCallback } from 'react';

export interface QuantityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (quantity: number) => void;
  itemName: string;
  currentQuantity?: number;
  unit?: string;
  mode?: 'add' | 'subtract' | 'set';
}

export default function QuantityModal({
  isOpen,
  onClose,
  onSubmit,
  itemName,
  currentQuantity = 0,
  unit = 'units',
  mode = 'set',
}: QuantityModalProps) {
  const [quantity, setQuantity] = useState<number>(mode === 'set' ? currentQuantity : 0);
  const [inputValue, setInputValue] = useState<string>(String(mode === 'set' ? currentQuantity : 0));

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialValue = mode === 'set' ? currentQuantity : 0;
      setQuantity(initialValue);
      setInputValue(String(initialValue));
    }
  }, [isOpen, currentQuantity, mode]);

  const handleIncrement = useCallback(() => {
    setQuantity((prev) => {
      const newVal = prev + 1;
      setInputValue(String(newVal));
      return newVal;
    });
  }, []);

  const handleDecrement = useCallback(() => {
    setQuantity((prev) => {
      const newVal = Math.max(0, prev - 1);
      setInputValue(String(newVal));
      return newVal;
    });
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed >= 0) {
      setQuantity(parsed);
    }
  };

  const handleSubmit = () => {
    onSubmit(quantity);
    onClose();
  };

  const getModeLabel = () => {
    switch (mode) {
      case 'add':
        return 'Add Stock';
      case 'subtract':
        return 'Remove Stock';
      default:
        return 'Set Quantity';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl 
                   shadow-xl transform transition-all animate-slide-up
                   pb-safe"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Handle bar for mobile */}
        <div className="flex justify-center pt-3 pb-2 sm:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <h2 id="modal-title" className="text-lg font-semibold text-gray-900">
              {getModeLabel()}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 -mr-2 text-gray-400 hover:text-gray-600 
                         active:bg-gray-100 rounded-full transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">{itemName}</p>
          {mode !== 'set' && (
            <p className="text-xs text-gray-400 mt-1">
              Current stock: {currentQuantity} {unit}
            </p>
          )}
        </div>

        {/* Quantity Controls */}
        <div className="px-6 py-6">
          <div className="flex items-center justify-center gap-4">
            {/* Decrement Button */}
            <button
              type="button"
              onClick={handleDecrement}
              disabled={quantity <= 0}
              className="w-16 h-16 flex items-center justify-center rounded-full 
                         bg-gray-100 text-gray-700 text-3xl font-medium
                         active:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors touch-manipulation"
              aria-label="Decrease quantity"
            >
              −
            </button>

            {/* Number Input */}
            <div className="flex-1 max-w-[140px]">
              <input
                type="number"
                inputMode="decimal"
                value={inputValue}
                onChange={handleInputChange}
                min="0"
                step="any"
                className="w-full text-center text-4xl font-bold text-gray-900 
                           border-b-2 border-gray-300 focus:border-emerald-500 
                           outline-none py-2 bg-transparent
                           [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none 
                           [&::-webkit-inner-spin-button]:appearance-none"
                aria-label="Quantity"
              />
              <p className="text-center text-sm text-gray-500 mt-1">{unit}</p>
            </div>

            {/* Increment Button */}
            <button
              type="button"
              onClick={handleIncrement}
              className="w-16 h-16 flex items-center justify-center rounded-full 
                         bg-emerald-100 text-emerald-700 text-3xl font-medium
                         active:bg-emerald-200 transition-colors touch-manipulation"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          {/* Quick Add Buttons */}
          <div className="flex justify-center gap-2 mt-6">
            {[1, 5, 10, 25].map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => {
                  const newVal = quantity + amount;
                  setQuantity(newVal);
                  setInputValue(String(newVal));
                }}
                className="px-4 py-2 text-sm font-medium text-gray-600 
                           bg-gray-100 rounded-lg active:bg-gray-200 
                           transition-colors touch-manipulation"
              >
                +{amount}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 px-4 text-base font-medium text-gray-700 
                       bg-gray-100 rounded-xl active:bg-gray-200 
                       transition-colors touch-manipulation"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 py-3.5 px-4 text-base font-medium text-white 
                       bg-emerald-600 rounded-xl active:bg-emerald-700 
                       transition-colors touch-manipulation"
          >
            Confirm
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
