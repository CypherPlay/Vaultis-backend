import { Injectable, UnauthorizedException, Inject, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { verifyMessage } from 'ethers';
import Redis from 'ioredis';
import { createHash } from 'crypto';
import { REDIS_CLIENT } from '../database/redis.module';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async generateToken(payload: any): Promise<string> {
    return this.jwtService.sign(payload);
  }

  async validateToken(token: string): Promise<any> {
    return this.jwtService.verify(token);
  }

  async verifySignature(message: string, signature: string, publicAddress: string): Promise<string> {
    // 1. Input validation
    if (!message || !signature || !publicAddress) {
      throw new UnauthorizedException('Invalid parameters: message, signature, and address are required.');
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(publicAddress)) {
      throw new UnauthorizedException('Invalid Ethereum address format.');
    }

    // 2. Verify signature
    const recoveredAddress = verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== publicAddress.toLowerCase()) {
      throw new UnauthorizedException('Signature verification failed.');
    }

    // 3. Check for replay attacks (after successful signature verification)
    await this.checkAndMarkNonce(message);

    const payload = { publicAddress };
    return this.generateToken(payload);
  }

  private async checkAndMarkNonce(message: string, ttlSeconds = 86400): Promise<void> {
    try {
      const key = `nonce:${createHash('sha256').update(message).digest('hex')}`;
      const setResult = await this.redis.set(key, '1', 'EX', ttlSeconds, 'NX');
      if (setResult !== 'OK') {
        throw new UnauthorizedException('Replay attack detected: message already used.');
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // Optionally more robust detection: if the error is a Redis client error
      // (e.g. instanceof Redis.RedisError or error.name/code indicating connection issue)
      console.error('Redis error during nonce check:', error);
      throw new InternalServerErrorException('Authentication service temporarily unavailable.');
    }
  }
}
