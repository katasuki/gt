import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    doc,
    getDoc,
    query,
    serverTimestamp,
    where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { auth, db } from "./firebase.js";

const platformLabels = {
    aimlabs: "Aimlabs",
    kovaaks: "KovaaK’s",
    kavask: "KAVASK",
    custom: "Của tôi"
};
const categoryLabels = { clicking: "clicking", tracking: "tracking", switching: "switching" };

const tableBody = document.getElementById("task-table-body");
const customTableBody = document.getElementById("custom-task-table-body");
const searchInput = document.getElementById("task-search");
const platformFilter = document.getElementById("platform-filter");
const categoryFilter = document.getElementById("category-filter");
const form = document.getElementById("add-task-form");
const formMessage = document.getElementById("task-form-message");
const logoutButton = document.getElementById("btn-tasks-logout");
const adminLink = document.getElementById("admin-dashboard-link");
let currentUid = "";

function isHttpUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:";
    } catch {
        return false;
    }
}

function appendCell(row, content, className = "") {
    const cell = document.createElement("td");
    if (className) cell.className = className;
    if (content instanceof Node) cell.append(content);
    else cell.textContent = content;
    row.append(cell);
}

function createPill(text, className) {
    const pill = document.createElement("span");
    pill.className = `task-pill ${className}`;
    pill.textContent = text;
    return pill;
}

function createTaskRow(task, isCustom = false) {
    const row = document.createElement("tr");
    row.className = "task-data-row";
    row.dataset.name = task.name.toLocaleLowerCase("vi");
    row.dataset.platform = isCustom ? "custom" : task.platform;
    row.dataset.category = task.category;

    if (!isCustom) {
        const detailCell = document.createElement("td");
        detailCell.className = "task-expand-cell";
        const detailButton = document.createElement("button");
        detailButton.className = "task-detail-toggle";
        detailButton.type = "button";
        detailButton.setAttribute("aria-label", `Xem mô tả ${task.name}`);
        detailButton.setAttribute("aria-expanded", "false");
        detailButton.innerHTML = '<i class="fa-solid fa-chevron-down" aria-hidden="true"></i>';
        detailCell.append(detailButton);
        row.append(detailCell);
        detailButton.addEventListener("click", () => {
            const details = row.nextElementSibling;
            const open = detailButton.getAttribute("aria-expanded") !== "true";
            detailButton.setAttribute("aria-expanded", String(open));
            details.hidden = !open;
        });
    }

    appendCell(row, task.name, "task-name-cell");
    appendCell(row, createPill(categoryLabels[task.category], `task-pill-${task.category}`));
    const source = document.createElement("span");
    source.className = `task-source task-source-${isCustom ? "custom" : task.platform}`;
    source.textContent = platformLabels[isCustom ? "custom" : task.platform] ?? platformLabels.custom;
    appendCell(row, source);

    if (!isCustom) appendCell(row, task.difficulty || "—");

    const actionCell = document.createElement("td");
    const openLink = document.createElement("a");
    openLink.className = "task-action-link";
    openLink.href = task.url || (task.platform === "kovaaks"
        ? "https://store.steampowered.com/app/824270/KovaaKs/"
        : task.platform === "kavask" ? "coaching.html" : "https://aimlabs.com/");
    openLink.target = "_blank";
    openLink.rel = "noopener noreferrer";
    openLink.setAttribute("aria-label", `Mở ${task.name}`);
    openLink.innerHTML = '<i class="fa-solid fa-play" aria-hidden="true"></i><span>Mở</span>';
    actionCell.append(openLink);

    if (isCustom) {
        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "task-remove-button ms-3";
        removeButton.setAttribute("aria-label", `Xóa ${task.name}`);
        removeButton.innerHTML = '<i class="fa-regular fa-trash-can" aria-hidden="true"></i>';
        removeButton.addEventListener("click", async () => {
            if (!window.confirm(`Xóa link bài tập "${task.name}" khỏi thư viện cá nhân?`)) return;
            try {
                await deleteDoc(doc(db, "userTasks", task.id));
                await renderCustomTasks();
            } catch (error) {
                console.error("Không thể xóa link bài tập:", error);
                setFormMessage("Không thể xóa link. Vui lòng thử lại.", false);
            }
        });
        actionCell.append(removeButton);
    }
    row.append(actionCell);

    if (isCustom) return [row];
    const details = document.createElement("tr");
    details.className = "task-detail-row";
    details.hidden = true;
    const detailsCell = document.createElement("td");
    detailsCell.colSpan = 6;
    detailsCell.textContent = task.description || "Chưa có mô tả.";
    details.append(detailsCell);
    return [row, details];
}

