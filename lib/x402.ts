import { x402ResourceServer } from '@x402/core/server';
import { HTTPFacilitatorClient } from '@x402/core/server';
import { ExactEvmScheme } from '@x402/evm/exact/server';

export const ABSTRACT_FACILITATOR_URL = 'https://facilitator.x402.abs.xyz';

const facilitatorClient = new HTTPFacilitatorClient({
  url: ABSTRACT_FACILITATOR_URL,
});

export const x402Server = new x402ResourceServer(facilitatorClient);
x402Server.register('eip155:*', new ExactEvmScheme());
