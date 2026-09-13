import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  renderCard,
  getBottleQuantity,
  getBottleSize,
  getProductName,
  getProductIcon,
  getProductType,
  getSnackGrams,
  MAX_LITERS
} from "./js/render.js";
import {
  siteShell, ageGate, drinkGrid, stockGrid, snackGrid, beverageCount,
  updateLabel, onlineStatus, footerOnlineStatus, adminForm, photoButton, photoInput,
  adminMessage, productInfoModal, closeProductInfoModal, productInfoTitle, productInfoContent,
  adminPanel, adminLink, categoriaSelect, iconSuggestions, iconInput,
  addQuantityInput, addSingleLitersSelect, addSnackGramsSelect, addFormatPreview,
  editModal, closeEditModal, availabilityForm, availabilityMessage,
  adminProductIdInput, adminProductKindInput, adminProductSelect, adminProductType,
  adminProductIcon, adminEditKind, deleteProductButton, adminQuantityInput,
  adminUnitInfo, adminTotalInfo, openAddModalButton, addModal, closeAddModal,
  inventoryTabs, inventoryViews,
  barcodeModal, closeBarcodeModal, barcodeReader, barcodeStatus,
  barcodeResult, barcodeResultCode, barcodeResultFields, barcodeRetryButton
} from "./js/dom.js";
import {
  loadProducts, loadStock, loadSnack,
  saveProduct, saveStock, saveSnack,
  updateProduct, updateStock, updateSnack,
  deleteProduct, deleteStock, deleteSnack,
  productsCache, stockCache, snackCache, countBottles
} from "./js/firestore.js";

const ADULT_REDIRECT_URL = "https://www.youtube.com/watch?v=cGUTvXkMcT8";
const ADULT_STORAGE_KEY = "minifrigo_adult_confirmed";

function readStoredChoice() {
  try {
    const sessionValue = sessionStorage.getItem(ADULT_STORAGE_KEY);
    if (sessionValue) return sessionValue;
  } catch (error) {
    console.warn("sessionStorage non disponibile, provo fallback locale.", error);
  }

  try {
    const localValue = localStorage.getItem(ADULT_STORAGE_KEY);
    if (localValue) return localValue;
  } catch (error) {
    console.warn("localStorage non disponibile, uso fallback in memoria.", error);
  }

  return document.body?.dataset?.adultChoice || null;
}

function storeChoice(choice) {
  try {
    sessionStorage.setItem(ADULT_STORAGE_KEY, choice);
    return;
  } catch (error) {
    console.warn("sessionStorage bloccato, fallback su localStorage.", error);
  }

  try {
    localStorage.setItem(ADULT_STORAGE_KEY, choice);
    return;
  } catch (error) {
    console.warn("localStorage bloccato, uso fallback in memoria.", error);
    if (document.body) document.body.dataset.adultChoice = choice;
  }
}

const ICONS = {
  bevanda: ["🥤", "🥤", "🥛", "🧃", "🍺", "🍷", "🥂", "☕", "🧋", "💧"],
  stock: ["🥤", "🥤", "🥛", "🧃", "🍺", "🍷", "🥂", "☕", "🧋", "💧"],
  snack: ["🍟", "🍿", "🥨", "🍪", "🍫", "🍬", "🥜", "🥟"]
};

const DRINK_SIZES = [0.20, 0.25, 0.33, 0.50, 0.75, 1, 1.5, 2];
const SNACK_SIZES = [20, 30, 40, 50, 75, 100, 125, 150, 200, 250, 500];

let currentUser = null;

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  syncAdminUI();
});

function setUpdateTimestamp() {
  if (!updateLabel) return;
  const now = new Date();
  updateLabel.innerHTML = `Ultimo aggiornamento<br>${now.toLocaleDateString("it-IT", {
    day: "2-digit", month: "long", year: "numeric"
  })}`;
}

