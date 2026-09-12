import { buildStorefront } from "./template.js";
import { PRESETS, applyPreset } from "./presets.js";

const SAMPLE_CONTACT = {
  phone: "+254 700 000 000",
  whatsapp: "0700000000",
};

const nameInput = document.getElementById("preview-name");
const cuisineSelect = document.getElementById("preview-cuisine");
const townInput = document.getElementById("preview-town");
const frame = document.getElementById("preview-frame");

function render() {
  const key = cuisineSelect.value;
  const town = townInput.value.trim();

  let data = {
    name: nameInput.value.trim() || "Your Restaurant",
    address: town || "Your town",
    phone: SAMPLE_CONTACT.phone,
    whatsapp: SAMPLE_CONTACT.whatsapp,
    menu: [],
    theme: {},
    lang: "en",
  };

  data = applyPreset(data, key);
  frame.srcdoc = buildStorefront(data);
}

// Populate the cuisine dropdown from PRESETS
for (const [key, preset] of Object.entries(PRESETS)) {
  const opt = document.createElement("option");
  opt.value = key;
  opt.textContent = preset.label;
  cuisineSelect.appendChild(opt);
}

nameInput.addEventListener("input", render);
townInput.addEventListener("input", render);
cuisineSelect.addEventListener("change", render);

render();