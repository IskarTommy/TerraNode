import "./LoadingSkeleton.css";

interface LoadingSkeletonProps {
  width?: string;
  height?: string;
  count?: number;
  className?: string;
  variant?: "text" | "rect" | "circle";
}

export const LoadingSkeleton = ({
  width = "100%",
  height = "1rem",
  count = 1,
  variant = "rect",
  className = "",
}: LoadingSkeletonProps) => {
  return (
    <div className={`skeleton-container ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`skeleton skeleton--${variant}`}
          style={{ width, height }}
        />
      ))}
   </div>
  );
};
