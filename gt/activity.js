import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { auth } from "./firebase.js";

let currentUid = "";
let lastActiveAt = 0;
let secondsSinceSave = 0;

function saveActiveTime(force = false) {
    if (!currentUid || !lastActiveAt) return;

    const now = performance.now();
    const elapsedSeconds = Math.floor((now - lastActiveAt) / 1000);
    if (elapsedSeconds < 1) return;

    lastActiveAt += elapsedSeconds * 1000;
    secondsSinceSave += elapsedSeconds;
    if (secondsSinceSave < 5 && !force) return;

    const key = `kavask-active-time:${currentUid}`;
    const totalSeconds = (Number(localStorage.getItem(key)) || 0) + secondsSinceSave;
    localStorage.setItem(key, String(totalSeconds));
    secondsSinceSave = 0;
}

function startTracking() {
    lastActiveAt = document.hidden ? 0 : performance.now();
}

onAuthStateChanged(auth, (user) => {
    saveActiveTime(true);
    currentUid = user?.uid || "";
    secondsSinceSave = 0;
    startTracking();
});

window.setInterval(() => {
    if (!document.hidden) saveActiveTime();
}, 1_000);

document.addEventListener("visibilitychange", () => {
    if (document.hidden) saveActiveTime(true);
    startTracking();
});

window.addEventListener("pagehide", () => saveActiveTime(true));
