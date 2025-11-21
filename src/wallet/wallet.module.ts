import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../schemas/user.schema';
import { WalletService } from './wallet.service';
import { RetryModule } from '../retry/retry.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    RetryModule,
  ],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
