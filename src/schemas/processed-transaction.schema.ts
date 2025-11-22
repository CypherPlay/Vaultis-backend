import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProcessedTransactionDocument = ProcessedTransaction & Document;

@Schema({ timestamps: true })
export class ProcessedTransaction {
  @Prop({ required: true, unique: true, index: true })
  transactionHash: string;
}

export const ProcessedTransactionSchema = SchemaFactory.createForClass(ProcessedTransaction);
