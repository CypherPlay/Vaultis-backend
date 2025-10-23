import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Riddle, RiddleSchema } from '../schemas/riddle.schema';
import { RiddleController } from './riddle.controller';
import { RiddleService } from './riddle.service';
import { RiddleManagerService } from './riddle-manager.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Riddle.name, schema: RiddleSchema }]),
  ],
  providers: [RiddleService, RiddleManagerService],
  controllers: [RiddleController],
  exports: [RiddleService, RiddleManagerService],
})
export class RiddleModule {}
