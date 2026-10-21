---
name: verify-ack
description: Drive the ACK Protocol web app at a local dev server or read-only against https://ack-onchain.dev. Use to prove home, explore, an agent page, give-kudos, tip, register (including the chain picker), and /.well-known/agent-registration.json with screenshots, ARIA snapshots, and API responses.
---

# Verify ACK

ACK (Agent Consensus Kudos) is a Next.js web app. The primary surface is the browser UI served by `next dev`. JSON routes under `/api` and `/.well-known` are part of the same server. Wallet signing and payments are external boundaries: this skill drives the UI up to that boundary and does not cross it.

Run every command from the repository root. The harness is `control-ack`.

```bash
export PATH="$PWD/.cursor/skills/verify-ack/scripts:$PATH"
export RUN_ID="$(date +%s)-$$"
export ACK_VERIFY_DIR="/tmp/ack-verify-$RUN_ID"
```

Keep `ACK_VERIFY_DIR` and `PATH` set for the whole run. Two runs need different directories and, for local servers, different `ACK_VERIFY_PORT` values. Do not point a second harness at a server this run did not start.

## Launch

Install dependencies once if `node_modules` or Playwright's Chromium is missing:

```bash
npm install
npx playwright install chromium
```

Start the documented dev server and the browser daemon:

```bash
control-ack launch
```

`launch` runs `npx next dev --turbopack -H 127.0.0.1 -p 4173` with `NEXT_PUBLIC_CHAIN=base`. It does not pass `DATABASE_URL`, `AGENT_PRIVATE_KEY`, or `PRIVATE_KEY`. Override the port with `ACK_VERIFY_PORT` before launch when 4173 is taken. Launch fails if that port is already open instead of attaching to a foreign process.

Ready means both of these are true:

- The server log at `$ACK_VERIFY_DIR/server.log` has printed Next's `Ready` line.
- `GET /api/health` returns `{"status":"healthy","name":"ACK Protocol",...}` and `GET /` returns HTML containing `ACK records kudos`.

A health check alone is not ready. Launch waits up to 180 seconds for the home page phrase, then exits non-zero and stops the process it started.

For a read-only pass against the deployed site, do not start Next:

```bash
control-ack launch --browser-only --origin https://ack-onchain.dev
```

That command starts only the browser daemon. It does not compile or boot the app. Use it for `https://ack-onchain.dev` only. Local verification uses `control-ack launch` without `--browser-only`.

This local launch is the README dev server, not `next build && next start`. Deployed production is the separate origin above.

## Doctor

Run doctor before the first drive, after any failed drive, and again after relaunch.

```bash
control-ack doctor
```

Doctor is read-only. It passes only when all of the following hold:

- The session file in `$ACK_VERIFY_DIR` records this run.
- For a local server: the recorded server pid is alive, that pid or a child it spawned is listening on the session port, `GET /api/health` names `ACK Protocol` and is `healthy`, and `GET /` still contains `ACK records kudos`.
- The server environment has no `DATABASE_URL`, `AGENT_PRIVATE_KEY`, or `PRIVATE_KEY`.
- The browser daemon pid is the one launch started, and it answers `ping`.

Check the deployed origin the same way:

```bash
control-ack doctor --origin https://ack-onchain.dev
```

That checks the remote health JSON and the local browser daemon. It does not require a local Next process. A failed doctor means the instance is not worth driving.

## Drive

Prefer `control-ack browser` targets: ARIA role plus accessible name, placeholder, or the `Network` label beside the register `<select>`. The feature map in `features/` is the source of which commands to run. Read `features/README.md` before a feature file.

Viewport and theme, in this order, before interacting:

```bash
control-ack browser viewport --width 1280 --height 800
control-ack browser open --path / --theme light
```

Mobile is `390` by `844`. Dark mode is `--theme dark` or:

```bash
control-ack browser theme --mode dark
```

Theme is the in-app `Toggle theme` button, which sets the `dark` class on `<html>`. It persists in this browser profile until `control-ack browser reset` or another theme command.

Useful commands:

```bash
control-ack browser click --role link --name "Explore" --within navigation
control-ack browser click --role button --name "Toggle menu"
control-ack browser click --role link --name "Explore" --within mobile-menu
control-ack browser fill --role textbox --name "Search for an agent by name or address" --value "Clawdia"
control-ack browser click --role button --name "Clawdia" --contains
control-ack browser wait --role heading --name "Clawdia" --contains
control-ack browser select --near "Network" --option "Ethereum"
control-ack browser press --key Escape
control-ack browser assert-text --text "ACK records kudos"
control-ack browser assert-absent --text "Kudos Sent!"
control-ack browser assert-url --includes /leaderboard
control-ack browser overflow --fail-on-overflow
control-ack http get --path /api/health --out home/health.json
```

