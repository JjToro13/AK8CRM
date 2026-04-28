import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Clock, Trash2 } from "lucide-react";
import LoadingSpinner from "../../../shared/components/feedback/LoadingSpinner";
import Input from "../../../shared/components/ui/Input";
import {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalPanel,
  modalPrimaryActionClassName,
  modalSecondaryActionClassName,
} from "../../../shared/components/layout/ModalLayout";
import type { CampaignViewRow } from "../types/campaign.types";
import { formatCampaignDate } from "../domain/campaign-formatters";
import {
  campaignModalFooterClass,
  campaignModalHeaderClass,
  campaignModalPanelClass,
} from "./campaignUi";

type DeleteCampaignConfirmModalProps = {
  campaign: CampaignViewRow | null;
  isOpen: boolean;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function DeleteCampaignConfirmModal({
  campaign,
  isOpen,
  deleting,
  onClose,
  onConfirm,
}: DeleteCampaignConfirmModalProps) {
  const [confirmationText, setConfirmationText] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setConfirmationText("");
  }, [campaign?.id, isOpen]);

  const deletionAvailableAt = campaign?.deletionAvailableAt
    ? new Date(campaign.deletionAvailableAt)
    : null;
  const now = new Date();
  const isPendingDeletion = Boolean(campaign?.deletionRequestedAt);
  const canDeletePermanently =
    isPendingDeletion &&
    deletionAvailableAt !== null &&
    deletionAvailableAt.getTime() <= now.getTime();
  const isGracePeriodActive = isPendingDeletion && !canDeletePermanently;
  const canConfirm =
    confirmationText.trim() === "ELIMINAR" &&
    !deleting &&
    !isGracePeriodActive;

  const copy = useMemo(() => {
    if (!campaign) {
      return {
        title: "Eliminar campana",
        action: "Eliminar",
        body: "",
      };
    }

    if (canDeletePermanently) {
      return {
        title: "Eliminar definitivamente",
        action: "Eliminar definitivamente",
        body: `Se eliminaran definitivamente la campana ${campaign.prefix} y sus ${campaign.total.toLocaleString()} clientes.`,
      };
    }

    if (isGracePeriodActive) {
      return {
        title: "Retiro en periodo de gracia",
        action: "No disponible",
        body: `La campana ${campaign.prefix} ya fue retirada. El borrado definitivo estara disponible desde ${formatCampaignDate(campaign.deletionAvailableAt)}.`,
      };
    }

    return {
      title: "Retirar campana",
      action: "Retirar durante 7 dias",
      body: `La campana ${campaign.prefix} se bloqueara, sus clientes quedaran desasignados y ocultos durante 7 dias antes del borrado definitivo.`,
    };
  }, [campaign, canDeletePermanently, isGracePeriodActive]);

  if (!isOpen || !campaign) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[rgba(15,23,42,0.5)] backdrop-blur-sm"
        onClick={onClose}
        aria-label="Cerrar confirmacion"
        disabled={deleting}
      />

      <ModalPanel className={cn(campaignModalPanelClass, "relative max-w-xl")}>
        <ModalHeader
          icon={
            isGracePeriodActive ? (
              <Clock className="h-5 w-5 text-amber-600" />
            ) : (
              <Trash2 className="h-5 w-5 text-red-600" />
            )
          }
          title={copy.title}
          description={`${campaign.name} · ${campaign.prefix}`}
          onClose={onClose}
          closeDisabled={deleting}
          className={campaignModalHeaderClass}
        />

        <ModalBody className="space-y-4">
          <div className="rounded-[1.2rem] border border-amber-200/90 bg-[linear-gradient(180deg,rgba(254,243,199,0.86),rgba(255,255,255,0.72))] p-4 text-sm text-amber-900">
            <div className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{copy.body}</p>
            </div>
          </div>

          {!isGracePeriodActive ? (
            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                Confirmacion requerida
              </div>
              <Input
                value={confirmationText}
                onChange={(event) => setConfirmationText(event.target.value)}
                disabled={deleting}
                placeholder="Escribe ELIMINAR"
              />
              <p className="mt-2 text-xs text-muted">
                Debes escribir ELIMINAR en mayusculas para continuar.
              </p>
            </div>
          ) : null}
        </ModalBody>

        <ModalFooter className={campaignModalFooterClass}>
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className={modalSecondaryActionClassName}
          >
            Cerrar
          </button>

          {!isGracePeriodActive ? (
            <button
              type="button"
              onClick={onConfirm}
              disabled={!canConfirm}
              className={modalPrimaryActionClassName}
            >
              {deleting ? (
                <LoadingSpinner size="sm" text="Procesando..." fullScreen={false} />
              ) : (
                copy.action
              )}
            </button>
          ) : null}
        </ModalFooter>
      </ModalPanel>
    </div>
  );
}
