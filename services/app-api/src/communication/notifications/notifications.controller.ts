import { Controller, Put, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtPayload } from '@routtes/shared';
import { NotificationsService } from './notifications.service';
import { UpdateDeviceTokenDto } from './dto/update-device-token.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Put('device-token')
  async updateDeviceToken(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateDeviceTokenDto,
  ): Promise<{ message: string }> {
    await this.service.updateFcmToken(user.sub, dto.token);
    return { message: 'Token atualizado com sucesso' };
  }
}
