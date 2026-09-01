import { Fragment, isValidElement, cloneElement, useCallback, useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';
import './Dialog.css';

export interface DialogProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    description?: string;
    children: ReactNode;
    variant?: 'default' | 'alert' | 'form';
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    closeOnOverlayClick?: boolean;
    closeOnEscape?: boolean;
    showCloseButton?: boolean;
}

function focusTrap(element: HTMLElement) {
    const focusableElements = element.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    function handleTab(e: KeyboardEvent) {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement?.focus();
            }
        } else {
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement?.focus();
            }
        }
    }

    element.addEventListener('keydown', handleTab);
    firstElement?.focus();

    return () => element.removeEventListener('keydown', handleTab);
}

export const Dialog = ({
    open,
    onOpenChange,
    title,
    description,
    children,
    variant = 'default',
    size = 'md',
    closeOnOverlayClick = true,
    closeOnEscape = true,
    showCloseButton = true,
    className,
    ...props
}: DialogProps) => {
    const overlayRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const previousActiveElement = useRef<HTMLElement | null>(null);
    const cleanupFocusTrap = useRef<(() => void) | null>(null);

    const close = useCallback(() => onOpenChange(false), [onOpenChange]);

    useEffect(() => {
        if (open) {
            previousActiveElement.current = document.activeElement as HTMLElement;
            document.body.style.overflow = 'hidden';
            document.body.setAttribute('data-dialog-open', 'true');
        } else {
            document.body.style.overflow = '';
            document.body.removeAttribute('data-dialog-open');
            previousActiveElement.current?.focus();
        }

        return () => {
            document.body.style.overflow = '';
            document.body.removeAttribute('data-dialog-open');
        };
    }, [open]);

    useEffect(() => {
        if (open && contentRef.current) {
            cleanupFocusTrap.current = focusTrap(contentRef.current);
        }
        return () => {
            cleanupFocusTrap.current?.();
            cleanupFocusTrap.current = null;
        };
    }, [open]);

    useEffect(() => {
        if (!open || !closeOnEscape) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') close();
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, closeOnEscape, close]);

    if (!open) return null;

    const dialogContent = (
        <div
            className={cn('dialog-overlay', 'animate-fade-in')}
            ref={overlayRef}
            onClick={(e) => {
                if (closeOnOverlayClick && e.target === overlayRef.current) close();
            }}
            role="presentation"
        >
            <div
                ref={contentRef}
                className={cn(
                    'dialog-content',
                    `dialog-content--${size}`,
                    `dialog-content--${variant}`,
                    className
                )}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? 'dialog-title' : undefined}
                aria-describedby={description ? 'dialog-description' : undefined}
                {...props}
            >
                {(title || showCloseButton) && (
                    <div className="dialog-header">
                        {title && (
                            <h2 id="dialog-title" className="dialog-title">
                                {title}
                            </h2>
                        )}
                        {description && (
                            <p id="dialog-description" className="dialog-description">
                                {description}
                            </p>
                        )}
                        {showCloseButton && (
                            <button
                                type="button"
                                className="dialog-close"
                                onClick={close}
                                aria-label="Close dialog"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                )}

                <div className="dialog-body">{children}</div>
            </div>
        </div>
    );

    if (typeof window === 'undefined') return null;

    return createPortal(dialogContent, document.body);
};

Dialog.displayName = 'Dialog';

export interface DialogTriggerProps {
    children: ReactNode;
    dialog: ReactNode;
}

export function DialogTrigger({ children, dialog }: DialogTriggerProps) {
    const [open, setOpen] = useState(false);
    return (
        <Fragment>
            {typeof children === 'function'
                ? (children as Function)({ open, setOpen })
                : (
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className="dialog-trigger"
                    >
                        {children}
                    </button>
                )}
            {isValidElement(dialog)
                ? cloneElement(dialog as any, { open, onOpenChange: setOpen })
                : dialog}
        </Fragment>
    );
}

DialogTrigger.displayName = 'DialogTrigger';

export const DialogContent = Dialog;
export const DialogHeader = ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={cn('dialog-header', className)}>{children}</div>
);
export const DialogTitle = ({ children, className }: { children: ReactNode; className?: string }) => (
    <h2 id="dialog-title" className={cn('dialog-title', className)}>{children}</h2>
);
export const DialogDescription = ({ children, className }: { children: ReactNode; className?: string }) => (
    <p id="dialog-description" className={cn('dialog-description', className)}>{children}</p>
);
export const DialogBody = ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={cn('dialog-body', className)}>{children}</div>
);
export const DialogFooter = ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={cn('dialog-footer', className)}>{children}</div>
);
export const DialogClose = ({ className, ...props }: HTMLAttributes<HTMLButtonElement>) => (
    <button
        type="button"
        className={cn('dialog-close', className)}
        {...props}
    >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
        </svg>
    </button>
);
