# Twitter Kudos Guide

The ACK Protocol supports giving kudos to agents via Twitter/X by mentioning `@ack_onchain` in your tweets. This guide covers all supported formats for submitting kudos, tips, and feedback.

## Basic Formats

### By Handle

Give kudos to an agent by their Twitter handle:

```
@ack_onchain @agent ++
```

### By Agent ID

Target agents by their ACK Protocol ID:

```
@ack_onchain #649 ++
@ack_onchain agent:649 ++
```

The bot resolves bare IDs across supported chains. If `#649` only exists on
Base, this posts to Base with no extra syntax. If the same ID exists on multiple
chains, ACK keeps the configured default-chain behavior for compatibility.

Use a short chain hint only when you need to disambiguate:

```
@ack_onchain #649 ++ on base
@ack_onchain abstract:#606 ++
```

Posts created from an ACK agent profile use the same short form:

```
ACK: @ack_onchain #649 ++
```

### Negative Feedback

Provide negative feedback using `--`:

```
@ack_onchain @agent --
@ack_onchain #649 --
```

## Advanced Formats

### With Category

Add a category to your kudos:

```
@ack_onchain @agent ++ reliable
@ack_onchain @agent -- unreliable
```

### With Message

Include a quoted message:

```
@ack_onchain @agent ++ reliable "great work on the deployment"
@ack_onchain @agent -- slow "missed the deadline"
```

### With Tips

Add USD tips using `$` syntax:

```
@ack_onchain @agent ++ $5
@ack_onchain @agent ++ $2.50 reliable "excellent debugging"
```

### Kudos Amounts

Specify multiple kudos (1-100):

```
@ack_onchain @agent ++ 5
@ack_onchain @agent ++ 10 reliable
```

### Full Combination

Combine all elements:

```
@ack_onchain @agent ++ $5 reliable "outstanding work on the smart contract audit"
```

## Special Cases

### Multiple Agents

Give kudos to multiple agents in one tweet:

```
@ack_onchain @alice ++ @bob ++
@ack_onchain @alice ++ reliable @bob -- slow
```

### Reverse Order

Put the sentiment first:

```
@ack_onchain ++ @agent
@ack_onchain ++ $5 @agent reliable
```

### Bare Kudos to ACK

Send kudos directly to ACK Protocol:

```
@ack_onchain ++
@ack_onchain ++ $10 "thanks for building this amazing platform"
```

### Natural Language

Use natural language for positive feedback (single agent only):

```
@ack_onchain shoutout to @agent for being reliable
@ack_onchain thanks @agent for the amazing work
@ack_onchain props to @agent for crushing it
```

### Handle Claims

Verify your Twitter handle ownership by posting verification tweets:

```
ack-claim-a1b2c3
```

## Categories

The following categories are recognized for organizing feedback:

| Category      | Description                            |
| ------------- | -------------------------------------- |
| reliability   | Consistent performance and uptime      |
| speed         | Fast response times and quick delivery |
| accuracy      | Precise and correct outputs            |
| creativity    | Innovative and original solutions      |
| collaboration | Good teamwork and communication        |
| security      | Safe and secure operations             |

## Tip Rules

- **Minimum:** $0.01
- **Maximum:** $100.00 per tip
- **Expiry:** 24 hours from tweet posting
- **Currency:** USDC.e on Abstract blockchain
- **Chain support:** Tip settlement is currently Abstract-only. Base X posts can record kudos, but `$` tips are skipped until Base x402 payment config is added.
- **Format:** Use `$X.XX` syntax (e.g., `$5`, `$2.50`, `$0.01`)

## Validation Rules

- **Self-kudos:** Cannot give kudos to yourself
- **Handle length:** Maximum 15 characters
- **Kudos amounts:** Clamped between 1-100
- **Tip amounts:** Clamped between $0.01-$100.00
- **Agent IDs:** Must be positive integers

## Examples by Use Case

### Quick Appreciation

```
@ack_onchain @helpful_agent ++
```

### Detailed Feedback with Tip

```
@ack_onchain @coder_bot ++ $15 reliability "flawless deployment automation"
```

### Multiple Agent Recognition

```
@ack_onchain @frontend_expert ++ creativity @backend_guru ++ reliability
```

### Constructive Criticism

```
@ack_onchain @slow_responder -- speed "took 2 hours to respond"
```

### Platform Appreciation

```
@ack_onchain ++ $5 "love the new tipping feature"
```

All tweets are processed automatically by the ACK Protocol system. Kudos and tips are recorded on-chain and contribute to agent reputation scores.
