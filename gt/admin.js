import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { auth, db, functions } from "./firebase.js";

const callListUsers = httpsCallable(functions, "listUsers");
const callSetRole = httpsCallable(functions, "setUserRole");
const callSetBanned = httpsCallable(functions, "setUserBanned");
const callDeleteUser = httpsCallable(functions, "deleteUserAccount");
const callListExercises = httpsCallable(functions, "listExercises");
const callDeleteExercise = httpsCallable(functions, "deleteExercise");
const callGetAdminOverview = httpsCallable(functions, "getAdminOverview");
const callSetUserRank = httpsCallable(functions, "setUserRank");
const usersBody = document.getElementById("users-table-body");
const exercisesBody = document.getElementById("exercises-table-body");
const rankHistoryList = document.getElementById("rank-history-list");
const rankCounts = document.getElementById("rank-counts");
const alertBox = document.getElementById("admin-alert");
const previousButton = document.getElementById("users-previous");
const nextButton = document.getElementById("users-next");
const pageLabel = document.getElementById("users-page-label");
const pageTokens = [null];
const ranks = [
    ["novice", "Tập sự"],
    ["intermediate", "Trung cấp"],
    ["advanced", "Nâng cao"],
    ["celestial", "Siêu việt"]
];
const rankLabels = Object.fromEntries(ranks);
let pageIndex = 0;

function showMessage(message, success = false) {
    alertBox.textContent = message;
    alertBox.classList.toggle("success", success);
    alertBox.classList.remove("d-none");
}

function getErrorMessage(error) {
    const code = typeof error?.code === "string"
        ? error.code.replace(/^functions\//, "")
        : "";
    const detail = typeof error?.message === "string" ? error.message.trim() : "";
    const messages = {
        "permission-denied": "Không có quyền thực hiện thao tác này.",
        "failed-precondition": error?.message || "Thao tác này không được phép.",
        "unauthenticated": "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.",
        "not-found": detail.toLowerCase().includes("page not found")
            ? "Không tìm thấy Cloud Function. Hãy triển khai Functions vào project và khu vực asia-southeast1."
            : detail || "Không tìm thấy dữ liệu cần thao tác.",
        "unavailable": "Dịch vụ đang không khả dụng. Hãy thử lại sau.",
        "deadline-exceeded": "Máy chủ xử lý quá thời gian. Hãy thử tải lại hoặc kiểm tra log Functions.",
        "internal": detail
            ? `Cloud Function gặp lỗi: ${detail}`
            : "Cloud Function gặp lỗi nội bộ. Hãy kiểm tra log Firebase Functions."
    };
    if (messages[code]) return messages[code];
    if (detail) return `Thao tác thất bại${code ? ` (${code})` : ""}: ${detail}`;
    return code
        ? `Thao tác thất bại (${code}). Kiểm tra cấu hình và log Firebase Functions.`
        : "Thao tác thất bại. Kiểm tra kết nối và thử lại.";
}

function appendTextCell(row, value, className = "") {
    const cell = document.createElement("td");
    if (className) cell.className = className;
    cell.textContent = value;
    row.append(cell);
}

function makeAction(label, className, action) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `admin-action-button ${className}`;
    button.textContent = label;
    button.addEventListener("click", action);
    return button;
}

function renderUsers(users) {
    const fragment = document.createDocumentFragment();
    for (const user of users) {
        const row = document.createElement("tr");
        const identity = document.createElement("td");
        const email = document.createElement("span");
        email.className = "admin-user-email";
        email.textContent = user.email || "(không có email)";
        const name = document.createElement("span");
        name.className = "admin-user-name";
        name.textContent = user.displayName || user.uid;
        identity.append(email, name);
        row.append(identity);

        appendTextCell(row, user.createdAt ? new Date(user.createdAt).toLocaleDateString("vi-VN") : "—");
        const rankCell = document.createElement("td");
        const rankControls = document.createElement("div");
        rankControls.className = "admin-rank-controls";
        const rankSelect = document.createElement("select");
        rankSelect.className = "admin-rank-select";
        rankSelect.setAttribute("aria-label", `Xếp hạng của ${user.displayName || user.email || user.uid}`);
        const unrankedOption = document.createElement("option");
        unrankedOption.value = "";
        unrankedOption.textContent = "Chưa xếp hạng";
        rankSelect.append(unrankedOption);
        for (const [value, label] of ranks) {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = label;
            rankSelect.append(option);
        }
        rankSelect.value = user.rank || "";
        const saveRankButton = makeAction("Lưu", "", () =>
            saveUserRank(user, rankSelect.value, saveRankButton));
        rankControls.append(rankSelect, saveRankButton);
        rankCell.append(rankControls);
        row.append(rankCell);

        const roleCell = document.createElement("td");
        const role = document.createElement("span");
        role.className = "admin-role";
        role.textContent = user.admin ? "ADMIN" : "USER";
        roleCell.append(role);
        row.append(roleCell);

        const stateCell = document.createElement("td");
        const state = document.createElement("span");
        state.className = `admin-state${user.disabled ? " admin-state-banned" : ""}`;
        state.textContent = user.disabled ? "Đã khóa" : "Hoạt động";
        stateCell.append(state);
        row.append(stateCell);

        const actionsCell = document.createElement("td");
        const actions = document.createElement("div");
        actions.className = "admin-actions";
        actions.append(makeAction(user.admin ? "Gỡ admin" : "Cấp admin", "", () =>
            changeRole(user, user.admin ? "user" : "admin")));
        actions.append(makeAction(user.disabled ? "Bỏ khóa" : "Ban", user.disabled ? "" : "admin-action-danger", () =>
            changeBan(user, !user.disabled)));
        actions.append(makeAction("Xóa", "admin-action-danger", () => removeUser(user)));
        actionsCell.append(actions);
        row.append(actionsCell);
        fragment.append(row);
    }

    if (users.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.className = "admin-empty";
        cell.colSpan = 6;
        cell.textContent = "Không có tài khoản trong trang này.";
        row.append(cell);
        fragment.append(row);
    }
    usersBody.replaceChildren(fragment);
}

