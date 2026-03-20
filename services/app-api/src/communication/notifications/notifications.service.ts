import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async updateFcmToken(userId: string, token: string): Promise<void> {
    await this.prisma.users.update({
      where: { id: userId },
      data: { fcm_token: token },
    });
  }
}
