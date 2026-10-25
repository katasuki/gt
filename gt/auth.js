import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { auth } from "./firebase.js";
const homePage = "indext.html";

const authMessages = {
    "auth/email-already-in-use": "Email này đã được đăng ký.",
    "auth/invalid-credential": "Email hoặc mật khẩu không chính xác.",
    "auth/invalid-email": "Địa chỉ email không hợp lệ.",
    "auth/operation-not-allowed": "Đăng nhập bằng email/mật khẩu chưa được bật trong Firebase.",
    "auth/too-many-requests": "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.",
    "auth/user-disabled": "Tài khoản này đã bị vô hiệu hóa.",
    "auth/user-not-found": "Không tìm thấy tài khoản với email này.",
    "auth/weak-password": "Mật khẩu cần có ít nhất 6 ký tự.",
    "auth/wrong-password": "Email hoặc mật khẩu không chính xác.",
    "auth/network-request-failed": "Không thể kết nối Firebase. Vui lòng kiểm tra mạng."
};

const tabLogin = document.getElementById("tab-login");
const tabRegister = document.getElementById("tab-register");
const formLogin = document.getElementById("form-login");
const formRegister = document.getElementById("form-register");
const alertBox = document.getElementById("auth-alert");

function showAlert(message, isSuccess = false) {
    alertBox.textContent = message;
    alertBox.className = `alert ${isSuccess ? "alert-success" : "alert-danger"} py-2 fs-7 cp-mono mb-3`;
    alertBox.classList.remove("d-none");
    alertBox.setAttribute("role", isSuccess ? "status" : "alert");
}

function hideAlert() {
    alertBox.classList.add("d-none");
}

function getErrorMessage(error) {
    return authMessages[error?.code] ?? "Đã xảy ra lỗi xác thực. Vui lòng thử lại.";
}

function setActiveTab(activeTab, inactiveTab, activeForm, inactiveForm, activeColor) {
    activeTab.className = `btn btn-link text-decoration-none text-${activeColor} fw-bold pb-2 border-bottom border-2 border-${activeColor} w-50 text-center`;
    inactiveTab.className = "btn btn-link text-decoration-none text-dim pb-2 w-50 text-center";
    activeForm.classList.remove("d-none");
    inactiveForm.classList.add("d-none");
    hideAlert();
}

tabLogin.addEventListener("click", () => {
    setActiveTab(tabLogin, tabRegister, formLogin, formRegister, "cyan");
});

tabRegister.addEventListener("click", () => {
    setActiveTab(tabRegister, tabLogin, formRegister, formLogin, "pink");
});

formLogin.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideAlert();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const submitButton = document.getElementById("btn-submit-login");

    try {
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>ĐANG XÁC THỰC...';
        await signInWithEmailAndPassword(auth, email, password);
        showAlert("Đăng nhập thành công. Đang chuyển về trang chủ...", true);
        window.setTimeout(() => {
            window.location.href = homePage;
        }, 800);
    } catch (error) {
        showAlert(getErrorMessage(error));
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fa-solid fa-right-to-bracket me-2" aria-hidden="true"></i>TRUY CẬP HỆ THỐNG';
    }
});

formRegister.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideAlert();

    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value;
    const confirmPassword = document.getElementById("reg-confirm-password").value;
    const submitButton = document.getElementById("btn-submit-register");

    if (password !== confirmPassword) {
        showAlert("Mật khẩu xác nhận không trùng khớp.");
        return;
    }

    try {
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>ĐANG TẠO TÀI KHOẢN...';
        await createUserWithEmailAndPassword(auth, email, password);
        showAlert("Đăng ký thành công. Đang chuyển về trang chủ...", true);
        window.setTimeout(() => {
            window.location.href = homePage;
        }, 800);
    } catch (error) {
        showAlert(getErrorMessage(error));
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fa-solid fa-user-plus me-2" aria-hidden="true"></i>TẠO TÀI KHOẢN MỚI';
    }
});