`--contains` matches a substring of the accessible name. Without it, the name must match exactly. `--within navigation` is the header landmark. `--within mobile-menu` is the open phone panel (it exists only after `Toggle menu`). `--nth 0` is zero-based when two controls share a name.

Names are exact as rendered: nav label `Give kudos`, register heading `Register agent or service`, kudos heading `Give kudos`, explore heading `Explore agents`.

Wallet and payment boundary:

- Do not complete a wallet signature, a contract write, or a tip payment.
- Disconnected proofs run first. `control-ack browser wallet-attach` injects a local EIP-1193 provider named `Verify ACK` into later navigations. It answers `eth_requestAccounts` and refuses every sign or send method with code `4001`.
- Attach it only after disconnected proofs, then open the page again:

```bash
control-ack browser wallet-attach
control-ack browser open --path /register --theme light
control-ack browser wallet-connect --button "Connect wallet"
```

- The connect button name depends on the screen: `Connect`, `Connect wallet`, `Connect Wallet`, or `Connect to Tip`.
- Never click MetaMask, Rainbow, Coinbase, WalletConnect, Abstract, or Injected. The only wallet button the harness may choose is `Verify ACK`.
- The browser aborts `POST /api/tips`, `POST /api/kudos`, and facilitator hosts inside the page and records them in `evidence/blocked-payments.jsonl`. A blocked POST is not a passed payment.
- Do not click `Send $1 via x402` or any `Send … via x402` button. ACK creates a tip record before the wallet prompt. Stop on the button label and the connect dialog.
- A kudos or register submit may be clicked only while the refusing wallet is connected. Immediately afterwards require a refused send and no success copy:

```bash
control-ack browser wallet-assert-refused
control-ack browser assert-absent --text "Kudos Sent!"
control-ack browser assert-absent --text "Agent Registered"
```

`wallet-assert-refused` fails if no method was refused or if the page shows `Kudos Sent!`, `Agent Registered`, or `sent to`.

Against `https://ack-onchain.dev`, pass `--origin https://ack-onchain.dev` on `open` and `http get`. Do not POST. The same refusing wallet and payment block still apply. Production doctor uses `--origin https://ack-onchain.dev`.

## Evidence

Write proof under `$ACK_VERIFY_DIR/evidence`. Relative `--path` and `--out` values are inside that directory. The harness rejects a path that escapes it.

Capture the action and the resulting state:

- A viewport screenshot via `control-ack browser screenshot --path <feature>/<state>.png`.
- An ARIA snapshot via `control-ack browser snapshot --path <feature>/<state>.aria.txt`.
- For a mutation that must not happen, `assert-absent` plus `wallet-log` or `wallet-assert-refused`.
- API proof is the saved response body from `control-ack http get`, plus `evidence/network.jsonl` for browser GETs. Payment attempts, if a drive hits the block, are in `evidence/blocked-payments.jsonl`. Wallet RPC outcomes are in `evidence/wallet.jsonl`.

Screenshots are the viewport the user sees, not a full-page stitch, unless `--full-page` is passed. Every visual feature is captured at 1280×800 and 390×844, in light and dark, except `/.well-known/agent-registration.json`, which is a raw JSON document with no app shell and no theme toggle. Prove that route with the response body and a browser screenshot at both widths.

A pass exercises the user path in the feature file. Do not call an internal setter or a test-only endpoint. Do not treat a skipped entry point as covered by a different one. If a precondition is missing, the feature fails and the reason belongs in that file's Gotchas.

## Cleanup

```bash
control-ack cleanup
```

Cleanup sends `SIGTERM`, then `SIGKILL`, to the process groups of the server pid and the daemon pid recorded in this session. It does not kill by process name. It removes the browser profile and the daemon socket. It leaves `$ACK_VERIFY_DIR/evidence` and `session.json` in place. After cleanup, `control-ack evidence` still prints that evidence directory, and the files written during the drive are still there.

Run cleanup after a failed launch too, so a half-started server does not keep the port.

## Helpers

`control-ack` is executable. Its source is `.cursor/skills/verify-ack/scripts/control-ack`. Invoke it by name after adding that directory to `PATH`, as in Launch. There is no second helper.

Subcommands: `launch`, `doctor`, `cleanup`, `evidence`, `http get`, and `browser` (`open`, `viewport`, `theme`, `click`, `fill`, `select`, `press`, `wait`, `screenshot`, `snapshot`, `assert-text`, `assert-absent`, `assert-url`, `url`, `overflow`, `wallet-attach`, `wallet-connect`, `wallet-log`, `wallet-assert-refused`, `reset`).

## Maintenance

When the app changes, run `/maintain-verification-skill` so this map stays aligned with the UI. Do not edit product code from that pass.
