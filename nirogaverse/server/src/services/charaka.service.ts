import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import { config } from '../config/env';

type CharakaChunk = {
  id: number;
  text: string;
};

export type RankedChunk = {
  id: number;
  text: string;
  score: number;
};

let cachedChunks: CharakaChunk[] | null = null;
let cacheError: string | null = null;

const getPdfPath = () => {
  if (config.knowledge.charakaPdfPath) {
    return path.resolve(config.knowledge.charakaPdfPath);
  }

  return path.resolve(__dirname, '../../../data/charaka_samhita.pdf');
};

const normalize = (text: string) => text.replace(/\r/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

const tokenize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2);

// Medical/Ayurvedic term stems for better matching
const getStemVariants = (word: string): string[] => {
  const variants = [word];
  // Common suffixes to strip for partial matching
  if (word.endsWith('ing')) variants.push(word.slice(0, -3));
  if (word.endsWith('tion')) variants.push(word.slice(0, -4));
  if (word.endsWith('ness')) variants.push(word.slice(0, -4));
  if (word.endsWith('ity')) variants.push(word.slice(0, -3));
  if (word.endsWith('ly')) variants.push(word.slice(0, -2));
  if (word.endsWith('ed')) variants.push(word.slice(0, -2));
  if (word.endsWith('er')) variants.push(word.slice(0, -2));
  if (word.endsWith('est')) variants.push(word.slice(0, -3));
  if (word.endsWith('s') && word.length > 3) variants.push(word.slice(0, -1));
  return variants.filter(v => v.length > 2);
};

const chunkText = (text: string): CharakaChunk[] => {
  const paragraphs = normalize(text)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 80);

  const out: CharakaChunk[] = [];
  let buffer = '';

  for (const paragraph of paragraphs) {
    const next = buffer ? `${buffer}\n\n${paragraph}` : paragraph;

    if (next.length > 900 && buffer) {
      out.push({ id: out.length + 1, text: buffer });
      buffer = paragraph;
    } else {
      buffer = next;
    }
  }

  if (buffer) {
    out.push({ id: out.length + 1, text: buffer });
  }

  return out;
};

const loadCharakaChunks = async () => {
  if (cachedChunks) {
    return cachedChunks;
  }

  if (cacheError) {
    return [];
  }

  const pdfPath = getPdfPath();

  if (!fs.existsSync(pdfPath)) {
    cacheError = `Charaka PDF not found at ${pdfPath}`;
    console.warn(cacheError);
    return [];
  }

  try {
    const fileBuffer = fs.readFileSync(pdfPath);
    const parsed = await pdfParse(fileBuffer);
    cachedChunks = chunkText(parsed.text);

    if (cachedChunks.length === 0) {
      cacheError = 'Charaka PDF loaded but no usable text chunks were extracted.';
      console.warn(cacheError);
      return [];
    }

    return cachedChunks;
  } catch (error) {
    cacheError = `Failed to parse Charaka PDF: ${String(error)}`;
    console.error(cacheError);
    return [];
  }
};

export const findRelevantCharakaChunks = async (query: string, limit = 5): Promise<RankedChunk[]> => {
  const chunks = await loadCharakaChunks();
  if (chunks.length === 0) {
    return [];
  }

  const queryTokens = Array.from(new Set(tokenize(query)));
  if (queryTokens.length === 0) {
    // Return some general chunks if no meaningful tokens
    return chunks.slice(0, Math.min(limit, 3)).map(c => ({ ...c, score: 1 }));
  }

  // Build expanded query token variants for better matching
  const expandedTokens: string[] = [];
  for (const token of queryTokens) {
    expandedTokens.push(...getStemVariants(token));
  }
  const uniqueExpanded = Array.from(new Set(expandedTokens));

  const ranked = chunks
    .map((chunk) => {
      const lower = chunk.text.toLowerCase();
      let score = 0;
      // Exact token match gets full point
      for (const token of queryTokens) {
        if (lower.includes(token)) score += 2;
      }
      // Stem variant match gets partial point
      for (const variant of uniqueExpanded) {
        if (!queryTokens.includes(variant) && lower.includes(variant)) score += 1;
      }
      return {
        id: chunk.id,
        text: chunk.text,
        score,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // If we got fewer chunks than requested, add some general ones
  if (ranked.length < 2) {
    const generalChunks = chunks
      .filter(c => !ranked.find(r => r.id === c.id))
      .slice(0, limit - ranked.length)
      .map(c => ({ ...c, score: 0 }));
    ranked.push(...generalChunks);
  }

  return ranked;
};

export const formatCharakaCitations = (chunks: RankedChunk[]) => {
  if (chunks.length === 0) {
    return 'No directly relevant Charaka passage found for this input.';
  }

  return chunks
    .map((chunk) => {
      const compact = chunk.text.replace(/\s+/g, ' ').slice(0, 280);
      return `- [Charaka chunk ${chunk.id}] ${compact}${chunk.text.length > 280 ? '...' : ''}`;
    })
    .join('\n');
};

export const validateAgainstCharaka = (generatedText: string, chunks: RankedChunk[]) => {
  if (chunks.length === 0) {
    return {
      score: 0,
      label: 'LOW',
      message: 'Validation LOW: no supporting Charaka chunk was found for this response.',
    };
  }

  const responseTokens = Array.from(new Set(tokenize(generatedText)));
  if (responseTokens.length === 0) {
    return {
      score: 0,
      label: 'LOW',
      message: 'Validation LOW: response had no meaningful tokens to validate.',
    };
  }

  const sourceText = chunks.map((chunk) => chunk.text.toLowerCase()).join(' ');
  const overlapCount = responseTokens.reduce((acc, token) => (sourceText.includes(token) ? acc + 1 : acc), 0);
  const score = Math.round((overlapCount / responseTokens.length) * 100);

  const label = score >= 55 ? 'HIGH' : score >= 30 ? 'MEDIUM' : 'LOW';

  return {
    score,
    label,
    message: `Validation ${label}: ${score}% lexical overlap with retrieved Charaka passages.`,
  };
};
