import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp({
    credential: applicationDefault(),
    projectId: "jsa11-278d4"
});

const exercises = [
    ["aimlabs-gridshot", "Gridshot", "aimlabs", "clicking", "Dễ", "Khởi động phản xạ và chuyển mục tiêu.", "https://aimlabs.com/"],
    ["aimlabs-sixshot", "Sixshot", "aimlabs", "clicking", "Trung bình", "Tập đặt tâm chính xác lên mục tiêu nhỏ.", "https://aimlabs.com/"],
    ["aimlabs-microshot", "Microshot", "aimlabs", "clicking", "Trung bình", "Rèn micro-adjustment và độ ổn định.", "https://aimlabs.com/"],
    ["aimlabs-strafeshot", "Strafeshot", "aimlabs", "tracking", "Trung bình", "Tracking mục tiêu di chuyển ngang.", "https://aimlabs.com/"],
    ["aimlabs-motiontrack", "Motiontrack", "aimlabs", "tracking", "Trung bình", "Luyện bám mục tiêu liên tục.", "https://aimlabs.com/"],
    ["aimlabs-spidershot", "Spidershot", "aimlabs", "switching", "Dễ", "Chuyển tâm giữa nhiều mục tiêu.", "https://aimlabs.com/"],
    ["kovaaks-tile-frenzy", "Tile Frenzy", "kovaaks", "clicking", "Dễ", "Luyện phản xạ click mục tiêu.", "https://store.steampowered.com/app/824270/KovaaKs/"],
    ["kovaaks-1wall-6targets-small", "1wall 6targets small", "kovaaks", "clicking", "Trung bình", "Click chuỗi mục tiêu nhỏ chính xác.", "https://store.steampowered.com/app/824270/KovaaKs/"],
    ["kovaaks-pasu-voltaic", "Pasu Voltaic", "kovaaks", "clicking", "Khó", "Click mục tiêu di chuyển và điều chỉnh tâm.", "https://store.steampowered.com/app/824270/KovaaKs/"],
    ["kovaaks-popcorn-voltaic", "Popcorn Voltaic", "kovaaks", "clicking", "Khó", "Rèn phản xạ với mục tiêu chuyển động.", "https://store.steampowered.com/app/824270/KovaaKs/"],
    ["kovaaks-vt-bounceshot", "VT Bounceshot", "kovaaks", "clicking", "Trung bình", "Chuyển mục tiêu liên tiếp ổn định.", "https://store.steampowered.com/app/824270/KovaaKs/"],
    ["kovaaks-smoothbot", "Smoothbot", "kovaaks", "tracking", "Trung bình", "Kiểm soát tracking mượt.", "https://store.steampowered.com/app/824270/KovaaKs/"],
    ["kovaaks-vt-air-angelic", "VT Air Angelic", "kovaaks", "tracking", "Khó", "Tracking mục tiêu trên không.", "https://store.steampowered.com/app/824270/KovaaKs/"],
    ["kovaaks-bounce-180", "Bounce 180", "kovaaks", "switching", "Khó", "Chuyển góc rộng giữa các mục tiêu.", "https://store.steampowered.com/app/824270/KovaaKs/"],
    ["kavask-precision-start", "KAVASK Precision Start", "kavask", "clicking", "Cơ bản", "Khởi động bằng thao tác chậm, chính xác.", "coaching.html"],
    ["kavask-tracking-flow", "KAVASK Tracking Flow", "kavask", "tracking", "Cơ bản", "Làm quen tracking đều tay.", "coaching.html"],
    ["kavask-target-switch", "KAVASK Target Switch", "kavask", "switching", "Cơ bản", "Luyện chuyển mục tiêu có kiểm soát.", "coaching.html"]
];

const db = getFirestore();
const batch = db.batch();
for (const [id, name, platform, category, difficulty, description, url] of exercises) {
    batch.set(db.collection("trainingTasks").doc(id), {
        name,
        platform,
        category,
        difficulty,
        description,
        url
    }, { merge: true });
}
await batch.commit();
console.log(`Seeded ${exercises.length} training exercises.`);
