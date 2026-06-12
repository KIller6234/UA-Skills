import { EntityDedupService } from './entity-dedup.service';

const mockPrisma = {
  entity: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  $queryRaw: jest.fn(),
  entityCoMention: {
    upsert: jest.fn(),
  },
};

const mockLlm = {
  matchEntities: jest.fn(),
};

const MOCK_ENTITY = {
  id: 'ent-1',
  kind: 'COMPANY',
  canonicalName: 'OpenAI',
  normalizedName: 'openai',
  aliases: ['OpenAI'],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('EntityDedupService', () => {
  let service: EntityDedupService;

  beforeEach(() => {
    service = new EntityDedupService(mockPrisma as any, mockLlm as any);
    jest.clearAllMocks();
  });

  describe('findOrCreate', () => {
    it('resolves all extracted entities in parallel', async () => {
      mockPrisma.entity.findFirst.mockResolvedValue(MOCK_ENTITY);
      mockPrisma.entity.update.mockResolvedValue(MOCK_ENTITY);

      const result = await service.findOrCreate([
        { name: 'OpenAI', type: 'company', confidence: 0.9 },
        { name: 'OpenAI', type: 'company', confidence: 0.95 },
      ]);
      expect(result).toHaveLength(2);
    });
  });

  describe('tier 1: exact normalized name match', () => {
    it('returns existing entity and skips create', async () => {
      mockPrisma.entity.findFirst.mockResolvedValueOnce(MOCK_ENTITY);
      mockPrisma.entity.update.mockResolvedValueOnce({ ...MOCK_ENTITY, aliases: ['OpenAI'] });

      const result = await service.findOrCreate([{ name: 'OpenAI', type: 'company', confidence: 0.9 }]);

      expect(mockPrisma.entity.create).not.toHaveBeenCalled();
      expect(result[0]?.id).toBe('ent-1');
    });

    it('adds alias if not already present', async () => {
      mockPrisma.entity.findFirst.mockResolvedValueOnce(MOCK_ENTITY);
      mockPrisma.entity.update.mockResolvedValueOnce({ ...MOCK_ENTITY, aliases: ['OpenAI', 'openai'] });

      await service.findOrCreate([{ name: 'openai', type: 'company', confidence: 0.9 }]);

      expect(mockPrisma.entity.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { aliases: { push: 'openai' } },
        }),
      );
    });

    it('skips alias update if alias already exists', async () => {
      mockPrisma.entity.findFirst.mockResolvedValueOnce({
        ...MOCK_ENTITY,
        aliases: ['OpenAI', 'openai'],
      });

      await service.findOrCreate([{ name: 'openai', type: 'company', confidence: 0.9 }]);

      expect(mockPrisma.entity.update).not.toHaveBeenCalled();
    });
  });

  describe('tier 2: alias match', () => {
    it('returns entity matched by alias array', async () => {
      mockPrisma.entity.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(MOCK_ENTITY);

      const result = await service.findOrCreate([{ name: 'OpenAI Inc', type: 'company', confidence: 0.85 }]);

      expect(result[0]?.id).toBe('ent-1');
      expect(mockPrisma.entity.create).not.toHaveBeenCalled();
    });
  });

  describe('tier 3: pg_trgm similarity', () => {
    it('adds alias and returns entity when single candidate found', async () => {
      mockPrisma.entity.findFirst.mockResolvedValue(null);
      mockPrisma.$queryRaw.mockResolvedValueOnce([MOCK_ENTITY]);
      mockPrisma.entity.update.mockResolvedValueOnce({ ...MOCK_ENTITY, aliases: ['OpenAI', 'Open AI'] });

      const result = await service.findOrCreate([{ name: 'Open AI', type: 'company', confidence: 0.9 }]);

      expect(result[0]?.id).toBe('ent-1');
      expect(mockLlm.matchEntities).not.toHaveBeenCalled();
    });

    it('uses LLM to disambiguate multiple candidates', async () => {
      const ENTITY_2 = { ...MOCK_ENTITY, id: 'ent-2', canonicalName: 'OpenTable', normalizedName: 'opentable' };
      mockPrisma.entity.findFirst.mockResolvedValue(null);
      mockPrisma.$queryRaw.mockResolvedValueOnce([MOCK_ENTITY, ENTITY_2]);
      mockLlm.matchEntities.mockResolvedValueOnce({ matchedName: 'OpenAI', confidence: 0.95 });
      mockPrisma.entity.update.mockResolvedValueOnce(MOCK_ENTITY);

      const result = await service.findOrCreate([{ name: 'OpnAI', type: 'company', confidence: 0.8 }]);

      expect(mockLlm.matchEntities).toHaveBeenCalledWith(
        expect.objectContaining({ candidate: 'OpnAI', options: ['OpenAI', 'OpenTable'] }),
      );
      expect(result[0]?.id).toBe('ent-1');
    });

    it('creates new entity when LLM returns no match', async () => {
      mockPrisma.entity.findFirst.mockResolvedValue(null);
      mockPrisma.$queryRaw.mockResolvedValueOnce([MOCK_ENTITY, { ...MOCK_ENTITY, id: 'ent-2' }]);
      mockLlm.matchEntities.mockResolvedValueOnce({ matchedName: null, confidence: 0 });
      mockPrisma.entity.create.mockResolvedValueOnce({ ...MOCK_ENTITY, id: 'ent-new', canonicalName: 'OpnAI' });

      await service.findOrCreate([{ name: 'OpnAI', type: 'company', confidence: 0.8 }]);

      expect(mockPrisma.entity.create).toHaveBeenCalled();
    });
  });

  describe('create new entity', () => {
    it('creates entity with normalized name and kind when no match found', async () => {
      mockPrisma.entity.findFirst.mockResolvedValue(null);
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);
      mockPrisma.entity.create.mockResolvedValueOnce({ ...MOCK_ENTITY, id: 'ent-new', canonicalName: 'NewCo' });

      const result = await service.findOrCreate([{ name: 'NewCo', type: 'company', confidence: 0.9 }]);

      expect(mockPrisma.entity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            canonicalName: 'NewCo',
            normalizedName: 'newco',
            kind: 'COMPANY',
          }),
        }),
      );
      expect(result[0]?.id).toBe('ent-new');
    });
  });

  describe('updateCoMentions', () => {
    it('does nothing when fewer than 2 entity IDs provided', async () => {
      await service.updateCoMentions(['ent-1']);
      expect(mockPrisma.entityCoMention.upsert).not.toHaveBeenCalled();
    });

    it('does nothing for empty array', async () => {
      await service.updateCoMentions([]);
      expect(mockPrisma.entityCoMention.upsert).not.toHaveBeenCalled();
    });

    it('upserts one co-mention for two entities', async () => {
      mockPrisma.entityCoMention.upsert.mockResolvedValue({});
      await service.updateCoMentions(['ent-1', 'ent-2']);
      expect(mockPrisma.entityCoMention.upsert).toHaveBeenCalledTimes(1);
    });

    it('upserts N*(N-1)/2 pairs for N entities', async () => {
      mockPrisma.entityCoMention.upsert.mockResolvedValue({});
      await service.updateCoMentions(['ent-1', 'ent-2', 'ent-3']);
      expect(mockPrisma.entityCoMention.upsert).toHaveBeenCalledTimes(3);
    });

    it('orders entity IDs so smaller ID is always entityAId', async () => {
      mockPrisma.entityCoMention.upsert.mockResolvedValue({});
      await service.updateCoMentions(['ent-z', 'ent-a']);
      const call = mockPrisma.entityCoMention.upsert.mock.calls[0][0];
      expect(call.where.entityAId_entityBId.entityAId).toBe('ent-a');
      expect(call.where.entityAId_entityBId.entityBId).toBe('ent-z');
    });
  });
});
