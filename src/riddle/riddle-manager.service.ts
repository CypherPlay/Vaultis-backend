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
    const riddles = await this.riddleService.findAll();
    if (riddles.length > 0) {
      const randomIndex = Math.floor(Math.random() * riddles.length);
      this.activeRiddle = riddles[randomIndex];
      if (this.activeRiddle) {
        this.logger.log(`Active riddle set to: ${(this.activeRiddle as RiddleDocument)._id}`);
      }
    } else {
      this.activeRiddle = null;
      this.logger.warn('No riddles found to rotate.');
    }
  }

  getActiveRiddle(): Riddle | null {
    return this.activeRiddle;
  }
}
