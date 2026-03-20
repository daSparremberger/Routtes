export class CreateAuditLogDto {
  actorId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  tenantId?: string;
  metadata?: Record<string, unknown>;
}
