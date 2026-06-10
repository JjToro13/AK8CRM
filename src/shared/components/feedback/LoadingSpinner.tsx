import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  fullScreen?: boolean;
}

export default function LoadingSpinner({
  size = "md",
  text = "Cargando...",
  fullScreen = true,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div
      className={
        fullScreen
          ? "flex min-h-screen flex-col items-center justify-center bg-gray-50"
          : "inline-flex items-center justify-center gap-2 align-middle"
      }
    >
      <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />
      {text ? (
        <p className={fullScreen ? "mt-4 font-medium text-gray-600" : "text-sm font-medium text-current"}>
          {text}
        </p>
      ) : null}
    </div>
  );
}
