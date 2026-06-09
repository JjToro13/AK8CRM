const OPERATION_2FA_REQUIRED_MESSAGE = "operation 2fa verification required";

export function isOperation2faRequiredError(error: unknown) {
  const message =
    typeof error === "string"
      ? error
      : error && typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : "";

  return message.toLowerCase().includes(OPERATION_2FA_REQUIRED_MESSAGE);
}

export function notifyOperation2faRequired() {
  window.dispatchEvent(new CustomEvent("cm:operation-2fa-required"));
}
