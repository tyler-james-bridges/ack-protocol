import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  submitKudos,
  ensureHandleRegistered,
  submitClaim,
  resolveAgentId,
  resolveHandleToAgentId,
  getAgentName,
  type KudosSubmission,
} from '../onchain';

// Mock viem modules
vi.mock('viem', async () => {
  const actual = await vi.importActual('viem');
  return {
    ...actual,
    createPublicClient: vi.fn(),
    createWalletClient: vi.fn(),
    http: vi.fn(),
    defineChain: vi.fn(() => ({ id: 2741 })),
    keccak256: vi.fn(
      () => '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    ),
    toHex: vi.fn((str: string) => `0x${str}`),
    encodeFunctionData: vi.fn(() => '0xencoded'),
  };
});

vi.mock('viem/accounts', () => ({
  privateKeyToAccount: vi.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
  })),
}));

// Mock implementations
const mockReadContract = vi.fn();
const mockWriteContract = vi.fn();
const mockSendTransaction = vi.fn();
const mockWaitForTransactionReceipt = vi.fn();

const mockPublicClient = {
  readContract: mockReadContract,
  waitForTransactionReceipt: mockWaitForTransactionReceipt,
};

const mockWalletClient = {
  writeContract: mockWriteContract,
  sendTransaction: mockSendTransaction,
};

beforeEach(async () => {
  vi.clearAllMocks();

  const { createPublicClient, createWalletClient } = vi.mocked(
    await import('viem')
  );

  createPublicClient.mockReturnValue(mockPublicClient);
  createWalletClient.mockReturnValue(mockWalletClient);

  // Reset environment
  delete process.env.AGENT_PRIVATE_KEY;
});

describe('submitKudos', () => {
  const baseSubmission: KudosSubmission = {
    agentId: 606,
    category: 'help',
    message: 'Great assistance!',
    from: 'testuser',
    sentiment: 'positive',
    amount: 5,
  };

  it('should return error when AGENT_PRIVATE_KEY is not set', async () => {
    const result = await submitKudos(baseSubmission);

    expect(result).toEqual({
      success: false,
      error: 'AGENT_PRIVATE_KEY not set',
    });
  });

  it('should successfully submit kudos with positive sentiment', async () => {
    process.env.AGENT_PRIVATE_KEY = '0x' + 'a'.repeat(64);

    mockSendTransaction.mockResolvedValue('0xtxhash');
    mockWaitForTransactionReceipt.mockResolvedValue({ status: 'success' });

    const result = await submitKudos(baseSubmission);

    expect(result).toEqual({
      success: true,
      txHash: '0xtxhash',
    });

    expect(mockSendTransaction).toHaveBeenCalledWith({
      to: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63',
      data: '0xencoded',
    });
  });

  it('should use negative value for negative sentiment', async () => {
    process.env.AGENT_PRIVATE_KEY = '0x' + 'a'.repeat(64);

    mockSendTransaction.mockResolvedValue('0xtxhash');
    mockWaitForTransactionReceipt.mockResolvedValue({ status: 'success' });

    const { encodeFunctionData } = vi.mocked(await import('viem'));

    await submitKudos({
      ...baseSubmission,
      sentiment: 'negative',
      amount: 3,
    });

    expect(encodeFunctionData).toHaveBeenCalledWith({
      abi: expect.any(Array),
      functionName: 'giveFeedback',
      args: [
        BigInt(606),
        BigInt(-3), // Negative value
        0,
        'help',
        '',
        '',
        expect.stringContaining('data:,'),
        expect.any(String),
      ],
    });
  });

  it('should set tag1 to "proxy" and tag2 to handle when proxyHandle is provided', async () => {
    process.env.AGENT_PRIVATE_KEY = '0x' + 'a'.repeat(64);

    mockSendTransaction.mockResolvedValue('0xtxhash');
    mockWaitForTransactionReceipt.mockResolvedValue({ status: 'success' });

    const { encodeFunctionData } = vi.mocked(await import('viem'));

    await submitKudos({
      ...baseSubmission,
      proxyHandle: 'ProxyUser',
    });

    expect(encodeFunctionData).toHaveBeenCalledWith({
      abi: expect.any(Array),
      functionName: 'giveFeedback',
      args: [
        BigInt(606),
        BigInt(5),
        0,
        'proxy', // tag1 set to 'proxy'
        'x:proxyuser', // tag2 set to lowercase handle
        '',
        expect.stringContaining('proxyFor'),
        expect.any(String),
      ],
    });
  });

  it('should produce empty feedbackURI when category and message are empty', async () => {
    process.env.AGENT_PRIVATE_KEY = '0x' + 'a'.repeat(64);

    mockSendTransaction.mockResolvedValue('0xtxhash');
    mockWaitForTransactionReceipt.mockResolvedValue({ status: 'success' });

    const { encodeFunctionData } = vi.mocked(await import('viem'));

    await submitKudos({
      ...baseSubmission,
      category: '',
      message: '',
    });

    expect(encodeFunctionData).toHaveBeenCalledWith({
      abi: expect.any(Array),
      functionName: 'giveFeedback',
      args: [
        BigInt(606),
        BigInt(5),
        0,
        'kudos', // fallback category
        '',
        '',
        '', // empty feedbackURI
        '0x0000000000000000000000000000000000000000000000000000000000000000', // zero hash
      ],
    });
  });

  it('should handle transaction errors gracefully', async () => {
    process.env.AGENT_PRIVATE_KEY = '0x' + 'a'.repeat(64);

    mockSendTransaction.mockRejectedValue(new Error('Transaction failed'));

    const result = await submitKudos(baseSubmission);

    expect(result).toEqual({
      success: false,
      error: 'Transaction failed',
    });
  });
});

