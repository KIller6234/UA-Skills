import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_AXES = [
  {
    key: 'content_type',
    label: 'Content Type',
    description: 'The type of content in this article',
    values: [
      { value: 'news', label: 'News' },
      { value: 'analysis', label: 'Analysis' },
      { value: 'tutorial', label: 'Tutorial' },
      { value: 'release', label: 'Release' },
      { value: 'opinion', label: 'Opinion' },
    ],
  },
  {
    key: 'reader_level',
    label: 'Reader Level',
    description: 'Technical level required to understand this article',
    values: [
      { value: 'junior', label: 'Junior' },
      { value: 'middle', label: 'Middle' },
      { value: 'senior', label: 'Senior' },
    ],
  },
  {
    key: 'region',
    label: 'Region',
    description: 'Geographic relevance of this article',
    values: [
      { value: 'ua', label: 'Ukraine' },
      { value: 'eu', label: 'Europe' },
      { value: 'us', label: 'United States' },
      { value: 'global', label: 'Global' },
    ],
  },
  {
    key: 'tone',
    label: 'Tone',
    description: 'Editorial tone of the article',
    values: [
      { value: 'neutral', label: 'Neutral' },
      { value: 'promotional', label: 'Promotional' },
      { value: 'critical', label: 'Critical' },
    ],
  },
];

export async function seedDefaultAxes(userId: string): Promise<void> {
  for (const [i, axis] of DEFAULT_AXES.entries()) {
    const created = await prisma.categorizationAxis.upsert({
      where: { userId_key: { userId, key: axis.key } },
      create: {
        userId,
        key: axis.key,
        label: axis.label,
        description: axis.description,
        isSystemDefault: true,
        sortOrder: i,
        values: {
          create: axis.values.map((v, j) => ({
            value: v.value,
            label: v.label,
            sortOrder: j,
          })),
        },
      },
      update: {},
    });
    void created;
  }
}

async function main(): Promise<void> {
  console.log('Seed: default axes are created per-user on registration. Nothing to seed globally.');
  await prisma.$disconnect();
}

void main();
