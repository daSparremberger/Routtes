import { IsEnum } from 'class-validator';

export enum OptimizationCriteria {
  DISTANCE = 'distance',
  TIME = 'time',
}

export class OptimizeRouteDto {
  @IsEnum(OptimizationCriteria)
  criteria: OptimizationCriteria;
}
