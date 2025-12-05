import { IsString, IsNotEmpty, IsISO8601, IsMongoId, Matches } from 'class-validator';

export class FinalizePrizeDto {

  @IsString()
  @IsNotEmpty()
  winnerAddress: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^0x[a-fA-F0-9]{64}$/, { message: 'Invalid transaction hash format' })
  transactionHash: string;

  @IsISO8601()
  @IsNotEmpty()
  date: string;
}
