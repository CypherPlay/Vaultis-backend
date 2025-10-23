import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { RiddleService, UpdateRiddleDto } from './riddle.service';
import { Riddle, RiddleDocument } from '../schemas/riddle.schema';
import { Guess, GuessDocument } from '../schemas/guess.schema';
import { Connection, Model } from 'mongoose';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';

function isRiddleDocument(riddle: Riddle | RiddleDocument): riddle is RiddleDocument {
  return riddle && (riddle as RiddleDocument)._id !== undefined;
}

@Injectable()
export class RiddleManagerService implements OnModuleInit {
  private readonly logger = new Logger(RiddleManagerService.name);
  private activeRiddle: RiddleDocument | null = null;

  constructor(
    private readonly riddleService: RiddleService,
    private schedulerRegistry: SchedulerRegistry,
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Guess.name) private guessModel: Model<GuessDocument>,
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
    let session;
    try {
      session = await this.connection.startSession();
      session.startTransaction();

      const now = new Date();
      let expiredRiddleId: string | undefined;

      // Expire the current riddle if one exists
      if (this.activeRiddle && isRiddleDocument(this.activeRiddle)) {
        expiredRiddleId = this.activeRiddle._id!.toString();
        this.logger.log(`Expiring previous riddle: ${expiredRiddleId}`);
        const updateExpiredDto: UpdateRiddleDto = { expiresAt: now, lastUsedAt: now };
        const updatedExpiredRiddle = await this.riddleService.updateRiddleMetadata(
          expiredRiddleId,
          updateExpiredDto,
          session,
        );

        if (!updatedExpiredRiddle) {
          this.logger.error(
            `Failed to update/expire riddle ${expiredRiddleId}. Aborting transaction.`,
          );
          await session.abortTransaction();
          this.activeRiddle = null;
          return;
        }
        this.logger.log(`Successfully expired riddle: ${expiredRiddleId}`);
        await this.updatePrizePool(expiredRiddleId);
      }

      // Find and activate a new eligible riddle
      const excludeIds = expiredRiddleId ? [expiredRiddleId] : [];
      const newRiddle = await this.riddleService.findOneEligibleRiddle(
        true,
        excludeIds,
      );

      if (!newRiddle || !isRiddleDocument(newRiddle)) {
        this.logger.warn('No eligible riddles found to activate. Aborting transaction.');
        await session.abortTransaction();
        this.activeRiddle = null;
        return;
      }

      const expiresAt = new Date();
      expiresAt.setUTCDate(expiresAt.getUTCDate() + 1); // Set expiration for 24 hours from now

      const updateNewDto: UpdateRiddleDto = { expiresAt: expiresAt, lastUsedAt: now };
      const updatedNewRiddle = await this.riddleService.updateRiddleMetadata(
        newRiddle._id!.toString(),
        updateNewDto,
        session,
      );

      if (!updatedNewRiddle) {
        this.logger.error(
          `Failed to activate new riddle ${newRiddle._id}. Aborting transaction.`,
        );
        await session.abortTransaction();
        this.activeRiddle = null;
        return;
      }

      await session.commitTransaction();
      this.activeRiddle = updatedNewRiddle;
      await this.updatePrizePool(this.activeRiddle._id!.toString());
      this.logger.log(
        `Activated new riddle: ${this.activeRiddle._id}. Expires at: ${this.activeRiddle.expiresAt.toISOString()}.`,
      );
    } catch (error) {
      if (session) {
        await session.abortTransaction();
        this.logger.error('Transaction aborted due to error.');
      }
      this.logger.error(
        `Error rotating riddle: ${error.message}`,
        error.stack,
      );
      this.activeRiddle = null;
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  }

  /**
   * Calculates and updates the prize pool for a specific riddle based on user entries.
   * Ensures atomic updates to prevent race conditions.
   * @param riddleId The ID of the riddle for which to update the prize pool.
   */
  async updatePrizePool(riddleId: string): Promise<void> {
    this.logger.log(`Updating prize pool for riddle: ${riddleId}`);
    let session;
    try {
      session = await this.connection.startSession();
      session.startTransaction();

      const riddle = await this.riddleService.findOne(riddleId, session);
      if (!riddle) {
        this.logger.warn(`Riddle with ID ${riddleId} not found. Cannot update prize pool.`);
        await session.abortTransaction();
        return;
      }

      const totalGuesses = await this.guessModel.countDocuments(
        { riddleId: riddle._id },
        { session },
      );

      const newPrizePool = totalGuesses * riddle.entryFee;

      const updatedRiddle = await this.riddleService.updateRiddleMetadata(
        riddleId,
        { prizePool: newPrizePool },
        session,
      );

      if (!updatedRiddle) {
        this.logger.error(
          `Failed to update prize pool for riddle ${riddleId}. Aborting transaction.`,
        );
        await session.abortTransaction();
        return;
      }

      await session.commitTransaction();
      this.logger.log(
        `Successfully updated prize pool for riddle ${riddleId} to ${newPrizePool}.`,
      );
    } catch (error) {
      if (session) {
        await session.abortTransaction();
        this.logger.error('Transaction aborted during prize pool update.');
      }
      this.logger.error(
        `Error updating prize pool for riddle ${riddleId}: ${error.message}`,
        error.stack,
      );
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  }

  getActiveRiddle(): RiddleDocument | null {
    return this.activeRiddle;
  }
}
