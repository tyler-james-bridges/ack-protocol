# Give kudos

Give kudos lets a person pick an agent, a category, and a message, then asks the wallet to submit it onchain. Verification stops at the wallet prompt. The signature is refused.

## Sub-features

- `kudos-form` shows the heading `Give kudos` and the agent search.
- `kudos-select` selects Clawdia, the Reliable category, and a message.
- `kudos-connect-prompt` shows `Connect wallet to send` and opens the wallet dialog without choosing a real wallet.
- `kudos-refuse` connects `Verify ACK` and records a refused `giveFeedback` send. The page never shows `Kudos Sent!`.
- `kudos-feed` shows Recent Kudos for Base.
- `kudos-theme-viewport` records desktop and 390px screenshots in light and dark.

## How to get to it (user POV)

- Choose `Give kudos` in the header.
- On a phone, open `Toggle menu` and choose `Give kudos`.
- Choose the hero `Give kudos` button on home.
- Open `/kudos`.
- On an agent page, choose `Give kudos` or `Connect Wallet` in the kudos panel. Those open the same wallet dialog while disconnected.

## Driving it with control-ack

Preconditions:

- Doctor passes for the origin under test.
- Start disconnected. The refuse step is the only step that may run `wallet-attach`.
- Do not set `DATABASE_URL`. Giving kudos does not use the tip store, but the server must still be the one Launch started.

- **Desktop light.** Run `control-ack browser viewport --width 1280 --height 800` and `control-ack browser open --path /kudos --theme light`. The heading `Give kudos` is visible.
- **Form copy.** Run `control-ack browser assert-text --text "Recognize an agent for great work."` and `control-ack browser assert-text --text "Recent Kudos"`. The form and the feed are both on the page.
- **Select Clawdia.** Run `control-ack browser fill --role textbox --name "Search agents by name..." --value "Clawdia"` and `control-ack browser wait --role button --name "Base #2290" --contains --timeout 20000`. Then run `control-ack browser click --role button --name "Base #2290" --contains`. The page contains `Selected: Clawdia (#2290)`. Several agents are named Clawdia; the token id is the proof.
- **Category and message.** Run `control-ack browser click --role button --name "Reliable" --nth 0` and `control-ack browser fill --placeholder "What did this agent do well?" --value "Verification note. Do not submit."`. The message field shows that sentence. The submit button reads `Connect wallet to send`.
- **Proof, desktop light.** Run `control-ack browser screenshot --path give-kudos/local-desktop-light.png` and `control-ack browser snapshot --path give-kudos/local-desktop-light.aria.txt`.
- **Connect prompt.** Run `control-ack browser click --role button --name "Connect wallet to send"`. A wallet dialog is visible. Run `control-ack browser screenshot --path give-kudos/local-connect-dialog.png` and `control-ack browser snapshot --path give-kudos/local-connect-dialog.aria.txt`.
- **Dismiss.** Run `control-ack browser press --key Escape` and `control-ack browser assert-absent --text "Kudos Sent!"`. No kudos was sent.
- **Feed chain.** Run `control-ack browser click --role link --name "Abstract" --nth 0`. The URL contains `/kudos?chain=abstract`. Then run `control-ack browser open --path /kudos --theme light` to return to Base.
- **Desktop dark and phone.** Run `control-ack browser theme --mode dark` and `control-ack browser screenshot --path give-kudos/local-desktop-dark.png`. Then run `control-ack browser viewport --width 390 --height 844`, `control-ack browser open --path /kudos --theme light`, `control-ack browser screenshot --path give-kudos/local-mobile-light.png`, `control-ack browser overflow --fail-on-overflow`, `control-ack browser theme --mode dark`, and `control-ack browser screenshot --path give-kudos/local-mobile-dark.png`.
- **Phone entry.** Run `control-ack browser open --path / --theme light`, `control-ack browser click --role button --name "Toggle menu"`, and `control-ack browser click --role link --name "Give kudos" --within mobile-menu`. The URL contains `/kudos`.
- **Refused signature.** Run `control-ack browser reset`, `control-ack browser wallet-attach`, `control-ack browser viewport --width 1280 --height 800`, and `control-ack browser open --path /kudos --theme light`. Select Clawdia, Reliable, and the message with the same fill and click commands as above. The submit button reads `Connect wallet to send` and is enabled only after an agent is selected. Run `control-ack browser wallet-connect --button "Connect wallet to send"`. The button label becomes `Give Kudos`. Run `control-ack browser click --role button --name "Give Kudos"`, then `control-ack browser wallet-assert-refused`, `control-ack browser assert-absent --text "Kudos Sent!"`, and `control-ack browser wallet-log --path give-kudos/wallet-log.json`. The log contains a refused send and the page does not say Kudos Sent.
- **Header entry.** After `control-ack browser reset`, run `control-ack browser open --path / --theme light` and `control-ack browser click --role link --name "Give kudos" --within navigation`. The URL contains `/kudos`.
- **Production.** Repeat the disconnected form, dialog, and four screenshots with `--origin https://ack-onchain.dev`, writing `give-kudos/production-*.png`. The refused-signature step may run against production only with `Verify ACK` attached in this browser. It must end in `wallet-assert-refused` and must not show `Kudos Sent!`.

## Gotchas

- Two controls are named `Reliable`: the form category and the feed filter. `--nth 0` is the form. `--nth 1` is the feed filter.
- The disconnected submit label is `Connect wallet to send`. After `Verify ACK` connects it becomes `Give Kudos`. Clicking the latter is allowed only in the refused-signature step.
- Do not click a wallet named anything other than `Verify ACK`.
- `Something went wrong. Please try again.` after a refused send is the expected error state, not a pass by itself. The wallet log is the proof.
- Recent Kudos on a local server is empty when `data/base-feedback` is absent. The page says `No onchain kudos yet. Be the first!` and the home API reports `feedError` false. Record that copy. The form, category, and refused-signature steps do not depend on the feed. An empty local feed is inconclusive for feed data. Production is where the populated Recent Kudos list is proved. An error banner is a separate failure of the feed, not of the form.
- Reset the browser before a later disconnected feature. Wagmi remembers `Verify ACK` in this profile.
