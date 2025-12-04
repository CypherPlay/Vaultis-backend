import { IsString, IsOptional, IsNumber, IsPositive, IsDateString } from 'class-validator';

export class UpdateRiddleDto {
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
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsDateString()
  lastUsedAt?: string;
}
