import { Test, TestingModule } from '@nestjs/testing';
import { BlockchainController } from '../blockchain.controller';
import { BlockchainEventService } from '../blockchain-event.service';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { RawBodyRequest } from '@nestjs/common/interfaces';
import { Request } from 'express';
import * as crypto from 'crypto';

describe('BlockchainController', () => {
  let controller: BlockchainController;
  let blockchainEventService: BlockchainEventService;
  let configService: ConfigService;

  const mockRawBody = JSON.stringify({ eventType: 'test', webhookId: '123', timestamp: '1678886400', payload: { data: 'test' } });
  const mockTimestamp = '1678886400'; // Example timestamp
  const mockSecret = 'supersecretkey';
  const generateSignature = (timestamp: string, rawBody: string, secret: string) => {
    return crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  };
  const mockSignature = generateSignature(mockTimestamp, mockRawBody, mockSecret);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlockchainController],
      providers: [
        {
          provide: BlockchainEventService,
          useValue: {
            verifySignature: jest.fn(),
            processWebhookEvent: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'WEBHOOK_SECRET') return mockSecret;
              if (key === 'WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS') return 300;
              if (key === 'NODE_ENV') return 'development';
              return null;
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<BlockchainController>(BlockchainController);
    blockchainEventService = module.get<BlockchainEventService>(BlockchainEventService);
    configService = module.get<ConfigService>(ConfigService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleWebhook', () => {
    const mockPayload = { eventType: 'test', webhookId: '123', timestamp: '1678886400', payload: { data: 'test' } };
    const mockRequest = {
      rawBody: Buffer.from(mockRawBody),
    } as RawBodyRequest<Request>;

    it('should throw UnauthorizedException if x-signature header is missing', async () => {
      await expect(controller.handleWebhook(mockRequest, mockPayload, undefined, mockTimestamp)).rejects.toThrow(UnauthorizedException);
      await expect(controller.handleWebhook(mockRequest, mockPayload, undefined, mockTimestamp)).rejects.toThrow('Missing signature header.');
      expect(blockchainEventService.verifySignature).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if x-timestamp header is missing', async () => {
      await expect(controller.handleWebhook(mockRequest, mockPayload, mockSignature, undefined)).rejects.toThrow(BadRequestException);
      await expect(controller.handleWebhook(mockRequest, mockPayload, mockSignature, undefined)).rejects.toThrow('Missing timestamp header.');
      expect(blockchainEventService.verifySignature).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if signature verification fails', async () => {
      jest.spyOn(blockchainEventService, 'verifySignature').mockRejectedValueOnce(new UnauthorizedException('Invalid webhook signature.'));

      await expect(controller.handleWebhook(mockRequest, mockPayload, 'invalid-signature', mockTimestamp)).rejects.toThrow(UnauthorizedException);
      await expect(controller.handleWebhook(mockRequest, mockPayload, 'invalid-signature', mockTimestamp)).rejects.toThrow('Invalid webhook signature.');
      expect(blockchainEventService.verifySignature).toHaveBeenCalledWith(mockRawBody, 'invalid-signature', mockTimestamp);
      expect(blockchainEventService.processWebhookEvent).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if timestamp is too old or invalid', async () => {
      jest.spyOn(blockchainEventService, 'verifySignature').mockRejectedValueOnce(new BadRequestException('Webhook timestamp is too old or invalid.'));

      await expect(controller.handleWebhook(mockRequest, mockPayload, mockSignature, '123')).rejects.toThrow(BadRequestException);
      await expect(controller.handleWebhook(mockRequest, mockPayload, mockSignature, '123')).rejects.toThrow('Webhook timestamp is too old or invalid.');
      expect(blockchainEventService.verifySignature).toHaveBeenCalledWith(mockRawBody, mockSignature, '123');
      expect(blockchainEventService.processWebhookEvent).not.toHaveBeenCalled();
    });

    it('should process webhook event if signature and timestamp are valid', async () => {
      jest.spyOn(blockchainEventService, 'verifySignature').mockResolvedValueOnce(true);
      jest.spyOn(blockchainEventService, 'processWebhookEvent').mockResolvedValueOnce(undefined);

      const result = await controller.handleWebhook(mockRequest, mockPayload, mockSignature, mockTimestamp);

      expect(blockchainEventService.verifySignature).toHaveBeenCalledWith(mockRawBody, mockSignature, mockTimestamp);
      expect(blockchainEventService.processWebhookEvent).toHaveBeenCalledWith(mockPayload);
      expect(result).toEqual({ status: 'success', message: 'Webhook event processed' });
    });

    it('should throw InternalServerErrorException if processWebhookEvent fails with a generic error', async () => {
      jest.spyOn(blockchainEventService, 'verifySignature').mockResolvedValueOnce(true);
      jest.spyOn(blockchainEventService, 'processWebhookEvent').mockRejectedValueOnce(new Error('Service processing failed'));

      await expect(controller.handleWebhook(mockRequest, mockPayload, mockSignature, mockTimestamp)).rejects.toThrow(InternalServerErrorException);
      await expect(controller.handleWebhook(mockRequest, mockPayload, mockSignature, mockTimestamp)).rejects.toThrow('Failed to process webhook event due to an internal server error.');
      expect(blockchainEventService.verifySignature).toHaveBeenCalledWith(mockRawBody, mockSignature, mockTimestamp);
      expect(blockchainEventService.processWebhookEvent).toHaveBeenCalledWith(mockPayload);
    });

    it('should re-throw HttpException if processWebhookEvent fails with an HttpException', async () => {
      jest.spyOn(blockchainEventService, 'verifySignature').mockResolvedValueOnce(true);
      const httpError = new BadRequestException('Invalid payload data');
      jest.spyOn(blockchainEventService, 'processWebhookEvent').mockRejectedValueOnce(httpError);

      await expect(controller.handleWebhook(mockRequest, mockPayload, mockSignature, mockTimestamp)).rejects.toThrow(BadRequestException);
      await expect(controller.handleWebhook(mockRequest, mockPayload, mockSignature, mockTimestamp)).rejects.toThrow('Invalid payload data');
      expect(blockchainEventService.verifySignature).toHaveBeenCalledWith(mockRawBody, mockSignature, mockTimestamp);
      expect(blockchainEventService.processWebhookEvent).toHaveBeenCalledWith(mockPayload);
    });

    it('should log error stack in development environment', async () => {
      jest.spyOn(blockchainEventService, 'verifySignature').mockResolvedValueOnce(true);
      jest.spyOn(blockchainEventService, 'processWebhookEvent').mockRejectedValueOnce(new Error('Test error'));
      const loggerErrorSpy = jest.spyOn(controller['logger'], 'error');

      await expect(controller.handleWebhook(mockRequest, mockPayload, mockSignature, mockTimestamp)).rejects.toThrow(InternalServerErrorException);

      expect(loggerErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Internal Server Error'), expect.stringContaining('Error: Test error'));
    });

    it('should not log error stack in production environment', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'WEBHOOK_SECRET') return mockSecret;
        if (key === 'WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS') return 300;
        if (key === 'NODE_ENV') return 'production'; // Simulate production
        return null;
      });

      // Re-get controller with updated configService mock
      const module: TestingModule = await Test.createTestingModule({
        controllers: [BlockchainController],
        providers: [
          {
            provide: BlockchainEventService,
            useValue: {
              verifySignature: jest.fn().mockResolvedValue(true),
              processWebhookEvent: jest.fn().mockRejectedValue(new Error('Test error')),
            },
          },
          {
            provide: ConfigService,
            useValue: configService, // Use the mocked configService
          },
        ],
      }).compile();

      const prodController = module.get<BlockchainController>(BlockchainController);
      const loggerErrorSpy = jest.spyOn(prodController['logger'], 'error');

      await expect(prodController.handleWebhook(mockRequest, mockPayload, mockSignature, mockTimestamp)).rejects.toThrow(InternalServerErrorException);

      // Expect error message but not the full stack trace (which would contain 'Error: Test error')
      expect(loggerErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Internal Server Error'), expect.not.stringContaining('Error: Test error'));
    });
  });
});