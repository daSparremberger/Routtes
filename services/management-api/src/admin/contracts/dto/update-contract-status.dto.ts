import { IsEnum } from 'class-validator';

export class UpdateContractStatusDto {
  @IsEnum(['active', 'suspended', 'terminated'])
  status: 'active' | 'suspended' | 'terminated';
}
