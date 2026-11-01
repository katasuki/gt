import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    serverTimestamp,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { auth, db } from "./firebase.js";

const games = [
    { id: "valorant", name: "VALORANT" },
    { id: "counter-strike-2", name: "Counter-Strike 2" },
    { id: "apex-legends", name: "Apex Legends" },
    { id: "overwatch-2", name: "Overwatch 2" },
    { id: "rainbow-six-siege", name: "Rainbow Six Siege" },
    { id: "fortnite", name: "Fortnite" },
    { id: "call-of-duty", name: "Call of Duty" },
    { id: "pubg-battlegrounds", name: "PUBG: Battlegrounds" },
    { id: "marvel-rivals", name: "Marvel Rivals" }
];
const sensitivityForm = document.getElementById("sensitivity-form");
const sensitivityGame = document.getElementById("sensitivity-game");
const sensitivityValue = document.getElementById("sensitivity-value");
const sensitivityDpi = document.getElementById("sensitivity-dpi");
const sensitivityNote = document.getElementById("sensitivity-note");
const sensitivityMessage = document.getElementById("sensitivity-message");
const sensitivityRecordBody = document.getElementById("sensitivity-record-body");
const saveButton = document.getElementById("sensitivity-save");
const logoutButton = document.getElementById("aim-settings-logout");
const adminLink = document.getElementById("admin-dashboard-link");
let currentUser = null;
let savedSensitivities = new Map();

function setSensitivityMessage(message, isError = false, isSuccess = false) {
    sensitivityMessage.textContent = message;
    sensitivityMessage.classList.toggle("is-error", isError);
    sensitivityMessage.classList.toggle("is-success", isSuccess);
}

function formatDate(value) {
    const date = value instanceof Date ? value : value?.toDate?.();
    return date instanceof Date ? date.toLocaleDateString("vi-VN") : "Vừa cập nhật";
}

function fillSensitivityForm() {
    const saved = savedSensitivities.get(sensitivityGame.value);
    sensitivityValue.value = saved ? String(saved.sensitivity) : "";
    sensitivityDpi.value = saved ? String(saved.dpi) : "800";
    sensitivityNote.value = saved?.note ?? "";
    setSensitivityMessage(saved ? "Đang xem cấu hình đã lưu cho game này." : "");
}

function renderSensitivities() {
    const configurations = [...savedSensitivities.values()]
        .sort((a, b) => a.gameName.localeCompare(b.gameName, "vi"));
    document.getElementById("sensitivity-sync-label").textContent =
        `${configurations.length}/${games.length} game đã có cấu hình`;

    if (configurations.length === 0) {
        sensitivityRecordBody.innerHTML =
            '<tr><td colspan="5">Chưa lưu cấu hình nào. Chọn game, nhập thông số rồi nhấn lưu.</td></tr>';
        return;
    }

    const fragment = document.createDocumentFragment();
    for (const configuration of configurations) {
        const row = document.createElement("tr");
        for (const value of [
            configuration.gameName,
            String(configuration.sensitivity),
            String(configuration.dpi),
            configuration.note || "—",
            formatDate(configuration.updatedAt)
        ]) {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.append(cell);
        }
        fragment.append(row);
    }
    sensitivityRecordBody.replaceChildren(fragment);
}

async function loadSensitivities() {
    const settings = collection(db, "aimProgress", currentUser.uid, "settings");
    const snapshot = await getDocs(settings);
    savedSensitivities = new Map(snapshot.docs.map((configurationDoc) => [
        configurationDoc.id,
        configurationDoc.data()
    ]));
    renderSensitivities();
    fillSensitivityForm();
}

async function saveSensitivity(event) {
    event.preventDefault();
    const game = games.find((item) => item.id === sensitivityGame.value);
    const sensitivity = Number(sensitivityValue.value);
    const dpi = Number(sensitivityDpi.value);
    const note = sensitivityNote.value.trim();
    if (!game || !Number.isFinite(sensitivity) || sensitivity < 0.01 || sensitivity > 1000 ||
        !Number.isInteger(dpi) || dpi < 100 || dpi > 32000 || note.length > 120) {
        setSensitivityMessage("Kiểm tra sensitivity (0.01–1000), DPI (100–32000) và ghi chú tối đa 120 ký tự.", true);
        return;
    }

    saveButton.disabled = true;
    setSensitivityMessage("Đang đồng bộ cấu hình...");
    try {
        const configuration = {
            gameId: game.id,
            gameName: game.name,
            sensitivity,
            dpi,
            note,
            updatedAt: serverTimestamp()
        };
        await setDoc(doc(db, "aimProgress", currentUser.uid, "settings", game.id), configuration);
        savedSensitivities.set(game.id, { ...configuration, updatedAt: new Date() });
        renderSensitivities();
        setSensitivityMessage(`Đã lưu cấu hình ${game.name} vào tài khoản.`, false, true);
    } catch (error) {
        console.error("Không thể lưu sensitivity theo game:", error);
        setSensitivityMessage("Không thể lưu cấu hình. Hãy kiểm tra kết nối và Firestore Rules.", true);
    } finally {
        saveButton.disabled = false;
    }
}

sensitivityGame.addEventListener("change", fillSensitivityForm);
sensitivityForm.addEventListener("submit", saveSensitivity);

logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    try {
        await signOut(auth);
        window.location.href = "indext.html";
    } catch (error) {
        console.error("Không thể đăng xuất Firebase:", error);
        window.alert("Đăng xuất chưa thành công. Vui lòng thử lại.");
        logoutButton.disabled = false;
    }
});

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.replace("auth.html");
        return;
    }
    currentUser = user;
    const displayName = user.displayName?.trim() || user.email?.split("@")[0] || "Người chơi";
    document.getElementById("sidebar-username").textContent = displayName;
    const avatar = document.getElementById("sidebar-avatar");
    if (user.photoURL) {
        const image = document.createElement("img");
        image.src = user.photoURL;
        image.alt = "";
        image.referrerPolicy = "no-referrer";
        avatar.replaceChildren(image);
    } else {
        avatar.textContent = displayName.charAt(0).toLocaleUpperCase("vi") || "K";
    }

    try {
        const role = await getDoc(doc(db, "userRoles", user.uid));
        adminLink?.classList.toggle("d-none", role.data()?.role !== "admin");
    } catch (error) {
        console.error("Không thể tải vai trò tài khoản:", error);
        adminLink?.classList.add("d-none");
    }

    try {
        await loadSensitivities();
    } catch (error) {
        console.error("Không thể tải sensitivity đã lưu:", error);
        document.getElementById("sensitivity-sync-label").textContent = "Không tải được cấu hình";
        sensitivityRecordBody.innerHTML =
            '<tr><td colspan="5">Không thể tải cấu hình. Hãy kiểm tra kết nối hoặc quyền Firestore.</td></tr>';
        setSensitivityMessage("Không tải được cấu hình đã lưu. Bạn vẫn có thể thử nhập và lưu.", true);
    }
});
