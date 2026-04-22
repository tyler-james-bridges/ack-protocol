import { handlers } from './handlers';

export type OfferingName = keyof typeof handlers;

export const OFFERING_PRICES: Record<OfferingName, number> = {
  agent_discovery: 0.02,
  reputation_check: 0.05,
  give_kudos: 0.1,
};

export function routeOffering(req: unknown): OfferingName | null {
  if (!req || typeof req !== 'object') return null;
  const r = req as Record<string, unknown>;
  if (typeof r.query === 'string') return 'agent_discovery';
  if (typeof r.agent === 'string') return 'reputation_check';
  if (typeof r.agentId === 'number' && r.agentId !== undefined)
    return 'give_kudos';
  return null;
}
