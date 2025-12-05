import { IsString, IsNotEmpty, IsNumber, IsPositive, IsISO8601 } from 'class-validator';

export class AdminCreateRiddleDto {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsString()
  @IsNotEmpty()
  answer: string;

  @IsNumber()
  @IsPositive()
  value: number;

  @IsISO8601()
  @IsNotEmpty()
  expiresAt: string;
}
