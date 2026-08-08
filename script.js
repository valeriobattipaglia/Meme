import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  renderCard,
  getBottleQuantity,
  getBottleSize,
  getProductName,
  MAX_LITERS
} from "./js/render.js";

const ADULT_REDIRECT_URL = "https://www.youtube.com/watch?v=cGUTvXkMcT8";
const ADULT_STORAGE_KEY = "minifrigo_adult_confirmed";

import {
  siteShell,
  ageGate,
  drinkGrid,
  stockGrid,
  snackGrid,
  beverageCount,
  updateLabel,
  onlineStatus,
  footerOnlineStatus,
  adminForm,
  adminMessage,
  adminPanel,
  adminLink,
  editModal,
  closeEditModal,
  availabilityForm,
  availabilityMessage,
  adminProductSelect,
  adminProductIdInput,
  deleteProductButton,
  adminQuantityInput,
  adminSingleLitersInput,
  adminTotalLitersInput,
  addPreviewLitersInput,
  addQuantityInput,
  addSingleLitersSelect
} from "./js/dom.js";

import {
  loadProducts,
  loadStock,
  loadSnack,
  saveProduct,
  saveStock,
  saveSnack,
  updateProduct,
  deleteProduct,
  productsCache,
  stockCache,
  snackCache,
  countBottles
} from "./js/firestore.js";

let currentUser = null;

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  syncAdminUI();
});

function setUpdateTimestamp() {
  if (!updateLabel) return;
  const now = new Date();
  updateLabel.innerHTML = `Ultimo aggiornamento<br>${now.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  })}`;
}

// Renderizza ogni griglia fornendo la categoria esplicita
function renderInventory() {
  if (drinkGrid) drinkGrid.innerHTML = productsCache.map((item) => renderCard(item, "drink")).join("");
  if (stockGrid) stockGrid.innerHTML = stockCache.map((item) => renderCard(item, "stock")).join("");
  if (snackGrid) snackGrid.innerHTML = snackCache.map((item) => renderCard(item, "snack")).join("");

  if (beverageCount) beverageCount.textContent = String(countBottles());
  setUpdateTimestamp();
  updateOnlineStatus(navigator.onLine);
}
// LOGICA FORM ADMIN DINAMICO
const categoriaSelect = document.getElementById("categoria");
const groupLitri = document.getElementById("group-litri");
const groupGrammi = document.getElementById("group-grammi");

if (categoriaSelect) {
  categoriaSelect.addEventListener("change", () => {
    const val = categoriaSelect.value;
    if (val === "snack") {
      if (groupLitri) groupLitri.classList.add("hidden");
      if (groupGrammi) groupGrammi.classList.remove("hidden");
    } else {
      if (groupLitri) groupLitri.classList.remove("hidden");
      if (groupGrammi) groupGrammi.classList.add("hidden");
    }
  });
}

if (adminForm) {
  adminForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const categoria = categoriaSelect?.value || "bevanda";
    const nome = document.getElementById("nome")?.value.trim() || "";
    const icona = document.getElementById("icona")?.value || (categoria === "snack" ? "🍿" : "🥤");
    const quantita = Math.max(0, Number(document.getElementById("quantita")?.value) || 0);

    try {
      if (categoria === "snack") {
        const grammi = Math.max(0, Number(document.getElementById("grammiquantita")?.value) || 0);
        await saveSnack({
          Nome: nome,
          Tipo: "Snack",
          Icona: icona,
          Quantita: quantita,
          grammiquantita: grammi
        });
        if (adminMessage) adminMessage.textContent = "Snack salvato con successo!";
      } else if (categoria === "stock") {
        const litriUnita = Math.max(0.05, Number(document.getElementById("litri-unita")?.value) || 0.33);
        await saveStock({
          Nome: nome,
          Tipo: "Stock",
          Icona: icona,
          Quantita: quantita,
          LitriUnita: litriUnita
        });
        if (adminMessage) adminMessage.textContent = "Stock salvato con successo!";
      } else {
        const litriUnita = Math.max(0.05, Number(document.getElementById("litri-unita")?.value) || 0.33);
        await saveProduct({
          Nome: nome,
          Tipo: "Bevanda",
          Icona: icona,
          Quantita: quantita,
          LitriUnita: litriUnita
        });
        if (adminMessage) adminMessage.textContent = "Bevanda salvata con successo!";
      }

      adminForm.reset();
      // Ripristina la visibilità dei campi al default
      if (groupLitri) groupLitri.classList.remove("hidden");
      if (groupGrammi) groupGrammi.classList.add("hidden");

      await refreshInventory();
    } catch (error) {
      console.error(error);
      if (adminMessage) adminMessage.textContent = "Errore durante il salvataggio.";
    }
  });
}
// Carica in parallelo i dati dal DB e aggiorna l'interfaccia
async function refreshInventory() {
  try {
    await Promise.all([
      loadProducts(),
      loadStock(),
      loadSnack()
    ]);
    renderInventory();
  } catch (error) {
    console.error(error);
    if (availabilityMessage) availabilityMessage.textContent = "Impossibile caricare il frigo.";
  }
}

