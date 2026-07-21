import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const faqPair = z.object({ q: z.string(), a: z.string() });

// Blog posts — TOFU/MOFU articles. BOFU termini are the campaign landing pages.
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string().default('Guide'),
    funnelStage: z.enum(['TOFU', 'MOFU', 'BOFU']),
    cluster: z.enum(['ichra', 'employers', 'nevada-core']),
    datePublished: z.string(),
    dateModified: z.string().optional(), // omit unless content genuinely changed (wiki: date-modified-schema)
    author: z.string().default('ProtectHealth Team'),
    quickAnswer: z.array(z.string()).min(3), // Quick Answer bullets (BOFU/MOFU extractable section)
    speakableText: z.string(), // 3-4 sentences, differs from quick answers (wiki: speakable-vs-accepted-answer)
    faq: z.array(faqPair).length(5), // exactly 5 pairs (wiki: faq-single-source-architecture)
    relatedQa: z.array(z.string()).default([]), // slugs of child Q&A pages
    heroAlt: z.string().optional(),
  }),
});

// Q&A pages — single-question answer pages clustered around parent posts.
const qa = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/qa' }),
  schema: z.object({
    question: z.string(),
    description: z.string(),
    cluster: z.enum(['ichra', 'employers', 'nevada-core']),
    parentPost: z.string(), // slug of the parent blog post
    siblings: z.array(z.string()).min(1), // sibling Q&A slugs
    datePublished: z.string(),
    dateModified: z.string().optional(),
    quickAnswer: z.string(), // 1-2 sentence direct answer → JSON-LD acceptedAnswer
    speakableText: z.string(), // richer 3-4 sentence passage → #ai-summary (MUST differ from quickAnswer)
    faq: z.array(faqPair).min(3).max(5),
  }),
});

export const collections = { blog, qa };
