export const DEFAULT_AGENT_TIMEZONE = "America/Bogota";

export const COMMON_TIMEZONE_OPTIONS = [
  { value: "America/Bogota", label: "Bogota (UTC-5)" },
  { value: "America/Mexico_City", label: "Ciudad de Mexico (UTC-6)" },
  { value: "America/Lima", label: "Lima (UTC-5)" },
  { value: "America/Santiago", label: "Santiago (UTC-4)" },
  { value: "America/Caracas", label: "Caracas (UTC-4)" },
  { value: "America/New_York", label: "New York (UTC-4/-5)" },
  { value: "America/Los_Angeles", label: "Los Angeles (UTC-7/-8)" },
  { value: "Europe/Madrid", label: "Madrid (UTC+1/+2)" },
  { value: "Europe/London", label: "Londres (UTC+0/+1)" },
  { value: "UTC", label: "UTC" },
] as const;

export function formatTimeZoneLabel(value: string | null | undefined) {
  const zone = value?.trim();
  if (!zone) return DEFAULT_AGENT_TIMEZONE;

  return (
    COMMON_TIMEZONE_OPTIONS.find((option) => option.value === zone)?.label ?? zone
  );
}
