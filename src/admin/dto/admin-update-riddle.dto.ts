import { IsString, IsOptional, IsNumber, IsPositive } from 'class-validator';

export class AdminUpdateRiddleDto {
  @IsOptional()
  @IsString()
  question?: string;

  @IsOptional()
  @IsString()
  answer?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  value?: number;
}
