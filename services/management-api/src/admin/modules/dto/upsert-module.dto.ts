import { IsString, IsArray, IsOptional, IsEnum } from 'class-validator';

export class UpsertModuleDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dependencies?: string[];

  @IsOptional()
  @IsEnum(['required', 'exclusive_group'])
  dependencyType?: string;
}
