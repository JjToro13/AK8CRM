import { useEffect, useMemo, useState } from "react";
import { UserPlus } from "lucide-react";
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

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type ClientAssignmentModalProps = {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (agentId: string | null) => void;
  saving: boolean;
  agents: Array<{ id: string; name: string; email?: string | null }>;
};

export default function ClientAssignmentModal({
  client,
  isOpen,
  onClose,
  onSave,
  saving,
  agents,
}: ClientAssignmentModalProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>(UNASSIGNED_OPTION);

  useEffect(() => {
    if (!client || !isOpen) return;
    setSelectedAgentId(client.assigned_to ?? UNASSIGNED_OPTION);
  }, [client, isOpen]);

  const currentAssignedLabel = useMemo(() => {
    if (!client?.assigned_to) return "Sin asignar";
    return client.assigned_agent?.name?.trim() || client.assigned_to;
  }, [client]);

  const hasChanges = (client?.assigned_to ?? UNASSIGNED_OPTION) !== selectedAgentId;

  if (!isOpen || !client) return null;

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
          title="Asignar cliente"
          description={`${client.first_name || client.name || "Cliente"} - ${client.serial}`}
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
            onClick={() =>
              onSave(selectedAgentId === UNASSIGNED_OPTION ? null : selectedAgentId)
            }
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
