// Utility function to parse contract errors and provide user-friendly messages
export function parseContractError(error: unknown): string {
  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  // Handle error objects with message
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    const message = error.message.toLowerCase();
    
    // Check for common revert reasons
    if (message.includes('user already registered')) {
      return 'This handle is already taken. Please choose a different handle.';
    }
    
    if (message.includes('handle already taken')) {
      return 'This handle is already registered by another user.';
    }
    
    if (message.includes('user not registered')) {
      return 'You need to register your handle first before giving kudos.';
    }
    
    if (message.includes('recipient not registered')) {
      return '⚠️ This recipient is not registered yet. For testing, try using handles like: @vitalik, @alice_dev, or @bob_builder. Or ask them to register their wallet first.';
    }
    
    if (message.includes('cannot give kudos to yourself')) {
      return 'You cannot give kudos to yourself. Please select a different recipient.';
    }
    
    if (message.includes('tweet already processed')) {
      return 'This tweet has already been used for kudos. Please use a different tweet URL.';
    }
    
    if (message.includes('insufficient funds')) {
      return 'Not enough ETH for transaction fees. Please add more ETH to your wallet.';
    }
    
    if (message.includes('user rejected')) {
      return 'Transaction was cancelled by user.';
    }
    
    if (message.includes('network')) {
      return 'Network error. Please check your connection and try again.';
    }
    
    // If we can't parse it, return the original message
    return error.message;
  }
  
  // Handle errors with reason
  if (error && typeof error === 'object' && 'reason' in error) {
    return parseContractError({ message: error.reason });
  }
  
  // Handle errors with cause
  if (error && typeof error === 'object' && 'cause' in error) {
    return parseContractError(error.cause);
  }
  
  // Default fallback
  return 'An unexpected error occurred. Please try again.';
}

// Helper to extract common error patterns from hex data
export function decodeRevertReason(data: string): string | null {
  try {
    // Remove 0x prefix and error selector (first 8 chars)
    const cleanData = data.replace('0x', '').slice(8);
    
    // Convert hex to string
    const bytes = Buffer.from(cleanData, 'hex');
    
    // Skip the first 64 bytes (offset and length) and read the actual message
    const messageLength = parseInt(cleanData.slice(56, 64), 16);
    const messageBytes = bytes.slice(32, 32 + messageLength);
    
    return messageBytes.toString('utf8');
  } catch {
    return null;
  }
}