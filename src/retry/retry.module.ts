import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RetryInventoryService } from './retry-inventory.service';
import { User, UserSchema } from '../schemas/user.schema';
import { RetryInventory, RetryInventorySchema } from '../schemas/retry-inventory.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: RetryInventory.name, schema: RetryInventorySchema },
    ]),
  ],
  providers: [RetryInventoryService],
  exports: [RetryInventoryService],
})
export class RetryModule {}
