import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RetryInventoryService } from './retry-inventory.service';
import { User, UserSchema } from '../schemas/user.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  providers: [RetryInventoryService],
  exports: [RetryInventoryService],
})
export class RetryModule {}
