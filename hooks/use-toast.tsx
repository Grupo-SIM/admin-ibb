import * as Toast from '@radix-ui/react-toast';
import { useState, useCallback } from 'react';

interface ToastProps {
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Toast.Provider swipeDirection="right">
      {children}
      <ToastViewport />
    </Toast.Provider>
  );
};

const ToastViewport = () => {
  return (
    <Toast.Viewport className="fixed bottom-0 right-0 flex flex-col p-6 gap-2 w-[390px] max-w-[100vw] m-0 list-none z-[2147483647] outline-none" />
  );
};

const ToastItem = ({ toast }: { toast: ToastProps & { id: string; open: boolean; onOpenChange: (open: boolean) => void } }) => {
  return (
    <Toast.Root
      className={`
        bg-white rounded-md shadow-lg p-4 flex flex-col gap-1 border 
        data-[state=open]:animate-slideIn 
        data-[state=closed]:animate-hide 
        data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] 
        data-[swipe=cancel]:translate-x-0 
        data-[swipe=cancel]:transition-[transform_200ms_ease-out] 
        data-[swipe=end]:animate-swipeOut
        ${toast.variant === 'destructive' ? 'border-red-500' : 'border-gray-200'}
      `}
      open={toast.open}
      onOpenChange={toast.onOpenChange}
    >
      <Toast.Title className={`font-medium ${toast.variant === 'destructive' ? 'text-red-500' : 'text-gray-900'}`}>
        {toast.title}
      </Toast.Title>
      <Toast.Description className="text-gray-600 text-sm">
        {toast.description}
      </Toast.Description>
    </Toast.Root>
  );
};

export const useToast = () => {
  const [toasts, setToasts] = useState<Array<ToastProps & { id: string; open: boolean }>>([]);

  const toast = useCallback(({ title, description, variant = 'default' }: ToastProps) => {
  //  const id = Math.random().toString(36).substr(2, 9);
 //   setToasts((currentToasts) => [...currentToasts, { id, title, description, variant, open: true }]);
 alert(title);
  }, []);

  const onOpenChange = useCallback((id: string, open: boolean) => {
    setToasts((currentToasts) =>
      currentToasts.map((toast) =>
        toast.id === id ? { ...toast, open } : toast
      )
    );

    if (!open) {
      setTimeout(() => {
        setToasts((currentToasts) =>
          currentToasts.filter((toast) => toast.id !== id)
        );
      }, 200);
    }
  }, []);

  return {
    toast,
    Toasts: () => (
      <>
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={{
              ...toast,
              onOpenChange: (open) => onOpenChange(toast.id, open),
            }}
          />
        ))}
      </>
    ),
  };
};

