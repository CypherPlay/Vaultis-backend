import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BlockchainEventDocument = BlockchainEvent & Document;

@Schema()
export class BlockchainEvent {
  @Prop({ required: true, index: true })
  txHash: string;

  @Prop({ required: true })
  eventType: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ type: Object })
  data: Record<string, any>;

  @Prop({ required: true, index: true })
  blockNumber: number;
}

export const BlockchainEventSchema = SchemaFactory.createForClass(BlockchainEvent);
