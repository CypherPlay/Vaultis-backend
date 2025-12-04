import { IsString, IsNotEmpty, IsNumber, IsPositive, IsOptional, IsDateString } from 'class-validator';

export class CreateRiddleDto {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsString()
  @IsNotEmpty()
  answer: string;

  @IsNumber()
  @IsPositive()
  value: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsDateString()
  lastUsedAt?: string;
}
