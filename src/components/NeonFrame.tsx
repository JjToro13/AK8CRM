import React from "react";

type NeonFrameProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Wrapper visual para "bordear todo con línea naranja neón".
 * Ponelo en tu layout root o, temporalmente, en Dashboard.
 */
export default function NeonFrame({ children, className = "" }: NeonFrameProps) {
  return (
    <div
      className={[
        "min-h-screen",
        // marco
        "border-2 border-orange-400/90 rounded-xl",
        // glow
        "shadow-[0_0_0_2px_rgba(255,140,0,0.35),0_0_28px_rgba(255,140,0,0.35)]",
        // un pelín de padding para que se vea el marco
        "p-1",
        className,
      ].join(" ")}
    >
      <div className="min-h-[calc(100vh-0.5rem)] rounded-lg bg-white">
        {children}
      </div>
    </div>
  );
}
