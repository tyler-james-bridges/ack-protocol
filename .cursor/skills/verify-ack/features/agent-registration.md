# Agent registration document

`GET /.well-known/agent-registration.json` is ACK's ERC-8004 domain registration file. It is JSON, not an HTML page, and it has no theme toggle and no navigation.

## Sub-features

- `registration-document` returns the registration object with `name` `ACK` and `active` true.
- `registration-base` includes the Base registration for agent id `19125`.
- `registration-services` lists the public web, A2A, and MCP endpoints on `ack-onchain.dev`.
- `registration-browser` shows the raw JSON at desktop and 390px widths. Light and dark do not apply.

## How to get to it (user POV)

- Open `/.well-known/agent-registration.json` in the browser.
- Fetch that path with HTTP. The docs page links the path, and a direct GET is the same document.

## Driving it with control-ack

Preconditions:

- Doctor passes for the origin under test.
- Do not attach a wallet. This route does not ask for one.
- Compare the local body and the production body. They are generated from the same route source and should match on the fields below.

- **Local body.** Run `control-ack http get --path /.well-known/agent-registration.json --out agent-registration/local.json`. The status is 200 and the content type is JSON.
- **Required fields.** Run `jq -e '.type == "https://eips.ethereum.org/EIPS/eip-8004#registration-v1" and .name == "ACK" and .active == true' "$ACK_VERIFY_DIR/evidence/agent-registration/local.json"`. The command exits 0.
- **Base registration.** Run `jq -e '[.registrations[] | select(.agentId == 19125 and .agentRegistry == "eip155:8453:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432")] | length == 1' "$ACK_VERIFY_DIR/evidence/agent-registration/local.json"`. One Base registration matches.
- **Services.** Run `jq -e '[.services[].endpoint] | index("https://ack-onchain.dev") and index("https://ack-onchain.dev/.well-known/agent-card.json") and index("https://ack-onchain.dev/api/mcp")' "$ACK_VERIFY_DIR/evidence/agent-registration/local.json"`. All three endpoints are present.
- **Browser, desktop.** Run `control-ack browser viewport --width 1280 --height 800` and `control-ack browser open --path /.well-known/agent-registration.json`. Then run `control-ack browser assert-text --text "ACK"` and `control-ack browser screenshot --path agent-registration/local-desktop.png`. The document text includes ACK. There is no `Toggle theme` button.
- **Browser, phone.** Run `control-ack browser viewport --width 390 --height 844`, `control-ack browser open --path /.well-known/agent-registration.json`, and `control-ack browser screenshot --path agent-registration/local-mobile.png`. The JSON is still readable. Do not run `theme` on this URL.
- **Production body.** Run `control-ack http get --origin https://ack-onchain.dev --path /.well-known/agent-registration.json --out agent-registration/production.json` and the same three `jq -e` checks against `agent-registration/production.json`.
- **Production browser.** Run `control-ack browser open --origin https://ack-onchain.dev --path /.well-known/agent-registration.json` at both viewports and save `agent-registration/production-desktop.png` and `agent-registration/production-mobile.png`.

## Gotchas

- This response is not wrapped in the app layout. A missing `Toggle theme` button is the expected end state, not a theme failure. Do not mark light or dark as verified here.
- Agent id `2290` is Clawdia, not this document. The Base registration in the file is ACK agent `19125`.
- The registry address is case-sensitive in the jq check above. Use the checksummed address from the route.
- A browser screenshot of JSON can wrap differently at 390px. Overflow of a raw JSON viewer is not an app-shell regression. Keep the screenshot. Do not fail the feature on horizontal overflow of the browser's JSON viewer.