function renderInventory() {
  if (drinkGrid) drinkGrid.innerHTML = productsCache.map((item) => renderCard(item, "drink")).join("");
  if (stockGrid) stockGrid.innerHTML = stockCache.map((item) => renderCard(item, "stock")).join("");
  if (snackGrid) snackGrid.innerHTML = snackCache.map((item) => renderCard(item, "snack")).join("");
  if (beverageCount) beverageCount.textContent = String(countBottles());
  setUpdateTimestamp();
  updateOnlineStatus(navigator.onLine);
}

async function refreshInventory() {
  try {
    await Promise.all([loadProducts(), loadStock(), loadSnack()]);
    renderInventory();
  } catch (error) {
    console.error(error);
    if (availabilityMessage) availabilityMessage.textContent = "Impossibile caricare il frigo.";
  }
}

function populateSizeOptions() {
  if (addSingleLitersSelect) {
    addSingleLitersSelect.innerHTML = DRINK_SIZES.map(value =>
      `<option value="${value}">${value.toLocaleString("it-IT", { maximumFractionDigits: 2 })} L</option>`
    ).join("");
    addSingleLitersSelect.value = "0.33";
  }

  if (addSnackGramsSelect) {
    addSnackGramsSelect.innerHTML = SNACK_SIZES.map(value =>
      `<option value="${value}">${value} g</option>`
    ).join("");
    addSnackGramsSelect.value = "50";
  }
}

function renderIconSuggestions() {
  if (!iconSuggestions) return;
  const category = categoriaSelect?.value || "bevanda";
  iconSuggestions.innerHTML = ICONS[category].map(icon =>
    `<option value="${icon}">${icon}</option>`
  ).join("");

  iconSuggestions.onchange = () => {
    if (iconInput) iconInput.value = iconSuggestions.value;
  };

  if (iconInput && !iconInput.value) iconInput.value = iconSuggestions.value;
}

function updateAddFormVisibility() {
  const category = categoriaSelect?.value || "bevanda";
  const groupLitri = document.getElementById("group-litri");
  const groupGrammi = document.getElementById("group-grammi");
  groupLitri?.classList.toggle("hidden", category === "snack");
  groupGrammi?.classList.toggle("hidden", category !== "snack");
  renderIconSuggestions();
  updateAddPreview();
}

function updateAddPreview() {
  if (!addFormatPreview || !addQuantityInput) return;
  const quantity = Math.max(0, Number(addQuantityInput.value) || 0);
  const category = categoriaSelect?.value || "bevanda";

  if (category === "snack") {
    const grams = Number(addSnackGramsSelect?.value) || 50;
    addFormatPreview.textContent = `${quantity} pezzi × ${grams} g = ${(quantity * grams).toLocaleString("it-IT")} g totali`;
  } else {
    const liters = Number(addSingleLitersSelect?.value) || 0.33;
    const total = Math.min(MAX_LITERS, quantity * liters);
    addFormatPreview.textContent = `${quantity} bottiglie × ${liters.toLocaleString("it-IT", { maximumFractionDigits: 2 })} L = ${total.toFixed(2)} L nel frigo`;
  }
}

async function addArticle(event) {
  event.preventDefault();
  if (!currentUser) return;

  const category = categoriaSelect?.value || "bevanda";
  const nome = document.getElementById("nome")?.value.trim() || "";
  const icona = iconInput?.value.trim() || ICONS[category][0];
  const quantity = Math.max(0, Number(addQuantityInput?.value) || 0);

  if (!nome) return;

  try {
    if (category === "snack") {
      const grams = Math.max(1, Number(addSnackGramsSelect?.value) || 50);
      await saveSnack({ Nome: nome, Tipo: "Snack", Icona: icona, Quantita: quantity, grammiquantita: grams });
      adminMessage.textContent = "Snack aggiunto con successo!";
    } else if (category === "stock") {
      const liters = Number(addSingleLitersSelect?.value) || 0.33;
      await saveStock({ Nome: nome, Tipo: "Stock", Icona: icona, Quantita: quantity, LitriUnita: liters });
      adminMessage.textContent = "Articolo aggiunto allo stock!";
    } else {
      const liters = Number(addSingleLitersSelect?.value) || 0.33;
      await saveProduct({ Nome: nome, Tipo: "Bevanda", Icona: icona, Quantita: quantity, LitriUnita: liters });
      adminMessage.textContent = "Bevanda aggiunta al frigo!";
    }

    adminForm.reset();
    categoriaSelect.value = "bevanda";
    addQuantityInput.value = "1";
    populateSizeOptions();
    updateAddFormVisibility();
    await refreshInventory();
    closeAddModalHandler();
  } catch (error) {
    console.error(error);
    adminMessage.textContent = "Salvataggio non riuscito.";
  }
}

