
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RiddleDocument = Riddle & Document;

@Schema()
export class Riddle {
  @Prop({ required: true })
  question: string;

  @Prop({ required: true })
  answerHash: string;

  @Prop({ required: true, type: Number })
  entryFee: number;

  @Prop({ required: true, type: Number })
  prizePool: number;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: null })
  lastUsedAt: Date;
}

export const RiddleSchema = SchemaFactory.createForClass(Riddle);
