import {collection,getDocs,addDoc,doc,updateDoc,deleteDoc} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "../firebase.js";
import {getBottleQuantity} from "./render.js";

export let productsCache = [];

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
// CONTATORI
// ==========================


export function countBottles()
{
    return productsCache.reduce((totale, prodotto)=>{return totale +getBottleQuantity(prodotto.data);},0);
}