# Tip

Tip lets a visitor choose a USDC amount for an agent and then connect a wallet. The payment itself is not executed. Clawdia's panel is the fixture.

## Sub-features

- `tip-panel` shows `Tip with USDC` and the presets `$1`, `$2`, `$5`, and `$10`.
- `tip-amount` selects `$1` and keeps a custom amount field.
- `tip-connect-prompt` opens the wallet dialog from `Connect to Tip` and dismisses it.
- `tip-send-label` after `Verify ACK` connects, shows `Send $1 via x402` and does not click it.
- `tip-methods` reads `GET /api/payments/methods` and Clawdia tip stats.
- `tip-theme-viewport` records the panel at desktop and 390px, light and dark.

## How to get to it (user POV)

- Open Clawdia at `/agent/8453/2290` and use the `Tip with USDC` panel.
- There is no standalone `/tip` page in the header. The agent page is the entry.

## Driving it with control-ack

Preconditions:

- Doctor passes for the origin under test.
- The browser is disconnected until the send-label step.
- Launch did not set `DATABASE_URL`. Do not add one.
- The harness blocks `POST /api/tips` and facilitator hosts. A blocked POST is not a successful tip.

- **Open Clawdia, desktop light.** Run `control-ack browser viewport --width 1280 --height 800` and `control-ack browser open --path /agent/8453/2290 --theme light`. Wait with `control-ack browser wait --text "Tip with USDC" --timeout 20000`. The panel is visible.
- **Select $1.** Run `control-ack browser click --role button --name "$1"`. The button `Connect to Tip` is visible. Run `control-ack browser assert-text --text "Connect to Tip"`.
- **Custom field.** Run `control-ack browser fill --placeholder "Custom amount" --value "3"` and `control-ack browser assert-text --text "Connect to Tip"`. Then run `control-ack browser click --role button --name "$1"` so the preset is the amount under test.
- **Proof, desktop light.** Run `control-ack browser screenshot --path tip/local-desktop-light.png` and `control-ack browser snapshot --path tip/local-desktop-light.aria.txt`. The artifacts show Tip with USDC and Connect to Tip.
- **Connect prompt.** Run `control-ack browser click --role button --name "Connect to Tip"`, `control-ack browser screenshot --path tip/local-connect-dialog.png`, and `control-ack browser snapshot --path tip/local-connect-dialog.aria.txt`. The wallet dialog is visible. Run `control-ack browser press --key Escape` and `control-ack browser assert-absent --text "sent to"`.
- **Desktop dark and phone.** Run `control-ack browser open --path /agent/8453/2290 --theme dark`, `control-ack browser wait --text "Tip with USDC" --timeout 20000`, and `control-ack browser screenshot --path tip/local-desktop-dark.png`. Then run `control-ack browser viewport --width 390 --height 844`, `control-ack browser open --path /agent/8453/2290 --theme light`, `control-ack browser wait --text "Tip with USDC" --timeout 20000`, `control-ack browser screenshot --path tip/local-mobile-light.png`, `control-ack browser overflow --fail-on-overflow`, `control-ack browser theme --mode dark`, and `control-ack browser screenshot --path tip/local-mobile-dark.png`.
- **Payment methods.** Run `control-ack http get --path /api/payments/methods --out tip/methods.json`. The body includes `x402` and a `defaultMethod`. Run `control-ack http get --path "/api/tips/stats?agentId=2290&wallet=0x715dc035ffb97dd7bb4095c6670138ba05bb4e6d" --out tip/stats.json`. Local totals are zero without a database. The status is still 200.
- **Send label, no payment.** Run `control-ack browser reset`, `control-ack browser wallet-attach`, `control-ack browser viewport --width 1280 --height 800`, and `control-ack browser open --path /agent/8453/2290 --theme light`. Wait for `Tip with USDC`. Run `control-ack browser click --role button --name "$1"` and `control-ack browser wallet-connect --button "Connect to Tip"`. The button now reads `Send $1 via x402`. Run `control-ack browser screenshot --path tip/local-send-label.png` and `control-ack browser assert-text --text "Send $1 via x402"`. Do not click that button. Run `control-ack browser assert-absent --text "sent to"` and `control-ack browser wallet-log --path tip/wallet-log.json`. The log has `eth_requestAccounts` and no refused or allowed send, because send was not requested.
- **Production.** Repeat the disconnected panel, `$1`, connect dialog, four screenshots, and `http get` with `--origin https://ack-onchain.dev`, writing `tip/production-*`. Do not click `Send $1 via x402` on production. The send-label screenshot may be taken on production only if `Verify ACK` is attached and the button is not clicked.

## Gotchas

- Clicking `Send $1 via x402` calls `POST /api/tips` before any wallet signature. The harness answers that POST with 403 and does not forward it. That block is not a passed payment. Leave the button unclicked.
- Abstract agents can show a PENGU token toggle. Clawdia is on Base, so the only token button is `USDC`.
- `$1` can match more than one control if the page shows several amounts. On Clawdia's page it is the preset button. If the click reports more than one match, scope it with `--nth 0` and say so in the run notes.
- `You own this agent.` appears only when the connected address owns Clawdia. `Verify ACK` uses `0x1111111111111111111111111111111111111111`, which does not.
- Empty local tip stats are a precondition of Launch, not a product failure.
