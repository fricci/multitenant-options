# Browser intercom demos

Two technical demonstrations of how operator UIs on **different origins** can share search and incoming-call cues. Each tenant (SGMY, GXB, GXS) is a small Nest app with sample customers.

Every tenant ships the same two mock screens — a **CC dashboard** (find customer + call task list) and a **Customer 360** call screen — laid out like the real collections console, with one accent colour per tenant (SGMY teal, GXB blue, GXS amber).

Hostnames must be distinct origins, so use the URLs listed per demo (not plain `localhost`). The browser-to-browser demo uses `*.localhost`, which Chrome and Firefox resolve to `127.0.0.1` themselves and treat as a secure context — required by the Notification API. The tenant overview demo uses `*.localtest.me`, which also resolves to `127.0.0.1` but is not a secure context.

## Start

Needs Node.js. `start.sh` also uses Python’s HTTP server for the proxy page. Alternatively: `docker compose up --build` in the demo folder.

```bash
./browser-browser-comm/start.sh   # ports 3001–3003, hub 3010
./tenant-overview/start.sh        # ports 3101–3103, overview 3110
```

Leave the script running. Ctrl+C stops everything.

---

## 1. Browser-to-browser (`browser-browser-comm`)

Tenants talk through a hidden iframe on `http://proxy.localhost:3010/` (`BroadcastChannel`). Open **two or more operator tabs** in the **same browser**.

| Tenant | Operator | Admin (incoming call) |
|--------|----------|------------------------|
| SGMY | http://sgmy.localhost:3001/ | http://sgmy.localhost:3001/admin |
| GXB | http://gxb.localhost:3002/ | http://gxb.localhost:3002/admin |
| GXS | http://gxs.localhost:3003/ | http://gxs.localhost:3003/admin |

**Search:** Wait until the header shows **intercom connected**. Search in one tab (e.g. `Singapore`, `overdue`, `TH-20001`). Other tabs run the same query into their own call task list and flash their title if they have hits and are in the background.

**Call:** On a tenant’s **Admin** page, pick a customer → **Incoming call**. That tenant’s operator tab opens the customer’s Customer 360, switches the rail clock to call duration, and flashes the tab until you click or focus it. Other operator tabs show a red **call in progress** dialog (tenant name, incoming time, minutes ago). Close it and it stays gone until the next incoming call.

Click the bell in an operator tab and allow browser notifications to opt in to native incoming-call alerts. The bell turns the tenant accent colour once notifications are enabled, and its tooltip reports the current permission state. When that tenant receives a call while its operator tab is in the background or the browser is minimized, clicking the notification focuses the existing tab and acknowledges the call. An operator tab must remain open because this demo detects calls by polling; notifications are not sent for cross-tenant **call in progress** alerts.

Notifications need a secure context, which is why these URLs use `*.localhost` rather than `*.localtest.me`. Permission is per origin, so grant it separately in each tenant. Safari does not resolve `*.localhost` reliably; use Chrome or Firefox for this demo.

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
