import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const shouldApply = process.argv.includes("--apply");

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them before running this script.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

function buildTargetEmail(currentEmail, tenantSlug) {
  const localPart = normalizeEmail(currentEmail).split("@")[0];
  return `${localPart}@${tenantSlug}.ak8crm.com`;
}

async function fetchAgents() {
  const { data, error } = await supabase
    .from("agents")
    .select("id, email, role, operation_id")
    .neq("role", "dev")
    .not("operation_id", "is", null)
    .order("email");

  if (error) {
    throw new Error(`Cannot read agents: ${error.message}`);
  }

  return data ?? [];
}

async function fetchAuthUsersByIds(userIds) {
  const pending = new Set(userIds);
  const authUsers = new Map();
  const perPage = 200;

  for (let page = 1; page <= 50 && pending.size > 0; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new Error(`Cannot read auth users: ${error.message}`);
    }

    const users = data?.users ?? [];
    for (const user of users) {
      if (pending.has(user.id)) {
        authUsers.set(user.id, user);
        pending.delete(user.id);
      }
    }

    if (users.length < perPage) {
      break;
    }
  }

  return authUsers;
}

async function fetchOperations(operationIds) {
  const { data, error } = await supabase
    .from("operations")
    .select("id, tenant_id")
    .in("id", operationIds);

  if (error) {
    throw new Error(`Cannot read operations: ${error.message}`);
  }

  return data ?? [];
}

async function fetchTenants(tenantIds) {
  const { data, error } = await supabase
    .from("tenants")
    .select("id, slug")
    .in("id", tenantIds);

  if (error) {
    throw new Error(`Cannot read tenants: ${error.message}`);
  }

  return data ?? [];
}

async function main() {
  const agents = await fetchAgents();

  if (agents.length === 0) {
    console.log("No non-dev agents found.");
    return;
  }

  const operationIds = [...new Set(agents.map((agent) => agent.operation_id).filter(Boolean))];
  const operations = await fetchOperations(operationIds);
  const operationById = new Map(operations.map((operation) => [operation.id, operation]));

  const tenantIds = [
    ...new Set(operations.map((operation) => operation.tenant_id).filter(Boolean)),
  ];
  const tenants = await fetchTenants(tenantIds);
  const tenantSlugById = new Map(
    tenants.map((tenant) => [tenant.id, normalizeEmail(tenant.slug)]),
  );
  const authUsersById = await fetchAuthUsersByIds(agents.map((agent) => agent.id));

  const changes = agents
    .map((agent) => {
      const operation = operationById.get(agent.operation_id);
      const tenantSlug = operation ? tenantSlugById.get(operation.tenant_id) : null;
      const authUser = authUsersById.get(agent.id);
      const authEmail = normalizeEmail(authUser?.email);

      if (!tenantSlug) {
        return {
          id: agent.id,
          current_email: agent.email,
          auth_email: authEmail || null,
          target_email: null,
          skipped_reason: "missing tenant slug",
        };
      }

      if (!authEmail) {
        return {
          id: agent.id,
          current_email: normalizeEmail(agent.email),
          auth_email: null,
          target_email: null,
          skipped_reason: "auth user not found",
        };
      }

      const agentEmail = normalizeEmail(agent.email);
      const targetEmail = buildTargetEmail(agentEmail, tenantSlug);

      return {
        id: agent.id,
        current_email: agentEmail,
        auth_email: authEmail,
        target_email: targetEmail,
        skipped_reason: authEmail === targetEmail ? "already synced" : null,
      };
    })
    .filter((row) => row.target_email || row.skipped_reason);

  console.table(changes);

  const pending = changes.filter((row) => !row.skipped_reason);

  if (!shouldApply) {
    console.log("");
    console.log(
      `Dry run only. ${pending.length} user(s) need auth email updates. Re-run with --apply to update Auth.`,
    );
    return;
  }

  for (const row of pending) {
    const { error } = await supabase.auth.admin.updateUserById(row.id, {
      email: row.target_email,
      email_confirm: true,
    });

    if (error) {
      throw new Error(
        `Failed updating ${row.current_email} -> ${row.target_email}: ${error.message}`,
      );
    }

    console.log(`Updated ${row.current_email} -> ${row.target_email}`);
  }

  console.log("");
  console.log(`Done. Updated ${pending.length} user(s) in Auth.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
