import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from './user.schema';

export type RetryInventoryDocument = RetryInventory & Document;

@Schema({ timestamps: true })
export class RetryInventory {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, default: 0 })
  retryCount: number;


}

export const RetryInventorySchema = SchemaFactory.createForClass(RetryInventory);
