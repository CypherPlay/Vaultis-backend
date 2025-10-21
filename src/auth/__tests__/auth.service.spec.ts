import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { Wallet } from 'ethers';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let wallet: Wallet;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn((payload) => `mocked_jwt_token_${payload.publicAddress}`),
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
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
    });

    it('should successfully verify a valid signature and return a JWT', async () => {
      const token = await service.verifySignature(message, signature, wallet.address);
      expect(token).toBe(`mocked_jwt_token_${wallet.address}`);
      expect(jwtService.sign).toHaveBeenCalledWith({ publicAddress: wallet.address });
    });

    it('should throw UnauthorizedException for an invalid signature', async () => {
      const invalidSignature = await new Wallet.createRandom().signMessage(message);
      await expect(service.verifySignature(message, invalidSignature, wallet.address)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifySignature(message, invalidSignature, wallet.address)).rejects.toThrow(
        'Signature verification failed.',
      );
    });

    it('should throw UnauthorizedException for a replay attack', async () => {
      await service.verifySignature(message, signature, wallet.address);
      await expect(service.verifySignature(message, signature, wallet.address)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifySignature(message, signature, wallet.address)).rejects.toThrow(
        'Replay attack detected: message already used.',
      );
    });

    it('should throw UnauthorizedException if recovered address does not match provided address', async () => {
      const otherWallet = Wallet.createRandom();
      await expect(service.verifySignature(message, signature, otherWallet.address)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifySignature(message, signature, otherWallet.address)).rejects.toThrow(
        'Signature verification failed.',
      );
    });
  });
});
