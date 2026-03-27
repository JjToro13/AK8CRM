-- Revoke default PUBLIC execute access from sensitive operational functions.
-- Postgres grants EXECUTE on new functions to PUBLIC unless explicitly revoked.

revoke all on function public.assign_leads_atomic(uuid, integer, uuid, text) from public;
revoke all on function public.assign_leads_atomic(uuid, integer, uuid, text) from anon;
grant execute on function public.assign_leads_atomic(uuid, integer, uuid, text) to authenticated;
grant execute on function public.assign_leads_atomic(uuid, integer, uuid, text) to service_role;

revoke all on function public.get_recent_calls(uuid) from public;
revoke all on function public.get_recent_calls(uuid) from anon;
grant execute on function public.get_recent_calls(uuid) to authenticated;
grant execute on function public.get_recent_calls(uuid) to service_role;

revoke all on function public.get_agent_assigned_counts() from public;
revoke all on function public.get_agent_assigned_counts() from anon;
grant execute on function public.get_agent_assigned_counts() to authenticated;
grant execute on function public.get_agent_assigned_counts() to service_role;

revoke all on function public.get_available_campaigns() from public;
revoke all on function public.get_available_campaigns() from anon;
grant execute on function public.get_available_campaigns() to authenticated;
grant execute on function public.get_available_campaigns() to service_role;

revoke all on function public.get_campaign_stats() from public;
revoke all on function public.get_campaign_stats() from anon;
grant execute on function public.get_campaign_stats() to authenticated;
grant execute on function public.get_campaign_stats() to service_role;
