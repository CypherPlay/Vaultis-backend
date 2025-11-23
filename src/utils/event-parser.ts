import { Interface } from 'ethers';

export class EventParser {
  /**
   * Decodes transaction logs using the provided contract ABI.
   * @param abi The contract ABI.
   * @param logs The transaction logs to decode.
   * @returns An array of decoded events.
   */
  static decodeLogs(abi: any[], logs: any[]): any[] {
    const iface = new Interface(abi);
    return logs
      .map((log) => {
        try {
          return iface.parseLog(log);
        } catch (error) {
          return null; // Log might not match the provided ABI
        }
      })
      .filter(Boolean); // Remove nulls
  }

  /**
   * Normalizes event data for consistent processing.
   * @param event The event object from ethers.js.
   * @returns A normalized event object.
   */
  static normalizeEventData(event: any): any {
    if (!event) return null;

    return {
      name: event.name,
      signature: event.signature,
      args: (() => {
        if (!event.args) return {};
        try {
          return event.args.toObject();
        } catch (error) {
          // Fallback for unnamed parameters
          return event.args.toArray().reduce((obj, value, index) => {
            obj[index] = value;
            return obj;
          }, {});
        }
      })(),
      topic: event.topic,
      address: event.address,
      transactionHash: event.transactionHash,
      blockNumber: event.blockNumber,
      logIndex: event.logIndex,
    };
  }

  /**
   * Validates if a block has enough confirmations.
   * @param currentBlock The current block number.
   * @param eventBlock The block number of the event.
   * @param requiredConfirmations The number of required confirmations.
   * @returns True if the block has enough confirmations, false otherwise.
   */
  static validateBlockConfirmation(
    currentBlock: number,
    eventBlock: number,
    requiredConfirmations: number,
  ): boolean {
    if (!Number.isFinite(currentBlock) || !Number.isInteger(currentBlock) || currentBlock < 0) {
      throw new Error('Current block must be a non-negative finite integer.');
    }
    if (!Number.isFinite(eventBlock) || !Number.isInteger(eventBlock) || eventBlock < 0) {
      throw new Error('Event block must be a non-negative finite integer.');
    }
    if (!Number.isFinite(requiredConfirmations) || !Number.isInteger(requiredConfirmations) || requiredConfirmations < 0) {
      throw new Error('Required confirmations must be a non-negative finite integer.');
    }
    if (eventBlock > currentBlock) {
      throw new Error('Event block cannot be greater than current block.');
    }
    return currentBlock - eventBlock >= requiredConfirmations;
  }
}
