import {collection,getDocs,addDoc,doc,updateDoc,deleteDoc,getDoc,query,where,limit} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "../firebase.js";
import {getBottleQuantity} from "./render.js";

export let productsCache = [];
export let stockCache = [];
export let snackCache = [];
// ==========================
// BEVANDE
// ==========================

export async function loadProducts()
{
    const snapshot =await getDocs(collection(db,"Prodotti"));
    productsCache =snapshot.docs.map(doc=>({id:doc.id,data:doc.data()}));
    return snapshot.docs;
}

export async function saveProduct(payload)
{
    return await addDoc(collection(db,"Prodotti"),payload);
}

export async function updateProduct(id,data)
{
    const ref =doc(db,"Prodotti",id);
    return await updateDoc(ref,data);
}

export async function deleteProduct(id)
{
    const ref =doc(db,"Prodotti",id);
    return await deleteDoc(ref);
}


// ==========================
// STOCK
// ==========================

export async function loadStock() {
    const snapshot = await getDocs(collection(db, "Stock"));
    stockCache = snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));
    return snapshot.docs;
}

export async function saveStock(payload) {
    return await addDoc(collection(db, "Stock"), payload);
}

export async function updateStock(id, data) {
    const ref = doc(db, "Stock", id);
    return await updateDoc(ref, data);
}

export async function deleteStock(id) {
    const ref = doc(db, "Stock", id);
    return await deleteDoc(ref);
}


// ==========================
// SNACK
// ==========================

export async function loadSnack() {
    const snapshot = await getDocs(collection(db, "Snack"));
    snackCache = snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));
    return snapshot.docs;
}

export async function saveSnack(payload) {
    return await addDoc(collection(db, "Snack"), payload);
}

export async function updateSnack(id, data) {
    const ref = doc(db, "Snack", id);
    return await updateDoc(ref, data);
}

export async function deleteSnack(id) {
    const ref = doc(db, "Snack", id);
    return await deleteDoc(ref);
}

// ==========================
// CODICI A BARRE
// ==========================

// Per ora il database atteso è:
// Barcodes/{EAN}
// oppure un documento della collection Barcodes con campo Codice = EAN.
export async function findBarcode(barcode) {
    const cleanBarcode = String(barcode || "").replace(/\D/g, "");
    if (!cleanBarcode) return null;

    // Prima prova: ID del documento = codice a barre.
    const directRef = doc(db, "Barcodes", cleanBarcode);
    const directSnap = await getDoc(directRef);
    if (directSnap.exists()) {
        return { id: directSnap.id, data: directSnap.data() };
    }

    // Seconda prova: campo Codice = codice a barre.
    const q = query(
        collection(db, "Barcodes"),
        where("Codice", "==", cleanBarcode),
        limit(1)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
        const item = snapshot.docs[0];
        return { id: item.id, data: item.data() };
    }

    return null;
}
// ==========================
// CONTATORI
// ==========================


export function countBottles()
{
    return productsCache.reduce((totale, prodotto)=>{return totale +getBottleQuantity(prodotto.data);},0);
}