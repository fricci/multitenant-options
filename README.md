# Browser intercom demos

Two technical demonstrations of how operator UIs on **different origins** can share search and incoming-call cues. Each tenant (SGMY, GXB, GXS) is a small Nest app with sample customers.

Every tenant ships the same two mock screens — a **CC dashboard** (find customer + call task list) and a **Customer 360** call screen — laid out like the real collections console, with one accent colour per tenant (SGMY teal, GXB blue, GXS amber).

Hostnames must be distinct origins. `*.localtest.me` already resolves to `127.0.0.1`, so use those URLs (not `localhost`).

## Start

Needs Node.js. `start.sh` also uses Python’s HTTP server for the proxy page. Alternatively: `docker compose up --build` in the demo folder.

```bash
./browser-browser-comm/start.sh   # ports 3001–3003, hub 3010
./tenant-overview/start.sh        # ports 3101–3103, overview 3110
```

Leave the script running. Ctrl+C stops everything.

---

## 1. Browser-to-browser (`browser-browser-comm`)

Tenants talk through a hidden iframe on `http://proxy.localtest.me:3010/` (`BroadcastChannel`). Open **two or more operator tabs** in the **same browser**.

| Tenant | Operator | Admin (incoming call) |
|--------|----------|------------------------|
| SGMY | http://sgmy.localtest.me:3001/ | http://sgmy.localtest.me:3001/admin |
| GXB | http://gxb.localtest.me:3002/ | http://gxb.localtest.me:3002/admin |
| GXS | http://gxs.localtest.me:3003/ | http://gxs.localtest.me:3003/admin |

**Search:** Wait until the header shows **intercom connected**. Search in one tab (e.g. `Singapore`, `overdue`, `TH-20001`). The switch above the search box picks the scope. On **All tenants** (the default) the query goes out to the other tabs, which run it into their own call task list, flash their title if they have hits and are in the background, and close any **call in progress** dialog they are showing. On **&lt;tenant&gt; only** the query stays in that tab and nothing changes elsewhere — the tab still follows searches broadcast by other tenants. The choice is remembered per tenant.

**Call:** On a tenant’s **Admin** page, pick a customer → **Incoming call**. That tenant’s operator tab opens the customer’s Customer 360, switches the rail clock to call duration, and flashes the tab until you click or focus it. Other operator tabs show a red **call in progress** dialog (tenant name, incoming time, minutes ago). Close it and it stays gone until the next incoming call.

**Native notifications:** Click the bell in an operator tab and allow notifications to opt in. The bell turns the tenant accent colour once enabled, and the status pill in the header reports the outcome of every click. When that tenant receives a call while its operator tab is unfocused, a native notification appears; clicking it focuses the tab and acknowledges the call. An operator tab must stay open because calls are detected by polling. Cross-tenant **call in progress** alerts stay in-page only.

The Notification API requires a **secure context**, and `*.localtest.me` over HTTP is not one — a browser judges this from the hostname, not from the `127.0.0.1` it resolves to. Without the setup below, Chrome silently denies the request instead of prompting, and the status pill will say so. Enable `chrome://flags/#unsafely-treat-insecure-origin-as-secure` and paste:

```
http://sgmy.localtest.me:3001,http://gxb.localtest.me:3002,http://gxs.localtest.me:3003
```

Relaunch Chrome afterwards. To avoid changing your normal browser, launch a throwaway instance instead — the separate profile is required, otherwise the flag is ignored:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --user-data-dir=/tmp/intercom-chrome \
  --unsafely-treat-insecure-origin-as-secure="http://sgmy.localtest.me:3001,http://gxb.localtest.me:3002,http://gxs.localtest.me:3003" \
  http://sgmy.localtest.me:3001/
```

Permission is per origin, so grant it in each tenant tab. On macOS, also confirm Chrome itself may show notifications (System Settings → Notifications) and that Do Not Disturb is off.

---

## 2. Tenant overview (`tenant-overview`)

One parent page embeds all three tenants in iframes.

Open **http://proxy.localtest.me:3110/**

**Search:** Type in the top bar (e.g. `overdue`, `Manila`, `SG-10001`). Tabs show hit counts; the first tenant with results is selected.

**Call:** Open a tenant **Admin** page (below), pick a customer → **Incoming call**. The overview tab for that tenant rings and switches into view.

| Tenant | Admin |
|--------|--------|
| SGMY | http://sgmy.localtest.me:3101/admin |
| GXB | http://gxb.localtest.me:3102/admin |
| GXS | http://gxs.localtest.me:3103/admin |

Operators can also be opened directly (`http://sgmy.localtest.me:3101/`, etc.) without the overview.

---

Try queries that hit one tenant (`Bangkok`) vs several (`overdue`, `Credit card`).