function syncAdminUI() {
  const isAdmin = currentUser !== null;

  if (adminPanel) {
    adminPanel.classList.toggle("hidden", !isAdmin);
  }

  if (adminLink) {
    adminLink.textContent = isAdmin ? "🔓" : "🔐";
    adminLink.title = isAdmin ? "Logout admin" : "Area admin";
  }
}

async function handleAdminLinkClick(event) {
  if (currentUser) {
    event.preventDefault();
    await signOut(auth);
    currentUser = null;
    syncAdminUI();

    if (availabilityMessage) {
      availabilityMessage.textContent = "Logout eseguito.";
    }
  }
}

function updateAddPreview() {
  if (!addPreviewLitersInput || !addQuantityInput || !addSingleLitersSelect) {
    return;
  }

  const quantity = Math.max(0, Number(addQuantityInput.value) || 0);
  const bottleSize = Math.max(0, Number(addSingleLitersSelect.value) || 0);
  const total = Math.min(MAX_LITERS, quantity * bottleSize);
  addPreviewLitersInput.value = `${total.toFixed(2)} L`;
}

// Cerca un prodotto partendo dall'ID dentro tutti i tre cache
function findItemById(id) {
  return productsCache.find((item) => item.id === id) ||
         stockCache.find((item) => item.id === id) ||
         snackCache.find((item) => item.id === id);
}

function syncSelectedProductDetails() {
  if ((!adminProductSelect && !adminProductIdInput) || !adminQuantityInput || !adminSingleLitersInput || !adminTotalLitersInput) {
    return;
  }

  const selectedId = adminProductIdInput?.value || adminProductSelect?.value;
  const selected = findItemById(selectedId);
  if (!selected) {
    return;
  }

  const data = selected.data;
  const quantity = getBottleQuantity(data);
  const bottleSize = getBottleSize(data);
  const totalLiters = Math.min(MAX_LITERS, quantity * bottleSize);

  if (adminProductSelect) {
    adminProductSelect.value = getProductName(data, selected.id);
  }
  if (adminProductIdInput) {
    adminProductIdInput.value = selected.id;
  }
  adminQuantityInput.value = String(quantity);
  adminSingleLitersInput.value = `${bottleSize.toFixed(2)} L`;
  adminTotalLitersInput.value = `${totalLiters.toFixed(2)} L`;
}

function openEditModal(productId) {
  if (!editModal || !adminProductIdInput) {
    return;
  }

  if (!currentUser) {
    window.location.href = "admin.html";
    return;
  }
  adminProductIdInput.value = productId;
  syncSelectedProductDetails();
  editModal.classList.remove("hidden");
}

async function deleteSelectedProduct() {
  const productId = adminProductIdInput?.value;

  if (!productId) {
    return;
  }

  const selected = findItemById(productId);
  const productName = selected
    ? getProductName(selected.data, productId)
    : "questo articolo";

  const confirmed = window.confirm(
    `Eliminare definitivamente ${productName}?`
  );

  if (!confirmed) {
    return;
  }

  try {
    await deleteProduct(productId);

    if (availabilityMessage) {
      availabilityMessage.textContent = `Articolo eliminato: ${productName}`;
    }

    closeEditModalHandler();
    await refreshInventory();
  } catch (error) {
    console.error(error);
    if (availabilityMessage) {
      availabilityMessage.textContent = "Eliminazione non riuscita.";
    }
  }
}

function closeEditModalHandler() {
  if (editModal) {
    editModal.classList.add("hidden");
  }
}

async function updateProductAvailability(event) {
  event.preventDefault();
  const productId = adminProductIdInput?.value;
  const quantity = Math.max(0, Number(adminQuantityInput.value) || 0);

  if (!productId) {
    availabilityMessage.textContent = "Seleziona un articolo.";
    return;
  }

  try {
    const selected = findItemById(productId);
    const bottleSize = getBottleSize(selected ? selected.data : {});
    await updateProduct(productId, { Quantita: quantity, LitriUnita: bottleSize });

    availabilityMessage.textContent = "Disponibilità aggiornata.";
    closeEditModalHandler();
    
    // Ricarica e ridisegna la UI
    await refreshInventory();
  } catch (error) {
    console.error(error);
    availabilityMessage.textContent = "Aggiornamento fallito.";
  }
}

