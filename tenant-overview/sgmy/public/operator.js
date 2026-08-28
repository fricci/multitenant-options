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
const pageTitle = document.getElementById("page-title");

const DASH_TITLE = "CC dashboard";
const clock = UI.clock(document.getElementById("clock"));
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

function render(results, query) {
  const trimmed = query.trim();
  if (!trimmed) {
    metaEl.textContent = "";
    countEl.textContent = "Customer call task list";
    resultsEl.innerHTML = '<p class="empty">Search a call task ID, name, ID, city or product to build the task list.</p>';
    return;
  }

  metaEl.textContent = `${APP.name} searched “${trimmed}”`;
  countEl.textContent = `Customer call task list (${results.length})`;

  if (!results.length) {
    resultsEl.innerHTML = '<p class="empty">No matching call tasks in this tenant.</p>';
    return;
  }

  resultsEl.innerHTML = UI.taskCards(results, "Open Customer 360");
}

function clearCall() {
  fetch("/api/clear-call", { method: "POST" }).catch(() => {
    /* the next poll re-syncs */
  });
}

function acknowledgeCall() {
  if (!ringing) return;
  ringing = false;
  document.body.classList.remove("ringing");
  clearCall();
  emitCallCleared();
}

function showSearch() {
  document.body.dataset.view = "search";
  pageTitle.textContent = DASH_TITLE;
  searchPage.classList.remove("hidden");
  customerPage.classList.add("hidden");
  acknowledgeCall();
  clock.endCall();
}

function openCustomer(row, { incoming } = { incoming: false }) {
  document.body.dataset.view = "customer";
  pageTitle.textContent = UI.headline(row);
  searchPage.classList.add("hidden");
  customerPage.classList.remove("hidden");
  customerCard.innerHTML = UI.customer360(row);
  if (incoming) {
    ringing = true;
    document.body.classList.add("ringing");
    clock.startCall();
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

document.querySelectorAll('[data-action="dashboard"]').forEach((element) => {
  element.addEventListener("click", () => {
    showSearch();
    render(searchRecords(input.value), input.value);
  });
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
      document.body.classList.remove("ringing");
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
      render([], "");
    }
    emitReady();
    renderStatus();
    pollCurrentCall();
    setInterval(pollCurrentCall, POLL_MS);
  });
