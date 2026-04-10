import { sileo } from "sileo";

type NotifyVariant = "success" | "error" | "info";

const baseOptions = {
  position: "top-center" as const,
  duration: 2600,
  roundness: 28,
  autopilot: {
    expand: 180,
    collapse: 1800,
  },
};

function isAtlasFinanceBranding() {
  if (typeof document === "undefined") return false;
  return document.documentElement.dataset.brandPreset === "atlas-finance";
}

function getVariantOptions(variant: NotifyVariant) {
  if (isAtlasFinanceBranding()) {
    switch (variant) {
      case "success":
        return {
          fill: "rgba(14, 24, 39, 0.96)",
          styles: {
            title: "!text-emerald-200 !font-semibold",
            description: "!text-slate-300/90",
            badge:
              "!bg-emerald-500/14 !text-emerald-200 !border !border-emerald-400/24",
          },
        };
      case "error":
        return {
          fill: "rgba(20, 24, 35, 0.97)",
          styles: {
            title: "!text-rose-200 !font-semibold",
            description: "!text-slate-300/90",
            badge:
              "!bg-rose-500/14 !text-rose-200 !border !border-rose-400/24",
          },
        };
      case "info":
      default:
        return {
          fill: "rgba(14, 22, 36, 0.96)",
          styles: {
            title: "!text-sky-200 !font-semibold",
            description: "!text-slate-300/90",
            badge:
              "!bg-sky-500/14 !text-sky-200 !border !border-sky-400/24",
          },
        };
    }
  }

  switch (variant) {
    case "success":
      return {
        fill: "rgba(236, 253, 245, 0.96)",
        styles: {
          title: "!text-emerald-800 !font-semibold",
          description: "!text-emerald-900/80",
          badge:
            "!bg-emerald-100 !text-emerald-700 !border !border-emerald-200/80",
        },
      };
    case "error":
      return {
        fill: "rgba(254, 242, 242, 0.97)",
        styles: {
          title: "!text-rose-800 !font-semibold",
          description: "!text-rose-900/80",
          badge:
            "!bg-rose-100 !text-rose-700 !border !border-rose-200/80",
        },
      };
    case "info":
    default:
      return {
        fill: "rgba(239, 246, 255, 0.96)",
        styles: {
          title: "!text-sky-800 !font-semibold",
          description: "!text-sky-900/80",
          badge:
            "!bg-sky-100 !text-sky-700 !border !border-sky-200/80",
        },
      };
  }
}

export const notify = {
  success(title: string, description?: string) {
    return sileo.success({
      ...baseOptions,
      ...getVariantOptions("success"),
      title,
      description,
    });
  },

  error(title: string, description?: string) {
    return sileo.error({
      ...baseOptions,
      ...getVariantOptions("error"),
      title,
      description,
    });
  },

  info(title: string, description?: string) {
    return sileo.info({
      ...baseOptions,
      ...getVariantOptions("info"),
      title,
      description,
    });
  },

  copied(label: string) {
    return sileo.success({
      ...baseOptions,
      ...getVariantOptions("success"),
      title: `${label} copiado`,
      description: "Ya puedes pegarlo donde lo necesites.",
    });
  },

  appointmentCreated() {
    return this.success(
      "Cita agendada",
      "La cita quedó guardada correctamente en el calendario.",
    );
  },

  appointmentUpdated() {
    return this.success(
      "Cita actualizada",
      "Los cambios se guardaron correctamente.",
    );
  },

  followUpSaved() {
    return this.success(
      "Seguimiento guardado",
      "El estado de la cita quedó actualizado.",
    );
  },

  appointmentDeleted() {
    return this.info(
      "Cita eliminada",
      "La cita fue retirada del calendario.",
    );
  },

  clientAssignmentUpdated(description?: string) {
    return this.success(
      "Asignacion actualizada",
      description || "El responsable del cliente se guardo correctamente.",
    );
  },
};