async function loadUsers() {
    usersBody.innerHTML = '<tr><td class="admin-empty" colspan="6">Đang tải...</td></tr>';
    try {
        const response = await callListUsers({ pageToken: pageTokens[pageIndex] });
        const { users, nextPageToken } = response.data;
        renderUsers(users);
        if (nextPageToken && pageTokens.length <= pageIndex + 1) pageTokens.push(nextPageToken);
        previousButton.disabled = pageIndex === 0;
        nextButton.disabled = !nextPageToken;
        pageLabel.textContent = `Trang ${pageIndex + 1}`;
    } catch (error) {
        console.error("Không thể tải danh sách tài khoản:", error);
        usersBody.replaceChildren();
        showMessage(getErrorMessage(error));
    }
}

function renderOverview(data) {
    document.getElementById("stat-total-users").textContent = data.totalUsers.toLocaleString("vi-VN");
    document.getElementById("stat-active-users").textContent = data.activeUsers.toLocaleString("vi-VN");
    document.getElementById("stat-new-users").textContent =
        data.currentPeriodNewUsers.toLocaleString("vi-VN");

    const growth = data.currentPeriodNewUsers - data.previousPeriodNewUsers;
    const growthLabel = growth > 0
        ? `Tăng ${growth} so với 30 ngày trước`
        : growth < 0
            ? `Giảm ${Math.abs(growth)} so với 30 ngày trước`
            : "Không đổi so với 30 ngày trước";
    const growthElement = document.getElementById("stat-user-growth");
    growthElement.textContent = growthLabel;
    growthElement.classList.toggle("admin-growth-up", growth > 0);
    growthElement.classList.toggle("admin-growth-down", growth < 0);

    const rankFragment = document.createDocumentFragment();
    for (const [value, label] of ranks) {
        const item = document.createElement("div");
        item.className = "admin-rank-count";
        const name = document.createElement("span");
        name.textContent = label;
        const count = document.createElement("strong");
        count.textContent = (data.rankCounts?.[value] ?? 0).toLocaleString("vi-VN");
        item.append(name, count);
        rankFragment.append(item);
    }
    rankCounts.replaceChildren(rankFragment);

    if (data.rankChanges.length === 0) {
        rankHistoryList.innerHTML =
            '<p class="admin-empty">Chưa có thay đổi rank. Các thay đổi mới sẽ được lưu tại đây.</p>';
        return;
    }

    const historyFragment = document.createDocumentFragment();
    for (const change of data.rankChanges) {
        const item = document.createElement("article");
        item.className = "admin-rank-change";
        const user = document.createElement("strong");
        user.textContent = change.displayName || change.uid;
        const transition = document.createElement("span");
        transition.textContent =
            `${rankLabels[change.fromRank] || "Chưa xếp hạng"} → ${rankLabels[change.toRank] || change.toRank}`;
        const date = document.createElement("time");
        if (change.updatedAt) {
            date.dateTime = change.updatedAt;
            date.textContent = new Date(change.updatedAt).toLocaleString("vi-VN");
        } else {
            date.textContent = "Vừa cập nhật";
        }
        item.append(user, transition, date);
        historyFragment.append(item);
    }
    rankHistoryList.replaceChildren(historyFragment);
}

async function loadOverview() {
    try {
        const response = await callGetAdminOverview();
        renderOverview(response.data);
    } catch (error) {
        console.error("Không thể tải tổng quan quản trị:", error);
        showMessage(getErrorMessage(error));
        rankHistoryList.innerHTML = '<p class="admin-empty">Không thể tải lịch sử xếp hạng.</p>';
    }
}

