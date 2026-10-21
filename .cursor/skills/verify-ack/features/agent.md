# Agent

The agent page shows one ERC-8004 agent. The fixture is Clawdia, Base token 2290, at `/agent/8453/2290`.

## Sub-features

- `agent-identity` shows the name Clawdia, chain Base, and token `#2290`.
- `agent-stats` shows a score and a kudos count once the profile request finishes.
- `agent-tip-panel` shows `Tip with USDC` and the amount presets.
- `agent-kudos-gate` shows `Give Kudos to Clawdia` and `Connect Wallet` while disconnected.
- `agent-theme-viewport` records desktop and 390px screenshots in light and dark.

## How to get to it (user POV)

- Open `/agent/8453/2290`.
- Search for Clawdia on home and choose the `Base #2290` result.
- Choose an agent row on Explore. That row may be a different agent; this recipe proves Clawdia by URL.

## Driving it with control-ack

Preconditions:

- Doctor passes for the origin under test.
- The browser is disconnected. Tip payment and kudos signing are covered by their own feature files.
- Clawdia is still agent `2290` on chain `8453`.

- **Open the fixture, desktop light.** Run `control-ack browser viewport --width 1280 --height 800` and `control-ack browser open --path /agent/8453/2290 --theme light`. Then run `control-ack browser wait --role heading --name "Clawdia" --contains --timeout 20000`. The heading is Clawdia and the URL stays `/agent/8453/2290`.
- **Identity.** Run `control-ack browser assert-text --text "#2290"` and `control-ack browser assert-text --text "Base"`. The chain and token are visible.
- **Tip and kudos panels.** Run `control-ack browser assert-text --text "Tip with USDC"` and `control-ack browser assert-text --text "Give Kudos to Clawdia"`. Both panels are on the page. The kudos panel offers `Connect Wallet`.
- **Not found path stays unused.** Do not assert `Agent not found` on this URL. That copy means this fixture failed to load.
- **Proof, desktop light.** Run `control-ack browser screenshot --path agent/local-desktop-light.png` and `control-ack browser snapshot --path agent/local-desktop-light.aria.txt`. The artifacts show Clawdia, `#2290`, and Tip with USDC.
- **Desktop dark.** Run `control-ack browser theme --mode dark`, `control-ack browser screenshot --path agent/local-desktop-dark.png`, and `control-ack browser snapshot --path agent/local-desktop-dark.aria.txt`.
- **Phone.** Run `control-ack browser viewport --width 390 --height 844`, `control-ack browser open --path /agent/8453/2290 --theme light`, `control-ack browser wait --role heading --name "Clawdia" --contains --timeout 20000`, `control-ack browser screenshot --path agent/local-mobile-light.png`, and `control-ack browser overflow --fail-on-overflow`. Then run `control-ack browser theme --mode dark` and `control-ack browser screenshot --path agent/local-mobile-dark.png`.
- **Read-only tip stats.** Run `control-ack http get --path "/api/tips/stats?agentId=2290&wallet=0x715dc035ffb97dd7bb4095c6670138ba05bb4e6d" --out agent/tip-stats.json`. The response is JSON. A local server without `DATABASE_URL` returns zero totals. Production may return non-zero totals. Either response is valid when the status is 200.
- **Production.** Repeat the open, the four screenshots, and the stats request with `--origin https://ack-onchain.dev`, writing `agent/production-*.png` and `agent/production-tip-stats.json`. Do not click `Connect to Tip`, `Connect Wallet`, or `Give kudos` in this feature.

## Gotchas

- The page first paints a skeleton without the Clawdia heading. Wait for the heading instead of sleeping a fixed time.
- A slug such as `/agent/base/2290` is replaced by `/agent/8453/2290`. Assert the numeric URL after the wait.
- The sidebar `Give kudos` button and the lower `Connect Wallet` button are different controls. This feature only checks that the disconnected copy is present. Give kudos and Tip drive the clicks.
- `#2290` also appears in body copy elsewhere on ACK. Pair it with the Clawdia heading and the URL.
- Tip stats on a local server are empty because Launch omits `DATABASE_URL`. Do not point the server at the production database to make the numbers match.
