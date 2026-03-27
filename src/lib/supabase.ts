import { supabase } from "../integrations/supabase/client";

export { supabase };

export type {
  Agent,
  AgentAssignment,
  AgentDidCredentials,
  AgentRole,
  Call,
  Client,
  ClientComment,
} from "../shared/types/crm";

export {
  getAgentManagementVisibleRoles,
  getAgentRoleLabel,
  isOperationalAgentRole,
} from "../shared/types/crm";

export { auth } from "../modules/auth/services/auth.service";
export { agents } from "../modules/agents/services/agents.service";
export { clients } from "../modules/clients/services/clients.service";
export { calls } from "../modules/calls/services/calls.service";
export { agentAssignments } from "../modules/assignments/services/agent-assignments.service";
export { emails } from "../modules/emails/services/emails.service";
export { clientComments } from "../modules/comments/services/client-comments.service";
export { didCredentials } from "../modules/did/services/did-credentials.service";
