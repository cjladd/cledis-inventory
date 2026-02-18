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
  isLoading?: boolean;
}

const QUICK_AMOUNTS = [1, 5, 10, 25];

export default function QuantityModal({
  isOpen,
  onClose,
  onSubmit,
  itemName,
  currentQuantity = 0,
  unit = 'units',
  mode = 'set',
  isLoading = false,
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

  const handleQuickAdd = (amount: number) => {
    setQuantity((prev) => {
      const newVal = prev + amount;
      setInputValue(String(newVal));
      return newVal;
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed >= 0) {
      setQuantity(parsed);
    }
  };

  const handleSubmit = () => {
    if (quantity > 0) {
      onSubmit(quantity);
    }
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

  const getModeColor = () => {
    switch (mode) {
      case 'add':
        return 'bg-emerald-500 hover:bg-emerald-600';
      case 'subtract':
        return 'bg-red-500 hover:bg-red-600';
      default:
        return 'bg-blue-500 hover:bg-blue-600';
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
                   shadow-xl transform transition-all
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
                className="w-full text-center text-4xl font-bold text-gray-900 
                           border-2 border-gray-200 rounded-xl py-3
                           focus:border-emerald-500 focus:outline-none
                           transition-colors"
                min={0}
                step="any"
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
          <div className="flex justify-center gap-2 mt-4">
            {QUICK_AMOUNTS.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => handleQuickAdd(amount)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg 
                           font-medium text-sm active:bg-gray-200 
                           transition-colors touch-manipulation"
              >
                +{amount}
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="px-6 pb-6">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={quantity <= 0 || isLoading}
            className={`w-full py-4 text-white font-semibold rounded-xl
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors touch-manipulation ${getModeColor()}`}
          >
            {isLoading ? 'Saving...' : `${getModeLabel()} (${quantity} ${unit})`}
          </button>
        </div>
      </div>
    </div>
  );
}
