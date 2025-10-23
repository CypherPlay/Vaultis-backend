
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RiddleDocument = Riddle & Document;

@Schema()
export class Riddle {
  @Prop({ required: true })
  question: string;

  @Prop({ required: true })
  answerHash: string;

  @Prop({ required: true, type: Decimal128 })
  entryFee: Decimal128;

  @Prop({ required: true, type: Decimal128 })
  prizePool: Decimal128;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: null })
  lastUsedAt: Date;
}

export const RiddleSchema = SchemaFactory.createForClass(Riddle);
