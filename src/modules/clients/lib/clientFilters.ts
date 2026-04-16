export type ClientBalanceRangeFilter =
  | "all"
  | "negative"
  | "zero_to_999"
  | "1000_to_4999"
  | "5000_plus";

export const CLIENT_BALANCE_RANGE_OPTIONS: Array<{
  value: ClientBalanceRangeFilter;
  label: string;
}> = [
  { value: "all", label: "Todos los saldos" },
  { value: "negative", label: "Saldo negativo" },
  { value: "zero_to_999", label: "Saldo de 0 a 999" },
  { value: "1000_to_4999", label: "Saldo de 1,000 a 4,999" },
  { value: "5000_plus", label: "Saldo de 5,000 o mas" },
];

export function getClientBalanceRangeLabel(
  balanceRange: ClientBalanceRangeFilter,
) {
  return (
    CLIENT_BALANCE_RANGE_OPTIONS.find((option) => option.value === balanceRange)
      ?.label ?? "Saldo"
  );
}

export function getClientBalanceRangeBounds(
  balanceRange: ClientBalanceRangeFilter,
) {
  switch (balanceRange) {
    case "negative":
      return { min: null, max: 0 };
    case "zero_to_999":
      return { min: 0, max: 1000 };
    case "1000_to_4999":
      return { min: 1000, max: 5000 };
    case "5000_plus":
      return { min: 5000, max: null };
    default:
      return { min: null, max: null };
  }
}
