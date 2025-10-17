import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';
import { Riddle } from './riddle.schema';

export type GuessDocument = Guess & Document;

@Schema()
export class Guess {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Riddle', required: true })
  riddleId: Types.ObjectId;

  @Prop({ required: true })
  guessText: string;

  @Prop({ default: false })
  isCorrect: boolean;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const GuessSchema = SchemaFactory.createForClass(Guess);
