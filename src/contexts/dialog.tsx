'use client';

import { createContext, useState, useCallback, ReactNode } from 'react';
import Modal, { ModalProps } from '@/components/modal';

interface DialogOptions {
  title?: ModalProps['title'];
  description?: ModalProps['description'];
  content: ModalProps['children'];
}

interface DialogContextType {
  show: (options: DialogOptions) => void;
  hide: () => void;
}

export const DialogContext = createContext<DialogContextType | null>(null);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialogState, setDialogState] = useState<DialogOptions & { isOpen: boolean }>({
    isOpen: false,
    content: null,
  });

  const show = useCallback((options: DialogOptions) => {
    setDialogState({
      ...options,
      isOpen: true,
    });
  }, []);

  const hide = useCallback(() => {
    setDialogState(prev => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  const onOpenChange = useCallback((open: boolean) => {
    if (!open) {
      hide();
    }
  }, [hide]);

  return (
    <DialogContext.Provider value={{ show, hide }}>
      {children}
      <Modal
        title={dialogState.title || ''}
        description={dialogState.description || ''}
        isOpen={dialogState.isOpen}
        onOpenChange={onOpenChange}
      >
        {dialogState.content}
      </Modal>
    </DialogContext.Provider>
  );
} 