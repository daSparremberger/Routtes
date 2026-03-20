import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PrismaService } from '../../../prisma/prisma.service';

export interface FcmSendParams {
  userId: string;
  tenantId: string;
  fcmToken: string;
  title: string;
  body: string;
  data: Record<string, string>;
}

@Injectable()
export class FcmService {
  private readonly logger = new Logger(FcmService.name);

  constructor(private readonly prisma: PrismaService) {}

  async sendToUser(params: FcmSendParams): Promise<void> {
    const { userId, tenantId, fcmToken, title, body, data } = params;

    try {
      const fcmMessageId = await admin.messaging().send({
        token: fcmToken,
        notification: { title, body },
        data,
        android: { priority: 'high' },
      });

      await this.prisma.notifications.create({
        data: {
          tenant_id: tenantId,
          user_id: userId,
          type: data.type ?? 'unknown',
          payload: data as any,
          sent_at: new Date(),
          fcm_message_id: fcmMessageId,
        },
      });
    } catch (err: any) {
      const isExpiredToken =
        err?.code === 'messaging/registration-token-not-registered' ||
        err?.code === 'messaging/invalid-registration-token';

      if (isExpiredToken) {
        await this.prisma.users.update({
          where: { id: userId, tenant_id: tenantId },
          data: { fcm_token: null },
        });
        this.logger.log(`FCM token cleared for user ${userId} (expired/invalid)`);
        return;
      }

      this.logger.warn(`FCM send failed for user ${userId}: ${err?.message}`);
      throw err;
    }
  }
}
