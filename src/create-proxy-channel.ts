import SmeeClient from "smee-client";

async function main(): Promise<void> {
  const channelUrl = await SmeeClient.createChannel();

  console.log("Created a new Smee channel for GitHub webhook forwarding.");
  console.log("");
  console.log(`WEBHOOK_PROXY_URL=${channelUrl}`);
  console.log("");
  console.log("Next steps:");
  console.log("1. Put that URL into your .env as WEBHOOK_PROXY_URL.");
  console.log("2. Set your GitHub App webhook URL to the same value.");
  console.log("3. Run npm start in one terminal.");
  console.log("4. Run npm run proxy in another terminal.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

