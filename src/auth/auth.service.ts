import {
  Injectable,
  UnauthorizedException,
  Inject,
  InternalServerErrorException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { verifyMessage } from 'ethers';
import Redis from 'ioredis';
import { createHash } from 'crypto';
import { REDIS_CLIENT } from '../database/redis.module';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async login(
    address: string,
    signature: string,
  ): Promise<{ accessToken: string }> {
    const message = `Sign in to Vaultis with address ${address}`;
    const token = await this.verifySignature(message, signature, address);

    const user = await this.userModel.findOne({ address }).exec();
    if (!user) {
      throw new NotFoundException('User not found. Please register.');
    }

    return { accessToken: token };
  }

  async register(
    address: string,
    signature: string,
    username: string,
  ): Promise<{ accessToken: string }> {
    const message = `Register with Vaultis using address ${address}`;
    const token = await this.verifySignature(message, signature, address);

    const existingUser = await this.userModel.findOne({ address }).exec();
    if (existingUser) {
      throw new ConflictException('User with this address already exists.');
    }

    const newUser = new this.userModel({ address, username });
    await newUser.save();

    return { accessToken: token };
  }

  async generateToken(payload: any): Promise<string> {
    return this.jwtService.sign(payload);
  }

  async validateToken(token: string): Promise<any> {
    return this.jwtService.verify(token);
  }

  async verifySignature(
    message: string,
    signature: string,
    publicAddress: string,
  ): Promise<string> {
    // 1. Input validation
    if (!message || !signature || !publicAddress) {
      throw new UnauthorizedException(
        'Invalid parameters: message, signature, and address are required.',
      );
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

  private async checkAndMarkNonce(
    message: string,
    ttlSeconds = 86400,
  ): Promise<void> {
    try {
      const key = `nonce:${createHash('sha256').update(message).digest('hex')}`;
      const setResult = await this.redis.set(key, '1', 'EX', ttlSeconds, 'NX');
      if (setResult === null) {
        throw new UnauthorizedException(
          'Replay attack detected: message already used.',
        );
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // Optionally more robust detection: if the error is a Redis client error
      // (e.g. instanceof Redis.RedisError or error.name/code indicating connection issue)
      console.error('Redis error during nonce check:', error);
      throw new InternalServerErrorException(
        'Authentication service temporarily unavailable.',
      );
    }
  }
}
