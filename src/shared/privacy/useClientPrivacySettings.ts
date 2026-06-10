import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../integrations/supabase/client";
import {
  defaultClientPrivacySettings,
  normalizeClientPrivacySettings,
  pendingClientPrivacySettings,
  type ClientPrivacySettings,
} from "./client-privacy";

export function useClientPrivacySettings() {
  const { activeOperationId, canSeeAllOperations, operationId, user } = useAuth();
  const [settings, setSettings] = useState<ClientPrivacySettings>(
    pendingClientPrivacySettings,
  );
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const targetOperationId = useMemo(
    () => (canSeeAllOperations ? activeOperationId : operationId) ?? null,
    [activeOperationId, canSeeAllOperations, operationId],
  );

  useEffect(() => {
    const reload = () => setReloadKey((current) => current + 1);

    window.addEventListener("cm:operation-changed", reload);
    window.addEventListener("cm:operation-settings-changed", reload);

    return () => {
      window.removeEventListener("cm:operation-changed", reload);
      window.removeEventListener("cm:operation-settings-changed", reload);
    };
  }, []);

  useEffect(() => {
    if (!user || !targetOperationId) {
      setSettings(defaultClientPrivacySettings);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setSettings(pendingClientPrivacySettings);

    const loadSettings = async () => {
      const { data, error } = await supabase.rpc(
        "get_operation_client_privacy_settings",
        {
          p_operation_id: targetOperationId,
        },
      );

      if (cancelled) return;

      if (error) {
        console.error("[client-privacy] error:", error);
        setSettings(defaultClientPrivacySettings);
        setLoading(false);
        return;
      }

      const row = Array.isArray(data) ? data[0] : data;
      setSettings(
        normalizeClientPrivacySettings({
          maskPhoneNumbers: row?.client_phone_masked === true,
          maskEmails: row?.client_email_masked === true,
        }),
      );
      setLoading(false);
    };

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, [reloadKey, targetOperationId, user]);

  return { loading, settings };
}
