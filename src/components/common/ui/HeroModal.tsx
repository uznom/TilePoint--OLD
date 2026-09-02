import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';

export type HeroModalSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';

export interface HeroModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: HeroModalSize;
  isDismissable?: boolean;
  hideCloseButton?: boolean;
  backdrop?: 'transparent' | 'opaque' | 'blur';
  zIndex?: number;
  containerClassName?: string;
  className?: string;
  id?: string;
}

export const HeroModal: React.FC<HeroModalProps> & {
  Header: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  Body: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  Content: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  Footer: React.FC<React.HTMLAttributes<HTMLDivElement>>;
} = ({
  isOpen,
  onClose,
  children,
  size = 'md',
  isDismissable = true,
  hideCloseButton = false,
  backdrop = 'blur',
  zIndex = 50,
  containerClassName = '',
  className = '',
  id,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDismissable && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isDismissable, onClose]);

  const getSizeClasses = () => {
    switch (size) {
      case 'xs':
        return 'max-w-xs';
      case 'sm':
        return 'max-w-sm';
      case 'lg':
        return 'max-w-2xl';
      case 'xl':
        return 'max-w-3xl';
      case '2xl':
        return 'max-w-4xl';
      case '3xl':
        return 'max-w-5xl';
      case '4xl':
        return 'max-w-6xl';
      case '5xl':
        return 'max-w-7xl';
      case 'full':
        return 'max-w-full m-2 h-[calc(100%-1rem)]';
      case 'md':
      default:
        return 'max-w-lg';
    }
  };

  const getBackdropClasses = () => {
    switch (backdrop) {
      case 'transparent':
        return 'bg-transparent';
      case 'opaque':
        return 'bg-black/60 dark:bg-black/75';
      case 'blur':
      default:
        return 'bg-black/60 dark:bg-black/75 backdrop-blur-md';
    }
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div
          id={id}
          style={{ zIndex }}
          className={`fixed inset-0 flex items-center justify-center p-4 sm:p-6 overflow-y-auto ${containerClassName}`}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={isDismissable ? onClose : undefined}
            data-slot="backdrop"
            className={`modal__backdrop fixed inset-0 z-0 ${getBackdropClasses()}`}
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            data-slot="dialog"
            className={`modal__dialog relative z-10 w-full ${getSizeClasses()} bg-white dark:bg-zinc-900 rounded-3xl shadow-elevation-modal border border-zinc-200/80 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh] ${className}`}
          >
            {!hideCloseButton && (
              <button
                type="button"
                data-slot="close-button"
                onClick={onClose}
                className="modal__close-button absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-default-100 dark:bg-content2/80 text-default-400 hover:text-foreground dark:hover:text-white transition-all flex items-center justify-center cursor-pointer active:scale-95"
                title="Close"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
};

HeroModal.Header = ({ children, className = '', ...props }) => (
  <div
    data-slot="header"
    className={`modal__header px-6 py-5 border-b border-divider font-semibold text-base sm:text-lg text-foreground flex items-center gap-3 font-sans tracking-tight ${className}`}
    {...props}
  >
    {children}
  </div>
);

HeroModal.Body = ({ children, className = '', ...props }) => (
  <div data-slot="body" className={`modal__body px-6 py-5 overflow-y-auto flex-1 text-foreground font-sans ${className}`} {...props}>
    {children}
  </div>
);

HeroModal.Content = ({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div data-slot="modal-content" className={`flex flex-col flex-1 overflow-hidden ${className}`} {...props}>
    {children}
  </div>
);

HeroModal.Footer = ({ children, className = '', ...props }) => (
  <div
    data-slot="footer"
    className={`modal__footer px-6 py-4 border-t border-divider bg-content1 dark:bg-content1/60 flex items-center justify-end gap-3 font-sans ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const ModalContent: React.FC<{ children?: React.ReactNode | ((onClose: () => void) => React.ReactNode); className?: string }> = ({
  children,
}) => {
  return <>{typeof children === 'function' ? children(() => {}) : children}</>;
};
ModalContent.displayName = 'ModalContent';

export const Modal = HeroModal;
export const ModalHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = (props) => <HeroModal.Header {...props} />;
export const ModalBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = (props) => <HeroModal.Body {...props} />;
export const ModalFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = (props) => <HeroModal.Footer {...props} />;

export function useDisclosure(defaultIsOpen = false) {
  const [isOpen, setIsOpen] = React.useState(defaultIsOpen);
  const onOpen = React.useCallback(() => setIsOpen(true), []);
  const onClose = React.useCallback(() => setIsOpen(false), []);
  const onOpenChange = React.useCallback(() => setIsOpen((prev) => !prev), []);

  return {
    isOpen,
    onOpen,
    onClose,
    onOpenChange,
    setIsOpen,
  };
}

export default HeroModal;

