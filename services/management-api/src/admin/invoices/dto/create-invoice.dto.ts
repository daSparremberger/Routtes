import { IsDateString, IsNumber, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInvoiceDto {
  @IsUUID() contractId: string;
  @IsDateString() competenceMonth: string;
  @Type(() => Number) @IsNumber() @Min(0) value: number;
}
