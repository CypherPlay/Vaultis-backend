import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Decimal128, Types } from 'mongoose';
import { Guess } from './guess.schema';

export type RiddleDocument = Riddle & Document;

@Schema()
export class Riddle {
  @Prop({ required: true, unique: true, trim: true })
  question: string;

  @Prop({ required: true, select: false, trim: true, minlength: 1 })
  answer: string;

  @Prop({ default: false })
  seeded: boolean;

  @Prop({ required: true, select: false })
  answerHash: string;

  @Prop({ required: true, type: Types.Decimal128 })
  entryFee: Types.Decimal128;

  @Prop({ required: true, type: Types.Decimal128 })
  prizePool: Types.Decimal128;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: null })
  lastUsedAt: Date;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Guess' }] })
  guesses: Types.Array<Guess>;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  winnerId: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['active', 'solved', 'expired', 'completed'],
    default: 'active',
  })
  status: string;

  @Prop({ default: null })
  winnerAddress: string;

  @Prop({ default: null })
  completedAt: Date;

  @Prop({ default: null })
  prizePayoutHash: string;
}
export const RiddleSchema = SchemaFactory.createForClass(Riddle);
