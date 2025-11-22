import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BlockchainEventService } from './blockchain-event.service';
import { BlockchainController } from './blockchain.controller';
import { RetryModule } from '../retry/retry.module';

@Module({
  imports: [ConfigModule, RetryModule],
  controllers: [BlockchainController],
  providers: [BlockchainEventService],
  exports: [BlockchainEventService],
})
export class BlockchainModule {}
