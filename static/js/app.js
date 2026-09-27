const tokenKey = "pocketsmart_token";


function token() {
  return localStorage.getItem(tokenKey);
}


function headers(json = true) {
  const h = {};

  if (json) {
    h["Content-Type"] = "application/json";
  }

  if (token()) {
    h["Authorization"] =
      "Bearer " + token();
  }

  return h;
}


function escapeHtml(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    c =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[c])
  );
}


async function api(url, options = {}) {

  options.headers = {
    ...headers(
      !(options.body instanceof FormData)
    ),
    ...(options.headers || {})
  };

  const res = await fetch(
    url,
    options
  );

  const data = await res
    .json()
    .catch(() => ({
      detail:
        "Unexpected server response"
    }));

  if (!res.ok) {
    throw new Error(
      data.detail ||
      "Request failed"
    );
  }

  return data;
}


function setAuthLink() {

  const a =
    document.getElementById(
      "authLink"
    );

  if (a && token()) {

    a.textContent = "Logout";

    a.href = "#";

    a.onclick = e => {
      e.preventDefault();
      logout();
    };
  }
}


setAuthLink();


function initLogin() {

  document.getElementById(
    "loginForm"
  ).onsubmit = async e => {

    e.preventDefault();

    const f =
      new FormData(e.target);

    try {

      const d = await api(
        "/api/auth/login",
        {
          method: "POST",
          body: JSON.stringify(
            Object.fromEntries(f)
          )
        }
      );

      localStorage.setItem(
        tokenKey,
        d.access_token
      );

      location.href =
        "/dashboard";

    } catch (err) {

      document.getElementById(
        "message"
      ).textContent =
        err.message;
    }
  };
}


function initRegister() {

  document.getElementById(
    "registerForm"
  ).onsubmit = async e => {

    e.preventDefault();

    const f =
      new FormData(e.target);

    try {

      const d = await api(
        "/api/auth/register",
        {
          method: "POST",
          body: JSON.stringify(
            Object.fromEntries(f)
          )
        }
      );

      localStorage.setItem(
        tokenKey,
        d.access_token
      );

      location.href =
        "/dashboard";

    } catch (err) {

      document.getElementById(
        "message"
      ).textContent =
        err.message;
    }
  };
}


function logout() {

  localStorage.removeItem(
    tokenKey
  );

  location.href = "/";
}


function requireAuth() {

  if (!token()) {

    location.href = "/login";

    return false;
  }

  return true;
}


function renderResults(d) {

  const alloc =
    Object.entries(
      d.allocations || {}
    )
      .map(
        ([k, v]) =>
          `<div>
            <b>${escapeHtml(k)}</b>
            <br>
            ₹${Number(v).toLocaleString(
              "en-IN"
            )}
          </div>`
      )
      .join("");


  const cards =
    d.recommendations
      .map(
        r =>
          `<article class="rec">
            <h3>${escapeHtml(
              r.name
            )}</h3>

            <div class="muted">
              ${escapeHtml(
                r.platform
              )}
              ·
              ${escapeHtml(
                r.category
              )}
            </div>

            <p class="price">
              ₹${Number(
                r.price
              ).toLocaleString(
                "en-IN"
              )}
              ×
              ${r.quantity || 1}
            </p>

            <p>
              ${escapeHtml(
                r.reason
              )}
            </p>

            <a
              href="${escapeHtml(
                r.url
              )}"
              target="_blank"
              rel="noopener"
            >
              Open platform ↗
            </a>
          </article>`
      )
      .join("");


  return `
    <section class="result">

      <div class="result-head">

        <div>

          <span class="pill">
            ${escapeHtml(
              d.source_mode
            )}
          </span>

          <h2>
            ${escapeHtml(
              d.summary
            )}
          </h2>

          <p>
            Budget
            ₹${Number(
              d.budget
            ).toLocaleString(
              "en-IN"
            )}

            · Selected
            ₹${Number(
              d.allocated_total
            ).toLocaleString(
              "en-IN"
            )}

            · Remaining
            ₹${Number(
              d.remaining_budget
            ).toLocaleString(
              "en-IN"
            )}
          </p>

        </div>

      </div>

      ${
        alloc
          ? `<div class="alloc">
              ${alloc}
             </div>`
          : ""
      }

      <div class="rec-grid">

        ${
          cards ||
          "<p>No recommendation fit the budget.</p>"
        }

      </div>

      <p class="muted">
        ${(d.notes || [])
          .map(escapeHtml)
          .join(" · ")}
      </p>

    </section>
  `;
}


