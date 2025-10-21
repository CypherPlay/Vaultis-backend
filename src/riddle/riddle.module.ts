import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Riddle, RiddleSchema } from '../schemas/riddle.schema';
import { RiddleService } from './riddle.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Riddle.name, schema: RiddleSchema }]),
  ],
  providers: [RiddleService],
  exports: [RiddleService],
})
export class RiddleModule {}
