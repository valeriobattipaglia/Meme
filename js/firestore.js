import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  where,
  limit,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "../firebase.js";
import { getBottleQuantity } from "./render.js";

export let productsCache = [];
export let stockCache = [];
export let snackCache = [];

async function loadCollection(name) {
  const snapshot = await getDocs(collection(db, name));
  return snapshot.docs.map(item => ({ id: item.id, data: item.data() }));
}

export async function loadProducts() {
  productsCache = await loadCollection("Prodotti");
  return productsCache;
}

export async function loadStock() {
  stockCache = await loadCollection("Stock");
  return stockCache;
}

export async function loadSnack() {
  snackCache = await loadCollection("Snack");
  return snackCache;
}

export async function saveProduct(payload) {
  return addDoc(collection(db, "Prodotti"), payload);
}

export async function updateProduct(id, data) {
  return updateDoc(doc(db, "Prodotti", id), data);
}

export async function deleteProduct(id) {
  return deleteDoc(doc(db, "Prodotti", id));
}

export async function saveStock(payload) {
  return addDoc(collection(db, "Stock"), payload);
}

export async function updateStock(id, data) {
  return updateDoc(doc(db, "Stock", id), data);
}

export async function deleteStock(id) {
  return deleteDoc(doc(db, "Stock", id));
}

export async function saveSnack(payload) {
  return addDoc(collection(db, "Snack"), payload);
}

export async function updateSnack(id, data) {
  return updateDoc(doc(db, "Snack", id), data);
}

export async function deleteSnack(id) {
  return deleteDoc(doc(db, "Snack", id));
}

// Cerca un prodotto per barcode nelle tre collezioni dell'inventario.
// Non dipende da una collezione Barcodes separata.
export function findInventoryItemByBarcode(barcode) {
  const clean = String(barcode || "").replace(/\D/g, "");
  if (!clean) return null;

  const collections = [
    ["drink", productsCache],
    ["stock", stockCache],
    ["snack", snackCache]
  ];

  for (const [kind, items] of collections) {
    const found = items.find(item => {
      const value = item.data?.CodiceABarre ?? item.data?.Barcode ?? item.data?.barcode;
      return String(value || "").replace(/\D/g, "") === clean;
    });
    if (found) return { ...found, kind };
  }

  return null;
}

// Aggiornamento atomico della sola quantità.
// È importante per evitare che due telefoni sovrascrivano
// accidentalmente la quantità dell'altro.
export async function changeInventoryQuantity(kind, id, delta, metadata = {}) {
  const collectionName = kind === "snack" ? "Snack" : kind === "stock" ? "Stock" : "Prodotti";
  const ref = doc(db, collectionName, id);

  return runTransaction(db, async transaction => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) throw new Error("Articolo non trovato.");

    const current = getBottleQuantity(snap.data());
    const next = Math.max(0, current + Number(delta || 0));

    if (next === current) {
      return { previous: current, next, changed: false };
    }

    transaction.update(ref, { Quantita: next });

    const movementRef = doc(collection(db, "Movimenti"));
    transaction.set(movementRef, {
      uid: metadata.uid || null,
      azione: Number(delta) < 0 ? "prelievo" : "rimessa",
      delta: Number(delta),
      productId: id,
      kind,
      Nome: metadata.name || "",
      CodiceABarre: metadata.barcode || "",
      quantitaPrecedente: current,
      quantitaSuccessiva: next,
      createdAt: serverTimestamp()
    });

    return { previous: current, next, changed: true };
  });
}

export async function getOwnUserProfile(uid) {
  if (!uid) return null;
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function countBottles() {
  return productsCache.reduce((total, product) => total + getBottleQuantity(product.data), 0);
}
