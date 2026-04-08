# discussion-vote-app

## Title summary spec

The app reads the vote table from the first post of a GitHub discussion, counts the literal values found in the `Approval` column, and appends a compact summary to the discussion title.

### Output format

Append a suffix in this exact shape:

```text
[VALUE_A COUNT_A, VALUE_B COUNT_B, ...]
```

Example for this table:

| Member | Approval | Comments |
|--------|----------|----------|
| Max | ✅ |  |
| Mark | ✅ |  |
| Mulan | ✅ |  |
| Marek | ❌ |  |
| Martin | ❌ |  |

The summary suffix is:

```text
[✅ 3, ❌ 2]
```

If the current discussion title is `Should we merge this?`, the updated title becomes:

```text
Should we merge this? [✅ 3, ❌ 2]
```

### Counting rules

- Ignore the header row.
- Read only the `Approval` column.
- Count literal cell values exactly as written after trimming surrounding whitespace.
- Skip empty `Approval` cells.
- Do not interpret vote meaning. The app groups identical values and counts them.
- Sort output by descending count.
- If counts tie, preserve the order of first appearance in the table.

### Notes

- This is intentionally style agnostic. A value like `✅`, `❌`, `🤷`, or any other marker is treated the same way.
- This spec defines only the title summary format. It does not yet define who is allowed to vote, whether a result passes, or how missing votes should be handled.

## Implementation checklist

### 1. App foundation

- Choose the runtime and framework for the GitHub App.
- Create the app project and repository structure.
- Add configuration loading for app credentials and webhook secrets.
- Add local development tooling for running the app and receiving webhooks.

### 2. GitHub App setup

- Create a GitHub App with Discussions read access.
- Give the app permission to update discussion titles.
- Decide whether the app should run on all repositories or a selected subset.
- Subscribe to the discussion events that should trigger a refresh.

### 3. Trigger rules

- Refresh the title when a discussion is created.
- Refresh the title when the first post body changes.
- Refresh the title when the app is explicitly asked to resync.
- Ignore later comments unless we decide they should affect the result.

### 4. Discussion data loading

- Read the discussion title, discussion number, and repository context.
- Load the first post body from the discussion.
- Identify the vote table in the first post.
- Extract the markdown table rows without being confused by unrelated tables in the post.

### 5. Vote table parsing

- Find the `Approval` column by header name.
- Ignore the separator row in the markdown table.
- Trim surrounding whitespace from each `Approval` cell.
- Skip empty `Approval` cells.
- Count distinct literal values from the `Approval` column.
- Preserve first appearance order for tie-breaking.
- Sort the final summary entries by descending count.

### 6. Title generation

- Build the summary suffix in the agreed format: `[VALUE_A COUNT_A, VALUE_B COUNT_B, ...]`.
- Preserve the human-written part of the title.
- Replace an existing app-generated suffix instead of appending a second one.
- Leave the title unchanged when no valid vote counts were found.

### 7. Safe update behavior

- Detect whether the computed title is already current before sending an update.
- Avoid overwriting manual title edits beyond the app-managed suffix.
- Make the title update idempotent so repeated webhook deliveries are harmless.
- Log why an update was skipped, applied, or failed.

### 8. Failure handling

- Handle discussions that have no markdown table.
- Handle tables that do not contain an `Approval` column.
- Handle malformed rows with missing cells.
- Handle GitHub API errors and retryable failures cleanly.

### 9. Testing

- Add unit tests for vote table parsing.
- Add unit tests for count ordering and tie-breaking.
- Add unit tests for title suffix replacement.
- Add fixture tests for realistic discussion bodies with extra markdown before and after the table.
- Add an end-to-end test or smoke test for webhook-to-title-update flow.

### 10. Operations

- Add structured logging.
- Document required permissions and environment variables.
- Add deployment instructions.
- Add a manual resync path for when a webhook was missed.

### First implementation milestone

For a first usable version, build only this path:

- Receive a discussion webhook.
- Read the first post body.
- Parse one vote table with an `Approval` column.
- Compute a suffix like `[✅ 3, ❌ 2]`.
- Replace or append that suffix on the discussion title.

## Current implementation

The repository now contains the first runnable scaffold for the app:

- A `Node.js + TypeScript + Probot` app skeleton.
- A pure parser that finds the first markdown table with an `Approval` column and builds a suffix like `[✅ 3, ❌ 2]`.
- A discussion webhook handler for `discussion.created` and `discussion.edited`.
- Safe title replacement that updates only the app-managed suffix.
- Unit tests for vote parsing and title suffix replacement.

## GitHub App settings

Create a GitHub App with these settings:

- Repository permission: `Discussions` set to `Read and write`.
- Subscribe to the `discussion` webhook event.
- Install the app on the repositories whose discussion titles it should manage.

The code currently reacts to `discussion.created` and `discussion.edited` deliveries.

## Local development

Copy `.env.example` to `.env` and fill in your app credentials.

This project now targets Node `^20.18.1 || >=22`.

Environment variables:

