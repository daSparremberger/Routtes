import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { FcmService } from '../fcm/fcm.service';

@Injectable()
export class ExecutionStartedHandler {
  private readonly logger = new Logger(ExecutionStartedHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fcm: FcmService,
  ) {}

  async handle(payload: Record<string, any>): Promise<void> {
    const { executionId, tenantId, routeName } = payload;

    const managers = await this.prisma.users.findMany({
      where: {
        tenant_id: tenantId,
        role: 'manager',
        status: 'active',
        fcm_token: { not: null },
      },
      select: { id: true, fcm_token: true },
    });

    this.logger.log(
      `EXECUTION_STARTED: notifying ${managers.length} managers for execution ${executionId}`,
    );

    await Promise.allSettled(
      managers.map((m) =>
        this.fcm.sendToUser({
          userId: m.id,
          tenantId,
          fcmToken: m.fcm_token!,
          title: 'Rota iniciada',
          body: `A rota "${routeName}" foi iniciada`,
          data: { type: 'EXECUTION_STARTED', executionId },
        }),
      ),
    );
  }
}