function showError(err) {

  document.getElementById(
    "results"
  ).innerHTML = `
    <section class="result">

      <b>
        Could not generate plan
      </b>

      <p>
        ${escapeHtml(
          err.message
        )}
      </p>

    </section>
  `;
}


function parseRooms(s) {

  return s
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);
}


function parseItems(s) {

  return s
    .split(",")
    .map(x => x.trim())
    .filter(Boolean)
    .map(x => {

      const [
        category,
        q
      ] = x.split(":");

      return {
        category:
          category.trim(),

        quantity:
          Number(q || 1)
      };
    });
}


function initHomePlanner() {

  document.getElementById(
    "homeForm"
  ).onsubmit = async e => {

    e.preventDefault();

    if (!requireAuth()) {
      return;
    }

    const f =
      new FormData(e.target);

    const body = {
      budget:
        Number(
          f.get("budget")
        ),

      rooms:
        parseRooms(
          f.get("rooms")
        ),

      style:
        f.get("style"),

      items:
        parseItems(
          f.get("items")
        ),

      city:
        f.get("city")
    };


    try {

      document.getElementById(
        "results"
      ).innerHTML =
        "<p>Generating...</p>";

      const result =
        await api(
          "/api/planners/home",
          {
            method: "POST",
            body:
              JSON.stringify(
                body
              )
          }
        );

      document.getElementById(
        "results"
      ).innerHTML =
        renderResults(
          result
        );

    } catch (err) {

      showError(err);
    }
  };
}


function initPartyPlanner() {

  document.getElementById(
    "partyForm"
  ).onsubmit = async e => {

    e.preventDefault();

    if (!requireAuth()) {
      return;
    }

    const f =
      new FormData(e.target);

    const body = {
      budget:
        Number(
          f.get("budget")
        ),

      guests:
        Number(
          f.get("guests")
        ),

      event_type:
        f.get("event_type"),

      venue:
        f.get("venue"),

      city:
        f.get("city")
    };


    try {

      document.getElementById(
        "results"
      ).innerHTML =
        "<p>Generating...</p>";

      const result =
        await api(
          "/api/planners/party",
          {
            method: "POST",
            body:
              JSON.stringify(
                body
              )
          }
        );

      document.getElementById(
        "results"
      ).innerHTML =
        renderResults(
          result
        );

    } catch (err) {

      showError(err);
    }
  };
}


function initJewelryPlanner() {

  document.getElementById(
    "jewelryForm"
  ).onsubmit = async e => {

    e.preventDefault();

    if (!requireAuth()) {
      return;
    }

    const f =
      new FormData(e.target);

    try {

      document.getElementById(
        "results"
      ).innerHTML =
        "<p>Generating...</p>";

      const result =
        await api(
          "/api/planners/jewelry",
          {
            method: "POST",
            body: f
          }
        );

      document.getElementById(
        "results"
      ).innerHTML =
        renderResults(
          result
        );

    } catch (err) {

      showError(err);
    }
  };
}


async function loadDashboard() {

  if (!requireAuth()) {
    return;
  }

  try {

    const d =
      await api(
        "/api/history"
      );

    document.getElementById(
      "dashboard"
    ).innerHTML =
      d.length
        ? d
            .map(
              x =>
                `<article class="history-item">

                  <b>
                    ${escapeHtml(
                      x.planner.toUpperCase()
                    )}
                  </b>

                  <p>
                    ${escapeHtml(
                      x.result.summary
                    )}
                  </p>

                  <span class="muted">
                    ${new Date(
                      x.created_at
                    ).toLocaleString()}
                  </span>

                </article>`
            )
            .join("")

        : `
          <div class="notice">
            No recommendations yet.
            Pick a planner to get started.
          </div>
        `;

  } catch (err) {

    document.getElementById(
      "dashboard"
    ).innerHTML = `
      <div class="notice">
        ${escapeHtml(
          err.message
        )}
      </div>
    `;
  }
}