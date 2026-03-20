import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../shared/audit/audit.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class InvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async generateManagerInvite(dto: CreateInviteDto, actorId: string) {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Cross-schema: writes to app.invite_tokens via $queryRaw (no FK from management schema)
    const result = await this.prisma.$queryRaw<{ id: string; token: string; expires_at: Date }[]>`
      INSERT INTO app.invite_tokens (id, tenant_id, token, role, email, expires_at, created_by)
      VALUES (
        gen_random_uuid(),
        ${dto.tenantId}::uuid,
        ${token},
        'manager',
        ${dto.email ?? null},
        ${expiresAt},
        ${actorId}::uuid
      )
      RETURNING id, token, expires_at
    `;

    await this.audit.log({
      actorId,
      action: 'invite.manager_created',
      resourceType: 'invite_token',
      resourceId: result[0].id,
      metadata: { tenantId: dto.tenantId, email: dto.email } as Record<string, unknown>,
    });

    return result[0];
  }

  async resendInvite(inviteId: string, actorId: string) {
    const existing = await this.prisma.$queryRaw<{ id: string; token: string; used_at: Date | null }[]>`
      SELECT id, token, used_at FROM app.invite_tokens WHERE id = ${inviteId}::uuid
    `;
    if (!existing.length) throw new NotFoundException(`Invite ${inviteId} not found`);
    if (existing[0].used_at) throw new NotFoundException('Invite already used');

    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.$executeRaw`
      UPDATE app.invite_tokens
      SET expires_at = ${newExpiresAt}
      WHERE id = ${inviteId}::uuid
    `;

    await this.audit.log({
      actorId,
      action: 'invite.resent',
      resourceType: 'invite_token',
      resourceId: inviteId,
    });

    return { id: inviteId, token: existing[0].token, expiresAt: newExpiresAt };
  }

  async listByTenant(tenantId: string) {
    return this.prisma.$queryRaw<{ id: string; email: string; expires_at: Date; used_at: Date | null }[]>`
      SELECT id, email, expires_at, used_at, created_by
      FROM app.invite_tokens
      WHERE tenant_id = ${tenantId}::uuid AND role = 'manager'
      ORDER BY expires_at DESC
    `;
  }
}
