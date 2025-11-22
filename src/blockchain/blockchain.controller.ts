import { Controller, Post, Body, Headers, Logger } from '@nestjs/common';
import { BlockchainEventService } from './blockchain-event.service';

@Controller('blockchain')
export class BlockchainController {
  private readonly logger = new Logger(BlockchainController.name);

  constructor(private readonly blockchainEventService: BlockchainEventService) {}

  @Post('webhook')
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-signature') signature: string,
  ) {
    this.logger.log('Received webhook event');
    // TODO: Implement signature verification for security
    // For now, we'll just log the payload and pass it to the service
    this.logger.debug(`Webhook payload: ${JSON.stringify(payload)}`);

    try {
      await this.blockchainEventService.processWebhookEvent(payload);
      return { status: 'success', message: 'Webhook event processed' };
    } catch (error) {
      this.logger.error('Error processing webhook event', error.stack);
      // Depending on the webhook source, you might want to return a 4xx or 5xx status code
      // For simplicity, returning 200 for now, but a more robust solution would handle errors
      return { status: 'error', message: 'Failed to process webhook event' };
    }
  }
}
