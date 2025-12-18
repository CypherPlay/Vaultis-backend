import * as fs from 'fs/promises';
import { resolve } from 'path';

export async function loadContractAbi(): Promise<any[]> {
  const abiPath = resolve(__dirname, 'abi', 'vaultis-contract.json');
  try {
    const data = await fs.readFile(abiPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Failed to load contract ABI from ${abiPath}:`, error);
    throw error;
  }
}
