import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "../../utils/cn";
import "./Toast.css";

type ToastVariant = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextType {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <ToastItem
            key={t.id}
            id={t.id}
            message={t.message}
            variant={t.variant}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
};

interface ToastItemProps {
  id: number;
  message: string;
  variant: ToastVariant;
}

const ToastItem = ({ id, message, variant }: ToastItemProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);
  const progressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Start progress bar animation
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev - 0.5; // 4500ms / 100 = 45ms per 1%
        if (newProgress <= 0) {
          setIsVisible(false);
          clearInterval(interval);
          return 0;
        }
        return newProgress;
      });
    }, 45);

    progressRef.current = interval;

    // Auto-dismiss after 4.5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 4500);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  const handleClick = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      key={id}
      className={cn(`toast toast--${variant}`, 'flex items-center gap-3 p-4 rounded-lg shadow-lg')}
      role="status"
      onClick={handleClick}
    >
      <span className="toast-icon" aria-hidden="true">
        {variant === "success" && "✓"}
        {variant === "error" && "✕"}
        {variant === "info" && "i"}
        {variant === "warning" && "!"}
      </span>
      <span className="toast-message flex-1">{message}</span>
      <div className="toast-progress" style={{ width: `${progress}%` }}></div>
    </div>
  );
};