function grantAccess() {
  sessionStorage.setItem(ADULT_STORAGE_KEY, "yes");
  if (ageGate) ageGate.classList.add("hidden");
  if (siteShell) siteShell.classList.remove("hidden");
  syncAdminUI();
  refreshInventory();
}

function denyAccess() {
  sessionStorage.setItem(ADULT_STORAGE_KEY, "no");
  window.location.href = ADULT_REDIRECT_URL;
}

function updateOnlineStatus(isOnline) {
  if (!onlineStatus) {
    return;
  }
  if (footerOnlineStatus) footerOnlineStatus.textContent = isOnline ? " Operativo" : " Offline";
  onlineStatus.textContent = isOnline ? "● ONLINE" : "● OFFLINE";
  onlineStatus.style.color = isOnline ? "#43e28a" : "#ff7488";
}

function initAgeGate() {
  const storedChoice = sessionStorage.getItem(ADULT_STORAGE_KEY);
  syncAdminUI();

  if (storedChoice === "yes") {
    if (ageGate) ageGate.classList.add("hidden");
    if (siteShell) siteShell.classList.remove("hidden");
    refreshInventory();
    return;
  }

  if (storedChoice === "no") {
    window.location.href = ADULT_REDIRECT_URL;
    return;
  }

  document.querySelectorAll("[data-age]").forEach((button) => {
    button.addEventListener("click", () => {
      const answer = button.dataset.age;
      if (answer === "yes") {
        grantAccess();
      } else {
        denyAccess();
      }
    });
  });
}

// Event Listeners Form & Input
if (adminForm) {
  adminForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const nome = document.getElementById("nome")?.value.trim() || "";
    const tipo = document.getElementById("tipo")?.value || "Bevanda";
    const icona = document.getElementById("icona")?.value || "🥤";
    const quantita = Math.max(0, Number(document.getElementById("quantita")?.value) || 0);
    const litriUnita = Math.max(0.33, Number(document.getElementById("litri-unita")?.value) || 0.33);

    try {
      await saveProduct({ Nome: nome, Tipo: tipo, Icona: icona, Quantita: quantita, LitriUnita: litriUnita });
      if (adminMessage) adminMessage.textContent = "Articolo salvato su Firebase.";
      adminForm.reset();
      updateAddPreview();
      await refreshInventory();
    } catch (error) {
      console.error(error);
      if (adminMessage) adminMessage.textContent = "Salvataggio non riuscito.";
    }
  });
}

if (availabilityForm) {
  availabilityForm.addEventListener("submit", updateProductAvailability);
}

if (adminProductSelect && adminProductSelect.tagName === "SELECT") {
  adminProductSelect.addEventListener("change", syncSelectedProductDetails);
}

if (deleteProductButton) {
  deleteProductButton.addEventListener("click", deleteSelectedProduct);
}

document.querySelectorAll(".stepper-button").forEach((button) => {
  button.addEventListener("click", (event) => {
    const step = Number(event.currentTarget.dataset.step) || 0;
    const targetId = event.currentTarget.dataset.target;
    const target = document.getElementById(targetId);
    if (!target || target.type !== "number") {
      return;
    }
    const min = Number(target.min) || 0;
    const max = Number(target.max) || Infinity;
    const value = Math.max(min, Math.min(max, Number(target.value) + step));
    target.value = value;
    target.dispatchEvent(new Event("input", { bubbles: true }));
  });
});

if (addQuantityInput && addSingleLitersSelect) {
  addQuantityInput.addEventListener("input", updateAddPreview);
  addSingleLitersSelect.addEventListener("change", updateAddPreview);
}

if (adminLink) {
  adminLink.addEventListener("click", handleAdminLinkClick);
}

if (closeEditModal) {
  closeEditModal.addEventListener("click", closeEditModalHandler);
}

if (editModal) {
  editModal.addEventListener("click", (event) => {
    if (event.target === editModal) {
      closeEditModalHandler();
    }
  });
}

// Gestore Unificato Click sulle Card per la modifica
function setupGridClickListener(gridElement) {
  if (!gridElement) return;
  gridElement.addEventListener("click", (event) => {
    const card = event.target.closest(".card");
    if (!card) return;

    const selectedId = card.dataset.docId;
    if (selectedId) {
      openEditModal(selectedId);
    }
  });
}

setupGridClickListener(drinkGrid);
setupGridClickListener(stockGrid);
setupGridClickListener(snackGrid);

// Monitor dello stato di rete
window.addEventListener("online", () => updateOnlineStatus(true));
window.addEventListener("offline", () => updateOnlineStatus(false));

initAgeGate();