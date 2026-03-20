import { IsDateString } from 'class-validator';

export class BulkGenerateDto {
  @IsDateString()
  competenceMonth: string; // e.g. '2026-04-01'
}
