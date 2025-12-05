import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';
import { Riddle } from './riddle.schema';

export type GuessDocument = Guess & Document;

@Schema({ timestamps: true })
export class Guess {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Riddle', required: true, index: true })
  riddleId: Types.ObjectId;

  @Prop({ required: true })
  guessText: string;

  @Prop({ default: false })
  isCorrect: boolean;
}

GuessSchema.index({ userId: 1, createdAt: -1 });

export const GuessSchema = SchemaFactory.createForClass(Guess);
