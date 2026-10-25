import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { auth, db } from "./firebase.js";

const authLink = document.getElementById("auth-link") ?? document.getElementById("coaching-auth-link");
const accountMenu = document.getElementById("account-menu");
const navUsername = document.getElementById("nav-username");
const navAvatar = document.getElementById("nav-avatar");
const signOutButton = document.getElementById("nav-signout");
const adminMenuItem = document.getElementById("admin-menu-item");

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

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        authLink?.classList.remove("d-none");
        accountMenu?.classList.add("d-none");
        adminMenuItem?.classList.add("d-none");
        return;
    }

    const displayName = getDisplayName(user);
    if (navUsername) navUsername.textContent = displayName;
    if (navAvatar) renderAvatar(navAvatar, user, displayName);
    authLink?.classList.add("d-none");
    accountMenu?.classList.remove("d-none");
    try {
        const role = await getDoc(doc(db, "userRoles", user.uid));
        adminMenuItem?.classList.toggle("d-none", role.data()?.role !== "admin");
    } catch (error) {
        console.error("Không thể tải vai trò tài khoản:", error);
        adminMenuItem?.classList.add("d-none");
    }
});

signOutButton?.addEventListener("click", async () => {
    signOutButton.disabled = true;
    try {
        await signOut(auth);
        window.location.href = "indext.html";
    } catch (error) {
        console.error("Không thể đăng xuất Firebase:", error);
        signOutButton.disabled = false;
        window.alert("Đăng xuất chưa thành công. Vui lòng thử lại.");
    }
});
