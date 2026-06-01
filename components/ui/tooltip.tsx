"use client";
import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/utils";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, className }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX + rect.width / 2,
      });
    }
  }, [isVisible]);

  return (
    <>
      <div
        ref={triggerRef}
        className={cn("relative inline-flex items-center", className)}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-[9999] px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-xl whitespace-normal max-w-xs pointer-events-none transform -translate-x-1/2"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
        >
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-0">
            <div className="border-4 border-transparent border-b-gray-900"></div>
          </div>
          {content}
        </div>
      )}
    </>
  );
};
