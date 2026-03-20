import { IsArray, IsString } from 'class-validator';

export class SetTenantModulesDto {
  @IsArray()
  @IsString({ each: true })
  moduleIds: string[];
}
