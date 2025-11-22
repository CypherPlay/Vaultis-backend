import { Test, TestingModule } from '@nestjs/testing';
import { BlockchainController } from '../blockchain.controller';
import { BlockchainEventService } from '../blockchain-event.service';

describe('BlockchainController', () => {
  let controller: BlockchainController;
  let service: BlockchainEventService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlockchainController],
      providers: [
        {
          provide: BlockchainEventService,
          useValue: {
            processWebhookEvent: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<BlockchainController>(BlockchainController);
    service = module.get<BlockchainEventService>(BlockchainEventService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call processWebhookEvent on the service when webhook is received', async () => {
    const payload = { some: 'data' };
    const signature = 'test-signature';

    await controller.handleWebhook(payload, signature);

    expect(service.processWebhookEvent).toHaveBeenCalledWith(payload);
  });

  it('should return success message on successful webhook processing', async () => {
    const payload = { some: 'data' };
    const signature = 'test-signature';

    const result = await controller.handleWebhook(payload, signature);

    expect(result).toEqual({ status: 'success', message: 'Webhook event processed' });
  });

  it('should return error message on failed webhook processing', async () => {
    const payload = { some: 'data' };
    const signature = 'test-signature';
    jest.spyOn(service, 'processWebhookEvent').mockRejectedValueOnce(new Error('Processing failed'));

    const result = await controller.handleWebhook(payload, signature);

    expect(result).toEqual({ status: 'error', message: 'Failed to process webhook event' });
  });
});