- `APP_ID`: the GitHub App ID.
- `PRIVATE_KEY` or `PRIVATE_KEY_PATH`: the app private key.
- `WEBHOOK_SECRET`: the webhook secret configured on the GitHub App.
- `WEBHOOK_PROXY_URL`: optional Smee forwarding URL for live local webhook development.
- `PORT`: local server port. Defaults to `3000`.
- `WEBHOOK_PATH`: webhook route. Defaults to `/api/github/webhooks`.
- `LOG_LEVEL`: Probot log level. Defaults to `info`.

Useful commands:

```text
npm install
npm run create-proxy-channel
npm run proxy
npm run typecheck
npm test
npm run simulate
npm run smoke
npm run dev
```

## Local confirmation

You can confirm the title logic works without any GitHub setup:

```text
npm run simulate
```

Expected output for the bundled sample fixture includes:

```text
Current title: Should we merge this?
Summary suffix: [✅ 3, ❌ 2]
Next title: Should we merge this? [✅ 3, ❌ 2]
Would update title: yes
```

You can also point the simulator at your own fixture:

```text
npm run simulate -- path/to/your-payload.json
```

The simulator expects a JSON file shaped like a `discussion` webhook payload with a `discussion.title` and `discussion.body`.

To confirm the discussion event handling flow locally, run:

```text
npm run smoke
```

That command:

- builds the app
- loads the bundled sample discussion webhook fixture
- runs the real discussion event handler in dry-run mode
- prints the computed title update

Expected output includes:

```text
Summary suffix: [✅ 3, ❌ 2]
Next title: Should we merge this? [✅ 3, ❌ 2]
Smoke test passed.
```

The smoke test also loads `.env` automatically, so it behaves like the local app configuration without needing a live GitHub App yet.

## Live GitHub integration

To test against a real GitHub Discussion locally:

1. Create or update a GitHub App.
2. Set repository permission `Discussions` to `Read and write`.
3. Subscribe the app to the `discussion` webhook event.
4. Generate or download the app private key.
5. Create a Smee channel with:

```text
npm run create-proxy-channel
```

6. Put the returned `WEBHOOK_PROXY_URL` into `.env`.
7. Set the GitHub App webhook URL to that same `WEBHOOK_PROXY_URL`.
8. Set `APP_ID`, `PRIVATE_KEY` or `PRIVATE_KEY_PATH`, `WEBHOOK_SECRET`, and `DRY_RUN=false` in `.env`.
9. Install the app on the repository that contains the discussion you want to test.
10. Start the app in one terminal:

```text
npm start
```

11. Start webhook forwarding in another terminal:

```text
npm run proxy
```

12. Edit the first post of a discussion so the vote table changes.

If everything is wired correctly, the local app logs should show either:

- `Updated discussion title with vote summary.`
- `Skipping title update because no change is needed.`

The forwarding terminal should show webhook deliveries arriving from GitHub.

## Vercel deployment

This app can also run on Vercel as a serverless webhook endpoint.

The Vercel entrypoint lives at `api/github/webhooks/index.ts`, so the deployed webhook URL is:

```text
https://your-vercel-project.vercel.app/api/github/webhooks
```

There is also a simple health endpoint at:

```text
https://your-vercel-project.vercel.app/api/healthz
```

The project root `/` rewrites to that health endpoint through `vercel.json`, so opening the app URL in a browser should return a small JSON health response.

### Vercel setup

1. Push this repository to GitHub.
2. Import the repository into Vercel.
3. In the Vercel project settings, add these environment variables:

- `APP_ID`
- `PRIVATE_KEY`
- `WEBHOOK_SECRET`
- `WEBHOOK_PATH=/api/github/webhooks`
- `LOG_LEVEL=info`
- `DRY_RUN=false`
- `NODEJS_HELPERS=0`

4. Redeploy after saving the variables.

Notes:

- `NODEJS_HELPERS=0` is required for Probot on Vercel so the raw webhook body is not pre-parsed.
- `PORT` is not needed on Vercel.
- `WEBHOOK_PROXY_URL` is only for local Smee development and should not be set for Vercel.
- `/api/healthz` is available for a simple deployment smoke check.

### GitHub App settings for Vercel

Create or update your GitHub App with:

- Repository permission: `Discussions` set to `Read and write`.
- Subscribed webhook event: `discussion`.
- Webhook URL: `https://your-vercel-project.vercel.app/api/github/webhooks`
- Webhook secret: exactly the same value as `WEBHOOK_SECRET` in Vercel.

Then:

1. Generate a private key for the GitHub App.
2. Copy the App ID into `APP_ID`.
3. Paste the private key contents into `PRIVATE_KEY`.
4. Install the GitHub App on the repository whose discussion titles should be managed.

### Verifying the deployment

After the Vercel deployment is live and the app is installed:

1. Open a discussion in the target repository.
2. Edit the first post so the `Approval` table changes.
3. Check the Vercel function logs.

If everything is wired correctly, you should see either:

- `Updated discussion title with vote summary.`
- `Skipping title update because no change is needed.`