function syncAdminUI() {
  const isAdmin = currentUser !== null;
  openAddModalButton?.classList.toggle("hidden", !isAdmin);
  if (!isAdmin) closeAddModalHandler();

  if (adminLink) {
    adminLink.textContent = isAdmin ? "🔓" : "🔐";
    adminLink.title = isAdmin ? "Logout admin" : "Area admin";
  }
}

function openAddModalHandler() {
  if (!currentUser || !addModal) return;

  adminMessage.textContent = "";
  adminForm?.reset();
  if (categoriaSelect) categoriaSelect.value = "bevanda";
  if (addQuantityInput) addQuantityInput.value = "1";
  populateSizeOptions();
  updateAddFormVisibility();
  addModal.classList.remove("hidden");
}

function closeAddModalHandler() {
  addModal?.classList.add("hidden");
}

function setupInventoryTabs() {
  inventoryTabs?.forEach(tab => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;
      inventoryTabs.forEach(item => {
        const active = item === tab;
        item.classList.toggle("active", active);
        item.setAttribute("aria-selected", active ? "true" : "false");
      });

      inventoryViews?.forEach(view => {
        view.classList.toggle("active", view.dataset.view === target);
      });
    });
  });
}

async function handleAdminLinkClick(event) {
  if (!currentUser) return;
  event.preventDefault();
  await signOut(auth);
  currentUser = null;
  syncAdminUI();
}

function findItem(id, kind) {
  if (kind === "drink") return productsCache.find(item => item.id === id);
  if (kind === "stock") return stockCache.find(item => item.id === id);
  if (kind === "snack") return snackCache.find(item => item.id === id);
  return null;
}

function getKindLabel(kind) {
  return kind === "snack" ? "SNACK" : kind === "stock" ? "STOCK" : "BEVANDA";
}

function updateEditTotal() {
  if (!adminQuantityInput || !adminTotalInfo) return;
  const quantity = Math.max(0, Number(adminQuantityInput.value) || 0);
  const kind = adminProductKindInput?.value || "drink";
  const selected = findItem(adminProductIdInput?.value, kind);
  if (!selected) return;

  if (kind === "snack") {
    const grams = getSnackGrams(selected.data);
    adminTotalInfo.textContent = `Totale: ${(quantity * grams).toLocaleString("it-IT")} g`;
  } else {
    const liters = getBottleSize(selected.data);
    adminTotalInfo.textContent = `Totale: ${(quantity * liters).toFixed(2)} L`;
  }
}

function syncSelectedProductDetails() {
  const id = adminProductIdInput?.value;
  const kind = adminProductKindInput?.value || "drink";
  const selected = findItem(id, kind);
  if (!selected) return;

  const data = selected.data;
  const quantity = getBottleQuantity(data);
  const icon = getProductIcon(data);
  const name = getProductName(data, id);
  const type = kind === "snack" ? "Snack" : getProductType(data);

  adminProductSelect.textContent = name;
  adminProductType.textContent = type;
  adminProductIcon.textContent = icon;
  adminEditKind.textContent = getKindLabel(kind);
  adminQuantityInput.value = String(quantity);

  if (kind === "snack") {
    const grams = getSnackGrams(data);
    adminUnitInfo.textContent = `${grams} g`;
    adminTotalInfo.textContent = `Totale: ${(quantity * grams).toLocaleString("it-IT")} g`;
  } else {
    const liters = getBottleSize(data);
    adminUnitInfo.textContent = `${liters.toLocaleString("it-IT", { maximumFractionDigits: 2 })} L`;
    adminTotalInfo.textContent = `Totale: ${(quantity * liters).toFixed(2)} L`;
  }
}

