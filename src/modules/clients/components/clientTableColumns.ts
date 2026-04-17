export type ClientTableColumnKey =
  | "status"
  | "first_name"
  | "last_name"
  | "email"
  | "phone_number"
  | "country"
  | "source"
  | "assigned_agent"
  | "funnel"
  | "deposit_amount"
  | "net_deposit"
  | "user_balance"
  | "investment_date"
  | "serial"
  | "attempts"
  | "comments"
  | "created_at";

export type ClientTableSortKey =
  | "first_name"
  | "last_name"
  | "email"
  | "phone_number"
  | "country"
  | "source"
  | "funnel"
  | "deposit_amount"
  | "net_deposit"
  | "user_balance"
  | "investment_date"
  | "serial"
  | "attempts"
  | "created_at";

export type ClientTableSortDirection = "asc" | "desc";

export type ClientTableTextFilterKey =
  | "first_name"
  | "last_name"
  | "email"
  | "phone_number"
  | "source"
  | "serial";

export type ClientTableTextFilters = Record<ClientTableTextFilterKey, string>;

export type ClientTableColumnConfig = {
  key: ClientTableColumnKey;
  label: string;
  width: string;
  sortable?: boolean;
  sortKey?: ClientTableSortKey;
  defaultVisible?: boolean;
  textFilterKey?: ClientTableTextFilterKey;
  filterPlaceholder?: string;
  usesStatusFilter?: boolean;
  usesCountryFilter?: boolean;
};

export const CLIENT_TABLE_COLUMNS: ClientTableColumnConfig[] = [
  {
    key: "status",
    label: "Estado",
    width: "170px",
    defaultVisible: true,
    usesStatusFilter: true,
  },
  {
    key: "first_name",
    label: "Nombre",
    width: "140px",
    sortable: true,
    sortKey: "first_name",
    defaultVisible: true,
    textFilterKey: "first_name",
    filterPlaceholder: "Buscar nombre...",
  },
  {
    key: "last_name",
    label: "Apellido",
    width: "180px",
    sortable: true,
    sortKey: "last_name",
    defaultVisible: true,
    textFilterKey: "last_name",
    filterPlaceholder: "Buscar apellido...",
  },
  {
    key: "email",
    label: "Email",
    width: "260px",
    sortable: true,
    sortKey: "email",
    defaultVisible: true,
    textFilterKey: "email",
    filterPlaceholder: "Buscar email...",
  },
  {
    key: "phone_number",
    label: "Telefono",
    width: "180px",
    sortable: true,
    sortKey: "phone_number",
    defaultVisible: true,
    textFilterKey: "phone_number",
    filterPlaceholder: "Buscar telefono...",
  },
  {
    key: "country",
    label: "Pais",
    width: "88px",
    sortable: true,
    sortKey: "country",
    defaultVisible: true,
    usesCountryFilter: true,
    filterPlaceholder: "Ej. Mexico",
  },
  {
    key: "source",
    label: "Empresa",
    width: "170px",
    sortable: true,
    sortKey: "source",
    defaultVisible: true,
    textFilterKey: "source",
    filterPlaceholder: "Buscar empresa...",
  },
  {
    key: "assigned_agent",
    label: "Agente",
    width: "170px",
    defaultVisible: true,
  },
  {
    key: "funnel",
    label: "Funnel",
    width: "150px",
    sortable: true,
    sortKey: "funnel",
    defaultVisible: true,
  },
  {
    key: "deposit_amount",
    label: "Depositado",
    width: "150px",
    sortable: true,
    sortKey: "deposit_amount",
    defaultVisible: true,
  },
  {
    key: "net_deposit",
    label: "Deposito neto",
    width: "150px",
    sortable: true,
    sortKey: "net_deposit",
    defaultVisible: true,
  },
  {
    key: "user_balance",
    label: "Balance",
    width: "150px",
    sortable: true,
    sortKey: "user_balance",
    defaultVisible: true,
  },
  {
    key: "investment_date",
    label: "Fecha inversion",
    width: "150px",
    sortable: true,
    sortKey: "investment_date",
    defaultVisible: true,
  },
  {
    key: "serial",
    label: "Serie",
    width: "126px",
    sortable: true,
    sortKey: "serial",
    defaultVisible: true,
    textFilterKey: "serial",
    filterPlaceholder: "Buscar serie...",
  },
  {
    key: "attempts",
    label: "Intentos",
    width: "96px",
    sortable: true,
    sortKey: "attempts",
    defaultVisible: true,
  },
  {
    key: "comments",
    label: "Comentarios",
    width: "320px",
    defaultVisible: true,
  },
  {
    key: "created_at",
    label: "Fecha creacion",
    width: "170px",
    sortable: true,
    sortKey: "created_at",
    defaultVisible: true,
  },
];

export const CLIENT_TABLE_DEFAULT_VISIBLE_COLUMNS = CLIENT_TABLE_COLUMNS
  .filter((column) => column.defaultVisible !== false)
  .map((column) => column.key);

export const CLIENT_TABLE_DEFAULT_TEXT_FILTERS: ClientTableTextFilters = {
  first_name: "",
  last_name: "",
  email: "",
  phone_number: "",
  source: "",
  serial: "",
};

export function buildClientsGridTemplate(visibleColumns: ClientTableColumnKey[]) {
  return CLIENT_TABLE_COLUMNS.filter((column) =>
    visibleColumns.includes(column.key),
  )
    .map((column) => column.width)
    .join(" ");
}
