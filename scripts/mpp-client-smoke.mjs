import { Mppx, tempo } from 'mppx/client';
import { privateKeyToAccount } from 'viem/accounts';

const base = process.env.BASE_URL || 'http://localhost:3012';
const tipId = process.env.TIP_ID;
const pk = process.env.MPP_TEST_PRIVATE_KEY;

if (!tipId) {
  console.error('TIP_ID required');
  process.exit(1);
}
if (!pk) {
  console.error('MPP_TEST_PRIVATE_KEY required');
  process.exit(1);
}

const account = privateKeyToAccount(pk);

const mppx = Mppx.create({
  methods: [tempo({ account })],
  polyfill: false,
});

const res = await mppx.fetch(`${base}/api/tips/${tipId}/pay`);
const text = await res.text();
console.log('status', res.status);
console.log('body', text);
