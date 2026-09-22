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
      // Resetting controlled-input state when modal opens — intentional setState in effect
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const isWaste = mode === 'subtract';
  const title = mode === 'add' ? 'Log prep' : isWaste ? 'Log waste' : 'Set quantity';

  /**
   * The cook's real question is "what will I have after this?", so the sheet
   * answers it directly rather than making them do the arithmetic.
   */
  const resulting =
    mode === 'set'
      ? quantity
      : isWaste
      ? Math.max(0, currentQuantity - quantity)
      : currentQuantity + quantity;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-ink/50"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="animate-sheet relative w-full max-w-md bg-surface
                   rounded-t-sheet sm:rounded-sheet pb-safe shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-rule">
          <div className="min-w-0">
            <h2 id="modal-title" className="text-lg font-bold leading-tight text-ink">
              {title}
            </h2>
            <p className="mt-0.5 text-[15px] text-ink-2 truncate">{itemName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 -mt-1 p-2 text-ink-3 hover:text-ink rounded-control
                       active:bg-surface-sunk transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* The number being entered is the whole point of this screen. */}
        <div className="px-5 pt-7 pb-5">
          <div className="flex items-center justify-center gap-5">
            <button
              type="button"
              onClick={handleDecrement}
              disabled={quantity <= 0}
              className="w-14 h-14 flex-shrink-0 flex items-center justify-center
                         rounded-full bg-surface-sunk text-ink text-3xl
                         active:bg-rule disabled:opacity-30
                         transition-colors touch-manipulation"
              aria-label="Decrease"
            >
              &minus;
            </button>

            <div className="min-w-0 flex-1">
              <input
                type="number"
                inputMode="decimal"
                value={inputValue}
                onChange={handleInputChange}
                aria-label={`Quantity in ${unit}`}
                className="tnum w-full bg-transparent text-center text-hero text-ink
                           border-0 p-0 focus:outline-none focus:ring-0
                           [appearance:textfield]
                           [&::-webkit-outer-spin-button]:appearance-none
                           [&::-webkit-inner-spin-button]:appearance-none"
                min={0}
                step="any"
              />
              <p className="text-center text-[15px] font-medium text-ink-2 mt-1">{unit}</p>
            </div>

            <button
              type="button"
              onClick={handleIncrement}
              className="w-14 h-14 flex-shrink-0 flex items-center justify-center
                         rounded-full bg-surface-sunk text-ink text-3xl
                         active:bg-rule transition-colors touch-manipulation"
              aria-label="Increase"
            >
              +
            </button>
          </div>

          <div className="flex justify-center gap-2 mt-6">
            {QUICK_AMOUNTS.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => handleQuickAdd(amount)}
                className="tnum flex-1 py-2.5 rounded-control bg-surface-sunk
                           font-semibold text-[15px] text-ink
                           active:bg-rule transition-colors touch-manipulation"
              >
                +{amount}
              </button>
            ))}
          </div>
        </div>

        {/* Result preview, then the action */}
        <div className="px-5 pb-5">
          {mode !== 'set' && (
            <div className="flex items-baseline justify-between px-4 py-3 mb-3
                            rounded-control bg-surface-sunk">
              <span className="text-[15px] text-ink-2">
                {isWaste ? 'Left after this' : 'On hand after this'}
              </span>
              <span className="tnum text-lg font-bold text-ink">
                {resulting} {unit}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={quantity <= 0 || isLoading}
            className={`w-full py-4 rounded-control text-white font-bold text-[17px]
                        disabled:opacity-40 disabled:cursor-not-allowed
                        transition-colors touch-manipulation
                        ${isWaste ? 'bg-flame active:bg-flame/90' : 'bg-amber active:bg-amber/90'}`}
          >
            {isLoading
              ? 'Saving'
              : quantity <= 0
              ? 'Enter an amount'
              : `Log ${quantity} ${unit}`}
          </button>
        </div>
      </div>
    </div>
  );
}
