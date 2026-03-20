import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { InvitesService } from './invites.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import { JwtPayload, UserRole } from '@routtes/shared';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN)
@Controller('admin/invites')
export class InvitesController {
  constructor(private readonly service: InvitesService) {}

  @Post()
  generate(@Body() dto: CreateInviteDto, @CurrentUser() user: JwtPayload) {
    return this.service.generateManagerInvite(dto, user.sub);
  }

  @Post(':id/resend')
  resend(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.service.resendInvite(id, user.sub);
  }

  @Get('tenant/:tenantId')
  listByTenant(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.service.listByTenant(tenantId);
  }
}
