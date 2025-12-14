import { registerAs } from '@nestjs/config';

export default registerAs('blockchainRpc', () => ({
  nodeUrl: process.env.BLOCKCHAIN_RPC_NODE_URL || 'http://localhost:8545', // Default to a local node
  chainId: parseInt(process.env.BLOCKCHAIN_CHAIN_ID || '1337', 10), // Default to a common testnet ID
  // Add contract addresses here as needed
  // For example:
  // contractAddresses: {
  //   myContract: process.env.MY_CONTRACT_ADDRESS,
  // },
}));
