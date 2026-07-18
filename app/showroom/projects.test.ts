import { describe, expect, it } from 'vitest';
import { CHAPTERS, EXHIBITS, STATUS_TONE } from './projects';

describe('showroom exhibits', () => {
  it('has 13 exhibits totaling 998 commits', () => {
    expect(EXHIBITS).toHaveLength(13);
    const total = EXHIBITS.reduce((sum, e) => sum + e.commits, 0);
    expect(total).toBe(998);
  });

  it('maps every status to a tone', () => {
    for (const e of EXHIBITS) {
      expect(STATUS_TONE[e.status]).toMatch(/^(alive|done|fell)$/);
    }
  });

  it('gives every live exhibit a URL', () => {
    for (const e of EXHIBITS.filter((e) => e.status === 'live')) {
      expect(e.url).toMatch(/^https:\/\//);
    }
  });

  it('assigns every exhibit to a known chapter, and every chapter has exhibits', () => {
    const chapters = new Set<string>(CHAPTERS);
    for (const e of EXHIBITS) {
      expect(chapters.has(e.chapter)).toBe(true);
    }
    for (const c of CHAPTERS) {
      expect(EXHIBITS.some((e) => e.chapter === c)).toBe(true);
    }
  });
});
