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
    document.getElementById("lista").innerHTML = e.message;
}
