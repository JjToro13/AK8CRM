import { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, UserPlus } from "lucide-react";
import type { Client } from "../../../shared/types/crm";
import {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalPanel,
  modalPrimaryActionClassName,
  modalSecondaryActionClassName,
} from "../layout/ModalLayout";
import {
  clientInsetClass,
  clientModalFooterClass,
  clientModalHeaderClass,
  clientModalPanelClass,
} from "./clientUi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/Select";

const UNASSIGNED_OPTION = "__unassigned__";
const KEEP_CURRENT_OPTION = "__keep_current__";
const KEEP_CAMPAIGN_OPTION = "__keep_campaign__";

export type ClientAssignmentSavePayload = {
  agentId?: string | null;
  targetCampaignId?: string | null;
  keepAssignmentOnCampaignChange: boolean;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type ClientAssignmentModalProps = {
  client: Client | null;
  clients?: Client[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (agentId: string | null) => void;
  onSaveDetails?: (payload: ClientAssignmentSavePayload) => void;
  saving: boolean;
  agents: Array<{ id: string; name: string; email?: string | null }>;
  campaignOptions?: Array<{ id: string; label: string }>;
};

export default function ClientAssignmentModal({
  client,
  clients = [],
  isOpen,
  onClose,
  onSave,
  onSaveDetails,
  saving,
  agents,
  campaignOptions = [],
}: ClientAssignmentModalProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>(UNASSIGNED_OPTION);
  const [selectedCampaignId, setSelectedCampaignId] =
    useState<string>(KEEP_CAMPAIGN_OPTION);
  const [keepAssignmentOnCampaignChange, setKeepAssignmentOnCampaignChange] =
    useState(true);

  const selectedClients = useMemo(
    () => (clients.length > 0 ? clients : client ? [client] : []),
    [client, clients],
  );
  const primaryClient = selectedClients[0] ?? null;
  const isBulk = selectedClients.length > 1;

  useEffect(() => {
    if (!primaryClient || !isOpen) return;
    setSelectedAgentId(
      isBulk ? KEEP_CURRENT_OPTION : primaryClient.assigned_to ?? UNASSIGNED_OPTION,
    );
    setSelectedCampaignId(KEEP_CAMPAIGN_OPTION);
    setKeepAssignmentOnCampaignChange(true);
  }, [isBulk, isOpen, primaryClient]);

  const currentAssignedLabel = useMemo(() => {
    if (selectedClients.length === 0) return "Sin asignar";

    const assignedKeys = new Set(
      selectedClients.map((item) => item.assigned_to ?? UNASSIGNED_OPTION),
    );

    if (assignedKeys.size > 1) return "Asignaciones mixtas";
    if (!primaryClient?.assigned_to) return "Sin asignar";
    return primaryClient.assigned_agent?.name?.trim() || primaryClient.assigned_to;
  }, [primaryClient, selectedClients]);

  const currentCampaignLabel = useMemo(() => {
    if (selectedClients.length === 0) return "Sin base";

    const campaignKeys = new Set(
      selectedClients.map((item) => item.campaign_id ?? KEEP_CAMPAIGN_OPTION),
    );

    if (campaignKeys.size > 1) return "Bases mixtas";

    const campaign = primaryClient?.campaign;
    return (
      campaign?.display_name?.trim() ||
      campaign?.prefix?.trim() ||
      primaryClient?.campaign_id ||
      "Sin base"
    );
  }, [primaryClient, selectedClients]);

  const currentCampaignId = useMemo(() => {
    if (selectedClients.length === 0) return null;

    const campaignKeys = new Set(
      selectedClients.map((item) => item.campaign_id ?? KEEP_CAMPAIGN_OPTION),
    );

    return campaignKeys.size === 1 ? selectedClients[0].campaign_id ?? null : null;
  }, [selectedClients]);

  const targetCampaignOptions = useMemo(
    () => campaignOptions.filter((campaign) => campaign.id !== currentCampaignId),
    [campaignOptions, currentCampaignId],
  );

  const agentHasChanges = isBulk
    ? selectedAgentId !== KEEP_CURRENT_OPTION
    : (primaryClient?.assigned_to ?? UNASSIGNED_OPTION) !== selectedAgentId;
  const campaignHasChanges = selectedCampaignId !== KEEP_CAMPAIGN_OPTION;
  const hasChanges = agentHasChanges || campaignHasChanges;

  if (!isOpen || !primaryClient) return null;

  const title = isBulk ? "Asignar clientes" : "Asignar cliente";
  const description = isBulk
    ? `${selectedClients.length} clientes seleccionados`
    : `${primaryClient.first_name || primaryClient.name || "Cliente"} - ${primaryClient.serial}`;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_42%),rgba(15,23,42,0.5)] backdrop-blur-[4px]"
        onClick={onClose}
        aria-label="Cerrar modal de asignacion"
        disabled={saving}
      />

      <ModalPanel className={cn(clientModalPanelClass, "relative max-w-xl")}>
        <ModalHeader
          icon={<UserPlus className="h-5 w-5 text-brand" />}
          title={title}
          description={description}
          onClose={onClose}
          closeDisabled={saving}
          className={clientModalHeaderClass}
        />

        <ModalBody className="space-y-5">
          <div className={cn(clientInsetClass, "p-4")}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Asignacion actual
            </div>
            <div className="mt-2 text-sm font-semibold text-ink">
              {currentAssignedLabel}
            </div>
          </div>

          <div className={cn(clientInsetClass, "p-4")}>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Nuevo responsable
            </div>

            <Select
              value={selectedAgentId}
              onValueChange={setSelectedAgentId}
              disabled={saving}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un agente" />
              </SelectTrigger>

              <SelectContent>
                {isBulk ? (
                  <SelectItem value={KEEP_CURRENT_OPTION}>
                    Mantener asignacion actual
                  </SelectItem>
                ) : null}
                <SelectItem value={UNASSIGNED_OPTION}>Sin asignar</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                    {agent.email ? ` · ${agent.email}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <p className="mt-3 text-xs text-muted">
              Puedes reasignar el cliente a otro agente o dejarlo libre para reasignacion futura.
            </p>
          </div>

          {onSaveDetails && targetCampaignOptions.length > 0 ? (
          <div className={cn(clientInsetClass, "p-4")}>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              <ArrowRightLeft className="h-4 w-4 text-brand" />
              Base / campana
            </div>

            <div className="mb-3 text-sm font-semibold text-ink">
              {currentCampaignLabel}
            </div>

            <Select
              value={selectedCampaignId}
              onValueChange={setSelectedCampaignId}
              disabled={saving}
            >
              <SelectTrigger>
                <SelectValue placeholder="Mantener base actual" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value={KEEP_CAMPAIGN_OPTION}>
                  Mantener base actual
                </SelectItem>
                {targetCampaignOptions.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {campaignHasChanges ? (
              <label className="mt-4 flex items-start gap-3 rounded-2xl border border-white/70 bg-white/55 p-3 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={keepAssignmentOnCampaignChange}
                  onChange={(event) =>
                    setKeepAssignmentOnCampaignChange(event.target.checked)
                  }
                  disabled={saving || agentHasChanges}
                  className="mt-0.5 h-4 w-4 rounded border-border"
                />
                <span>
                  Mantener la asignacion a los agentes al cambiar de base.
                  {agentHasChanges ? (
                    <span className="block text-xs text-muted">
                      Se usara el nuevo responsable seleccionado arriba.
                    </span>
                  ) : null}
                </span>
              </label>
            ) : null}
          </div>
          ) : null}
        </ModalBody>

        <ModalFooter className={clientModalFooterClass}>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className={modalSecondaryActionClassName}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={() => {
              const agentId =
                selectedAgentId === KEEP_CURRENT_OPTION
                  ? undefined
                  : selectedAgentId === UNASSIGNED_OPTION
                    ? null
                    : selectedAgentId;

              if (onSaveDetails) {
                onSaveDetails({
                  agentId,
                  targetCampaignId: campaignHasChanges ? selectedCampaignId : undefined,
                  keepAssignmentOnCampaignChange,
                });
                return;
              }

              onSave(agentId === undefined ? null : agentId);
            }}
            disabled={saving || !hasChanges}
            className={modalPrimaryActionClassName}
          >
            Guardar asignacion
          </button>
        </ModalFooter>
      </ModalPanel>
    </div>
  );
}