function openEditModal(productId, kind) {
  if (!editModal || !currentUser) return;
  if (!findItem(productId, kind)) return;
  adminProductIdInput.value = productId;
  adminProductKindInput.value = kind;
  syncSelectedProductDetails();
  availabilityMessage.textContent = "";
  editModal.classList.remove("hidden");
}

function closeEditModalHandler() {
  editModal?.classList.add("hidden");
}

async function updateProductAvailability(event) {
  event.preventDefault();
  const id = adminProductIdInput?.value;
  const kind = adminProductKindInput?.value || "drink";
  const quantity = Math.max(0, Number(adminQuantityInput?.value) || 0);
  const selected = findItem(id, kind);

  if (!id || !selected) {
    availabilityMessage.textContent = "Articolo non trovato.";
    return;
  }

  try {
    if (kind === "snack") {
      await updateSnack(id, { Quantita: quantity });
    } else if (kind === "stock") {
      await updateStock(id, { Quantita: quantity });
    } else {
      await updateProduct(id, { Quantita: quantity });
    }

    availabilityMessage.textContent = "Quantità aggiornata.";
    closeEditModalHandler();
    await refreshInventory();
  } catch (error) {
    console.error(error);
    availabilityMessage.textContent = "Aggiornamento fallito.";
  }
}

async function deleteSelectedProduct() {
  const id = adminProductIdInput?.value;
  const kind = adminProductKindInput?.value || "drink";
  const selected = findItem(id, kind);
  if (!id || !selected) return;

  const name = getProductName(selected.data, id);
  if (!window.confirm(`Eliminare definitivamente ${name}?`)) return;

  try {
    if (kind === "snack") await deleteSnack(id);
    else if (kind === "stock") await deleteStock(id);
    else await deleteProduct(id);

    closeEditModalHandler();
    await refreshInventory();
  } catch (error) {
    console.error(error);
    availabilityMessage.textContent = "Eliminazione non riuscita.";
  }
}

let barcodeScanner = null;
let barcodeScannerRunning = false;
let barcodeScanHandled = false;

function resetBarcodeResult() {
  barcodeResult?.classList.add("hidden");
  barcodeRetryButton?.classList.add("hidden");
  if (barcodeResultCode) barcodeResultCode.textContent = "";
  if (barcodeResultFields) barcodeResultFields.innerHTML = "";
}

function formatBarcodeValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") {
    try { return JSON.stringify(value, null, 2); }
    catch { return String(value); }
  }
  return String(value);
}

function offImageUrl(product) {
  return product?.image_front_url || product?.image_url || "";
}

function nutritionValue(nutriments, key, unit) {
  const value = nutriments?.[`${key}_100g`];
  if (value === undefined || value === null || value === "") return "—";
  return `${value} ${unit}`;
}

function prettyList(value) {
  if (!value) return "—";
  if (Array.isArray(value)) {
    return value
      .map(item => String(item).replace(/^[a-z]{2,3}:/i, "").replace(/-/g, " "))
      .join(", ");
  }
  return String(value);
}

