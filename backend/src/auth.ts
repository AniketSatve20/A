import { ethers } from 'ethers';

/**
 * Verify wallet signature for authentication
 * Frontend signs: wallet_address + timestamp
 * Backend verifies signature
 */
export function verifyWalletSignature(
  address: string,
  message: string,
  signature: string
): boolean {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (error) {
    return false;
  }
}

/**
 * Create auth message for user to sign
 */
export function createAuthMessage(address: string): string {
  const timestamp = Date.now();
  return `Authenticate to HumanWork: ${address}\nTimestamp: ${timestamp}`;
}

/**
 * Middleware to verify auth (express)
 */
export function authMiddleware(req: any, res: any, next: any) {
  const { signature, address, message } = req.headers;

  if (!signature || !address || !message) {
    return res.status(401).json({ error: 'Missing auth headers' });
  }

  if (!verifyWalletSignature(address as string, message as string, signature as string)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  req.walletAddress = address;
  next();
}
