"use client";
import { useState, useCallback } from "react";

interface ConfirmationOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
}

export const useConfirmation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmationOptions | null>(null);
  const [onConfirm, setOnConfirm] = useState<(() => void) | null>(null);

  const confirm = useCallback((opts: ConfirmationOptions, callback: () => void) => {
    setOptions(opts);
    setOnConfirm(() => callback);
    setIsOpen(true);
  }, []);

  const handleConfirm = useCallback(() => {
    if (onConfirm) {
      onConfirm();
    }
    setIsOpen(false);
    setOptions(null);
    setOnConfirm(null);
  }, [onConfirm]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    setOptions(null);
    setOnConfirm(null);
  }, []);

  return {
    confirm,
    isOpen,
    options,
    onConfirm: handleConfirm,
    onCancel: handleCancel,
  };
};
