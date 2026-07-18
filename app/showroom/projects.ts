// Real project history compiled 2026-07-17 from local git logs in ~/code.
// Commit counts exclude upstream x402scan history. Live URLs verified same day.

export type ExhibitStatus =
  | 'live'
  | 'upstreamed'
  | 'shipped'
  | 'contributed'
  | 'concluded'
  | 'superseded'
  | 'one-shot'
  | 'dormant'
  | 'stalled'
  | 'abandoned';

// alive = emerald, done = neutral, fell = amber
export const STATUS_TONE: Record<ExhibitStatus, 'alive' | 'done' | 'fell'> = {
  live: 'alive',
  upstreamed: 'alive',
  shipped: 'alive',
  contributed: 'done',
  concluded: 'done',
  superseded: 'done',
  'one-shot': 'done',
  dormant: 'fell',
  stalled: 'fell',
  abandoned: 'fell',
};

export interface Exhibit {
  name: string;
  dates: string;
  commits: number;
  status: ExhibitStatus;
  blurb: string;
  url?: string;
  chapter: string;
}

export const CHAPTERS = [
  'THE REPUTATION THREAD',
  'ONE WEEK, TWO WINS',
  'THE SPREE',
  'GAMES WITH PAYMENTS',
  'INFRASTRUCTURE',
] as const;

export const EXHIBITS: Exhibit[] = [
  {
    name: 'ACK PROTOCOL',
    dates: 'AUG 2025 - NOW',
    commits: 485,
    status: 'live',
    blurb: 'ERC-8004 reputation for AI agents. Kudos, tips, 14+ chains.',
    url: 'https://ack-onchain.dev',
    chapter: 'THE REPUTATION THREAD',
  },
  {
    name: 'ONCHAIN KUDOS',
    dates: 'AUG 2025 - FEB 2026',
    commits: 83,
    status: 'superseded',
    blurb: 'Permanent shoutouts for X frens. Became ACK Protocol.',
    chapter: 'THE REPUTATION THREAD',
  },
  {
    name: 'ACK SDK',
    dates: 'FEB 16 2026',
    commits: 1,
    status: 'one-shot',
    blurb: 'TypeScript SDK, v0.1.1. One commit, one publish.',
    chapter: 'THE REPUTATION THREAD',
  },
  {
    name: 'ABSTRACT-SKILLS',
    dates: 'FEB 26-27 2026',
    commits: 9,
    status: 'upstreamed',
    blurb:
      'Claude Code plugin. Two days of work, now in the Abstract-Foundation org.',
    url: 'https://github.com/Abstract-Foundation/abstract-skills',
    chapter: 'ONE WEEK, TWO WINS',
  },
  {
    name: 'ABSTRACK',
    dates: 'FEB 27 - MAR 3 2026',
    commits: 44,
    status: 'live',
    blurb: 'Every block is a song. Gas sets tempo, the hash seeds the scale.',
    url: 'https://www.abstrack.live',
    chapter: 'ONE WEEK, TWO WINS',
  },
  {
    name: 'ETCH',
    dates: 'MAR 23 - MAY 28 2026',
    commits: 90,
    status: 'live',
    blurb:
      'Permanent onchain records with generative art. npm + OpenSea + Abscan.',
    url: 'https://etch.ack-onchain.dev',
    chapter: 'THE SPREE',
  },
  {
    name: 'AGENT-AFK',
    dates: 'MAR 6 - APR 16 2026',
    commits: 120,
    status: 'dormant',
    blurb: 'Autonomous DeFi agents. 120 commits, no public deploy. Yet.',
    chapter: 'THE SPREE',
  },
  {
    name: 'BIRTHDAY-VAULT',
    dates: 'MAR 8 2026',
    commits: 1,
    status: 'shipped',
    blurb: 'Onchain memory capsule for Ezra. Mainnet in a day, on purpose.',
    chapter: 'THE SPREE',
  },
  {
    name: 'AGENT-ARENA',
    dates: 'MAR 25-27 2026',
    commits: 16,
    status: 'concluded',
    blurb: 'Two agents, one USDC prize. Four battles, hashes verified onchain.',
    chapter: 'THE SPREE',
  },
  {
    name: 'X402SCAN PR',
    dates: 'MAR 19 2026',
    commits: 1,
    status: 'contributed',
    blurb: 'Abstract chain scaffolding (2741) contributed upstream.',
    chapter: 'THE SPREE',
  },
  {
    name: 'X402-ABSTRACT',
    dates: 'MAR 8-11 2026',
    commits: 8,
    status: 'stalled',
    blurb: 'x402 explorer for Abstract. Four days of commits, then nothing.',
    chapter: 'THE SPREE',
  },
  {
    name: 'ASSEMBLY-SNIPER',
    dates: 'MAR 7 2026',
    commits: 1,
    status: 'one-shot',
    blurb:
      'Auction sniper for AI Assembly seats. Landed once, never touched again.',
    chapter: 'THE SPREE',
  },
  {
    name: 'PUFF-PUFF-PASS',
    dates: 'APR 15-17 2026',
    commits: 21,
    status: 'live',
    blurb: 'x402-gated joint passing game. Built in three days, still up.',
    url: 'https://ppp.0x402.sh',
    chapter: 'GAMES WITH PAYMENTS',
  },
  {
    name: 'AGENT TOOL INDEX',
    dates: 'JUN 2-17 2026',
    commits: 122,
    status: 'live',
    blurb: 'ERC-8257 tools indexed across Ethereum, Base, Abstract.',
    url: 'https://agenttoolindex.xyz',
    chapter: 'INFRASTRUCTURE',
  },
  {
    name: 'GIGATHON-1',
    dates: 'JUN 15-16 2026',
    commits: 6,
    status: 'abandoned',
    blurb: 'Ten-day hackathon. Goal: win. Commits stop on day two.',
    chapter: 'INFRASTRUCTURE',
  },
];
