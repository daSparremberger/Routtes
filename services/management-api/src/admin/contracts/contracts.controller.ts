import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractStatusDto } from './dto/update-contract-status.dto';
import { JwtPayload, UserRole } from '@routtes/shared';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN)
@Controller('admin/contracts')
export class ContractsController {
  constructor(private readonly service: ContractsService) {}

  @Post()
  create(@Body() dto: CreateContractDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user.sub);
  }

  @Get()
  findAll(@Query('organizationId') organizationId?: string) {
    return this.service.findAll(organizationId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContractStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateStatus(id, dto, user.sub);
  }
}
