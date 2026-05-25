import { GoogleAdapter } from './google.adapter';
import { LlmValidationError } from '../llm.interface';

jest.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: jest.fn(() => jest.fn(() => 'mock-model')),
}));

jest.mock('ai', () => ({
  generateObject: jest.fn(),
}));

import { generateObject } from 'ai';

const mockGenerateObject = generateObject as jest.MockedFunction<typeof generateObject>;

const VALID_RESULT = {
  entities: [{ name: 'OpenAI', type: 'company', confidence: 0.95 }],
  summary: 'OpenAI released a new model with improved capabilities.',
  importance: 'high' as const,
  axisValues: { content_type: 'news', region: 'us' },
  categories: ['AI News'],
};

const MOCK_INPUT = {
  contentHash: 'abc123',
  title: 'OpenAI releases GPT-5',
  bodyText: 'OpenAI has released its latest model...',
  userCategories: ['AI News'],
  axes: [{ key: 'content_type', label: 'Content Type', values: ['news', 'analysis'] }],
  promptVersion: 'v1',
};

describe('GoogleAdapter', () => {
  let adapter: GoogleAdapter;

  beforeEach(() => {
    adapter = new GoogleAdapter('test-api-key', 'gemini-1.5-flash');
    jest.clearAllMocks();
  });

  it('returns parsed result on valid response', async () => {
    mockGenerateObject.mockResolvedValueOnce({ object: VALID_RESULT } as never);
    const result = await adapter.analyzeArticle(MOCK_INPUT);
    expect(result.importance).toBe('high');
    expect(result.entities[0]?.name).toBe('OpenAI');
    expect(result.summary.length).toBeGreaterThan(10);
  });

  it('throws LlmValidationError when provider throws', async () => {
    mockGenerateObject.mockRejectedValueOnce(new Error('API timeout'));
    await expect(adapter.analyzeArticle(MOCK_INPUT)).rejects.toThrow(LlmValidationError);
  });

  it('calls generateObject with temperature 0.1 for analysis', async () => {
    mockGenerateObject.mockResolvedValueOnce({ object: VALID_RESULT } as never);
    await adapter.analyzeArticle(MOCK_INPUT);
    expect(mockGenerateObject).toHaveBeenCalledWith(
      expect.objectContaining({ temperature: 0.1 }),
    );
  });

  it('calls generateObject with temperature 0 for entity matching', async () => {
    mockGenerateObject.mockResolvedValueOnce({
      object: { matchedName: 'Microsoft', confidence: 0.97 },
    } as never);
    await adapter.matchEntities({ candidate: 'MSFT', options: ['Microsoft', 'Apple'] });
    expect(mockGenerateObject).toHaveBeenCalledWith(
      expect.objectContaining({ temperature: 0 }),
    );
  });
});
