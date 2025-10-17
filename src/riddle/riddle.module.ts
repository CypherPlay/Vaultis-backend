import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Riddle, RiddleSchema } from '../schemas/riddle.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Riddle.name, schema: RiddleSchema }]),
  ],
  providers: [],
  controllers: [],
})
export class RiddleModule {}