function renderOpenFoodFactsProduct(barcode, product) {
  if (!barcodeResult || !barcodeResultFields || !barcodeResultCode) return;

  barcodeResultCode.textContent = `EAN/UPC: ${barcode}`;

  const name = product?.product_name || "Prodotto senza nome";
  const brand = product?.brands || "—";
  const quantity = product?.quantity || "—";
  const category = product?.categories || prettyList(product?.categories_tags);
  const allergens = product?.allergens || prettyList(product?.allergens_tags);
  const nutriments = product?.nutriments || {};
  const image = offImageUrl(product);

  const greenScore = product?.environmental_score_grade
    ? String(product.environmental_score_grade).toUpperCase()
    : "—";

  const nutrition = [
    ["Energia", nutritionValue(nutriments, "energy-kcal", "kcal")],
    ["Grassi", nutritionValue(nutriments, "fat", "g")],
    ["di cui saturi", nutritionValue(nutriments, "saturated-fat", "g")],
    ["Carboidrati", nutritionValue(nutriments, "carbohydrates", "g")],
    ["di cui zuccheri", nutritionValue(nutriments, "sugars", "g")],
    ["Proteine", nutritionValue(nutriments, "proteins", "g")],
    ["Sale", nutritionValue(nutriments, "salt", "g")]
  ];

  barcodeResultFields.innerHTML = `
    <div class="off-product-head">
      ${image ? `<img class="off-product-image" src="${image}" alt="${name.replace(/"/g, '&quot;')}" loading="lazy">` : `<div class="off-product-image off-product-image-empty">🥤</div>`}
      <div class="off-product-main">
        <h3>${name}</h3>
        <div class="off-product-brand">${brand}</div>
        <div class="off-product-quantity">${quantity}</div>
      </div>
    </div>

    <div class="barcode-info-section">
      <h4>📦 Prodotto</h4>
      <div class="barcode-info-grid">
        <div><span>Categoria</span><strong>${formatBarcodeValue(category)}</strong></div>
        <div class="barcode-info-text"><strong>Allergeni:</strong> ${formatBarcodeValue(allergens)}</div>
        </div>
    </div>

    <div class="barcode-info-section">
      <h4>📊 Valori nutrizionali · per 100 g/ml</h4>
      <div class="off-nutrition-grid">
        ${nutrition.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("")}
      </div>
    </div>

    <div class="off-source">Dati: Open Food Facts · codice ${barcode}</div>
  `;

  barcodeResult.classList.remove("hidden");
}

async function lookupOpenFoodFacts(barcode) {
  // Open Food Facts API v3: è l'unico database interrogato in questa fase.
  const fields = [
    "code", "product_name", "brands", "quantity", "categories", "categories_tags",
    "countries", "countries_tags", "ingredients_text", "ingredients_text_it",
    "allergens", "allergens_tags", "nutriscore_grade", "nova_group",
    "environmental_score_grade", "nutriments", "image_front_url", "image_url"
  ].join(",");

  const url = `https://world.openfoodfacts.org/api/v3/product/${encodeURIComponent(barcode)}?fields=${encodeURIComponent(fields)}&lc=it&cc=it`;
  const response = await fetch(url, { headers: { "Accept": "application/json" } });

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Open Food Facts HTTP ${response.status}`);
  }

  const payload = await response.json();
  // v3 può restituire il prodotto anche quando il campo status non è
  // valorizzato come nella vecchia API v2. La presenza di `product` è
  // quindi il controllo principale.
  if (!payload?.product || typeof payload.product !== "object") return null;
  return payload.product;
}

async function lookupScannedBarcode(decodedText) {
  const barcode = String(decodedText || "").replace(/\D/g, "");
  if (!barcode) return;

  barcodeStatus.textContent = `Codice rilevato: ${barcode}. Cerco su Open Food Facts...`;
  resetBarcodeResult();

  try {
    const product = await lookupOpenFoodFacts(barcode);

    if (!product) {
      barcodeStatus.textContent = "Codice letto correttamente — prodotto non trovato.";
      barcodeResultCode.textContent = `EAN/UPC: ${barcode}`;
      barcodeResultFields.innerHTML = `
        <div class="barcode-empty barcode-not-found">
          <strong>Prodotto "${barcode}" non trovato.</strong>
          <div class="barcode-debug">
            <div><span>Codice letto</span><strong>${barcode}</strong></div>
            <div><span>Database</span><strong>Open Food Facts</strong></div>
            <div><span>Risultato</span><strong>Non presente</strong></div>
          </div>
        </div>`;
      barcodeResult.classList.remove("hidden");
      barcodeRetryButton?.classList.remove("hidden");
      return;
    }

    barcodeStatus.textContent = "Prodotto trovato su Open Food Facts.";
    renderOpenFoodFactsProduct(barcode, product);
    populateAddFormFromScannedProduct(product);
    closeBarcodeModalHandler();
    barcodeRetryButton?.classList.remove("hidden");
  } catch (error) {
    console.error("Errore ricerca Open Food Facts:", error);
    barcodeStatus.textContent = "Errore durante la richiesta a Open Food Facts.";
    barcodeResultCode.textContent = `EAN/UPC: ${barcode}`;
    barcodeResultFields.innerHTML = `
      <div class="barcode-empty">
        <strong>Errore nella richiesta.</strong>
        <div class="barcode-debug">
          <div><span>Codice letto</span><strong>${barcode}</strong></div>
          <div><span>Database</span><strong>Open Food Facts</strong></div>
          <div><span>Errore</span><strong>${String(error.message || error).replace(/</g, "&lt;")}</strong></div>
        </div>
      </div>`;
    barcodeResult.classList.remove("hidden");
    barcodeRetryButton?.classList.remove("hidden");
  }
}

async function stopBarcodeScanner() {
  if (!barcodeScanner) return;

  try {
    if (barcodeScannerRunning) {
      await barcodeScanner.stop();
      barcodeScannerRunning = false;
    }
    await barcodeScanner.clear();
  } catch (error) {
    console.warn("Chiusura scanner:", error);
  }

  barcodeScanner = null;
}

async function startBarcodeScanner() {
  if (!barcodeReader || !window.Html5Qrcode) {
    barcodeStatus.textContent = "Scanner non disponibile.";
    return;
  }

  await stopBarcodeScanner();
  resetBarcodeResult();
  barcodeScanHandled = false;
  barcodeStatus.textContent = "Richiesta accesso alla fotocamera...";

  barcodeScanner = new window.Html5Qrcode("barcode-reader");

  try {
    await barcodeScanner.start(
      { facingMode: { exact: "environment" } },
      {
        fps: 10,
        qrbox: { width: 280, height: 140 },
        aspectRatio: 1.777778
      },
      async (decodedText) => {
        if (barcodeScanHandled) return;
        barcodeScanHandled = true;

        await stopBarcodeScanner();
        await lookupScannedBarcode(decodedText);
      },
      () => {}
    );

    barcodeScannerRunning = true;
    barcodeStatus.textContent = "Inquadra il codice a barre davanti alla fotocamera.";
  } catch (firstError) {
    console.warn("Fotocamera posteriore non disponibile:", firstError);

    try {
      await stopBarcodeScanner();
      barcodeScanner = new window.Html5Qrcode("barcode-reader");

      await barcodeScanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 280, height: 140 },
          aspectRatio: 1.777778
        },
        async (decodedText) => {
          if (barcodeScanHandled) return;
          barcodeScanHandled = true;

          await stopBarcodeScanner();
          await lookupScannedBarcode(decodedText);
        },
        () => {}
      );

      barcodeScannerRunning = true;
      barcodeStatus.textContent = "Inquadra il codice a barre davanti alla fotocamera.";
    } catch (error) {
      console.error("Impossibile avviare la fotocamera:", error);
      barcodeStatus.textContent =
        "Impossibile aprire la fotocamera. Verifica i permessi del browser e che il sito sia in HTTPS.";
      barcodeRetryButton?.classList.remove("hidden");
    }
  }
}

function openBarcodeModalHandler() {
  if (!currentUser || !barcodeModal) return;
  barcodeModal.classList.remove("hidden");
  startBarcodeScanner();
}

async function closeBarcodeModalHandler() {
  await stopBarcodeScanner();
  barcodeModal?.classList.add("hidden");
}

function formatInfoValue(value) {
  if (value === null || value === undefined || value === "") return "Nessuna informazione";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") {
    const entries = Object.entries(value).map(([key, item]) => `${key}: ${formatInfoValue(item)}`);
    return entries.length ? entries.join("<br>") : "Nessuna informazione";
  }
  return String(value);
}

function inferProductCategoryFromScanner(product) {
  const source = `${product?.categories || ""} ${product?.product_name || ""} ${product?.brands || ""}`.toLowerCase();
  if (/(snack|chips|cracker|biscuit|cookie|cereal|barretta|nut|cracker|focaccia|frutta secca)/.test(source)) return "snack";
  return "bevanda";
}

function populateAddFormFromScannedProduct(product) {
  if (!adminForm || !categoriaSelect || !document.getElementById("nome")) return;

  const productName = String(product?.product_name || product?.product_name_en || "Prodotto senza nome").trim();
  const category = inferProductCategoryFromScanner(product);

  document.getElementById("nome").value = productName;
  categoriaSelect.value = category;
  if (iconInput) iconInput.value = "";
  if (addQuantityInput) addQuantityInput.value = "1";
  updateAddFormVisibility();
  adminMessage.textContent = `Prodotto trovato: ${productName}. I campi sono stati riempiti automaticamente.`;
}

function openProductInfo(productId, kind) {
  const item = findItem(productId, kind);
  if (!item || !productInfoModal || !productInfoContent || !productInfoTitle) return;

  const data = item.data || {};
  const name = getProductName(data, productId);
  const icon = getProductIcon(data);
  const type = kind === "snack" ? "Snack" : kind === "stock" ? "Stock" : getProductType(data);
  const allergeni = data.Allergeni ?? data.allergeni ?? data.Allergens ?? data.allergens ?? "Nessuna informazione";
  const ingredienti = data.Ingredienti ?? data.ingredienti ?? data.Ingredients ?? data.ingredients ?? "Nessuna informazione";
  const nutrizionali = data.ValoriNutrizionali ?? data.valoriNutrizionali ?? data.NutritionalValues ?? data.nutritionalValues ?? null;

  const nutritionItems = nutrizionali && typeof nutrizionali === "object"
    ? Object.entries(nutrizionali).map(([key, value]) => `<div><span>${key}</span><strong>${formatInfoValue(value)}</strong></div>`).join("")
    : "<div class=\"barcode-empty\"><strong>Nessuna informazione nutrizionale disponibile.</strong></div>";

  productInfoTitle.textContent = `${icon} ${name}`;
  productInfoContent.innerHTML = `
    <div class="off-product-head">
      <div class="off-product-image off-product-image-empty">${icon}</div>
      <div class="off-product-main">
        <h3>${name}</h3>
        <div class="off-product-brand">${type}</div>
      </div>
    </div>

    <div class="barcode-info-section">
      <h4>🥗 Ingredienti</h4>
      <div class="barcode-info-text">${formatInfoValue(ingredienti)}</div>
    </div>

    <div class="barcode-info-section">
      <h4>⚠️ Allergeni</h4>
      <div class="barcode-info-text">${formatInfoValue(allergeni)}</div>
    </div>

    <div class="barcode-info-section">
      <h4>📊 Valori nutrizionali</h4>
      <div class="off-nutrition-grid">${nutritionItems}</div>
    </div>
  `;

  productInfoModal.classList.remove("hidden");
}

function closeProductInfoModalHandler() {
  productInfoModal?.classList.add("hidden");
}

function setupPhotoButton() {
  photoButton?.addEventListener("click", openBarcodeModalHandler);

  // Manteniamo l'input foto come fallback per dispositivi/browser che non supportano
  // la fotocamera tramite getUserMedia.
  photoInput?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    adminMessage.textContent = `Foto selezionata: ${file.name}`;
  });

  closeBarcodeModal?.addEventListener("click", closeBarcodeModalHandler);
  barcodeModal?.addEventListener("click", event => {
    if (event.target === barcodeModal) closeBarcodeModalHandler();
  });

  closeProductInfoModal?.addEventListener("click", closeProductInfoModalHandler);
  productInfoModal?.addEventListener("click", event => {
    if (event.target === productInfoModal) closeProductInfoModalHandler();
  });

  barcodeRetryButton?.addEventListener("click", startBarcodeScanner);
}

function setupQuantityButtons() {
  document.querySelectorAll(".quantity-button").forEach(button => {
    button.addEventListener("click", () => {
      const target = document.getElementById(button.dataset.target);
      if (!target) return;
      const step = Number(button.dataset.step) || 0;
      const min = Number(target.min) || 0;
      const max = Number(target.max) || 99;
      const current = Number(target.value) || 0;
      target.value = String(Math.max(min, Math.min(max, current + step)));
      target.dispatchEvent(new Event("input", { bubbles: true }));
    });
  });
}

function setupGridClickListener(gridElement) {
  if (!gridElement) return;
  gridElement.addEventListener("click", event => {
    const infoButton = event.target.closest(".card-info-button");
    if (infoButton) {
      event.stopPropagation();
      const id = infoButton.dataset.docId;
      const kind = infoButton.dataset.kind || "drink";
      if (id) openProductInfo(id, kind);
      return;
    }

    const card = event.target.closest(".card");
    if (!card) return;
    const id = card.dataset.docId;
    const kind = card.dataset.kind || "drink";
    if (id) openEditModal(id, kind);
  });
}

function updateOnlineStatus(isOnline) {
  if (!onlineStatus) return;
  if (footerOnlineStatus) footerOnlineStatus.textContent = isOnline ? " Operativo" : " Offline";
  onlineStatus.textContent = isOnline ? "● ONLINE" : "● OFFLINE";
  onlineStatus.style.color = isOnline ? "#43e28a" : "#ff7488";
}

function grantAccess() {
  storeChoice("yes");
  ageGate?.classList.add("hidden");
  siteShell?.classList.remove("hidden");
  syncAdminUI();
  refreshInventory();
}

function denyAccess() {
  storeChoice("no");
  window.location.href = ADULT_REDIRECT_URL;
}

function initAgeGate() {
  const storedChoice = readStoredChoice();
  syncAdminUI();

  if (storedChoice === "yes") {
    ageGate?.classList.add("hidden");
    siteShell?.classList.remove("hidden");
    refreshInventory();
    return;
  }
  if (storedChoice === "no") {
    window.location.href = ADULT_REDIRECT_URL;
    return;
  }
  document.querySelectorAll("[data-age]").forEach(button => {
    button.addEventListener("click", () => button.dataset.age === "yes" ? grantAccess() : denyAccess());
  });
}

categoriaSelect?.addEventListener("change", updateAddFormVisibility);
addQuantityInput?.addEventListener("input", updateAddPreview);
addSingleLitersSelect?.addEventListener("change", updateAddPreview);
addSnackGramsSelect?.addEventListener("change", updateAddPreview);
adminQuantityInput?.addEventListener("input", updateEditTotal);
adminForm?.addEventListener("submit", addArticle);
availabilityForm?.addEventListener("submit", updateProductAvailability);
deleteProductButton?.addEventListener("click", deleteSelectedProduct);
adminLink?.addEventListener("click", handleAdminLinkClick);
openAddModalButton?.addEventListener("click", openAddModalHandler);
closeAddModal?.addEventListener("click", closeAddModalHandler);
addModal?.addEventListener("click", event => {
  if (event.target === addModal) closeAddModalHandler();
});
closeEditModal?.addEventListener("click", closeEditModalHandler);
editModal?.addEventListener("click", event => {
  if (event.target === editModal) closeEditModalHandler();
});
window.addEventListener("online", () => updateOnlineStatus(true));
window.addEventListener("offline", () => updateOnlineStatus(false));

setupPhotoButton();
setupQuantityButtons();
setupInventoryTabs();
populateSizeOptions();
updateAddFormVisibility();
setupGridClickListener(drinkGrid);
setupGridClickListener(stockGrid);
setupGridClickListener(snackGrid);
initAgeGate();
