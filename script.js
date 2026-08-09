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
  updateLabel, onlineStatus, footerOnlineStatus, adminForm, adminMessage,
  adminPanel, adminLink, categoriaSelect, iconSuggestions, iconInput,
  addQuantityInput, addSingleLitersSelect, addSnackGramsSelect, addFormatPreview,
  editModal, closeEditModal, availabilityForm, availabilityMessage,
  adminProductIdInput, adminProductKindInput, adminProductSelect, adminProductType,
  adminProductIcon, adminEditKind, deleteProductButton, adminQuantityInput,
  adminUnitInfo, adminTotalInfo
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

const ICONS = {
  bevanda: ["🥤", "🥤", "🥛", "🧃", "🍺", "🍷", "🥂", "☕", "🧋", "💧"],
  stock: ["🥤", "🥤", "🥛", "🧃", "🍺", "🍷", "🥂", "☕", "🧋", "💧"],
  snack: ["🍟", "🍿", "🥨", "🍪", "🍫", "🍬", "🥜", "🥟"]
};

const DRINK_SIZES = [0.25, 0.33, 0.50, 0.75, 1, 1.5, 2];
const SNACK_SIZES = [75, 100, 125, 150, 200, 250,500];

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
  iconSuggestions.innerHTML = ICONS[category].map((icon, index) =>
    `<button type="button" class="icon-suggestion${index === 0 ? " selected" : ""}" data-icon="${icon}">${icon}</button>`
  ).join("");

  iconSuggestions.querySelectorAll(".icon-suggestion").forEach(button => {
    button.addEventListener("click", () => {
      iconSuggestions.querySelectorAll(".icon-suggestion").forEach(item => item.classList.remove("selected"));
      button.classList.add("selected");
      if (iconInput) iconInput.value = button.dataset.icon || "";
    });
  });

  if (iconInput && !iconInput.value) iconInput.value = ICONS[category][0];
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
  } catch (error) {
    console.error(error);
    adminMessage.textContent = "Salvataggio non riuscito.";
  }
}

function syncAdminUI() {
  const isAdmin = currentUser !== null;
  adminPanel?.classList.toggle("hidden", !isAdmin);
  if (adminLink) {
    adminLink.textContent = isAdmin ? "🔓" : "🔐";
    adminLink.title = isAdmin ? "Logout admin" : "Area admin";
  }
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
  sessionStorage.setItem(ADULT_STORAGE_KEY, "yes");
  ageGate?.classList.add("hidden");
  siteShell?.classList.remove("hidden");
  syncAdminUI();
  refreshInventory();
}

function denyAccess() {
  sessionStorage.setItem(ADULT_STORAGE_KEY, "no");
  window.location.href = ADULT_REDIRECT_URL;
}

function initAgeGate() {
  const storedChoice = sessionStorage.getItem(ADULT_STORAGE_KEY);
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
closeEditModal?.addEventListener("click", closeEditModalHandler);
editModal?.addEventListener("click", event => {
  if (event.target === editModal) closeEditModalHandler();
});
window.addEventListener("online", () => updateOnlineStatus(true));
window.addEventListener("offline", () => updateOnlineStatus(false));

setupQuantityButtons();
populateSizeOptions();
updateAddFormVisibility();
setupGridClickListener(drinkGrid);
setupGridClickListener(stockGrid);
setupGridClickListener(snackGrid);
initAgeGate();