async function saveUserRank(user, rank, button) {
    button.disabled = true;
    try {
        const response = await callSetUserRank({ uid: user.uid, rank });
        showMessage(
            response.data.changed
                ? (rank ? "Đã cập nhật xếp hạng người chơi." : "Đã gỡ xếp hạng người chơi.")
                : "Người chơi đã ở bậc xếp hạng này.",
            true
        );
        await Promise.all([loadUsers(), loadOverview()]);
    } catch (error) {
        console.error("Không thể cập nhật xếp hạng:", error);
        showMessage(getErrorMessage(error));
    } finally {
        button.disabled = false;
    }
}

function renderExercises(exercises) {
    const fragment = document.createDocumentFragment();
    for (const exercise of exercises) {
        const row = document.createElement("tr");
        appendTextCell(row, exercise.name || "(bài tập không tên)");
        appendTextCell(row, exercise.platform || "Thành viên");
        appendTextCell(row, exercise.category || "—");
        appendTextCell(row, exercise.ownerUid ? exercise.ownerUid : "KAVASK");
        const actionCell = document.createElement("td");
        actionCell.append(makeAction("Xóa bài", "admin-action-danger", () => removeExercise(exercise)));
        row.append(actionCell);
        fragment.append(row);
    }
    if (exercises.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.className = "admin-empty";
        cell.colSpan = 5;
        cell.textContent = "Thư viện chưa có bài tập.";
        row.append(cell);
        fragment.append(row);
    }
    exercisesBody.replaceChildren(fragment);
}

async function loadExercises() {
    exercisesBody.innerHTML = '<tr><td class="admin-empty" colspan="5">Đang tải...</td></tr>';
    try {
        const response = await callListExercises();
        renderExercises(response.data.exercises);
    } catch (error) {
        console.error("Không thể tải danh sách bài tập:", error);
        exercisesBody.replaceChildren();
        showMessage(getErrorMessage(error));
    }
}

async function runAction(action, successMessage) {
    try {
        await action();
        showMessage(successMessage, true);
        await Promise.all([loadUsers(), loadExercises(), loadOverview()]);
    } catch (error) {
        console.error("Thao tác quản trị thất bại:", error);
        showMessage(getErrorMessage(error));
    }
}

function changeRole(user, role) {
    const actionText = role === "admin" ? "cấp quyền admin cho" : "gỡ quyền admin của";
    if (!window.confirm(`Bạn có chắc muốn ${actionText} ${user.email}?`)) return;
    return runAction(
        () => callSetRole({ uid: user.uid, role }),
        "Đã cập nhật quyền. Tài khoản đó cần đăng nhập lại để nhận vai trò mới."
    );
}

function changeBan(user, banned) {
    const verb = banned ? "ban" : "bỏ ban";
    if (!window.confirm(`Bạn có chắc muốn ${verb} tài khoản ${user.email}?`)) return;
    return runAction(() => callSetBanned({ uid: user.uid, banned }), banned ? "Đã khóa tài khoản." : "Đã mở khóa tài khoản.");
}

function removeUser(user) {
    if (!window.confirm(`Xóa vĩnh viễn tài khoản ${user.email} và link bài tập thành viên đã gửi?`)) return;
    return runAction(() => callDeleteUser({ uid: user.uid }), "Đã xóa tài khoản và dữ liệu bài tập cá nhân.");
}

function removeExercise(exercise) {
    if (!window.confirm(`Xóa bài tập "${exercise.name}" khỏi thư viện?`)) return;
    return runAction(
        () => callDeleteExercise({ id: exercise.id, source: exercise.source }),
        "Đã xóa bài tập khỏi thư viện."
    );
}

document.getElementById("refresh-users").addEventListener("click", () => loadUsers());
document.getElementById("refresh-exercises").addEventListener("click", () => loadExercises());
document.getElementById("refresh-overview").addEventListener("click", () => loadOverview());
previousButton.addEventListener("click", () => {
    if (pageIndex === 0) return;
    pageIndex -= 1;
    loadUsers();
});
nextButton.addEventListener("click", () => {
    if (!pageTokens[pageIndex + 1]) return;
    pageIndex += 1;
    loadUsers();
});

document.getElementById("admin-signout").addEventListener("click", async (event) => {
    event.currentTarget.disabled = true;
    try {
        await signOut(auth);
        window.location.href = "indext.html";
    } catch (error) {
        console.error("Không thể đăng xuất:", error);
        showMessage("Đăng xuất thất bại. Vui lòng thử lại.");
        event.currentTarget.disabled = false;
    }
});

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.replace("auth.html");
        return;
    }
    try {
        const role = await getDoc(doc(db, "userRoles", user.uid));
        if (role.data()?.role !== "admin") {
            window.location.replace("profile.html");
            return;
        }
        await Promise.all([loadUsers(), loadExercises(), loadOverview()]);
    } catch (error) {
        console.error("Không thể đọc vai trò quản trị:", error);
        window.location.replace("profile.html");
    }
});
