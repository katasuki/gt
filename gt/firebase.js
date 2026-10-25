import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js";

const firebaseConfig = {
    apiKey: "AIzaSyCKFuuTBzQA1JJsPuUm63zuR7ESOvU4u1w",
    authDomain: "jsa11-278d4.firebaseapp.com",
    databaseURL: "https://jsa11-278d4-default-rtdb.firebaseio.com",
    projectId: "jsa11-278d4",
    storageBucket: "jsa11-278d4.firebasestorage.app",
    messagingSenderId: "935682686715",
    appId: "1:935682686715:web:72069f7703ae41b9593a5e"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, "asia-southeast1");
