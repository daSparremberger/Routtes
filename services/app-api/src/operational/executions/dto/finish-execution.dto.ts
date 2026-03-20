import { IsNumber, IsOptional } from 'class-validator';

export class FinishExecutionDto {
  @IsNumber()
  @IsOptional()
  total_km?: number;
}
