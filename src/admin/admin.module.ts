import { Module } from '@nestjs/common';
import { AdminRiddleController } from './admin-riddle.controller';
import { AdminRiddleService } from './admin-riddle.service';
import { AuthModule } from '../auth/auth.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Riddle, RiddleSchema } from '../schemas/riddle.schema';

@Module({
  imports: [AuthModule, MongooseModule.forFeature([{ name: Riddle.name, schema: RiddleSchema }])],
  controllers: [AdminRiddleController],
  providers: [AdminRiddleService],
})
export class AdminModule {}
