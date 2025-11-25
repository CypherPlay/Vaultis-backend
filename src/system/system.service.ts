import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { BlockchainPollerService } from '../blockchain/blockchain-poller.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { SchedulerRegistry } from '@nestjs/schedule';

@Injectable()
export class SystemService {
  private readonly logger = new Logger(SystemService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly blockchainPollerService: BlockchainPollerService,
    @InjectRedis() private readonly redis: Redis,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  async getSystemHealth() {
    const databaseHealth = await this.checkDatabaseHealth();
    const blockchainListenerHealth = this.checkBlockchainListenerHealth();
    const redisHealth = await this.checkRedisHealth();
    const schedulerHealth = this.checkSchedulerHealth();

    return {
      database: databaseHealth,
      blockchainListener: blockchainListenerHealth,
      redis: redisHealth,
      scheduler: schedulerHealth,
      overall: databaseHealth.status === 'up' && blockchainListenerHealth.status === 'up' && redisHealth.status === 'up' && schedulerHealth.status === 'up',
    };
  }

  private async checkDatabaseHealth() {
    try {
      const isConnected = this.connection.readyState === 1;
      return { status: isConnected ? 'up' : 'down', message: isConnected ? 'Database connected' : 'Database disconnected' };
    } catch (error) {
      this.logger.error('Database health check failed', error.stack);
      return { status: 'down', message: 'Database connection error', error: error.message };
    }
  }

  private checkBlockchainListenerHealth() {
    const isRunning = this.blockchainPollerService.isPolling();
    return { status: isRunning ? 'up' : 'down', message: isRunning ? 'Blockchain listener is active' : 'Blockchain listener is inactive' };
  }

  private async checkRedisHealth() {
    try {
      await this.redis.ping();
      return { status: 'up', message: 'Redis connected' };
    } catch (error) {
      this.logger.error('Redis health check failed', error.stack);
      return { status: 'down', message: 'Redis connection error', error: error.message };
    }
  }

  private checkSchedulerHealth() {
    const jobs = this.schedulerRegistry.getIntervals();
    const hasJobs = jobs.length > 0;
    return { status: hasJobs ? 'up' : 'down', message: hasJobs ? 'Scheduler has active jobs' : 'Scheduler has no active jobs' };
  }
}
