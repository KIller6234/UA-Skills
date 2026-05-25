import { GroqAdapter } from './groq.adapter';
import { LlmValidationError } from '../llm.interface';

jest.mock('@ai-sdk/groq', () => ({
  createGroq: jest.fn(() => jest.fn(() => 'mock-model')),
}));

jest.mock('ai', () => ({
  generateObject: jest.fn(),
}));

import { generateObject } from 'ai';

const mockGenerateObject = generateObject as jest.MockedFunction<typeof generateObject>;

const VALID_RESULT = {
  entities: [{ name: 'Ethereum', type: 'product', confidence: 0.9 }],
  summary: 'Ethereum completed a major protocol upgrade this week.',
  importance: 'normal' as const,
  axisValues: { region: 'global' },
  categories: [],
};

const MOCK_INPUT = {
  contentHash: 'xyz789',
  title: 'Ethereum upgrade completed',
  bodyText: 'The Ethereum network successfully completed its latest upgrade...',
  userCategories: [],
  axes: [],
  promptVersion: 'v1',
};

describe('GroqAdapter', () => {
  let adapter: GroqAdapter;

  beforeEach(() => {
    adapter = new GroqAdapter('test-groq-key', 'llama-3.1-8b-instant');
    jest.clearAllMocks();
  });

  it('returns parsed result on valid response', async () => {
    mockGenerateObject.mockResolvedValueOnce({ object: VALID_RESULT } as never);
    const result = await adapter.analyzeArticle(MOCK_INPUT);
    expect(result.entities[0]?.name).toBe('Ethereum');
    expect(result.importance).toBe('normal');
  });

  it('throws LlmValidationError when provider throws', async () => {
    mockGenerateObject.mockRejectedValueOnce(new Error('Rate limit exceeded'));
    await expect(adapter.analyzeArticle(MOCK_INPUT)).rejects.toThrow(LlmValidationError);
  });

  it('passes mode: json for Groq compatibility', async () => {
    mockGenerateObject.mockResolvedValueOnce({ object: VALID_RESULT } as never);
    await adapter.analyzeArticle(MOCK_INPUT);
    expect(mockGenerateObject).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'json' }),
    );
  });

  it('entity match returns null when no match found', async () => {
    mockGenerateObject.mockResolvedValueOnce({
      object: { matchedName: null, confidence: 0.0 },
    } as never);
    const result = await adapter.matchEntities({ candidate: 'XYZ Corp', options: ['Apple', 'Google'] });
    expect(result.matchedName).toBeNull();
    expect(result.confidence).toBe(0.0);
  });
});
