# ACK verification map

This directory is the maintained source for verifying the user-facing behavior of ACK. Read this index, then use the matching feature file as the recipe.

## Baseline preconditions

- Export `PATH` and `ACK_VERIFY_DIR` as `SKILL.md` describes.
- Local drives use `control-ack launch` and `http://127.0.0.1:4173` unless `ACK_VERIFY_PORT` set another port. The origin is printed by launch.
- Read-only production drives use `control-ack launch --browser-only --origin https://ack-onchain.dev` or pass `--origin https://ack-onchain.dev` to `open` and `http get` while a local daemon is up.
- Run `control-ack doctor` before the first drive and after any failed drive. For production, `control-ack doctor --origin https://ack-onchain.dev`.
- Never drive a server this run did not start. Never set `DATABASE_URL` or a private key in the server environment.
- The known agent fixture is Clawdia at `/agent/8453/2290` (Base, token `2290`). Search queries use `Clawdia`.

## Driving conventions

- Start every recipe from a disconnected browser. Run `control-ack browser reset` if an earlier recipe connected `Verify ACK`.
- Desktop is `control-ack browser viewport --width 1280 --height 800`. Mobile is `--width 390 --height 844`.
- Set the theme after each `open` that should prove a theme. `light` is the app default. `dark` is the `Toggle theme` control.
- On a 390px viewport the header links are hidden. Open them with `Toggle menu`, then click `--within mobile-menu`.
- Prefer role and accessible name. Pass `--contains` only when the recipe says the accessible name includes extra text.
- Wallet signing and payments are not executed. Disconnected recipes stop at the connect dialog. Connected recipes use only the refusing `Verify ACK` wallet and stop as the feature file says.
- Capture screenshots and ARIA snapshots under `$ACK_VERIFY_DIR/evidence/<feature>/`. Cleanup does not delete that directory.
- Record the feature id, origin (`local` or `production`), viewport, and theme in the artifact name.
- An unreachable path is a failure. Report the command and the missing precondition. Do not mark it passed through a different entry point.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- UI proof is an ARIA snapshot plus a viewport screenshot that shows the ACK wordmark or the page heading.
- HTTP proof is the status and the saved body from `control-ack http get`.
- A refused signature is proof only when `wallet-assert-refused` passes and the success phrase is absent.
- A `POST /api/tips` or facilitator request recorded in `blocked-payments.jsonl` is a blocked write, not a completed tip.

## Feature entry contract

Each feature file starts with an H1 and one paragraph, then exactly four H2 sections: `Sub-features`, `How to get to it (user POV)`, `Driving it with control-ack`, and `Gotchas`.

## Features

- [Home](./home.md) covers the landing page, hero search, top agents, theme, and the phone menu.
- [Explore](./explore.md) covers `/leaderboard`, sort, chain sections, and opening an agent.
- [Agent](./agent.md) covers `/agent/8453/2290` (Clawdia), identity, and the tip and kudos panels.
- [Give kudos](./give-kudos.md) covers `/kudos` up to the wallet prompt, and the refused signature with `Verify ACK`.
- [Tip](./tip.md) covers the Clawdia tip panel up to the connect or send-label state, without a payment.
- [Register](./register.md) covers the connect prompt and the chain picker after the refusing wallet connects.
- [Agent registration document](./agent-registration.md) covers `GET /.well-known/agent-registration.json`.
