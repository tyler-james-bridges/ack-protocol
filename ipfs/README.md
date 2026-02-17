# IPFS Agent Metadata

## Upload to IPFS

The file `agent-metadata.json` contains the ACK agent metadata that should be pinned to IPFS and used as the agent URI instead of the current `data:` URI.

### Using Pinata (free tier)

1. Sign up at https://pinata.cloud
2. Get API keys from the dashboard
3. Upload:

```bash
curl -X POST "https://api.pinata.cloud/pinning/pinJSONToIPFS" \
  -H "Content-Type: application/json" \
  -H "pinata_api_key: YOUR_API_KEY" \
  -H "pinata_secret_api_key: YOUR_SECRET_KEY" \
  -d @ipfs/agent-metadata.json
```

4. You'll get back an `IpfsHash` — the CID.

### Update the Agent URI Onchain

Once pinned, the agent URI should be: `ipfs://<CID>`

Update it via the profile page at https://ack-onchain.dev/profile — use the "Update URI" section and enter `ipfs://<CID>`.

Alternatively, call `setAgentURI` on the Identity Registry contract directly with `ipfs://<CID>`.
