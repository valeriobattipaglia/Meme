import { initializeApp } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";


import { 
getFirestore,
collection,
getDocs,
addDoc,
doc,
updateDoc,
deleteDoc
} 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


import {
getAuth,
onAuthStateChanged,
signOut
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
const firebaseConfig = {
  apiKey: "AIzaSyAkHOF2S_NRreXMHU1yDpc6o11r1wpxj9g",
  authDomain: "minifrigo-673a5.firebaseapp.com",
  projectId: "minifrigo-673a5",
  storageBucket: "minifrigo-673a5.firebasestorage.app",
  messagingSenderId: "346725946911",
  appId: "1:346725946911:web:94d4bda49c1760c315e72a",
  measurementId: "G-SQBNJC1PNB"
};
const ADULT_REDIRECT_URL = "https://www.youtube.com/watch?v=cGUTvXkMcT8";
const ADULT_STORAGE_KEY = "minifrigo_adult_confirmed";
const MAX_LITERS = 4;
const siteShell = document.getElementById("site-shell");
const ageGate = document.getElementById("age-gate");
const drinkGrid = document.getElementById("drink-grid");
const snackGrid = document.getElementById("snack-grid");
const beverageCount = document.getElementById("beverage-count");
const updateLabel = document.getElementById("last-update");
const onlineStatus = document.getElementById("online-status");
const footerOnlineStatus = document.getElementById("footer-online-status");
const adminForm = document.getElementById("admin-form");
const snackForm = document.getElementById("snack-form");
const adminMessage = document.getElementById("admin-message");
const snackMessage = document.getElementById("snack-message");
const adminPanel = document.getElementById("admin-panel");
const adminLink = document.querySelector(".admin-link");
const editModal = document.getElementById("edit-modal");
const closeEditModal = document.getElementById("close-edit-modal");
const availabilityForm = document.getElementById("availability-form");
const availabilityMessage = document.getElementById("availability-message");
const adminProductSelect = document.getElementById("admin-product");
const adminProductIdInput = document.getElementById("admin-product-id");
const deleteProductButton = document.getElementById("delete-product-button");
const adminQuantityInput = document.getElementById("admin-quantita");
const adminSingleLitersInput = document.getElementById("admin-litri-unita");
const adminTotalLitersInput = document.getElementById("admin-litri-totali");
const addPreviewLitersInput = document.getElementById("add-preview-litri");
const addQuantityInput = document.getElementById("quantita");
const addSingleLitersSelect = document.getElementById("litri-unita");
let productsCache = [];
let snacksCache = [];

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
let currentUser = null;

onAuthStateChanged(auth,(user)=>{
    currentUser=user;
    syncAdminUI();
});
function getProductName(data, docId) {
  return data.Nome || data.nome || data.name || docId;
}

function getProductType(data) {
  return data.Tipo || data.tipo || data.Categoria || data.categoria || data.category || "Bevanda";
}

function getProductIcon(data) {
  return data.Icona || data.icona || data.emoji || data.immagine || "🥤";
}

function getBottleQuantity(data) {
  const possibleKeys = ["Quantita", "quantita", "Bottiglie", "bottiglie", "Disponibilita", "disponibilita", "Stock", "stock"];
  for (const key of possibleKeys) {
    const value = Number(data[key]);
    if (!Number.isNaN(value)) {
      return Math.max(0, value);
    }
  }
  return 0;
}

function getBottleSize(data) {
  const possibleKeys = ["LitriUnita", "litriUnita", "LitroUnita", "litroUnita", "LitriSingola", "litriSingola", "SingleLitri", "singleLitri"];
  for (const key of possibleKeys) {
    const value = Number(data[key]);
    if (!Number.isNaN(value)) {
      return Math.max(0.33, Math.min(2, value));
    }
  }

  const totalLiters = Number(data.Litri || data.litri || data.Litro || data.litro);
  const quantity = getBottleQuantity(data);
  if (!Number.isNaN(totalLiters) && quantity > 0) {
    return totalLiters / quantity;
  }

  return 0.33;
}

function getAvailableLiters(data) {
  const quantity = getBottleQuantity(data);
  const bottleSize = getBottleSize(data);
  const total = quantity * bottleSize;
  return Math.max(0, Math.min(MAX_LITERS, total));
}

function getStockPercent(data) {
  const liters = getAvailableLiters(data);
  return Math.round((liters / MAX_LITERS) * 100);
}

function getStockLabel(percent) {
  if (percent >= 75) return "Scorta ottima";
  if (percent >= 50) return "Buona disponibilità";
  if (percent >= 25) return "Scorta media";
  return "Poche unità";
}

function renderCard(doc) {
  const data = typeof doc.data === "function" ? doc.data() : doc.data;
  const productId = doc.id || doc.docId;
  const productName = getProductName(data, productId);
  const productType = getProductType(data);
  const icon = getProductIcon(data);
  const percent = getStockPercent(data);
  const liters = getAvailableLiters(data);
  const quantity = getBottleQuantity(data);
  const unitLiters = getBottleSize(data);

  return `
    <article class="card" data-doc-id="${productId}">
      <div class="product-image">${icon}</div>
      <div class="name">${productName}</div>
      <div class="type">${productType}</div>
      <div class="stock">
        <div class="stock-label">Disponibilità in litri</div>
        <div class="bar">
          <div class="fill" style="width:${percent}%"></div>
        </div>
        <div class="amount">${quantity} bottiglie • ${unitLiters.toFixed(2)} L ciascuna • ${liters.toFixed(2)} L totali • ${getStockLabel(percent)}</div>
      </div>
    </article>
  `;
}

function getSnackName(data, docId) {
  return data.Nome || data.nome || data.name || docId;
}

function getSnackBagCount(data) {
  const possibleKeys = ["NumeroBuste", "numeroBuste", "Buste", "buste", "Confezioni", "confezioni"];
  for (const key of possibleKeys) {
    const value = Number(data[key]);
    if (!Number.isNaN(value)) {
      return Math.max(0, value);
    }
  }
  return 0;
}

function getSnackQuantityPerBag(data) {
  const possibleKeys = ["QuantitaBusta", "quantitaBusta", "QuantitaPerBusta", "quantitaPerBusta", "Quantita", "quantita"];
  for (const key of possibleKeys) {
    const value = Number(data[key]);
    if (!Number.isNaN(value)) {
      return Math.max(0, value);
    }
  }
  return 0;
}

function renderSnackCard(doc) {
  const data = typeof doc.data === "function" ? doc.data() : doc.data;
  const snackId = doc.id || doc.docId;
  const snackName = getSnackName(data, snackId);
  const bagCount = getSnackBagCount(data);
  const quantityPerBag = getSnackQuantityPerBag(data);

  return `
    <article class="card snack-card" data-doc-id="${snackId}" data-kind="snack">
      <div class="product-image">🥨</div>
      <div class="name">${snackName}</div>
      <div class="type">Snack</div>
      <div class="stock">
        <div class="stock-label">Disponibilità</div>
        <div class="amount">${bagCount} buste • ${quantityPerBag} pezzi per busta</div>
      </div>
    </article>
  `;
}

function setUpdateTimestamp() {
  const now = new Date();
  updateLabel.innerHTML = `Ultimo aggiornamento<br>${now.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  })}`;
}

function syncAdminUI(){

    const isAdmin = currentUser !== null;

    if(adminPanel){

        adminPanel.classList.toggle("hidden",!isAdmin);
    }

    if(adminLink){
        adminLink.textContent =isAdmin ? "🔓" : "🔐";
        adminLink.title =isAdmin? "Logout admin": "Area admin";
    }
}

async function handleAdminLinkClick(event) {

    if(currentUser){

        event.preventDefault();

        await signOut(auth);

        currentUser = null;

        syncAdminUI();

        if(availabilityMessage){
            availabilityMessage.textContent =
            "Logout eseguito.";
        }

    }

}

async function loadProducts() {
  try {
    const beverageSnapshot = await getDocs(collection(db, "Prodotti"));
    const snackSnapshot = await getDocs(collection(db, "Snack"));

    productsCache = beverageSnapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
    snacksCache = snackSnapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() }));

    const numeroBottiglie = productsCache.reduce((totale, prodotto) => {
      return totale + getBottleQuantity(prodotto.data);
    }, 0);

    const items = beverageSnapshot.docs.map((doc) => renderCard(doc)).join("");
    const snackItems = snackSnapshot.docs.map((doc) => renderSnackCard(doc)).join("");

    if (drinkGrid) {
      drinkGrid.innerHTML = items || `<div class="card"><div class="name">Nessuna bevanda</div><div class="type">Aggiungi una nuova voce dal pannello admin.</div></div>`;
    }

    if (snackGrid) {
      snackGrid.innerHTML = snackItems || `<div class="card"><div class="name">Nessuno snack</div><div class="type">Aggiungi uno snack dal pannello admin.</div></div>`;
    }

    beverageCount.textContent = String(numeroBottiglie);
    setUpdateTimestamp();
    updateOnlineStatus(true);

    if (adminProductSelect) {
      adminProductSelect.value = "";
    }
  } catch (firebaseError) {
    console.error("Errore caricamento Firestore:", firebaseError);
    if (drinkGrid) {
      drinkGrid.innerHTML = `<div class="card"><div class="name">Errore caricamento</div><div class="type">Impossibile leggere il database Firestore.</div></div>`;
    }
    if (snackGrid) {
      snackGrid.innerHTML = `<div class="card"><div class="name">Errore caricamento</div><div class="type">Impossibile leggere il database snack.</div></div>`;
    }
    updateOnlineStatus(false);
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

async function saveProduct(event) {
  event.preventDefault();

  const formData = new FormData(adminForm);
  const quantity = Math.max(0, Number(formData.get("quantita") || 0));
  const bottleSize = Math.max(0.33, Math.min(2, Number(formData.get("litri-unita")) || 0.33));
  const payload = {
    Nome: String(formData.get("nome") || "").trim(),
    Tipo: String(formData.get("tipo") || "").trim(),
    Icona: String(formData.get("icona") || "🥤").trim() || "🥤",
    Quantita: quantity,
    LitriUnita: bottleSize
  };

  if (!payload.Nome || !payload.Tipo) {
    adminMessage.textContent = "Compila nome e tipo prima di salvare.";
    return;
  }

  try {
    await addDoc(collection(db, "Prodotti"), payload);
    adminMessage.textContent = `Bevanda aggiunta: ${payload.Nome}`;
    adminForm.reset();
    document.getElementById("icona").value = "🥤";
    document.getElementById("quantita").value = 6;
    document.getElementById("litri-unita").value = 1.5;
    updateAddPreview();
    await loadProducts();
  } catch (error) {
    console.error("Write error:", error);
    adminMessage.textContent = "Salvataggio non riuscito. Controlla le regole Firestore.";
  }
}

async function saveSnack(event) {
  event.preventDefault();

  const formData = new FormData(snackForm);
  const payload = {
    Nome: String(formData.get("snack-nome") || "").trim(),
    NumeroBuste: Math.max(0, Number(formData.get("snack-buste") || 0)),
    QuantitaBusta: Math.max(0, Number(formData.get("snack-quantita-busta") || 0))
  };

  if (!payload.Nome) {
    snackMessage.textContent = "Inserisci il nome dello snack.";
    return;
  }

  try {
    await addDoc(collection(db, "Snack"), payload);
    snackMessage.textContent = `Snack aggiunto: ${payload.Nome}`;
    snackForm.reset();
    await loadProducts();
  } catch (error) {
    console.error("Snack write error:", error);
    snackMessage.textContent = "Salvataggio snack non riuscito. Controlla le regole Firestore.";
  }
}

function syncSelectedProductDetails() {
  if ((!adminProductSelect && !adminProductIdInput) || !adminQuantityInput || !adminSingleLitersInput || !adminTotalLitersInput) {
    return;
  }

  const selectedId = adminProductIdInput?.value || adminProductSelect?.value;
  const selected = productsCache.find((item) => item.id === selectedId);
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

  if(!currentUser){
    window.location.href="admin.html";
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

  const selected = productsCache.find((item) => item.id === productId);
  const productName = selected ? getProductName(selected.data, productId) : "questa bevanda";
  const confirmed = window.confirm(`Eliminare definitivamente ${productName}?`);
  if (!confirmed) {
    return;
  }

  try {
    await deleteDoc(doc(db, "Prodotti", productId));
    availabilityMessage.textContent = `Bevanda eliminata: ${productName}`;
    closeEditModalHandler();
    await loadProducts();
  } catch (error) {
    console.error("Delete error:", error);
    availabilityMessage.textContent = "Eliminazione non riuscita. Controlla le regole Firestore.";
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
    availabilityMessage.textContent = "Seleziona una bevanda da modificare.";
    return;
  }

  try {
    const productRef = doc(db, "Prodotti", productId);
    const selected = productsCache.find((item) => item.id === productId);
    const bottleSize = getBottleSize(selected ? selected.data : {});
    await updateDoc(productRef, {
      Quantita: quantity,
      LitriUnita: bottleSize
    });
    availabilityMessage.textContent = "Disponibilità aggiornata.";
    closeEditModalHandler();
    await loadProducts();
  } catch (error) {
    console.error("Update error:", error);
    availabilityMessage.textContent = "Aggiornamento non riuscito. Controlla le regole Firestore.";
  }
}

function grantAccess() {
  sessionStorage.setItem(ADULT_STORAGE_KEY, "yes");
  ageGate.classList.add("hidden");
  siteShell.classList.remove("hidden");
  syncAdminUI();
  loadProducts();
}

function denyAccess() {
  sessionStorage.setItem(ADULT_STORAGE_KEY, "no");
  window.location.href = ADULT_REDIRECT_URL;
}

function updateOnlineStatus(isOnline) {
  if (!onlineStatus) {
    return;
  }
  footerOnlineStatus.textContent = isOnline ? " Operativo" : " Offline";
  onlineStatus.textContent = isOnline ? "● ONLINE" : "● OFFLINE";
  onlineStatus.style.color = isOnline ? "#43e28a" : "#ff7488";
}

function initAgeGate() {
  const storedChoice = sessionStorage.getItem(ADULT_STORAGE_KEY);
  syncAdminUI();

  if (storedChoice === "yes") {
    ageGate.classList.add("hidden");
    siteShell.classList.remove("hidden");
    loadProducts();
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

if (adminForm) {
  adminForm.addEventListener("submit", saveProduct);
}

if (snackForm) {
  snackForm.addEventListener("submit", saveSnack);
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

if (drinkGrid) {
  drinkGrid.addEventListener("click", (event) => {
    const card = event.target.closest(".card");
    if (!card || card.dataset.kind === "snack") {
      return;
    }

    const selectedId = card.dataset.docId;
    if (!selectedId) {
      return;
    }

    openEditModal(selectedId);
  });
}

initAgeGate();
