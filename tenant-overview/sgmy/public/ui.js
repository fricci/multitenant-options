/* Rendering helpers shared by the operator console and the call simulator. Needs APP to be defined first. */
const UI = (() => {
  const money = new Intl.NumberFormat(APP.locale, {
    style: "currency",
    currency: APP.currency,
    maximumFractionDigits: 0
  });

  const STATUS = {
    overdue: { label: "At risk", tone: "bad", value: 0.84 },
    current: { label: "Performing", tone: "good", value: 0.24 },
    settled: { label: "Settled", tone: "accent", value: 0.06 }
  };

  const ARC = Math.PI * 38;
  const NONE = '<span class="dash">———</span>';
  const TENANTS = { sgmy: "SGMY", gxb: "GXB", gxs: "GXS" };

  function tenantName(id) {
    return TENANTS[id] || id;
  }

  function esc(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* Stable per-account pseudo values so the scoring cards look populated without a real model. */
  function hash(value) {
    let h = 7;
    for (const char of String(value)) h = (h * 31 + char.charCodeAt(0)) >>> 0;
    return h;
  }

  function icon(name, extra) {
    return `<svg class="ic ${extra || ""}"><use href="#i-${name}"></use></svg>`;
  }

  function band(value, labels) {
    if (value < 0.34) return labels[0];
    if (value < 0.67) return labels[1];
    return labels[2];
  }

  function tone(value) {
    return value < 0.34 ? "good" : value < 0.67 ? "warn" : "bad";
  }

  function gauge(value, toneName, label) {
    const v = Math.min(1, Math.max(0, Number(value) || 0));
    return `
      <div class="gauge-wrap">
        <svg class="gauge" viewBox="0 0 96 60" aria-hidden="true">
          <path class="g-track" d="M10 52A38 38 0 0 1 86 52"></path>
          <path class="g-fill tone-${toneName}" d="M10 52A38 38 0 0 1 86 52"
            stroke-dasharray="${ARC.toFixed(1)}" stroke-dashoffset="${(ARC * (1 - v)).toFixed(1)}"></path>
          <line class="g-needle" x1="48" y1="52" x2="48" y2="22"
            transform="rotate(${(-90 + 180 * v).toFixed(1)} 48 52)"></line>
          <circle class="g-hub" cx="48" cy="52" r="4"></circle>
        </svg>
        <div class="gauge-label">${esc(label)}</div>
      </div>`;
  }

  function taskField(name, label, value) {
    return `
      <div class="task-field">
        ${icon(name, "sm")}
        <div>
          <span class="tf-label">${esc(label)}</span>
          <span class="tf-value">${esc(value)}</span>
        </div>
      </div>`;
  }

  function amount(row) {
    return row.amount ? money.format(row.amount) : money.format(0);
  }

  function taskCards(rows, actionLabel) {
    return rows
      .map(
        (row) => `
      <article class="task-card ${esc(row.status)}" data-account="${esc(row.account)}">
        <div class="task-top">
          <div>
            <div class="task-id">${esc(row.account)}</div>
            <div class="task-name">${esc(row.name)}</div>
          </div>
          <button type="button" class="task-action" data-account="${esc(row.account)}">${esc(actionLabel)}</button>
        </div>
        <div class="task-fields">
          ${taskField("pin", "Home city", row.city)}
          ${taskField("card", "Product", row.product)}
          ${taskField("coin", "Total past due", amount(row))}
        </div>
      </article>`
      )
      .join("");
  }

  function field(label, value, wide) {
    return `
      <div${wide ? ' style="grid-column: span 2"' : ""}>
        <span class="field-label">${esc(label)}</span>
        <span class="field-value">${value === null || value === undefined || value === "" ? NONE : esc(value)}</span>
      </div>`;
  }

  function tile(label, value) {
    return `
      <div class="tile">
        <span class="tile-label">${esc(label)}</span>
        <span class="tile-value">${value}</span>
      </div>`;
  }

  function headline(row) {
    return `${row.name} (${row.account}) — ${row.product}`;
  }

  function customer360(row) {
    const seed = hash(row.account);
    const state = STATUS[row.status] || { label: row.status, tone: "accent", value: 0.5 };
    const willingness = ((seed >>> 3) % 100) / 100;
    const affordability = ((seed >>> 9) % 100) / 100;
    const cycles = row.status === "overdue" ? 1 + (seed % 3) : 0;
    const kept = row.status === "overdue" ? (seed >>> 5) % 40 : 60 + ((seed >>> 5) % 40);

    return `
      <section class="card">
        <h2 class="card-title">Profile <span class="spacer"></span>
          <button type="button" class="icon-btn" title="Share profile">${icon("share")}</button>
        </h2>
        <div class="profile-top">
          <div class="perf">
            ${gauge(state.value, state.tone, state.label)}
          </div>
          <div class="kpis">
            <div class="kpi"><span class="kpi-label">Risk status</span><span class="kpi-value">${esc(state.label)}</span></div>
            <div class="kpi"><span class="kpi-label">Full refund left</span><span class="kpi-value">${money.format(0)}</span></div>
            <div class="kpi wide"><span class="kpi-label">Total past due</span><span class="kpi-value big ${row.amount ? "danger" : ""}">${amount(row)}</span></div>
            <div class="kpi"><span class="kpi-label">Treatment path</span><span class="kpi-value">${NONE}</span></div>
            <div class="kpi"><span class="kpi-label">Treatment stage</span><span class="kpi-value">NotA…</span></div>
          </div>
        </div>

        <div class="divider"><span>Basic info</span></div>
        <div class="fields c4">
          ${field("Customer name", row.name)}
          ${field("Customer ID", row.account)}
          ${field("Birth date", "")}
          ${field("Date of death", "")}
        </div>

        <div class="divider"><span>Highlights</span></div>
        <div class="fields c2">
          ${field("Last communication", "")}
          ${field("Date", "")}
          ${field("Expected communication send method", "")}
          <div>
            <span class="field-label">Digital output</span>
            <span class="check"></span>
          </div>
        </div>

        <div class="divider"><span>Preferred email and phone number</span></div>
        <div class="fields c2">
          ${field("Preferred email address", "")}
          ${field("Preferred phone number", "")}
        </div>

        <div class="divider"><span>Preferred home address</span></div>
        <div class="fields c5">
          ${field("Street", "")}
          ${field("House number", "")}
          ${field("Postal/ZIP", "")}
          ${field("City", row.city)}
          ${field("Country", APP.country)}
        </div>
      </section>

      <aside class="c360-side">
        <section class="card">
          <h2 class="card-title">Willingness <span class="spacer"></span>
            <button type="button" class="icon-btn" title="Open willingness">${icon("share")}</button>
          </h2>
          <div class="side-body">
            <div class="tiles">
              ${tile("PTP/PA kept/made", `${kept}%`)}
              ${tile("First non-delinquency period", String(300 + (seed % 500)))}
              ${tile("Nr of delinquency cycles", String(cycles))}
              ${tile("Subjective rating", NONE)}
            </div>
            ${gauge(willingness, tone(1 - willingness), band(willingness, ["Low", "Moderate", "High"]))}
          </div>
        </section>

        <section class="card">
          <h2 class="card-title">Affordability <span class="spacer"></span>
            <button type="button" class="icon-btn" title="Open affordability">${icon("share")}</button>
          </h2>
          <div class="side-body">
            <div class="tiles">
              ${tile("DTI", NONE)}
              ${tile("DTA", NONE)}
            </div>
            ${gauge(affordability, tone(affordability), band(affordability, ["Low", "Medium", "High"]))}
          </div>
        </section>

        <section class="card">
          <h2 class="card-title">Latest SFA info</h2>
          <div class="tiles">
            ${tile("Product", esc(row.product))}
            ${tile("Outstanding", amount(row))}
            ${tile("Last review", NONE)}
          </div>
        </section>
      </aside>`;
  }

  /* Session countdown in the rail, switched to call duration while a call is live. */
  function clock(el) {
    let session = 30 * 60;
    let call = null;

    function format(total) {
      const minutes = Math.floor(total / 60);
      const seconds = total % 60;
      return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    function paint() {
      if (!el) return;
      el.textContent = format(call === null ? session : call);
      el.classList.toggle("live", call !== null);
    }

    setInterval(() => {
      session = Math.max(0, session - 1);
      if (call !== null) call += 1;
      paint();
    }, 1000);
    paint();

    return {
      startCall() {
        call = 0;
        paint();
      },
      endCall() {
        call = null;
        paint();
      }
    };
  }

  return { esc, icon, money, gauge, taskCards, customer360, headline, clock, amount, tenantName, NONE };
})();
