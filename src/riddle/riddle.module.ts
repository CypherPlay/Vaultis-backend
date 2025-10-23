import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Riddle, RiddleSchema } from '../schemas/riddle.schema';
import { RiddleController } from './riddle.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Riddle.name, schema: RiddleSchema }]),
  ],
  providers: [RiddleService],
  controllers: [RiddleController],
})
export class RiddleModule {}