describe('ensureHandleRegistered', () => {
  it('should return false when AGENT_PRIVATE_KEY is not set', async () => {
    const result = await ensureHandleRegistered('testhandle');

    expect(result).toEqual({ registered: false });
  });

  it('should return false when handle already exists', async () => {
    process.env.AGENT_PRIVATE_KEY = '0x' + 'a'.repeat(64);

    mockReadContract.mockResolvedValue(true); // Handle exists

    const result = await ensureHandleRegistered('testhandle');

    expect(result).toEqual({ registered: false });
    expect(mockReadContract).toHaveBeenCalledWith({
      address: expect.any(String),
      abi: expect.any(Array),
      functionName: 'exists',
      args: ['x', 'testhandle'],
    });
  });

  it('should register new handle and return txHash', async () => {
    process.env.AGENT_PRIVATE_KEY = '0x' + 'a'.repeat(64);

    mockReadContract.mockResolvedValue(false); // Handle doesn't exist
    mockWriteContract.mockResolvedValue('0xregistertx');
    mockWaitForTransactionReceipt.mockResolvedValue({ status: 'success' });

    const result = await ensureHandleRegistered('NewHandle');

    expect(result).toEqual({
      registered: true,
      txHash: '0xregistertx',
    });

    expect(mockWriteContract).toHaveBeenCalledWith({
      address: expect.any(String),
      abi: expect.any(Array),
      functionName: 'registerHandle',
      args: ['x', 'newhandle'], // lowercase
    });
  });

  it('should handle registration errors gracefully', async () => {
    process.env.AGENT_PRIVATE_KEY = '0x' + 'a'.repeat(64);

    mockReadContract.mockRejectedValue(new Error('Network error'));

    const result = await ensureHandleRegistered('testhandle');

    expect(result).toEqual({ registered: false });
  });
});

describe('submitClaim', () => {
  it('should return error when AGENT_PRIVATE_KEY is not set', async () => {
    const result = await submitClaim('testhandle', '0xowner', 606);

    expect(result).toEqual({
      success: false,
      error: 'AGENT_PRIVATE_KEY not set',
    });
  });

  it('should successfully submit claim and return txHash', async () => {
    process.env.AGENT_PRIVATE_KEY = '0x' + 'a'.repeat(64);

    mockReadContract.mockResolvedValue('0xhash123');
    mockWriteContract
      .mockResolvedValueOnce('0xclaimtx') // claimHandle
      .mockResolvedValueOnce('0xlinktx'); // linkAgent
    mockWaitForTransactionReceipt.mockResolvedValue({ status: 'success' });

    const result = await submitClaim('testhandle', '0xowner', 606);

    expect(result).toEqual({
      success: true,
      txHash: '0xlinktx',
    });

    // Check claimHandle call
    expect(mockWriteContract).toHaveBeenCalledWith({
      address: expect.any(String),
      abi: expect.any(Array),
      functionName: 'claimHandle',
      args: ['0xhash123', '0xowner'],
    });

    // Check linkAgent call
    expect(mockWriteContract).toHaveBeenCalledWith({
      address: expect.any(String),
      abi: expect.any(Array),
      functionName: 'linkAgent',
      args: ['0xhash123', BigInt(606)],
    });
  });

  it('should return error message on failure', async () => {
    process.env.AGENT_PRIVATE_KEY = '0x' + 'a'.repeat(64);

    mockReadContract.mockRejectedValue(new Error('Handle not found'));

    const result = await submitClaim('testhandle', '0xowner', 606);

    expect(result).toEqual({
      success: false,
      error: 'Handle not found',
    });
  });
});

