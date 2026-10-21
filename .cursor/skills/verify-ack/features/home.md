# Home

Home is the ACK landing page. It introduces the product, searches agents by name, and lists top agents and recent kudos.

## Sub-features

- `home-hero` shows the ACK heading and the sentence `ACK records kudos for ERC-8004 agents.`
- `home-search` finds Clawdia from the hero search box and opens that agent.
- `home-top-agents` lists top agents with a link to explore.
- `home-theme` switches the page between light and dark with `Toggle theme`.
- `home-mobile-nav` opens the phone menu and shows Explore, Give kudos, and Register.

## How to get to it (user POV)

- Open `/`.
- Choose the `ACK` wordmark in the header from any other page.
- On a phone, open `Toggle menu` to reach the other sections.

## Driving it with control-ack

Preconditions:

- `control-ack doctor` reports a healthy local origin, or `--origin https://ack-onchain.dev` for the read-only pass.
- The browser is disconnected. Do not run `wallet-attach` before this recipe.
- Clawdia is searchable on 8004scan.

- **Desktop light.** Set the desktop viewport and open home in light mode. Run `control-ack browser viewport --width 1280 --height 800` and `control-ack browser open --path / --theme light`. The heading `ACK` is visible and the page contains `ACK records kudos`.
- **Confirm the hero.** Run `control-ack browser assert-text --text "ACK records kudos for ERC-8004 agents."` and `control-ack browser assert-text --text "Top agents"`. Both phrases are present.
- **Proof, desktop light.** Run `control-ack browser screenshot --path home/local-desktop-light.png` and `control-ack browser snapshot --path home/local-desktop-light.aria.txt`. The artifacts show the ACK heading, the search box, and Top agents.
- **Search.** Type Clawdia. Run `control-ack browser fill --role textbox --name "Search for an agent by name or address" --value "Clawdia"` and `control-ack browser wait --role button --name "Clawdia" --contains --timeout 20000`. A result button for Clawdia is visible.
- **Open the result.** Run `control-ack browser click --role button --name "Base #2290" --contains`. The URL contains `/agent/8453/2290`.
- **Return and prove search.** Run `control-ack browser screenshot --path home/local-search-result.png`, then `control-ack browser open --path / --theme light`. Home is shown again.
- **Desktop dark.** Run `control-ack browser theme --mode dark`, `control-ack browser screenshot --path home/local-desktop-dark.png`, and `control-ack browser snapshot --path home/local-desktop-dark.aria.txt`. `<html>` is in dark mode and the heading is still `ACK`.
- **Phone light.** Run `control-ack browser viewport --width 390 --height 844`, `control-ack browser open --path / --theme light`, and `control-ack browser click --role button --name "Toggle menu"`. The menu shows Explore.
- **Phone menu.** Run `control-ack browser wait --role link --name "Explore" --within mobile-menu`, `control-ack browser screenshot --path home/local-mobile-light.png`, and `control-ack browser overflow --fail-on-overflow`. The menu is visible and the page does not scroll sideways.
- **Phone dark.** Close the open menu by running `control-ack browser click --role button --within mobile-menu --nth 0`. Then run `control-ack browser theme --mode dark`, `control-ack browser click --role button --name "Toggle menu"`, and `control-ack browser screenshot --path home/local-mobile-dark.png`. The dark phone menu is visible.
- **Close the menu.** Run `control-ack browser click --role button --within mobile-menu --nth 0`. The header `Toggle menu` button sits under the open panel, so the close control is the first button inside the panel. The panel then leaves the page.
- **API.** Run `control-ack http get --path /api/health --out home/health.json` and `control-ack http get --path /api/home --out home/home.json`. Health status is `healthy`. The home JSON includes a `leaderboard` key.
- **Production.** Repeat the four screenshots with `--origin https://ack-onchain.dev` on `open` and `http get`, writing `home/production-*.png` and `home/production-health.json`. The same heading and search result are required. Do not attach a wallet.

## Gotchas

- Header `Register` and the hero `Register` share an accessible name. Scope the header with `--within navigation`.
- `Explore` also appears in the footer. Header clicks use `--within navigation` on desktop and `--within mobile-menu` on a phone.
- Hero search results are buttons. The Clawdia result's accessible name includes `Base #2290`. Wait for the result before clicking; the search request is debounced by the query hook once the text is at least two characters.
- `Toggle menu` opens the phone panel. The panel covers that header button, so a second click on `Toggle menu` does not close it. Close with the first button inside `mobile-menu`.
- Pressing Escape does not close the phone panel.
- A Clawdia search can match many buttons. Open the result named `Base #2290`, not the first `Clawdia` button.
- Theme sticks in this browser profile. Set it after every `open` when the screenshot must be a specific theme.
- A fresh checkout has no `data/base-feedback` directory. An absent Base feedback store is treated as an empty success (`feedError` false, `recentKudos` empty). Local home then shows `No kudos yet - be the first!` and omits kudos counts on top agents. That empty state is not proof the feed works. Do not point the server at production data to fill it. Production `GET /api/home` is the populated proof.
