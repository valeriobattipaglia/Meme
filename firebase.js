import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {

  apiKey: "AIzaSyAkHOF2S_NRreXMHU1yDpc6o11r1wpxj9g",
  authDomain: "minifrigo-673a5.firebaseapp.com",
  projectId: "minifrigo-673a5",
  storageBucket: "minifrigo-673a5.firebasestorage.app",
  messagingSenderId: "346725946911",
  appId: "1:346725946911:web:94d4bda49c1760c315e72a",
  measurementId: "G-SQBNJC1PNB"

};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

export const auth = getAuth(app);