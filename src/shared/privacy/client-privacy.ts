export type ClientPrivacySettings = {
  maskPhoneNumbers: boolean;
  maskEmails: boolean;
};

export const defaultClientPrivacySettings: ClientPrivacySettings = {
  maskPhoneNumbers: false,
  maskEmails: false,
};

export const pendingClientPrivacySettings: ClientPrivacySettings = {
  maskPhoneNumbers: true,
  maskEmails: true,
};

export function normalizeClientPrivacySettings(
  value?: Partial<ClientPrivacySettings> | null,
): ClientPrivacySettings {
  return {
    maskPhoneNumbers: Boolean(value?.maskPhoneNumbers),
    maskEmails: Boolean(value?.maskEmails),
  };
}

export function maskPhoneNumber(value?: string | null) {
  const text = value?.trim();
  if (!text) return "";

  const digits = text.replace(/\D/g, "");
  if (digits.length <= 4) return "••••";

  return `${"•".repeat(Math.max(4, digits.length - 4))}${digits.slice(-4)}`;
}

export function maskEmail(value?: string | null) {
  const text = value?.trim();
  if (!text) return "";

  const [user, domain] = text.split("@");
  if (!user || !domain) return "••••";

  const visibleUser = user.length <= 2 ? user.slice(0, 1) : user.slice(0, 2);
  const domainParts = domain.split(".");
  const domainName = domainParts[0] ?? "";
  const domainSuffix = domainParts.slice(1).join(".");
  const visibleDomain = domainName ? domainName.slice(0, 1) : "";

  return `${visibleUser}${"•".repeat(4)}@${visibleDomain}${"•".repeat(3)}${
    domainSuffix ? `.${domainSuffix}` : ""
  }`;
}

export function displayClientPhone(
  value: string | null | undefined,
  settings: ClientPrivacySettings,
) {
  if (!value) return "";
  return settings.maskPhoneNumbers ? maskPhoneNumber(value) : value;
}

export function displayClientEmail(
  value: string | null | undefined,
  settings: ClientPrivacySettings,
) {
  if (!value) return "";
  return settings.maskEmails ? maskEmail(value) : value;
}
