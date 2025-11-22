import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { RetryInventoryService } from '../retry/retry-inventory.service';

@Injectable()
export class BlockchainEventService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BlockchainEventService.name);
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private boundHandlePurchaseRetryEvent: ((...args: any[]) => void) | null;

  constructor(
    private readonly configService: ConfigService,
    private readonly retryInventoryService: RetryInventoryService,
  ) {}

  onModuleInit() {
    this.logger.log('Initializing BlockchainEventService...');
    this.connectToBlockchain();
  }

  onModuleDestroy() {
    this.logger.log('Shutting down BlockchainEventService...');
    this.disconnectFromBlockchain();
  }

  private connectToBlockchain() {
    try {
      const rpcUrl = this.configService.get<string>('BLOCKCHAIN_RPC_URL');
      const contractAddress = this.configService.get<string>('BLOCKCHAIN_CONTRACT_ADDRESS');
      const contractAbi = this.configService.get<any[]>('BLOCKCHAIN_CONTRACT_ABI'); // Assuming ABI is loaded from config

      if (!rpcUrl || !contractAddress || !contractAbi) {
        throw new Error('Missing blockchain configuration: please set BLOCKCHAIN_RPC_URL, BLOCKCHAIN_CONTRACT_ADDRESS and BLOCKCHAIN_CONTRACT_ABI');
      }

      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.contract = new ethers.Contract(contractAddress, contractAbi, this.provider);

      this.boundHandlePurchaseRetryEvent = this.handlePurchaseRetryEvent.bind(this);
      this.contract.on('purchaseRetry', this.boundHandlePurchaseRetryEvent!);
      this.logger.log('Connected to blockchain and listening for purchaseRetry events.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to connect to blockchain:', errorMessage);
      throw new Error(`Blockchain connection failed: ${errorMessage}`);
    }
  }

  private disconnectFromBlockchain() {
    if (this.contract && this.boundHandlePurchaseRetryEvent) {
      this.contract.off('purchaseRetry', this.boundHandlePurchaseRetryEvent);
      this.boundHandlePurchaseRetryEvent = null; // Clear the reference
      this.logger.log('Disconnected from blockchain events.');
    }
  }

  private async handlePurchaseRetryEvent(userAddress: string, quantity: bigint, event: ethers.Log) {
    this.logger.log(`Received purchaseRetry event: userAddress=${userAddress}, quantity=${quantity.toString()}`);
    if (!ethers.isAddress(userAddress)) {
      this.logger.error(`Invalid userAddress received: ${userAddress}`);
      return;
    }

    if (quantity > BigInt(Number.MAX_SAFE_INTEGER) || quantity < BigInt(Number.MIN_SAFE_INTEGER)) {
      this.logger.error(`Quantity ${quantity.toString()} is out of safe integer range for user ${userAddress}.`);
      // Depending on requirements, you might throw an error or handle it differently
      return;
    }

    try {
      await this.retryInventoryService.addRetries(userAddress, Number(quantity));
      this.logger.log(`Successfully added ${quantity.toString()} retries for user ${userAddress}`);
    } catch (error) {
      this.logger.error(`Failed to process purchaseRetry event for user ${userAddress}: ${error.message}`);
    }
  }
}
