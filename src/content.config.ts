import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      summary: z.string(),
      tags: z.array(z.string()),
      stack: z.array(z.string()),
      // 越小越靠前
      order: z.number(),
      // 封面二选一：一张图片，或者内置的插画
      cover: image().optional(),
      coverAlt: z.string().optional(),
      coverPosition: z.string().default('center'),
      art: z.enum(['seats']).optional(),
      demo: z.url().optional(),
      source: z.url().optional(),
    }),
});

export const collections = { projects };
