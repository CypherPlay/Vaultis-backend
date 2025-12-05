import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserHistoryController } from './user-history.controller';

@Module({
  providers: [UserService],
  controllers: [UserHistoryController],
})
export class UserModule {}
