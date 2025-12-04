import { IsString, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

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
}
