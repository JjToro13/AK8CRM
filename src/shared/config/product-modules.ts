export type ProductModuleKey =
  | "clients"
  | "agent_management"
  | "custom_dispositions"
  | "email"
  | "whatsapp"
  | "calls"
  | "calendar"
  | "reports";

export type ProductModuleCategory =
  | "core"
  | "communication"
  | "operations"
  | "analytics";

export interface ProductModuleDefinition {
  key: ProductModuleKey;
  name: string;
  category: ProductModuleCategory;
  description: string;
  requiredModules?: ProductModuleKey[];
}

export const productModulesCatalog: Record<
  ProductModuleKey,
  ProductModuleDefinition
> = {
  clients: {
    key: "clients",
    name: "Modulo de Clientes",
    category: "core",
    description: "Base del CRM: clientes, estado comercial y seguimiento.",
  },
  agent_management: {
    key: "agent_management",
    name: "Gestion de Usuarios y Roles",
    category: "core",
    description: "Usuarios, roles operativos y permisos por tenant u operacion.",
  },
  custom_dispositions: {
    key: "custom_dispositions",
    name: "Tipificacion Personalizada",
    category: "operations",
    description: "Estados y flujos adaptados al negocio de cada empresa.",
    requiredModules: ["clients"],
  },
  email: {
    key: "email",
    name: "Modulo de Correo",
    category: "communication",
    description: "Envio de emails, cuentas remitentes y trazabilidad.",
    requiredModules: ["clients"],
  },
  whatsapp: {
    key: "whatsapp",
    name: "Modulo de WhatsApp",
    category: "communication",
    description: "Mensajeria y seguimiento conversacional por cliente.",
    requiredModules: ["clients"],
  },
  calls: {
    key: "calls",
    name: "Modulo de Llamadas",
    category: "communication",
    description: "Llamadas, historial, marcacion y soporte operativo.",
    requiredModules: ["clients", "agent_management"],
  },
  calendar: {
    key: "calendar",
    name: "Modulo de Calendario",
    category: "operations",
    description: "Agenda comercial, recordatorios y seguimiento programado.",
    requiredModules: ["clients"],
  },
  reports: {
    key: "reports",
    name: "Modulo de Reportes",
    category: "analytics",
    description: "Indicadores, exportaciones y analitica por empresa.",
    requiredModules: ["clients"],
  },
};

export const productPackageBlueprints = {
  starter: ["clients", "agent_management"] satisfies ProductModuleKey[],
  growth: [
    "clients",
    "agent_management",
    "custom_dispositions",
    "calls",
    "reports",
  ] satisfies ProductModuleKey[],
  enterprise: [
    "clients",
    "agent_management",
    "custom_dispositions",
    "email",
    "whatsapp",
    "calls",
    "calendar",
    "reports",
  ] satisfies ProductModuleKey[],
} as const;
