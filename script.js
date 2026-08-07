import { db, auth } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


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
    saveProduct,
    saveSnack,
    updateProduct,
    deleteProduct,
    productsCache,
    countBottles

} from "./js/firestore.js";

let currentUser = null;

onAuthStateChanged(auth,(user)=>{
    currentUser=user;
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

    availabilityMessage.textContent =
    `Bevanda eliminata: ${productName}`;

    closeEditModalHandler();

    await loadProducts();


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
