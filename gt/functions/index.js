import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

initializeApp();
const adminAuth = getAuth();
const db = getFirestore();
const region = "asia-southeast1";
const rankLabels = {
    novice: "Tập sự",
    intermediate: "Trung cấp",
    advanced: "Nâng cao",
    celestial: "Siêu việt"
};

async function requireAdmin(request) {
    if (!request.auth) {
        throw new HttpsError("permission-denied", "Bạn không có quyền quản trị.");
    }
    const [access, role, user] = await Promise.all([
        db.doc(`userAccess/${request.auth.uid}`).get(),
        db.doc(`userRoles/${request.auth.uid}`).get(),
        adminAuth.getUser(request.auth.uid)
    ]);
    if (role.data()?.role !== "admin" || access.data()?.banned === true || user.disabled) {
        throw new HttpsError("permission-denied", "Tài khoản quản trị đã bị khóa.");
    }
    return request.auth.uid;
}

function requireUid(value) {
    if (typeof value !== "string" || value.length < 1 || value.length > 128) {
        throw new HttpsError("invalid-argument", "Tài khoản không hợp lệ.");
    }
    return value;
}

async function isActiveAdmin(uid) {
    const [role, access, user] = await Promise.all([
        db.doc(`userRoles/${uid}`).get(),
        db.doc(`userAccess/${uid}`).get(),
        adminAuth.getUser(uid)
    ]);
    return role.data()?.role === "admin" &&
        access.data()?.banned !== true &&
        !user.disabled;
}

async function countActiveAdmins() {
    const roles = await db.collection("userRoles").where("role", "==", "admin").get();
    const activeStates = await Promise.all(roles.docs.map(async (role) => {
        try {
            return await isActiveAdmin(role.id);
        } catch (error) {
            if (error.code === "auth/user-not-found") return false;
            throw error;
        }
    }));
    return activeStates.filter(Boolean).length;
}

async function protectLastAdmin(target) {
    const targetIsAdmin = await db.doc(`userRoles/${target.uid}`).get()
        .then((snapshot) => snapshot.data()?.role === "admin");
    const remainingAdmins = await countActiveAdmins() - (targetIsAdmin ? 1 : 0);
    if (targetIsAdmin && remainingAdmins < 1) {
        throw new HttpsError("failed-precondition", "Không thể gỡ quyền hoặc khóa admin cuối cùng.");
    }
}

export const listUsers = onCall({ region }, async (request) => {
    await requireAdmin(request);
    const pageToken = typeof request.data?.pageToken === "string" ? request.data.pageToken : undefined;
    const page = await adminAuth.listUsers(100, pageToken);
    const [roles, ranks] = await Promise.all([
        db.collection("userRoles").get(),
        db.collection("userRanks").get()
    ]);
    const adminIds = new Set(roles.docs
        .filter((role) => role.data().role === "admin")
        .map((role) => role.id));
    const rankByUid = new Map(ranks.docs.map((rank) => [rank.id, rank.data().rank]));
    return {
        users: page.users.map((user) => ({
            uid: user.uid,
            email: user.email ?? "",
            displayName: user.displayName ?? "",
            admin: adminIds.has(user.uid),
            rank: rankByUid.get(user.uid) ?? "",
            disabled: user.disabled,
            createdAt: user.metadata.creationTime ?? ""
        })),
        nextPageToken: page.pageToken ?? null
    };
});

export const getAdminOverview = onCall({ region, timeoutSeconds: 120 }, async (request) => {
    await requireAdmin(request);
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const currentPeriodStart = now - thirtyDays;
    const previousPeriodStart = now - 2 * thirtyDays;
    const users = [];
    let pageToken;
    do {
        const page = await adminAuth.listUsers(1000, pageToken);
        users.push(...page.users);
        pageToken = page.pageToken;
    } while (pageToken);

    const currentPeriodNewUsers = users.filter((user) => {
        const createdAt = Date.parse(user.metadata.creationTime ?? "");
        return createdAt >= currentPeriodStart && createdAt <= now;
    }).length;
    const previousPeriodNewUsers = users.filter((user) => {
        const createdAt = Date.parse(user.metadata.creationTime ?? "");
        return createdAt >= previousPeriodStart && createdAt < currentPeriodStart;
    }).length;
    const activeUsers = users.filter((user) => {
        const lastSignIn = Date.parse(user.metadata.lastSignInTime ?? "");
        return !user.disabled && lastSignIn >= currentPeriodStart && lastSignIn <= now;
    }).length;

    const [rankHistory, ranks] = await Promise.all([
        db.collection("rankHistory").orderBy("updatedAt", "desc").limit(10).get(),
        db.collection("userRanks").get()
    ]);
    const userByUid = new Map(users.map((user) => [user.uid, user]));
    const rankChanges = rankHistory.docs.map((change) => {
        const data = change.data();
        const updatedAt = data.updatedAt?.toDate?.();
        return {
            uid: data.uid ?? "",
            displayName: userByUid.get(data.uid)?.displayName ??
                userByUid.get(data.uid)?.email ??
                data.uid ??
                "",
            fromRank: data.fromRank ?? "",
            toRank: data.toRank ?? "",
            updatedAt: updatedAt instanceof Date ? updatedAt.toISOString() : ""
        };
    });

    const rankCounts = Object.fromEntries(Object.keys(rankLabels).map((rank) => [rank, 0]));
    for (const rank of ranks.docs) {
        const value = rank.data().rank;
        if (Object.hasOwn(rankCounts, value)) rankCounts[value] += 1;
    }

    return {
        totalUsers: users.length,
        activeUsers,
        currentPeriodNewUsers,
        previousPeriodNewUsers,
        rankCounts,
        rankChanges
    };
});

