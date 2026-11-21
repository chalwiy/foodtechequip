(() => {
  "use strict";

  const form = document.querySelector("[data-inquiry-form]");
  const preview = document.querySelector("[data-generated-inquiry]");
  if (!form || !preview) return;

  form.addEventListener("input", () => {
    if (preview.hidden) return;
    preview.hidden = true;
    preview.querySelector("[data-inquiry-text]").value = "";
    preview.querySelector("[data-copy-status]").textContent = "";
    preview.querySelector("[data-email-inquiry]").href = "mailto:" + form.dataset.email;
    preview.querySelector("[data-whatsapp-inquiry]").href = form.dataset.whatsapp;
  });
})();
