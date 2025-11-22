import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BlockchainEventService } from './blockchain-event.service';
import { BlockchainController } from './blockchain.controller';
import { RetryModule } from '../retry/retry.module';
import { BlockchainPollerService } from './blockchain-poller.service';

@Module({
  imports: [ConfigModule, RetryModule],
  controllers: [BlockchainController],
  providers: [BlockchainEventService, BlockchainPollerService],
  exports: [BlockchainEventService],
})
export class BlockchainModule {}
