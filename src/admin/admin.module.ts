import { Module } from '@nestjs/common';
import { AdminRiddleController } from './admin-riddle.controller';
import { AuthModule } from '../auth/auth.module';
import { RiddleModule } from '../riddle/riddle.module';

@Module({
  imports: [AuthModule, RiddleModule],
  controllers: [AdminRiddleController],
})
export class AdminModule {}
