import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { verifyMessage } from 'ethers';

@Injectable()
export class AuthService {
  private readonly usedNonces: Set<string> = new Set(); // In-memory store for used nonces. For production, use a persistent store.

  constructor(private readonly jwtService: JwtService) {}

  async generateToken(payload: any): Promise<string> {
    return this.jwtService.sign(payload);
  }

  async validateToken(token: string): Promise<any> {
    return this.jwtService.verify(token);
  }

  async verifySignature(message: string, signature: string, publicAddress: string): Promise<string> {
    // Check for replay attacks
    if (this.usedNonces.has(message)) {
      throw new UnauthorizedException('Replay attack detected: message already used.');
    }

    const recoveredAddress = verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== publicAddress.toLowerCase()) {
      throw new UnauthorizedException('Signature verification failed.');
    }

    // Mark the message as used to prevent replay attacks
    this.usedNonces.add(message);

    const payload = { publicAddress };
    return this.generateToken(payload);
  }
}
