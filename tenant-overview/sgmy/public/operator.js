const OVERVIEW_ORIGIN = "http://proxy.localtest.me:3110";
const inOverview = window.parent !== window;

const input = document.getElementById("q");
const resultsEl = document.getElementById("results");
const statusEl = document.getElementById("status");
const metaEl = document.getElementById("meta");
const countEl = document.getElementById("count");
const form = document.getElementById("search-form");
const searchPage = document.getElementById("search-page");
const customerPage = document.getElementById("customer-page");
const customerCard = document.getElementById("customer-card");
const backBtn = document.getElementById("back-btn");

const money = new Intl.NumberFormat(APP.locale, { style: "currency", currency: APP.currency });
const POLL_MS = 1000;

let RECORDS = [];
let lastCallId = 0;
let channelOk = true;
let debounceTimer = null;
let ringing = false;

function urlState() {
  const params = new URLSearchParams(location.search);
  return {
    q: params.get("q") || "",
    searchId: params.get("sid") || ""
  };
}

function emitToParent(payload) {
  if (!inOverview) return;
  window.parent.postMessage({ tenant: APP.id, ...payload }, OVERVIEW_ORIGIN);
}

function emitReady() {
  emitToParent({ type: "ready" });
}

function emitSearchResults(query, count, searchId) {
  emitToParent({
    type: "search-results",
    query,
    count,
    searchId
  });
}

function emitIncomingCall(customer) {
  emitToParent({ type: "incoming-call", customer });
}

function emitCallCleared() {
  emitToParent({ type: "call-cleared" });
}

function renderStatus() {
  if (inOverview) {
    statusEl.textContent = channelOk ? "overview connected" : "overview connected · call channel offline";
    statusEl.classList.toggle("ok", channelOk);
    return;
  }
  statusEl.textContent = channelOk ? "ready" : "call channel offline";
  statusEl.classList.toggle("ok", channelOk);
}

function searchRecords(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return RECORDS.filter((row) =>
    Object.values(row).some((value) => String(value).toLowerCase().includes(q))
  );
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function render(results, query) {
  const trimmed = query.trim();
  if (!trimmed) {
    metaEl.textContent = "";
    countEl.textContent = "";
    resultsEl.innerHTML = '<p class="empty">Type a search to look up accounts in this tenant.</p>';
    return;
  }

  metaEl.textContent = `${APP.name} searched “${trimmed}”`;
  countEl.textContent = `${results.length} result${results.length === 1 ? "" : "s"}`;

  if (!results.length) {
    resultsEl.innerHTML = '<p class="empty">No matching accounts in this tenant.</p>';
    return;
  }

  resultsEl.innerHTML = results.map((row) => `
    <article class="card" data-account="${escapeHtml(row.account)}">
      <div class="card-top">
        <div class="name">${escapeHtml(row.name)}</div>
        <div class="badge ${escapeHtml(row.status)}">${escapeHtml(row.status)}</div>
      </div>
      <div class="detail">${escapeHtml(row.account)} · ${escapeHtml(row.city)} · ${money.format(row.amount)}</div>
      <div class="detail">${escapeHtml(row.product)}</div>
    </article>
  `).join("");
}

function clearCall() {
  fetch("/api/clear-call", { method: "POST" }).catch(() => {
    /* the next poll re-syncs */
  });
}

function acknowledgeCall() {
  if (!ringing) return;
  ringing = false;
  clearCall();
  emitCallCleared();
}

function showSearch() {
  searchPage.classList.remove("hidden");
  customerPage.classList.add("hidden");
  acknowledgeCall();
}

function renderCustomer(row) {
  customerCard.innerHTML = `
    <div class="card-top">
      <div class="name">${escapeHtml(row.name)}</div>
      <div class="badge ${escapeHtml(row.status)}">${escapeHtml(row.status)}</div>
    </div>
    <dl class="dl">
      <dt>Account</dt><dd>${escapeHtml(row.account)}</dd>
      <dt>City</dt><dd>${escapeHtml(row.city)}</dd>
      <dt>Product</dt><dd>${escapeHtml(row.product)}</dd>
      <dt>Amount</dt><dd>${money.format(row.amount)}</dd>
    </dl>
  `;
}

function openCustomer(row, { incoming } = { incoming: false }) {
  searchPage.classList.add("hidden");
  customerPage.classList.remove("hidden");
  renderCustomer(row);
  if (incoming) {
    ringing = true;
  } else {
    acknowledgeCall();
  }
}

function runSearch(query, { notifyParent } = { notifyParent: false }) {
  showSearch();
  const results = searchRecords(query);
  render(results, query);
  if (notifyParent) {
    emitSearchResults(query, results.length, urlState().searchId);
  }
}

function handleIncomingCall(payload) {
  const customer = payload && payload.customer;
  if (!customer || !customer.account) return;
  const row = RECORDS.find((item) => item.account === customer.account) || customer;
  openCustomer(row, { incoming: true });
  emitIncomingCall(row);
}

window.addEventListener("pointerdown", acknowledgeCall);
window.addEventListener("keydown", acknowledgeCall);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  clearTimeout(debounceTimer);
  runSearch(input.value, { notifyParent: true });
});

input.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    runSearch(input.value, { notifyParent: false });
  }, 300);
});

resultsEl.addEventListener("click", (event) => {
  const card = event.target.closest("[data-account]");
  if (!card) return;
  const row = RECORDS.find((item) => item.account === card.dataset.account);
  if (row) openCustomer(row, { incoming: false });
});

backBtn.addEventListener("click", () => {
  showSearch();
  render(searchRecords(input.value), input.value);
});

async function pollCurrentCall() {
  try {
    const res = await fetch("/api/current-call", { cache: "no-store" });
    const body = await res.json();
    const call = body && body.call;
    channelOk = true;
    renderStatus();
    if (call && call.id > lastCallId) {
      lastCallId = call.id;
      handleIncomingCall(call);
    } else if (!call && ringing) {
      ringing = false;
      emitCallCleared();
    }
  } catch {
    channelOk = false;
    renderStatus();
  }
}

fetch("/api/customers")
  .then((res) => res.json())
  .then((rows) => {
    RECORDS = Array.isArray(rows) ? rows : [];
  })
  .catch(() => {
    /* search stays empty; the customer detail view still works from the call payload */
  })
  .finally(() => {
    const { q, searchId } = urlState();
    if (q) {
      input.value = q;
      const results = searchRecords(q);
      render(results, q);
      emitSearchResults(q, results.length, searchId);
    } else {
      render([], "", APP.id);
    }
    emitReady();
    renderStatus();
    pollCurrentCall();
    setInterval(pollCurrentCall, POLL_MS);
  });
