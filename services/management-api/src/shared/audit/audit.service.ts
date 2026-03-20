import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(dto: CreateAuditLogDto): Promise<void> {
    try {
      await this.prisma.audit_logs.create({
        data: {
          actor_id: dto.actorId,
          action: dto.action,
          resource_type: dto.resourceType,
          resource_id: dto.resourceId,
          tenant_id: dto.tenantId ?? null,
          metadata: (dto.metadata ?? {}) as object,
        },
      });
    } catch (err) {
      const e = err as Error;
      this.logger.error(`Audit log failed: ${e.message}`, e.stack);
    }
  }
}
