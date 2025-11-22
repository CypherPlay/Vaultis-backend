import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BlockchainEventService } from './blockchain-event.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BlockchainPollerService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainPollerService.name);
  private lastProcessedBlock: number = 0;

  constructor(
    private readonly blockchainEventService: BlockchainEventService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    // Initialize lastProcessedBlock from config or a persistent store
    // For now, we'll start from the latest block on service init
    try {
      const latestBlock = await this.blockchainEventService.getLatestBlockNumber();
      this.lastProcessedBlock = latestBlock;
      this.logger.log(`Initialized lastProcessedBlock to ${this.lastProcessedBlock}`);
    } catch (error) {
      this.logger.error('Failed to initialize lastProcessedBlock:', error);
      // Depending on the error, you might want to exit or start from block 0
    }
  }

  @Cron(CronExpression.EVERY_10_SECONDS) // Poll every 10 seconds
  async handleCron() {
    this.logger.debug('Polling for blockchain events...');

    if (!this.blockchainEventService.isConnected()) {
      this.logger.warn('BlockchainEventService is not connected. Skipping polling.');
      return;
    }

    try {
      const currentBlock = await this.blockchainEventService.getLatestBlockNumber();

      if (currentBlock <= this.lastProcessedBlock) {
        this.logger.debug(`No new blocks since last poll. Current: ${currentBlock}, Last processed: ${this.lastProcessedBlock}`);
        return;
      }

      this.logger.log(`Fetching events from block ${this.lastProcessedBlock + 1} to ${currentBlock}`);

      const filter = this.blockchainEventService.getContract().filters.purchaseRetry();
      const events = await this.blockchainEventService.getContract().queryFilter(filter, this.lastProcessedBlock + 1, currentBlock);

      if (events.length > 0) {
        this.logger.log(`Found ${events.length} new purchaseRetry events.`);
        for (const event of events) {
          if ('args' in event) { // Type guard for EventLog
            const userAddress = event.args[0];
            const quantity = event.args[1];
            await this.blockchainEventService.handlePurchaseRetryEvent(userAddress, quantity, event);
          } else {
            this.logger.warn(`Skipping event without args: ${event.transactionHash}`);
          }
        }
      } else {
        this.logger.debug('No new purchaseRetry events found.');
      }

      this.lastProcessedBlock = currentBlock;
      this.logger.log(`Successfully processed up to block ${this.lastProcessedBlock}`);
    } catch (error) {
      this.logger.error('Error during blockchain polling:', error);
    }
  }
}
