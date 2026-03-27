import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, LazyMotion, domAnimation, m } from "framer-motion";
import { Pencil } from "lucide-react";
import LoadingSpinner from "../../../shared/components/feedback/LoadingSpinner";
import Field from "../../../shared/components/ui/Field";
import Input from "../../../shared/components/ui/Input";
import {
  ModalBody,
  ModalFooter,
  ModalHeader,
  modalPrimaryActionClassName,
  modalSecondaryActionClassName,
} from "../../../shared/components/layout/ModalLayout";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const overlayV = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
} as const;

const panelV = {
  initial: { opacity: 0, y: 16, scale: 0.985, filter: "blur(10px)" },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 240, damping: 22 },
  },
  exit: {
    opacity: 0,
    y: 10,
    scale: 0.99,
    filter: "blur(10px)",
    transition: { duration: 0.18 },
  },
} as const;

export default function EditCampaignNameModal({
  isOpen,
  onClose,
  editCampaignId: _editCampaignId,
  editPrefix,
  editName,
  setEditName,
  savingName,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  editCampaignId?: string | null;
  editPrefix: string | null;
  editName: string;
  setEditName: (v: string) => void;
  savingName: boolean;
  onSave: () => void;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !savingName) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose, savingName]);

  if (!isOpen) return null;

  return createPortal(
    <LazyMotion features={domAnimation}>
      <AnimatePresence mode="wait">
        <m.div
        className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6"
        variants={overlayV}
        initial="initial"
        animate="animate"
        exit="exit"
        onMouseDown={(e) => {
          if (savingName) return;
          if (e.target === e.currentTarget) onClose();
        }}
        >
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[3px]" />

          <m.div
          className="relative w-full max-w-lg overflow-hidden rounded-[1.5rem] border border-border bg-surface shadow-soft2"
          variants={panelV}
          initial="initial"
          animate="animate"
          exit="exit"
          >
          <ModalHeader
            icon={<Pencil className="w-5 h-5 text-brand" />}
            title={`Editar nombre de campaña${editPrefix ? ` (${editPrefix})` : ""}`}
            description={
              <>
                Actualiza el <span className="font-semibold">display_name</span> (opcional).
              </>
            }
            onClose={() => !savingName && onClose()}
            closeDisabled={savingName}
          />

          <ModalBody className="space-y-3">
            <Field label="Nombre (display_name)">
              <Input
                className={cn(savingName && "opacity-70")}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Ej: Reactivación MX / VIP Feb"
                disabled={savingName}
              />

              <p className="text-xs text-muted">
                Si lo dejas vació, volverá al nombre por defecto{" "}
                <span className="font-semibold text-ink/70">
                  "Campaña {editPrefix ?? ""}"
                </span>
                .
              </p>
            </Field>
          </ModalBody>

          <ModalFooter className="justify-end gap-2">
            <button
              className={modalSecondaryActionClassName}
              onClick={onClose}
              disabled={savingName}
              type="button"
            >
              Cancelar
            </button>

            <button
              className={modalPrimaryActionClassName}
              onClick={onSave}
              disabled={savingName}
              type="button"
            >
              {savingName ? (
                <LoadingSpinner size="sm" text="Guardando..." fullScreen={false} />
              ) : (
                "Guardar"
              )}
            </button>
          </ModalFooter>
          </m.div>
        </m.div>
      </AnimatePresence>
    </LazyMotion>,
    document.body,
  );
}
