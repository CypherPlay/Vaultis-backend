import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { RetryInventoryService } from '../retry/retry-inventory.service';

@Injectable()
export class BlockchainEventService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BlockchainEventService.name);
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;

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
        this.logger.error('Missing blockchain configuration. Please check BLOCKCHAIN_RPC_URL, BLOCKCHAIN_CONTRACT_ADDRESS, and BLOCKCHAIN_CONTRACT_ABI.');
        return;
      }

      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.contract = new ethers.Contract(contractAddress, contractAbi, this.provider);

      this.contract.on('purchaseRetry', this.handlePurchaseRetryEvent.bind(this));
      this.logger.log('Connected to blockchain and listening for purchaseRetry events.');
    } catch (error) {
      this.logger.error('Failed to connect to blockchain:', error.message);
    }
  }

  private disconnectFromBlockchain() {
    if (this.contract) {
      this.contract.off('purchaseRetry', this.handlePurchaseRetryEvent.bind(this));
      this.logger.log('Disconnected from blockchain events.');
    }
  }

  private async handlePurchaseRetryEvent(userAddress: string, quantity: ethers.BigNumber, event: ethers.Event) {
    this.logger.log(`Received purchaseRetry event: userAddress=${userAddress}, quantity=${quantity.toString()}`);
    try {
      // In a real application, you would likely map userAddress to your internal userId
      // For now, let's assume userAddress can be directly used or we have a mapping service
      await this.retryInventoryService.addRetries(userAddress, quantity.toNumber());
      this.logger.log(`Successfully added ${quantity.toString()} retries for user ${userAddress}`);
    } catch (error) {
      this.logger.error(`Failed to process purchaseRetry event for user ${userAddress}: ${error.message}`);
    }
  }
}
