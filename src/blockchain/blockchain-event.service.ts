import { Injectable, OnModuleInit, OnModuleDestroy, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { RetryInventoryService } from '../retry/retry-inventory.service';

@Injectable()
export class BlockchainEventService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BlockchainEventService.name);
  private provider: ethers.JsonRpcProvider | null = null;
  private contract: ethers.Contract | null = null;
  private boundHandlePurchaseRetryEvent: ((...args: any[]) => void) | null = null;

  private _isConnected = false;
  private _isHealthy = false;
  private _reconnectAttempts = 0;
  private _reconnectTimeout: NodeJS.Timeout | null = null;
  private _healthCheckInterval: NodeJS.Timeout | null = null;

  private readonly RECONNECT_INITIAL_DELAY_MS = 1000; // 1 second
  private readonly RECONNECT_MAX_DELAY_MS = 60000; // 1 minute
  private readonly HEALTH_CHECK_INTERVAL_MS = 15000; // 15 seconds

  constructor(
    private readonly configService: ConfigService,
    private readonly retryInventoryService: RetryInventoryService,
  ) {}

  onModuleInit() {
    this.logger.log('Initializing BlockchainEventService...');
    this.start();
  }

  onModuleDestroy() {
    this.logger.log('Shutting down BlockchainEventService...');
    this.stop();
  }

  public async verifySignature(rawBody: string, signature: string, timestamp: string): Promise<boolean> {
    const secret = this.configService.get<string>('WEBHOOK_SECRET');
    if (!secret) {
      this.logger.error('WEBHOOK_SECRET is not configured.');
      throw new UnauthorizedException('Webhook secret not configured.');
    }

    // 1. Check timestamp freshness
    const toleranceSeconds = this.configService.get<number>('WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS', 300); // Default to 5 minutes
    const now = Math.floor(Date.now() / 1000);
    const receivedTimestamp = parseInt(timestamp, 10);

    if (isNaN(receivedTimestamp) || Math.abs(now - receivedTimestamp) > toleranceSeconds) {
      this.logger.warn(`Webhook timestamp out of tolerance. Received: ${receivedTimestamp}, Now: ${now}`);
      throw new BadRequestException('Webhook timestamp is too old or invalid.');
    }

    // 2. Verify signature (HMAC-SHA256)
    const signedPayload = `${timestamp}.${rawBody}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expectedSignature, 'utf8'),
    );

    if (!isValid) {
      this.logger.warn('Webhook signature verification failed.');
      throw new UnauthorizedException('Invalid webhook signature.');
    }

    this.logger.debug('Webhook signature and timestamp verified successfully.');
    return true;
  }

  public start() {
    this.connectToBlockchain();
    this._healthCheckInterval = setInterval(() => this.healthCheck(), this.HEALTH_CHECK_INTERVAL_MS);
  }

  public stop() {
    this.disconnectFromBlockchain();
    if (this._reconnectTimeout) {
      clearTimeout(this._reconnectTimeout);
      this._reconnectTimeout = null;
    }
    if (this._healthCheckInterval) {
      clearInterval(this._healthCheckInterval);
      this._healthCheckInterval = null;
    }
  }

  private async connectToBlockchain() {
    if (this._isConnected) {
      this.logger.log('Already connected to blockchain. Skipping reconnection.');
      return;
    }

    try {
      const rpcUrl = this.configService.get<string>('BLOCKCHAIN_RPC_URL');
      const contractAddress = this.configService.get<string>('BLOCKCHAIN_CONTRACT_ADDRESS');
      const contractAbi = this.configService.get<any[]>('BLOCKCHAIN_CONTRACT_ABI');

      if (!rpcUrl || !contractAddress || !contractAbi) {
        throw new Error('Missing blockchain configuration: please set BLOCKCHAIN_RPC_URL, BLOCKCHAIN_CONTRACT_ADDRESS and BLOCKCHAIN_CONTRACT_ABI');
      }

      // Clear existing provider and contract if they somehow persist
      this.disconnectFromBlockchain();

      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.contract = new ethers.Contract(contractAddress, contractAbi, this.provider);

      // Register error and close handlers for the provider
      this.provider.on('error', (error) => this.handleProviderDisconnect(error));
      this.provider.on('close', (code, reason) => this.handleProviderDisconnect(new Error(`Closed with code ${code}: ${reason}`)));

      this.boundHandlePurchaseRetryEvent = this.handlePurchaseRetryEvent.bind(this);
      this.contract.on('purchaseRetry', this.boundHandlePurchaseRetryEvent!);

      this._isConnected = true;
      this._isHealthy = true;
      this._reconnectAttempts = 0; // Reset attempts on successful connection
      this.logger.log('Connected to blockchain and listening for purchaseRetry events.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to connect to blockchain:', errorMessage);
      this._isConnected = false;
      this._isHealthy = false;
      this.scheduleReconnect();
    }
  }

  private disconnectFromBlockchain() {
    if (this.contract && this.boundHandlePurchaseRetryEvent) {
      this.contract.off('purchaseRetry', this.boundHandlePurchaseRetryEvent);
      this.boundHandlePurchaseRetryEvent = null;
      this.logger.log('Disconnected from blockchain events.');
    }
    if (this.provider) {
      // Remove all listeners to prevent memory leaks and ensure clean shutdown
      this.provider.removeAllListeners();
      this.provider = null;
    }
    this.contract = null;
    this._isConnected = false;
    this._isHealthy = false;
  }

  private handleProviderDisconnect(error: Error) {
    this.logger.error(`Provider disconnected or encountered an error: ${error.message}. Attempting to reconnect...`);
    this._isHealthy = false;
    this._isConnected = false;
    this.scheduleReconnect();
  }

  private scheduleReconnect() {
    if (this._reconnectTimeout) {
      clearTimeout(this._reconnectTimeout);
    }

    const delay = Math.min(
      this.RECONNECT_INITIAL_DELAY_MS * Math.pow(2, this._reconnectAttempts),
      this.RECONNECT_MAX_DELAY_MS,
    );

    this.logger.log(`Attempting to reconnect in ${delay / 1000} seconds (attempt ${this._reconnectAttempts + 1})...`);
    this._reconnectTimeout = setTimeout(() => {
      this._reconnectAttempts++;
      this.connectToBlockchain();
    }, delay);
  }

  private async healthCheck() {
    if (!this._isConnected || !this.provider) {
      this.logger.warn('Health check skipped: Not connected to blockchain.');
      this._isHealthy = false;
      this.scheduleReconnect();
      return;
    }

    try {
      await this.provider.detectNetwork();
      if (!this._isHealthy) {
        this.logger.log('Blockchain connection restored and healthy.');
        this._isHealthy = true;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Health check failed: ${errorMessage}. Marking connection unhealthy.`);
      this._isHealthy = false;
      this.scheduleReconnect();
    }
  }

  private async handlePurchaseRetryEvent(userAddress: string, quantity: bigint, event: ethers.Log) {
    this.logger.log(`Received purchaseRetry event: userAddress=${userAddress}, quantity=${quantity.toString()}, transactionHash=${event.transactionHash}`);
    if (!ethers.isAddress(userAddress)) {
      this.logger.error(`Invalid userAddress received: ${userAddress}`);
      return;
    }

    if (quantity > BigInt(Number.MAX_SAFE_INTEGER) || quantity < BigInt(Number.MIN_SAFE_INTEGER)) {
      this.logger.error(`Quantity ${quantity.toString()} is out of safe integer range for user ${userAddress}.`);
      return;
    }

    try {
      await this.retryInventoryService.addRetries(userAddress, Number(quantity), event.transactionHash);
      this.logger.log(`Successfully added ${quantity.toString()} retries for user ${userAddress} with transaction ${event.transactionHash}`);
    } catch (error) {
      this.logger.error(`Failed to process purchaseRetry event for user ${userAddress} (transaction ${event.transactionHash}): ${error.message}`);
    }
  }
}
