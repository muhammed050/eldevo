export function resolveTaskOrganization(agentOrganizationId: string, membershipOrganizationId: string) {
  if (!agentOrganizationId || agentOrganizationId !== membershipOrganizationId) {
    throw new Error("Organization membership mismatch");
  }
  return agentOrganizationId;
}
