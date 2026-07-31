import { initializeApp } from 
"https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import { getFirestore, collection, getDocs } 
from 
"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


const firebaseConfig = {
  apiKey: "AIzaSyAkHOF2S_NRreXMHU1yDpc6o11r1wpxj9g",
  authDomain: "minifrigo-673a5.firebaseapp.com",
  projectId: "minifrigo-673a5"
};


const app = initializeApp(firebaseConfig);

const db = getFirestore(app);


const querySnapshot = await getDocs(
    collection(db,"Prodotti")
);


let html = "";


querySnapshot.forEach((doc)=>{

    const prodotto = doc.data();

    html += `
    <p>
    ${prodotto.Nome}: ${prodotto.Quantità}
    </p>
    `;

});


document.getElementById("lista").innerHTML = html;
