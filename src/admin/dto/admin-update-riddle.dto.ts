import { IsString, IsOptional, IsNumber, IsPositive, IsISO8601 } from 'class-validator';

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

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}
