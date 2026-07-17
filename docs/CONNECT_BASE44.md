# Connect Base44 interface → Flouba Lite backend

This is the exact path your Flouba Lite dashboard must use:

```text
Base44 UI (browser)
  → Base44 backend functions  ← secrets live here
    → Flouba Lite Node backend (/api/base44/*)
      → MT5 EA (/api/mt5/*)
```

Never call the Flouba backend URL or API key from Base44 frontend code.

---

## Step 1 — Make the backend reachable from Base44

Base44 Cloud must reach your backend over **HTTPS**.

| Your situation | What to do |
|---|---|
| Backend still local | Use a tunnel (`ngrok http 8080` or Cloudflare Tunnel) and use that HTTPS URL |
| Render / Railway / VPS | Use the public HTTPS URL |

Local-only `http://localhost:8080` will **not** work from Base44 cloud.

Confirm health:

```bash
curl -s https://YOUR-BACKEND-HOST/health
```

---

## Step 2 — Align secrets

### On Flouba Lite backend (`.env` or host env)

Use a strong key (32+ chars), for example:

```env
BASE44_API_KEY=your-long-random-base44-key-here!!!!!!!!!!
ALLOWED_ORIGINS=https://app.base44.com,https://YOUR-BASE44-APP-DOMAIN
ENABLE_HMAC_VALIDATION=false
```

Restart the backend after changing env.

### In Base44 (server secrets only)

| Base44 secret | Value |
|---|---|
| `FLOUBA_BACKEND_URL` | `https://YOUR-BACKEND-HOST` (no trailing slash) |
| `FLOUBA_BASE44_API_KEY` | **exactly** the same as backend `BASE44_API_KEY` |
| `FLOUBA_HMAC_SECRET` | optional; only if HMAC is enabled |

---

## Step 3 — Add Base44 backend functions

Paste from:

`examples/base44/base44-functions.ts`

Create Base44 **server** functions for at least:

**Read (dashboard)**
- `getBackendHealth`
- `getRobots`
- `getRobotStatus`
- `getAccountSummary`
- `getOpenPositions`
- `getPendingOrders`
- `getClosedTrades`
- `getCommands`
- `getHeartbeat`

**Control (buttons)**
- `startRobot` / `stopRobot` / `pauseRobot` / `resumeRobot`
- `emergencyStop` / `clearEmergencyStop`
- `closeAllPositions` / `cancelAllOrders`
- `createTradeCommand`
- `updateRobotSettings`

Each function must run on Base44 **server**, not in the browser.

---

## Step 4 — Wire the Base44 UI

From the interface, call server functions only, for example:

```ts
// status card
const status = await getRobotStatus(robotId);

// account panel
const account = await getAccountSummary(robotId);

// positions table
const positions = await getOpenPositions(robotId);

// Start button
await startRobot(robotId);

// Emergency Stop button
await emergencyStop(robotId);
```

UI rules:
1. Pass only `robotId` + user inputs from the browser.
2. Show command results as **Queued / Delivered / Completed** — not “trade filled” until MT5 confirms.
3. Poll `getRobotStatus` / `getCommands` after control actions.
4. Never log API keys.

---

## Step 5 — End-to-end smoke test

1. MT5 EA online and registered (`Robot_Id` matches Base44 robot id).
2. From Base44: `getBackendHealth` → success.
3. `getRobots` / `getRobotStatus` → shows ONLINE after heartbeat.
4. `startRobot` → command appears `QUEUED`.
5. EA polls → command becomes `DELIVERED` → then `COMPLETED` after EA result.
6. `emergencyStop` → blocks new entry commands; close-all still allowed.

---

## Common failures

| Symptom | Cause | Fix |
|---|---|---|
| Base44 timeout / fetch failed | Backend not public HTTPS | Deploy or tunnel |
| `INVALID_API_KEY` | Keys mismatch | Make Base44 secret = backend `BASE44_API_KEY` |
| `UNAUTHORIZED` missing headers | Function not using pack | Use `base44-functions.ts` |
| Robot always OFFLINE | EA not heartbeating | Check EA WebRequest URL + keys |
| Command stays QUEUED | EA not polling | EA timer / mode / Allow_Backend_Trades |

---

## Robot ID reminder

Use the **same** id everywhere:
- Base44 UI / functions: `robotId`
- EA input: `Robot_Id`
- Backend robot record after MT5 `POST /api/mt5/register`
