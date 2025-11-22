import { Controller, Post, Body, Headers, Logger, Req, RawBodyRequest, UsePipes, ValidationPipe, HttpException, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlockchainEventService } from './blockchain-event.service';
import { BlockchainWebhookDto } from './dto/blockchain-webhook.dto';
import { PayloadSanitizer } from '../utils/payload-sanitizer';

@Controller('blockchain')
export class BlockchainController {
  private readonly logger = new Logger(BlockchainController.name);

  constructor(
    private readonly blockchainEventService: BlockchainEventService,
    private readonly configService: ConfigService,
  ) {}

  @Post('webhook')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Body() payload: BlockchainWebhookDto,
    @Headers('x-signature') signature: string,
    @Headers('x-timestamp') timestamp: string,
  ) {
    const webhookId = payload.webhookId || 'N/A';
    const eventType = payload.eventType || 'N/A';
    const logContext = `Webhook ID: ${webhookId}, Event Type: ${eventType}`;

    this.logger.log(`Received webhook event. ${logContext}`);

    try {
      // 1. Request signature validation
      if (!signature) {
        this.logger.warn(`Missing x-signature header. ${logContext}`);
        throw new UnauthorizedException('Missing signature header.');
      }
      if (!timestamp) {
        this.logger.warn(`Missing x-timestamp header. ${logContext}`);
        throw new BadRequestException('Missing timestamp header.');
      }

      // Ensure rawBody is available for signature verification
      if (!req.rawBody) {
        this.logger.error(`Raw body not available for signature verification. ${logContext}`);
        throw new InternalServerErrorException('Raw body not available.');
      }

      await this.blockchainEventService.verifySignature(req.rawBody.toString(), signature, timestamp);

      // 2. Input validation for the webhook payload is handled by @UsePipes and BlockchainWebhookDto

      // 3. Modify logging to avoid printing the entire webhook payload
      const maxLogLength = this.configService.get<number>('WEBHOOK_LOG_MAX_LENGTH', 1000);
      const sanitizedPayload = PayloadSanitizer.sanitize(payload, undefined, maxLogLength);
      let payloadToLog = JSON.stringify(sanitizedPayload);
      if (sanitizedPayload.__wasTruncated) {
        payloadToLog = payloadToLog.substring(0, maxLogLength) + '... [TRUNCATED]';
      }
      this.logger.debug(`Processing webhook event. ${logContext}, Sanitized Payload: ${payloadToLog}`);

      await this.blockchainEventService.processWebhookEvent(payload);
      this.logger.log(`Successfully processed webhook event. ${logContext}`);
      return { status: 'success', message: 'Webhook event processed' };
    } catch (error) {
      // 4. Improve error handling & 5. Modify error logging
      const isDevelopment = this.configService.get<string>('NODE_ENV') === 'development';
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      const errorName = error instanceof Error ? error.name : 'UnknownError';
      const errorStack = error instanceof Error ? error.stack : 'No stack available';

      if (error instanceof HttpException) {
        this.logger.error(`HTTP Error processing webhook event. ${logContext}, Status: ${error.getStatus()}, Message: ${errorMessage}`);
        if (isDevelopment) {
          this.logger.error(`Error stack: ${errorStack}`);
        }
        throw error; // Re-throw HTTP exceptions as they are already well-formed
      } else {
        this.logger.error(`Internal Server Error processing webhook event. ${logContext}, Name: ${errorName}, Message: ${errorMessage}`);
        if (isDevelopment) {
          this.logger.error(`Error stack: ${errorStack}`);
        }
        // For unexpected errors, throw a generic 500 InternalServerErrorException
        throw new InternalServerErrorException('Failed to process webhook event due to an internal server error.');
      }
    }
  }
}