async function renderCatalog() {
    tableBody.innerHTML = '<tr><td class="no-task-results" colspan="6">Đang tải thư viện...</td></tr>';
    try {
        const snapshot = await getDocs(collection(db, "trainingTasks"));
        const tasks = snapshot.docs.map((taskDoc) => ({ id: taskDoc.id, ...taskDoc.data() }));
        const fragment = document.createDocumentFragment();
        tasks.sort((a, b) => a.name.localeCompare(b.name, "vi"));
        for (const task of tasks) fragment.append(...createTaskRow(task));
        tableBody.replaceChildren(fragment);
        applyFilters();
    } catch (error) {
        console.error("Không thể tải thư viện bài tập:", error);
        tableBody.replaceChildren();
        document.getElementById("no-task-results").textContent =
            "Không thể tải thư viện. Admin cần triển khai Functions, Firestore Rules và nạp danh sách bài tập.";
        document.getElementById("no-task-results").classList.remove("d-none");
    }
}

async function renderCustomTasks() {
    try {
        const personalTasks = query(collection(db, "userTasks"), where("ownerUid", "==", currentUid));
        const snapshot = await getDocs(personalTasks);
        const fragment = document.createDocumentFragment();
        for (const taskDoc of snapshot.docs) {
            fragment.append(...createTaskRow({ id: taskDoc.id, ...taskDoc.data() }, true));
        }
        customTableBody.replaceChildren(fragment);
        document.getElementById("no-custom-tasks").classList.toggle("d-none", snapshot.size > 0);
    } catch (error) {
        console.error("Không thể tải link bài tập cá nhân:", error);
        customTableBody.replaceChildren();
        document.getElementById("no-custom-tasks").textContent = "Không thể tải link cá nhân. Hãy tải lại trang.";
        document.getElementById("no-custom-tasks").classList.remove("d-none");
    }
    applyFilters();
}

function applyFilters() {
    const search = searchInput.value.trim().toLocaleLowerCase("vi");
    const platform = platformFilter.value;
    const category = categoryFilter.value;
    let visibleCatalogCount = 0;
    let visibleCount = 0;

    for (const row of tableBody.querySelectorAll(".task-data-row")) {
        const visible = row.dataset.name.includes(search) &&
            (platform === "all" || platform === row.dataset.platform) &&
            (category === "all" || category === row.dataset.category);
        row.hidden = !visible;
        const detail = row.nextElementSibling;
        if (detail?.classList.contains("task-detail-row") && !visible) detail.hidden = true;
        if (visible) {
            visibleCatalogCount += 1;
            visibleCount += 1;
        }
    }
    for (const row of customTableBody.querySelectorAll(".task-data-row")) {
        const visible = row.dataset.name.includes(search) &&
            (platform === "all" || platform === "custom") &&
            (category === "all" || category === row.dataset.category);
        row.hidden = !visible;
        if (visible) visibleCount += 1;
    }
    document.getElementById("task-result-count").textContent = `${visibleCount} bài tập`;
    document.getElementById("no-task-results").classList.toggle(
        "d-none",
        visibleCatalogCount > 0 || platform === "custom"
    );
}

function setFormMessage(message, success) {
    formMessage.textContent = message;
    formMessage.classList.toggle("success", success);
    formMessage.classList.remove("d-none");
}

searchInput.addEventListener("input", applyFilters);
platformFilter.addEventListener("change", applyFilters);
categoryFilter.addEventListener("change", applyFilters);

document.addEventListener("keydown", (event) => {
    if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
        event.preventDefault();
        searchInput.focus();
    }
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    formMessage.classList.add("d-none");
    const name = document.getElementById("task-name").value.trim();
    const url = document.getElementById("task-url").value.trim();
    const category = document.getElementById("task-category").value;
    if (!name || name.length > 70 || !isHttpUrl(url)) {
        setFormMessage("Nhập tên tối đa 70 ký tự và link http:// hoặc https:// hợp lệ.", false);
        return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    try {
        await addDoc(collection(db, "userTasks"), {
            name,
            url,
            platform: "custom",
            category,
            ownerUid: currentUid,
            createdAt: serverTimestamp()
        });
        form.reset();
        await renderCustomTasks();
        setFormMessage("Đã lưu link vào thư viện cá nhân.", true);
    } catch (error) {
        console.error("Không thể lưu link bài tập:", error);
        setFormMessage("Không thể lưu link. Hãy thử lại sau.", false);
    } finally {
        submitButton.disabled = false;
    }
});

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.replace("auth.html");
        return;
    }

    currentUid = user.uid;
    const displayName = user.displayName?.trim() || user.email?.split("@")[0] || "Người chơi";
    const avatar = document.getElementById("sidebar-avatar");
    document.getElementById("sidebar-username").textContent = displayName;
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

    await Promise.all([renderCatalog(), renderCustomTasks()]);
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
