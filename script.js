import { initializeApp } from 
"https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import { getFirestore, collection, getDocs } 
from 
"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


const firebaseConfig = {
  apiKey: "AIzaSyAkHOF2S_NRreXMHU1yDpc6o11r1wpxj9g",
  authDomain: "minifrigo-673a5.firebaseapp.com",
  projectId: "minifrigo-673a5",
  storageBucket: "minifrigo-673a5.firebasestorage.app",
  messagingSenderId: "346725946911",
  appId: "1:346725946911:web:94d4bda49c1760c315e72a",
  measurementId: "G-SQBNJC1PNB"
};

console.log("1 - Script avviato");

const app = initializeApp(firebaseConfig);
console.log("2 - Firebase inizializzato");

const db = getFirestore(app);
console.log("3 - Firestore creato");

try {
    const querySnapshot = await getDocs(collection(db, "Prodotti"));

    console.log("4 - Query eseguita");
    console.log("Documenti:", querySnapshot.size);

    let html = "";

    querySnapshot.forEach((doc) => {
        console.log(doc.id, doc.data());

        const prodotto = doc.data();

        html += `<p>${prodotto.Nome}: ${prodotto.Quantità}</p>`;
    });

    document.getElementById("lista").innerHTML = html;

} catch (e) {
    console.error(e);
    document.getElementById("lista").innerHTML =
"<pre>" + e.stack + "</pre>";
}
