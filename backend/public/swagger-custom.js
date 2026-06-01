(function () {
  const LOGIN_PATH = "/api/auth/login";
  const PROVIDER_LOGIN_PATH = "/api/auth/provider-login";
  const LOGIN_PLACEHOLDER = '{\n  "username": "username",\n  "password": "password"\n}';

  function isLoginBlock(block) {
    const pathEl = block.querySelector(".opblock-summary-path");
    return pathEl && pathEl.textContent && pathEl.textContent.includes(LOGIN_PATH);
  }

  function isProviderLoginBlock(block) {
    const pathEl = block.querySelector(".opblock-summary-path span");
    if (!pathEl) return false;
    return pathEl.textContent.includes(PROVIDER_LOGIN_PATH);
  }

  function applyProviderLoginRedirect(block) {
    const executeBtn = block.querySelector(".execute");
    if (!executeBtn || executeBtn.dataset.redirectPatched) return;

    executeBtn.addEventListener("click", (e) => {
      // If the button is in 'Execute' mode, redirect the whole window
      if (executeBtn.classList.contains("execute")) {
        e.preventDefault();
        e.stopPropagation();
        window.location.assign(PROVIDER_LOGIN_PATH);
      }
    }, true);

    executeBtn.dataset.redirectPatched = "true";
  }

  function applyLoginTextarea(block) {
    const textarea = block.querySelector("textarea.body-param");
    if (!textarea) return;

    textarea.placeholder = LOGIN_PLACEHOLDER;

    if (!textarea.dataset.codexPatched) {
      const currentValue = (textarea.value || "").trim();
      const shouldReset =
        currentValue === "" ||
        currentValue.includes('"username": "string"') ||
        currentValue.includes('"password": "string"') ||
        currentValue.toLowerCase().includes("admin") ||
        currentValue.includes("zBtx1bCq?*_608r64a4*");

      if (shouldReset) {
        textarea.value = "";
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
      }

      textarea.dataset.codexPatched = "true";
    }
  }

  function applyLoginFieldPlaceholders(block) {
    block.querySelectorAll("table.parameters tbody tr").forEach((row) => {
      const rowText = (row.textContent || "").toLowerCase();
      const input = row.querySelector("input");
      if (!input) return;

      if (rowText.includes("username")) {
        input.placeholder = "username";
        input.autocomplete = "username";
      }

      if (rowText.includes("password")) {
        input.placeholder = "password";
        input.type = "password";
        input.autocomplete = "current-password";
      }
    });
  }

  function patchSwaggerUi() {
    document.querySelectorAll(".opblock").forEach((block) => {
      if (isLoginBlock(block)) {
        applyLoginTextarea(block);
        applyLoginFieldPlaceholders(block);
      }
      if (isProviderLoginBlock(block)) {
        applyProviderLoginRedirect(block);
      }
    });
  }

  const observer = new MutationObserver(() => {
    patchSwaggerUi();
  });

  function init() {
    patchSwaggerUi();
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
