import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { RiddleService } from './riddle.service';
import { Riddle, RiddleDocument } from '../schemas/riddle.schema';

@Injectable()
export class RiddleManagerService implements OnModuleInit {
  private readonly logger = new Logger(RiddleManagerService.name);
  private activeRiddle: Riddle | null = null;

  constructor(
    private readonly riddleService: RiddleService,
    private schedulerRegistry: SchedulerRegistry,
  ) {}

  async onModuleInit() {
    await this.rotateRiddle(); // Initial riddle selection on application start
  }

  @Cron('0 0 * * *', {
    timeZone: 'UTC',
  })
  async handleCron() {
    this.logger.log('Running daily riddle rotation cron job (UTC 00:00)');
    await this.rotateRiddle();
  }

  async rotateRiddle(): Promise<void> {
    this.logger.log('Attempting to rotate riddle...');

    // Expire the current riddle if one exists
    if (this.activeRiddle) {
      const now = new Date();
      // Ensure activeRiddle is a RiddleDocument to access _id
      const activeRiddleDoc = this.activeRiddle as RiddleDocument;
      await this.riddleService.updateRiddle(activeRiddleDoc._id, {
        expiresAt: now,
      });
      this.logger.log(`Expired previous riddle: ${activeRiddleDoc._id}`);
      this.activeRiddle = null; // Clear active riddle after expiring
    }

    // Find and activate a new eligible riddle
    const newRiddle = await this.riddleService.findOneEligibleRiddle();

    if (newRiddle) {
      const expiresAt = new Date();
      expiresAt.setUTCDate(expiresAt.getUTCDate() + 1); // Set expiration for 24 hours from now

      const newRiddleDoc = newRiddle as RiddleDocument;
      await this.riddleService.updateRiddle(newRiddleDoc._id, {
        expiresAt: expiresAt,
      });
      this.activeRiddle = newRiddle;
      this.logger.log(`Activated new riddle: ${newRiddleDoc._id}. Expires at: ${expiresAt.toISOString()}`);
    } else {
      this.activeRiddle = null;
      this.logger.warn('No eligible riddles found to activate.');
    }
  }

  getActiveRiddle(): Riddle | null {
    return this.activeRiddle;
  }
}
