import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  renderCard,
  renderSnackCard,
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
  snackGrid,
  beverageCount,
  updateLabel,
  onlineStatus,
  footerOnlineStatus,
  adminForm,
  snackForm,
  adminMessage,
  snackMessage,
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
  loadSnacks,
  saveProduct,
  saveSnack,
  updateProduct,
  deleteProduct,
  productsCache,
  snacksCache,
  countBottles
} from "./js/firestore.js";

let currentUser = null;

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  syncAdminUI();
});



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



function setUpdateTimestamp() {
  if (!updateLabel) return;
  const now = new Date();
  updateLabel.innerHTML = `Ultimo aggiornamento<br>${now.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  })}`;
}

function renderInventory() {
  if (drinkGrid) drinkGrid.innerHTML = productsCache.map((item) => renderCard(item)).join("");
  if (snackGrid) snackGrid.innerHTML = snacksCache.map((item) => renderSnackCard(item)).join("");
  if (beverageCount) beverageCount.textContent = String(countBottles());
  setUpdateTimestamp();
  updateOnlineStatus(navigator.onLine);
}

async function refreshInventory() {
  try {
    await loadProducts();
    await loadSnacks();
    renderInventory();
  } catch (error) {
    console.error(error);
    if (availabilityMessage) availabilityMessage.textContent = "Impossibile caricare il frigo.";
  }
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


function updateAddPreview() {
  if (!addPreviewLitersInput || !addQuantityInput || !addSingleLitersSelect) {
    return;
  }

  const quantity = Math.max(0, Number(addQuantityInput.value) || 0);
  const bottleSize = Math.max(0, Number(addSingleLitersSelect.value) || 0);
  const total = Math.min(MAX_LITERS, quantity * bottleSize);
  addPreviewLitersInput.value = `${total.toFixed(2)} L`;
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


  const selected = productsCache.find(
      (item) => item.id === productId
  );


  const productName = selected
      ? getProductName(selected.data, productId)
      : "questa bevanda";


  const confirmed = window.confirm(
      `Eliminare definitivamente ${productName}?`
  );


  if (!confirmed) {
    return;
  }


  try {

    await deleteProduct(productId);

    if (availabilityMessage) availabilityMessage.textContent =
    `Bevanda eliminata: ${productName}`;

    closeEditModalHandler();

    await refreshInventory();


  } catch(error){

    console.error(error);

    availabilityMessage.textContent =
    "Eliminazione non riuscita.";

  }

}

function closeEditModalHandler() {
  if (editModal) {
    editModal.classList.add("hidden");
  }
}

async function updateProductAvailability(event){

event.preventDefault();


const productId =
adminProductIdInput?.value;


const quantity =
Math.max(
0,
Number(adminQuantityInput.value)||0
);


if(!productId){

availabilityMessage.textContent =
"Seleziona una bevanda.";

return;

}



try{


const selected =
productsCache.find(
(item)=>item.id===productId
);



const bottleSize =
getBottleSize(
selected ? selected.data : {}
);



await updateProduct(
productId,
{
Quantita:quantity,
LitriUnita:bottleSize
}
);



availabilityMessage.textContent =
"Disponibilità aggiornata.";



closeEditModalHandler();


await loadProducts();



}catch(error){

console.error(error);

availabilityMessage.textContent =
"Aggiornamento fallito.";

}


}

function grantAccess() {
  sessionStorage.setItem(ADULT_STORAGE_KEY, "yes");
  ageGate.classList.add("hidden");
  siteShell.classList.remove("hidden");
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
      if (adminMessage) adminMessage.textContent = "Bevanda salvata su Firebase.";
      adminForm.reset();
      updateAddPreview();
      await refreshInventory();
    } catch (error) {
      console.error(error);
      if (adminMessage) adminMessage.textContent = "Salvataggio non riuscito.";
    }
  });
}

if (snackForm) {
  snackForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const nome = document.getElementById("snack-nome")?.value.trim() || "";
    const buste = Math.max(0, Number(document.getElementById("snack-buste")?.value) || 0);
    const quantitaBusta = Math.max(0, Number(document.getElementById("snack-quantita-busta")?.value) || 0);
    try {
      await saveSnack({ Nome: nome, NumeroBuste: buste, QuantitaBusta: quantitaBusta });
      if (snackMessage) snackMessage.textContent = "Snack salvato su Firebase.";
      snackForm.reset();
      await refreshInventory();
    } catch (error) {
      console.error(error);
      if (snackMessage) snackMessage.textContent = "Salvataggio snack non riuscito.";
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
