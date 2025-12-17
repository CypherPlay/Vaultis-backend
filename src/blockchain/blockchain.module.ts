import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BlockchainEventService } from './blockchain-event.service';
import { BlockchainController } from './blockchain.controller';
import { RetryModule } from '../retry/retry.module';
import { BlockchainPollerService } from './blockchain-poller.service';
import { BlockchainEvent, BlockchainEventSchema } from '../schemas/blockchain-event.schema';
import { BlockchainEventRepository } from './blockchain-event.repository';
import { LoggerModule } from '../logger/logger.module';
import { BlockchainRPCService } from './blockchain-rpc.service';

@Module({
  imports: [
    ConfigModule,
    RetryModule,
    MongooseModule.forFeature([{ name: BlockchainEvent.name, schema: BlockchainEventSchema }]),
    LoggerModule,
  ],
  controllers: [BlockchainController],
  providers: [BlockchainEventService, BlockchainPollerService, BlockchainEventRepository, BlockchainRPCService],
  exports: [BlockchainEventService, BlockchainEventRepository, BlockchainPollerService, BlockchainRPCService],
})
export class BlockchainModule {}