export const setUserRank = onCall({ region }, async (request) => {
    const callerUid = await requireAdmin(request);
    const uid = requireUid(request.data?.uid);
    const rank = request.data?.rank;
    if (typeof rank !== "string" || (rank !== "" && !Object.hasOwn(rankLabels, rank))) {
        throw new HttpsError("invalid-argument", "Bậc xếp hạng không hợp lệ.");
    }

    await adminAuth.getUser(uid);
    const rankRef = db.doc(`userRanks/${uid}`);
    const changed = await db.runTransaction(async (transaction) => {
        const previousRank = await transaction.get(rankRef);
        const fromRank = previousRank.data()?.rank ?? "";
        if (fromRank === rank) return false;

        if (rank) {
            transaction.set(rankRef, {
                rank,
                updatedAt: FieldValue.serverTimestamp(),
                updatedBy: callerUid
            });
        } else {
            transaction.delete(rankRef);
        }
        transaction.set(db.collection("rankHistory").doc(), {
            uid,
            fromRank,
            toRank: rank,
            updatedAt: FieldValue.serverTimestamp(),
            updatedBy: callerUid
        });
        return true;
    });
    return { success: true, changed };
});

export const setUserRole = onCall({ region }, async (request) => {
    const callerUid = await requireAdmin(request);
    const uid = requireUid(request.data?.uid);
    const role = request.data?.role;
    if (!["admin", "user"].includes(role)) {
        throw new HttpsError("invalid-argument", "Vai trò không hợp lệ.");
    }
    if (uid === callerUid) {
        throw new HttpsError("failed-precondition", "Không thể tự thay đổi quyền của mình.");
    }

    const target = await adminAuth.getUser(uid);
    if (role === "user") await protectLastAdmin(target);
    const roleRef = db.doc(`userRoles/${uid}`);
    if (role === "admin") {
        if (target.disabled) {
            throw new HttpsError("failed-precondition", "Hãy bỏ khóa tài khoản trước khi cấp quyền admin.");
        }
        await roleRef.set({ role: "admin", updatedAt: FieldValue.serverTimestamp() });
    } else {
        await roleRef.delete();
    }
    return { success: true };
});

export const setUserBanned = onCall({ region }, async (request) => {
    const callerUid = await requireAdmin(request);
    const uid = requireUid(request.data?.uid);
    const banned = request.data?.banned;
    if (typeof banned !== "boolean") {
        throw new HttpsError("invalid-argument", "Trạng thái khóa không hợp lệ.");
    }
    if (uid === callerUid) {
        throw new HttpsError("failed-precondition", "Không thể tự khóa tài khoản đang dùng.");
    }

    const target = await adminAuth.getUser(uid);
    if (banned) await protectLastAdmin(target);
    const accessRef = db.doc(`userAccess/${uid}`);
    if (banned) {
        await accessRef.set({ banned: true, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        await adminAuth.updateUser(uid, { disabled: true });
        await adminAuth.revokeRefreshTokens(uid);
    } else {
        await adminAuth.updateUser(uid, { disabled: false });
        await accessRef.set({ banned: false, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }
    return { success: true };
});

export const deleteUserAccount = onCall({ region }, async (request) => {
    const callerUid = await requireAdmin(request);
    const uid = requireUid(request.data?.uid);
    if (uid === callerUid) {
        throw new HttpsError("failed-precondition", "Không thể xóa tài khoản admin đang dùng.");
    }

    const target = await adminAuth.getUser(uid);
    await protectLastAdmin(target);
    await db.doc(`userAccess/${uid}`).set({
        banned: true,
        updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    await adminAuth.updateUser(uid, { disabled: true });
    await adminAuth.revokeRefreshTokens(uid);
    const writer = db.bulkWriter();
    const userTasks = await db.collection("userTasks").where("ownerUid", "==", uid).get();
    for (const task of userTasks.docs) writer.delete(task.ref);
    writer.delete(db.doc(`userAccess/${uid}`));
    writer.delete(db.doc(`userRoles/${uid}`));
    writer.delete(db.doc(`userRanks/${uid}`));
    await writer.close();
    await adminAuth.deleteUser(uid);
    return { success: true };
});

export const listExercises = onCall({ region }, async (request) => {
    await requireAdmin(request);
    const [catalog, submitted] = await Promise.all([
        db.collection("trainingTasks").get(),
        db.collection("userTasks").get()
    ]);
    return {
        exercises: [
            ...catalog.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    source: "catalog",
                    name: data.name ?? "",
                    platform: data.platform ?? "",
                    category: data.category ?? ""
                };
            }),
            ...submitted.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    source: "user",
                    name: data.name ?? "",
                    platform: "Thành viên",
                    category: data.category ?? "",
                    ownerUid: data.ownerUid ?? ""
                };
            })
        ]
    };
});

export const deleteExercise = onCall({ region }, async (request) => {
    await requireAdmin(request);
    const id = requireUid(request.data?.id);
    const source = request.data?.source;
    const collection = source === "catalog" ? "trainingTasks" : source === "user" ? "userTasks" : null;
    if (!collection) {
        throw new HttpsError("invalid-argument", "Nguồn bài tập không hợp lệ.");
    }
    const exerciseRef = db.collection(collection).doc(id);
    const exercise = await exerciseRef.get();
    if (!exercise.exists) {
        throw new HttpsError("not-found", "Không tìm thấy bài tập.");
    }
    await exerciseRef.delete();
    return { success: true };
});
