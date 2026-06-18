'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  cls?: string; // e.g. 'bg-green-100 text-green-700'
}

interface InlineDropdownProps {
  value: string;
  options: DropdownOption[];
  onSelect: (val: string) => void;
}

export default function InlineDropdown({ value, options, onSelect }: InlineDropdownProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const current = options.find((o) => o.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    const handleScroll = () => {
      if (open) updatePosition();
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleScroll);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [open]);

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
      });
    }
  };

  const handleToggle = () => {
    if (!open) {
      updatePosition();
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={`flex items-center justify-between gap-2 px-3 py-2 min-w-[140px] rounded border text-sm font-medium transition-all
          ${current?.cls || 'bg-gray-100 text-gray-700'}
          border-gray-200 hover:border-gray-300`}
      >
        <span className="truncate">{current?.label || value}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''
            }`}
        />
      </button>

      {open && typeof window !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: position.top,
              left: position.left,
              width: position.width,
              zIndex: 99999,
            }}
            className="bg-white border border-gray-200 rounded-md py-1 animate-in fade-in zoom-in-95"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onSelect(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-all
  ${opt.cls ? `${opt.cls} hover:brightness-90` : 'text-gray-600 hover:bg-gray-100'}
`}
              >
                <span className={`px-2 py-1 rounded-md text-xs font-medium `}>
                  {opt.label}
                </span>

                {value === opt.value && (
                  <Check className="w-4 h-4 text-gray-600" />
                )}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
