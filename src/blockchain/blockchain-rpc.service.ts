import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

@Injectable()
export class BlockchainRPCService {
  private readonly logger = new Logger(BlockchainRPCService.name);
  private provider: ethers.JsonRpcProvider;
  private vaultisContract: ethers.Contract;

  constructor(private readonly configService: ConfigService) {
    const rpcUrl = this.configService.get<string>('BLOCKCHAIN_RPC_URL');
    const contractAddress = this.configService.get<string>('CONTRACT_ADDRESS'); // Assuming an environment variable for contract address
    const contractAbi = this.configService.get<any[]>('CONTRACT_ABI'); // Assuming an environment variable for contract ABI

    if (!rpcUrl || !contractAddress || !contractAbi) {
      this.logger.error('Missing blockchain configuration. RPC URL, Contract Address, or ABI is not defined.');
      return;
    }

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.vaultisContract = new ethers.Contract(contractAddress, contractAbi, this.provider);
  }

  async getCurrentPrizePool(): Promise<ethers.BigNumberish> {
    try {
      // Assuming a method like 'prizePool' on your contract
      const prizePool = await this.vaultisContract.prizePool();
      this.logger.log(`Current prize pool: ${prizePool.toString()}`);
      return prizePool;
    } catch (error) {
      this.logger.error('Error fetching current prize pool', error.stack);
      throw error;
    }
  }

  async getContractStateVariable(variableName: string): Promise<any> {
    try {
      // Generic method to read a state variable
      const value = await this.vaultisContract[variableName]();
      this.logger.log(`Contract state variable "${variableName}": ${value.toString()}`);
      return value;
    } catch (error) {
      this.logger.error(`Error fetching contract state variable "${variableName}"`, error.stack);
      throw error;
    }
  }

  async getRiddleIds(): Promise<string[]> {
    try {
      // Assuming a method like 'getAllRiddleIds' that returns an array of riddle IDs
      const riddleIds = await this.vaultisContract.getAllRiddleIds();
      this.logger.log(`Riddle IDs: ${riddleIds.join(', ')}`);
      return riddleIds;
    } catch (error) {
      this.logger.error('Error fetching riddle IDs', error.stack);
      throw error;
    }
  }
}
