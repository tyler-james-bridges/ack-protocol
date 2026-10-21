# Register

Register mints an ERC-8004 identity. While the wallet is disconnected, the page asks the visitor to connect and shows a disabled preview. The chain picker appears only after a wallet connects. Verification connects the refusing `Verify ACK` wallet, changes the network, and does not broadcast a transaction.

## Sub-features

- `register-disconnected` shows `Register agent or service` and `Connect wallet`.
- `register-connect-prompt` opens the wallet dialog and dismisses it without choosing MetaMask or any other real wallet.
- `register-chain-picker` shows the `Network` select after `Verify ACK` connects. The default option is Base.
- `register-switch` chooses Ethereum and shows `Register on Ethereum` plus gas copy that names Ethereum.
- `register-refuse` clicks `Register on Ethereum` only when `Verify ACK` is connected, records a refused send, and does not show `Agent Registered`.
- `register-theme-viewport` records desktop and 390px screenshots in light and dark.

## How to get to it (user POV)

- Choose `Register` in the header.
- On a phone, open `Toggle menu` and choose `Register`.
- Choose the hero `Register` button or `Register now` on home.
- Open `/register`.

## Driving it with control-ack

Preconditions:

- Doctor passes for the origin under test.
- Start disconnected. Attach `Verify ACK` only at the chain-picker step.
- The register `<select>` is unlabeled for assistive tech. Drive it with `control-ack browser select --near "Network"`, which uses the visible `Network` label beside the control.
- Option labels are the chain names from the app, including `Base` and `Ethereum`. Do not guess `Eth`.

- **Desktop light, disconnected.** Run `control-ack browser viewport --width 1280 --height 800` and `control-ack browser open --path /register --theme light`. The heading `Register agent or service` is visible. Run `control-ack browser assert-text --text "Connect your wallet"` and `control-ack browser assert-text --text "Mint an onchain identity"`.
- **No picker yet.** The disconnected preview has no `Network` select. Do not run `select` on this screen. Run `control-ack browser assert-text --text "ETH on Base"`. That sentence is the default-chain copy, not the picker.
- **Proof, desktop light.** Run `control-ack browser screenshot --path register/local-desktop-light.png` and `control-ack browser snapshot --path register/local-desktop-light.aria.txt`.
- **Connect prompt.** Run `control-ack browser click --role button --name "Connect wallet"`, `control-ack browser screenshot --path register/local-connect-dialog.png`, and `control-ack browser snapshot --path register/local-connect-dialog.aria.txt`. The wallet dialog is visible. Run `control-ack browser press --key Escape`. The heading is still `Register agent or service`.
- **Desktop dark and phone, still disconnected.** Run `control-ack browser theme --mode dark` and `control-ack browser screenshot --path register/local-desktop-dark.png`. Then run `control-ack browser viewport --width 390 --height 844`, `control-ack browser open --path /register --theme light`, `control-ack browser screenshot --path register/local-mobile-light.png`, `control-ack browser overflow --fail-on-overflow`, `control-ack browser theme --mode dark`, and `control-ack browser screenshot --path register/local-mobile-dark.png`.
- **Phone entry.** Run `control-ack browser open --path / --theme light`, `control-ack browser click --role button --name "Toggle menu"`, and `control-ack browser click --role link --name "Register" --within mobile-menu`. The URL contains `/register`.
- **Header entry.** Run `control-ack browser viewport --width 1280 --height 800`, `control-ack browser open --path / --theme light`, and `control-ack browser click --role link --name "Register" --within navigation`. The URL contains `/register`.
- **Chain picker.** Run `control-ack browser reset`, `control-ack browser wallet-attach`, and `control-ack browser open --path /register --theme light`. Run `control-ack browser wallet-connect --button "Connect wallet"`. The `Network` label and a select are visible. The selected option is Base and the submit button reads `Register on Base`.
- **Switch network.** Run `control-ack browser fill --placeholder "e.g. my_agent" --value "Verify Ack"` and `control-ack browser fill --placeholder "What does your agent do? What problems does it solve?" --value "Verification agent used only to reach the wallet prompt."`. Then run `control-ack browser select --near "Network" --option "Ethereum"`. The command result label is `Ethereum`. Run `control-ack browser assert-text --text "Register on Ethereum"` and `control-ack browser assert-text --text "ETH on Ethereum"`. Run `control-ack browser screenshot --path register/local-chain-ethereum.png` and `control-ack browser snapshot --path register/local-chain-ethereum.aria.txt`.
- **Refused register.** Run `control-ack browser click --role button --name "Register on Ethereum"`, `control-ack browser wallet-assert-refused`, `control-ack browser assert-absent --text "Agent Registered"`, and `control-ack browser wallet-log --path register/wallet-log.json`. The log contains a refused send. The page does not show Agent Registered.
- **Production.** Repeat the disconnected screenshots, connect dialog, chain switch, and refused register with `--origin https://ack-onchain.dev`, writing `register/production-*`. `wallet-assert-refused` is required after the production submit click. Do not choose any wallet except `Verify ACK`.

## Gotchas

- The chain picker is not in the disconnected preview. A run that only opens `/register` and looks for `Network` will fail. Connect `Verify ACK` first.
- The `Network` label is not tied to the select with `for`. `select --near "Network"` is the supported handle.
- Abstract Global Wallet warning copy appears only for that connector. `Verify ACK` does not show it.
- `Register on Ethereum` triggers `wallet_switchEthereumChain` and then a contract send. The switch is allowed by the refusing wallet. The send must be refused. If the log has no refused send, the step fails.
- The submit button stays disabled until the name is non-empty and the description is at least 50 characters. The recipe fills both before the click. The button label still shows the selected chain while disabled.
- One identity per wallet per chain is enforced only after a chain read. The refusing address has no agent, so the already-registered warning is not expected.
