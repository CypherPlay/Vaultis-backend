import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Guess } from './guess.schema';
import { LeaderboardEntry } from './leaderboard-entry.schema';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  walletAddress: string;

  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Guess' }] })
  guesses: Types.Array<Guess>;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'LeaderboardEntry' }] })
  leaderboardEntries: Types.Array<LeaderboardEntry>;
}

export const UserSchema = SchemaFactory.createForClass(User);
