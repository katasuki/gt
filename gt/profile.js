import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    collection,
    doc,
    getDoc,
    getCountFromServer,
    query,
    where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { auth, db } from "./firebase.js";

const profileName = document.getElementById("profile-name");
const profileEmail = document.getElementById("profile-email");
const profileTaskCount = document.getElementById("profile-task-count");
const profileRank = document.getElementById("profile-rank");
const profileRankNote = document.getElementById("profile-rank-note");
const profileAvatar = document.getElementById("profile-avatar");
const profileRoleBadge = document.getElementById("profile-role-badge");
const sidebarAvatar = document.getElementById("sidebar-avatar");
const logoutButton = document.getElementById("btn-profile-logout");
const adminLink = document.getElementById("admin-dashboard-link");
const rankLabels = {
    novice: "Tập sự",
    intermediate: "Trung cấp",
    advanced: "Nâng cao",
    celestial: "Siêu việt"
};

function getDisplayName(user) {
    return user.displayName?.trim() || user.email?.split("@")[0] || "Người chơi";
}

function renderAvatar(element, user, name) {
    if (user.photoURL) {
        const image = document.createElement("img");
        image.src = user.photoURL;
        image.alt = "";
        image.referrerPolicy = "no-referrer";
        element.replaceChildren(image);
        return;
    }

    element.textContent = name.trim().charAt(0).toLocaleUpperCase("vi") || "K";
}

function renderActiveTime(uid) {
    const seconds = Number(localStorage.getItem(`kavask-active-time:${uid}`)) || 0;
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    document.getElementById("profile-active-time").textContent = hours > 0
        ? `${hours} giờ ${remainder} phút`
        : `${minutes} phút`;
}

async function loadTrainingStats(user) {
    const savedTasks = query(
        collection(db, "userTasks"),
        where("ownerUid", "==", user.uid)
    );
    const [tasksResult, rankResult] = await Promise.allSettled([
        getCountFromServer(savedTasks),
        getDoc(doc(db, "userRanks", user.uid))
    ]);

    if (tasksResult.status === "fulfilled") {
        profileTaskCount.textContent = tasksResult.value.data().count.toLocaleString("vi-VN");
    } else {
        console.error("Không thể tải số bài tập đã lưu:", tasksResult.reason);
        profileTaskCount.textContent = "—";
    }

    if (rankResult.status === "fulfilled") {
        const rank = rankLabels[rankResult.value.data()?.rank] || "Chưa xếp hạng";
        profileRank.textContent = rank;
        profileRankNote.textContent = rank === "Chưa xếp hạng"
            ? "Quản trị viên chưa gán rank cho tài khoản"
            : "Theo xếp hạng được gán cho tài khoản";
        document.getElementById("profile-bio-rank").textContent = rank;
    } else {
        console.error("Không thể tải xếp hạng người chơi:", rankResult.reason);
        profileRank.textContent = "Không tải được";
        profileRankNote.textContent = "Vui lòng tải lại trang để thử lại";
        document.getElementById("profile-bio-rank").textContent = "Không tải được";
    }
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.replace("auth.html");
        return;
    }

    const displayName = getDisplayName(user);
    const email = user.email || "Chưa có email";
    profileName.textContent = displayName;
    profileEmail.textContent = email;
    document.getElementById("profile-bio-name").textContent = displayName;
    document.getElementById("profile-bio-email").textContent = email;
    renderAvatar(profileAvatar, user, displayName);
    renderAvatar(sidebarAvatar, user, displayName);
    renderActiveTime(user.uid);
    const activeTimeRefresh = window.setInterval(() => renderActiveTime(user.uid), 5_000);
    const trainingStats = loadTrainingStats(user);
    try {
        const roleDoc = await getDoc(doc(db, "userRoles", user.uid));
        const role = roleDoc.data()?.role === "admin" ? "ADMIN" : "USER";
        const isAdmin = role === "ADMIN";

        profileRoleBadge.textContent = role;
        profileRoleBadge.classList.toggle("d-none", false);
        profileRoleBadge.classList.toggle("admin", isAdmin);
        profileRoleBadge.classList.toggle("user", !isAdmin);

        adminLink?.classList.toggle("d-none", !isAdmin);
        document.getElementById("profile-bio-role").textContent = isAdmin ? "Quản trị viên" : "Người chơi";
    } catch (error) {
        console.error("Không thể tải vai trò tài khoản:", error);
        profileRoleBadge.textContent = "USER";
        profileRoleBadge.classList.remove("d-none", "admin");
        profileRoleBadge.classList.add("user");
        adminLink?.classList.add("d-none");
        document.getElementById("profile-bio-role").textContent = "Không tải được";
    }
    await trainingStats;

    window.addEventListener("beforeunload", () => window.clearInterval(activeTimeRefresh), { once: true });
});

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
