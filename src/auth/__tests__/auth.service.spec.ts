import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { JwtService } from '@nestjs/jwt';
import {
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Wallet } from 'ethers';
import { REDIS_CLIENT } from '../../database/redis.module';
import Redis from 'ioredis';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let wallet: Wallet;
  let redisClient: Redis;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(
              (payload) => `mocked_jwt_token_${payload.publicAddress}`,
            ),
            verify: jest.fn(),
          },
        },
        {
          provide: REDIS_CLIENT,
          useValue: {
            set: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    redisClient = module.get<Redis>(REDIS_CLIENT);
    wallet = Wallet.createRandom();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('verifySignature', () => {
    const message = 'Sign this message to authenticate.';
    let signature: string;

    beforeEach(async () => {
      signature = await wallet.signMessage(message);
      (redisClient.set as jest.Mock).mockResolvedValue('OK'); // Default to nonce not used
    });

    it('should successfully verify a valid signature and return a JWT', async () => {
      const token = await service.verifySignature(
        message,
        signature,
        wallet.address,
      );
      expect(token).toBe(`mocked_jwt_token_${wallet.address}`);
      expect(jwtService.sign).toHaveBeenCalledWith({
        publicAddress: wallet.address,
      });
      expect(redisClient.set).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for an invalid signature', async () => {
      const invalidSignature = await Wallet.createRandom().signMessage(message);
      await expect(
        service.verifySignature(message, invalidSignature, wallet.address),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.verifySignature(message, invalidSignature, wallet.address),
      ).rejects.toThrow('Signature verification failed.');
      expect(redisClient.set).not.toHaveBeenCalled(); // Nonce check should not happen
    });

    it('should throw UnauthorizedException for a replay attack', async () => {
      (redisClient.set as jest.Mock).mockResolvedValueOnce('OK'); // First call succeeds
      await service.verifySignature(message, signature, wallet.address);

      (redisClient.set as jest.Mock).mockResolvedValueOnce(null); // Second call fails (replay)
      await expect(
        service.verifySignature(message, signature, wallet.address),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.verifySignature(message, signature, wallet.address),
      ).rejects.toThrow('Replay attack detected: message already used.');
    });

    it('should throw UnauthorizedException if recovered address does not match provided address', async () => {
      const otherWallet = Wallet.createRandom();
      await expect(
        service.verifySignature(message, signature, otherWallet.address),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.verifySignature(message, signature, otherWallet.address),
      ).rejects.toThrow('Signature verification failed.');
      expect(redisClient.set).not.toHaveBeenCalled(); // Nonce check should not happen
    });

    it('should throw UnauthorizedException for missing message', async () => {
      await expect(
        service.verifySignature(null, signature, wallet.address),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.verifySignature(null, signature, wallet.address),
      ).rejects.toThrow(
        'Invalid parameters: message, signature, and address are required.',
      );
      expect(redisClient.set).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for missing signature', async () => {
      await expect(
        service.verifySignature(message, null, wallet.address),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.verifySignature(message, null, wallet.address),
      ).rejects.toThrow(
        'Invalid parameters: message, signature, and address are required.',
      );
      expect(redisClient.set).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for missing publicAddress', async () => {
      await expect(
        service.verifySignature(message, signature, null),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.verifySignature(message, signature, null),
      ).rejects.toThrow(
        'Invalid parameters: message, signature, and address are required.',
      );
      expect(redisClient.set).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid publicAddress format', async () => {
      await expect(
        service.verifySignature(message, signature, 'invalid-address'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.verifySignature(message, signature, 'invalid-address'),
      ).rejects.toThrow('Invalid Ethereum address format.');
      expect(redisClient.set).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if Redis is unavailable during nonce check', async () => {
      (redisClient.set as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Redis connection error');
      });

      await expect(
        service.verifySignature(message, signature, wallet.address),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.verifySignature(message, signature, wallet.address),
      ).rejects.toThrow('Authentication service temporarily unavailable.');
    });
  });
});
