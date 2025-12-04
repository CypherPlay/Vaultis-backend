import { IsString, IsNotEmpty, IsISO8601 } from 'class-validator';

export class FinalizePrizeDto {
  @IsString()
  @IsNotEmpty()
  riddleId: string;

  @IsString()
  @IsNotEmpty()
  winnerAddress: string;

  @IsString()
  @IsNotEmpty()
  transactionHash: string;

  @IsISO8601()
  @IsNotEmpty()
  date: string;
}
