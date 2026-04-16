import React from "react";
import { Info, AlertTriangle, XCircle, X } from "lucide-react";

type Variant = "info" | "warning" | "danger";

type GeneralNoticeModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  message: React.ReactNode;
  variant?: Variant;
  dismissKey?: string;
  primaryText?: string;
};

function variantStyles(variant: Variant) {
  switch (variant) {
    case "warning":
      return {
        icon: AlertTriangle,
        ring: "ring-amber-400/30",
        header: "text-amber-900",
        body: "text-amber-800",
        iconColor: "text-amber-600",
        bg: "bg-amber-50",
        border: "border-amber-200",
        button: "bg-amber-600 hover:bg-amber-700 text-white",
      };
    case "danger":
      return {
        icon: XCircle,
        ring: "ring-red-400/30",
        header: "text-red-900",
        body: "text-red-800",
        iconColor: "text-red-600",
        bg: "bg-red-50",
        border: "border-red-200",
        button: "bg-red-600 hover:bg-red-700 text-white",
      };
    case "info":
    default:
      return {
        icon: Info,
        ring: "ring-blue-400/30",
        header: "text-blue-900",
        body: "text-blue-800",
        iconColor: "text-blue-600",
        bg: "bg-blue-50",
        border: "border-blue-200",
        button: "bg-blue-600 hover:bg-blue-700 text-white",
      };
  }
}

export default function GeneralNoticeModal({
  open,
  onClose,
  title,
  message,
  variant = "info",
  dismissKey,
  primaryText = "Entendido",
}: GeneralNoticeModalProps) {
  const dismissed = (() => {
    if (!dismissKey) return false;
    try {
      return localStorage.getItem(dismissKey) === "1";
    } catch {
      return false;
    }
  })();

  if (!open || dismissed) return null;

  const s = variantStyles(variant);
  const Icon = s.icon;

  const handleClose = () => {
    if (dismissKey) {
      try {
        localStorage.setItem(dismissKey, "1");
      } catch {
        // ignore
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={handleClose}
        aria-label="Cerrar aviso"
      />
      <div
        className={[
          "relative w-full max-w-lg rounded-2xl border",
          s.border,
          s.bg,
          "p-5 shadow-xl ring-1",
          s.ring,
        ].join(" ")}
      >
        <button
          onClick={handleClose}
          className="absolute right-3 top-3 rounded-lg p-2 hover:bg-black/5"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5 text-gray-700" />
        </button>

        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-xl bg-white/60 p-2">
            <Icon className={["h-6 w-6", s.iconColor].join(" ")} />
          </div>

          <div className="flex-1">
            <h3 className={["text-lg font-semibold", s.header].join(" ")}>
              {title}
            </h3>
            <div className={["mt-2 text-sm leading-relaxed", s.body].join(" ")}>
              {message}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={handleClose}
                className={[
                  "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold",
                  s.button,
                ].join(" ")}
              >
                {primaryText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