describe('resolveAgentId', () => {
  it('should return valid agent id when agent exists', async () => {
    mockReadContract.mockResolvedValue('0xowner');

    const result = await resolveAgentId(606);

    expect(result).toBe(606);
    expect(mockReadContract).toHaveBeenCalledWith({
      address: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
      abi: expect.any(Array),
      functionName: 'ownerOf',
      args: [BigInt(606)],
    });
  });

  it('should return null for invalid agent', async () => {
    mockReadContract.mockRejectedValue(new Error('ERC721: invalid token ID'));

    const result = await resolveAgentId(9999);

    expect(result).toBeNull();
  });

  it('should return null for non-integer input', async () => {
    const result = await resolveAgentId(3.14);

    expect(result).toBeNull();
  });

  it('should return null for zero or negative input', async () => {
    expect(await resolveAgentId(0)).toBeNull();
    expect(await resolveAgentId(-1)).toBeNull();
  });
});

describe('resolveHandleToAgentId', () => {
  it('should return linked agent id when handle is linked', async () => {
    mockReadContract
      .mockResolvedValueOnce('0xhash123') // handleHash
      .mockResolvedValueOnce({
        // getHandle
        platform: 'x',
        handle: 'testhandle',
        claimedBy: '0xowner',
        linkedAgentId: BigInt(606),
        createdAt: BigInt(123456),
        claimedAt: BigInt(123457),
      });

    const result = await resolveHandleToAgentId('testhandle');

    expect(result).toBe(606);
  });

  it('should fallback to hardcoded map for unlinked handles', async () => {
    mockReadContract.mockResolvedValueOnce('0xhash123').mockResolvedValueOnce({
      platform: 'x',
      handle: 'bighoss',
      claimedBy: '0xowner',
      linkedAgentId: BigInt(0), // Not linked
      createdAt: BigInt(123456),
      claimedAt: BigInt(123457),
    });

    const result = await resolveHandleToAgentId('bighoss');

    expect(result).toBe(592); // From hardcoded map
  });

  it('should return null for unknown handle', async () => {
    mockReadContract.mockRejectedValue(new Error('Handle not found'));

    const result = await resolveHandleToAgentId('unknownhandle');

    expect(result).toBeNull();
  });

  it('should handle case insensitive lookup', async () => {
    mockReadContract.mockResolvedValueOnce('0xhash123').mockResolvedValueOnce({
      platform: 'x',
      handle: 'ack_onchain',
      claimedBy: '0xowner',
      linkedAgentId: BigInt(0),
      createdAt: BigInt(123456),
      claimedAt: BigInt(123457),
    });

    const result = await resolveHandleToAgentId('ACK_ONCHAIN');

    expect(result).toBe(606); // From hardcoded map, case insensitive
  });
});

describe('getAgentName', () => {
  it('should return agent name from valid data URI', async () => {
    const mockData = JSON.stringify({ name: 'Test Agent' });
    const mockUri = `data:application/json;base64,${btoa(mockData)}`;

    mockReadContract.mockResolvedValue(mockUri);

    const result = await getAgentName(606);

    expect(result).toBe('Test Agent');
    expect(mockReadContract).toHaveBeenCalledWith({
      address: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
      abi: expect.any(Array),
      functionName: 'tokenURI',
      args: [BigInt(606)],
    });
  });

  it('should return null for invalid URI format', async () => {
    mockReadContract.mockResolvedValue('https://example.com/token/606');

    const result = await getAgentName(606);

    expect(result).toBeNull();
  });

  it('should return null on contract error', async () => {
    mockReadContract.mockRejectedValue(new Error('Contract error'));

    const result = await getAgentName(9999);

    expect(result).toBeNull();
  });

  it('should return null when name field is missing', async () => {
    const mockData = JSON.stringify({ description: 'Agent without name' });
    const mockUri = `data:application/json;base64,${btoa(mockData)}`;

    mockReadContract.mockResolvedValue(mockUri);

    const result = await getAgentName(606);

    expect(result).toBeNull();
  });
});
