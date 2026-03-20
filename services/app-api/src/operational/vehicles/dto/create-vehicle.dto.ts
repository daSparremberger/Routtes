import { IsString, IsNotEmpty, IsInt, IsOptional, Min } from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  @IsNotEmpty()
  plate: string;

  @IsInt()
  @Min(1)
  capacity: number;

  @IsString()
  @IsOptional()
  model?: string;

  @IsString()
  @IsOptional()
  totem_id?: string;
}
