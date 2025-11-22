import { IsNotEmpty, IsString, IsObject, IsOptional } from 'class-validator';

export class BlockchainWebhookDto {
  @IsNotEmpty()
  @IsString()
  eventType: string;

  @IsNotEmpty()
  @IsString()
  webhookId: string;

  @IsNotEmpty()
  @IsString()
  timestamp: string;

  @IsObject()
  @IsNotEmpty()
  payload: Record<string, any>;

  @IsOptional()
  @IsString()
  signature?: string; // This will be read from header, but good to have it here if it's ever in body
}
