# Explore

Explore lists ERC-8004 agents, starting with Base, and sorts them. It is the page at `/leaderboard`. The header calls it Explore. `/explore` redirects here.

## Sub-features

- `explore-open` shows the heading `Explore agents` from the header, the phone menu, and the home `View all` link.
- `explore-sort` changes the sort and the URL.
- `explore-base` shows the Base section and at least one agent row.
- `explore-open-agent` opens an agent from a row.
- `explore-theme-viewport` records desktop and 390px screenshots in light and dark.

## How to get to it (user POV)

- Choose `Explore` in the header.
- On a phone, open `Toggle menu` and choose `Explore`.
- Choose `View all` beside Top agents on home.
- Open `/leaderboard` or `/explore`.

## Driving it with control-ack

Preconditions:

- Doctor passes for the origin under test.
- The browser is disconnected.
- Viewport commands in this recipe set their own size.

- **Header entry, desktop light.** Run `control-ack browser viewport --width 1280 --height 800`, `control-ack browser open --path / --theme light`, and `control-ack browser click --role link --name "Explore" --within navigation`. The URL contains `/leaderboard` and the heading `Explore agents` is visible.
- **Wait for rows.** Run `control-ack browser wait --text "Base" --timeout 20000` and `control-ack browser assert-text --text "Explore agents"`. The Base section is on the page.
- **Proof, desktop light.** Run `control-ack browser screenshot --path explore/local-desktop-light.png` and `control-ack browser snapshot --path explore/local-desktop-light.aria.txt`. The artifacts show Explore agents and a Base section.
- **Sort.** Run `control-ack browser click --role button --name "Score"`. The URL contains `sort=total_score` and Score stays visible.
- **Open an agent.** Run `control-ack browser click --role button --name "#" --contains --nth 0`. The URL matches `/agent/<chain>/<id>`.
- **Direct entry.** Run `control-ack browser open --path /leaderboard --theme light` and `control-ack browser assert-url --includes /leaderboard`. The heading is shown again.
- **Redirect.** Run `control-ack browser open --path /explore --theme light` and `control-ack browser assert-url --includes /leaderboard`. `/explore` lands on the same page.
- **Home entry.** Run `control-ack browser open --path / --theme light` and `control-ack browser click --role link --name "View all" --contains --nth 0`. The URL contains `/leaderboard`. Home has two `View all` links; the first is beside Top agents. The second opens the kudos feed.
- **Desktop dark.** Run `control-ack browser open --path /leaderboard --theme dark`, `control-ack browser screenshot --path explore/local-desktop-dark.png`, and `control-ack browser snapshot --path explore/local-desktop-dark.aria.txt`.
- **Phone light.** Run `control-ack browser viewport --width 390 --height 844`, `control-ack browser open --path / --theme light`, `control-ack browser click --role button --name "Toggle menu"`, and `control-ack browser click --role link --name "Explore" --within mobile-menu`. The URL contains `/leaderboard`.
- **Phone proof.** Run `control-ack browser screenshot --path explore/local-mobile-light.png`, `control-ack browser overflow --fail-on-overflow`, `control-ack browser theme --mode dark`, and `control-ack browser screenshot --path explore/local-mobile-dark.png`. Neither width overflows.
- **Production.** Repeat header entry, sort, both viewports, and both themes with `--origin https://ack-onchain.dev`, writing `explore/production-*.png`. Do not attach a wallet.

## Gotchas

- The default sort is Kudos, which omits `sort` from the URL. Score writes `sort=total_score`. Newest writes `sort=created_at`.
- Agent rows are buttons whose names start with a rank such as `#1`. The row text changes as the sort changes. Assert the URL pattern, not a fixed agent name, for the row click.
- Clawdia (`8453/2290`) may be absent from the first Base page. The agent recipe opens that URL directly.
- Other chain sections start collapsed. Base starts expanded. Collapsing Base is a separate click on the Base header button and is not required for a pass.
- The phone menu click must happen before the viewport is widened, or `mobile-menu` is not in the DOM.
- Kudos totals on the board come from the same Base feedback store as home. A fresh checkout has no `data/base-feedback`, so local rows can show a score without a kudos count. Sort, row open, and the `/explore` redirect do not require those counts. Production is the populated-count proof.
