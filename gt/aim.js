import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { auth, db } from "./firebase.js";
import * as THREE from "three";
import { PointerLockControls } from "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/controls/PointerLockControls.js";

const chapters = [
    {
        id: "flick",
        title: "CHAPTER 01 / FLICK CONTROL",
        missions: [
            {
                id: "flick_basics",
                title: "Điểm ngắm cơ bản",
                description: "Làm quen với tâm ngắm và nhịp bắn mục tiêu tĩnh.",
                seconds: 30,
                radius: 0.62,
                moving: false,
                difficulty: "CƠ BẢN"
            },
            {
                id: "micro_flick",
                title: "Micro Flick",
                description: "Mục tiêu nhỏ hơn, rèn độ chính xác trong mỗi cú flick.",
                seconds: 35,
                radius: 0.4,
                moving: false,
                difficulty: "TRUNG CẤP"
            },
            {
                id: "wide_flick",
                title: "Wide Flick",
                description: "Flick luân phiên giữa các mục tiêu xuất hiện ở hai phía.",
                seconds: 40,
                radius: 0.48,
                moving: false,
                difficulty: "TRUNG CẤP"
            },
            {
                id: "precision_pop",
                title: "Precision Pop",
                description: "Mục tiêu nhỏ xuất hiện ngắn ở nhiều vị trí trong tầm nhìn.",
                seconds: 40,
                radius: 0.3,
                moving: false,
                difficulty: "NÂNG CAO"
            }
        ]
    },
    {
        id: "tracking",
        title: "CHAPTER 02 / TRACKING",
        missions: [
            {
                id: "tracking_orbit",
                title: "Bám mục tiêu",
                description: "Theo sát mục tiêu chuyển động trước khi căn tâm và bắn.",
                seconds: 35,
                radius: 0.54,
                moving: true,
                difficulty: "TRUNG CẤP"
            },
            {
                id: "tracking_sweep",
                title: "Quỹ đạo nhanh",
                description: "Mục tiêu đổi hướng liên tục để thử khả năng tracking.",
                seconds: 40,
                radius: 0.4,
                moving: true,
                difficulty: "NÂNG CAO"
            },
            {
                id: "tracking_strafe",
                title: "Strafe Track",
                description: "Bám theo mục tiêu di chuyển ngang với tốc độ ổn định.",
                seconds: 40,
                radius: 0.46,
                moving: true,
                speed: 2,
                difficulty: "TRUNG CẤP"
            },
            {
                id: "tracking_vertical",
                title: "Vertical Track",
                description: "Theo sát mục tiêu chuyển động theo cả phương ngang và dọc.",
                seconds: 45,
                radius: 0.36,
                moving: true,
                speed: 2.8,
                difficulty: "NÂNG CAO"
            }
        ]
    },
    {
        id: "switching",
        title: "CHAPTER 03 / TARGET SWITCH",
        missions: [
            {
                id: "switching_duo",
                title: "Chuyển mục tiêu",
                description: "Bắn liên tiếp các mục tiêu xuất hiện ở vị trí khác nhau.",
                seconds: 35,
                radius: 0.5,
                moving: false,
                difficulty: "TRUNG CẤP"
            },
            {
                id: "switching_triad",
                title: "Đa mục tiêu",
                description: "Tăng nhịp chuyển mục tiêu với kích thước nhỏ hơn.",
                seconds: 45,
                radius: 0.39,
                moving: true,
                difficulty: "NÂNG CAO"
            },
            {
                id: "switching_rapid",
                title: "Rapid Switch",
                description: "Chuyển tâm nhanh giữa các mục tiêu tĩnh ở nhiều góc khác nhau.",
                seconds: 40,
                radius: 0.44,
                moving: false,
                difficulty: "TRUNG CẤP"
            },
            {
                id: "switching_mixed",
                title: "Mixed Targets",
                description: "Kết hợp mục tiêu tĩnh và mục tiêu chuyển động liên tiếp.",
                seconds: 45,
                radius: 0.34,
                moving: true,
                speed: 3,
                difficulty: "NÂNG CAO"
            }
        ]
    },
    {
        id: "precision",
        title: "CHAPTER 04 / PRECISION",
        missions: [
            {
                id: "precision_headline",
                title: "Head-Level Line",
                description: "Giữ tâm ngắm ở tầm cao ổn định và phản ứng với mục tiêu.",
                seconds: 40,
                radius: 0.43,
                moving: false,
                difficulty: "TRUNG CẤP"
            },
            {
                id: "precision_tiny",
                title: "Tiny Targets",
                description: "Bài kiểm tra độ chính xác với mục tiêu siêu nhỏ.",
                seconds: 45,
                radius: 0.25,
                moving: false,
                difficulty: "NÂNG CAO"
            },
            {
                id: "precision_reaction",
                title: "Reaction Shots",
                description: "Tập trung phản xạ và bắn ngay khi mục tiêu xuất hiện.",
                seconds: 35,
                radius: 0.38,
                moving: true,
                speed: 3.4,
                difficulty: "NÂNG CAO"
            }
        ]
    }
];
const missions = chapters.flatMap((chapter) =>
    chapter.missions.map((mission) => ({ ...mission, chapterId: chapter.id, chapterTitle: chapter.title }))
);
const dailyDate = getLocalDateKey();
const dailyMission = missions[hashString(dailyDate) % missions.length];

const missionList = document.getElementById("aim-mission-list");
const arena = document.getElementById("aim-arena");
const canvas = document.getElementById("aim-canvas");
const startButton = document.getElementById("aim-start");
const overlayStartButton = document.getElementById("aim-overlay-start");
const overlay = document.getElementById("aim-overlay");
const statusMessage = document.getElementById("aim-status");
const recordBody = document.getElementById("aim-record-body");
const logoutButton = document.getElementById("aim-logout");
const adminLink = document.getElementById("admin-dashboard-link");
let currentUser = null;
let selectedMission = missions[0];
let selectedMissionId = null;
let savedRuns = [];
let renderer;
let scene;
let camera;
let controls;
let activeTarget = null;
let runTimer = 0;
let runStartedAt = 0;
let remainingSeconds = 0;
let runActive = false;
let startPending = false;
let fullscreenReady = false;
let pointerLockReady = false;
let dailyRun = false;
let shots = 0;
let hits = 0;
let score = 0;
const raycaster = new THREE.Raycaster();
const crosshair = new THREE.Vector2(0, 0);

function getLocalDateKey(date = new Date()) {
    return date.toISOString().slice(0, 10);
}

function hashString(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function setStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.classList.toggle("is-error", isError);
}

function getMission(id) {
    return missions.find((mission) => mission.id === id);
}

function bestScoreByMission() {
    const bests = new Map();
    for (const run of savedRuns) {
        bests.set(run.missionId, Math.max(bests.get(run.missionId) ?? 0, run.score ?? 0));
    }
    return bests;
}

function getCompletedMissionIds() {
    const completed = new Set();
    for (const run of savedRuns) {
        const mission = getMission(run.missionId);
        if (mission && run.mode !== "daily" && Number(run.durationSeconds) >= mission.seconds) {
            completed.add(mission.id);
        }
    }
    return completed;
}

function getUnlockedMissionCount(completed) {
    let unlockedCount = 0;
    for (const mission of missions) {
        if (!completed.has(mission.id)) break;
        unlockedCount += 1;
    }
    return Math.min(unlockedCount + 1, missions.length);
}

function renderMissions() {
    const bests = bestScoreByMission();
    const completed = getCompletedMissionIds();
    const unlockedCount = getUnlockedMissionCount(completed);
    const completedCount = missions.filter((mission) => completed.has(mission.id)).length;
    const progressSummary = document.getElementById("aim-progress-summary");
    progressSummary.textContent =
        `${completedCount} / ${missions.length} bài hoàn thành · ` +
        `${Math.round((completedCount / missions.length) * 100)}%`;
    const fragment = document.createDocumentFragment();
    let missionIndex = 0;
    for (const [chapterIndex, chapter] of chapters.entries()) {
        const chapterMissions = chapter.missions.map((mission) => getMission(mission.id));
        const chapterCompleted = chapterMissions.filter((mission) => completed.has(mission.id)).length;
        const chapterSection = document.createElement("section");
        chapterSection.className = "aim-chapter-path";

        const chapterHeading = document.createElement("div");
        chapterHeading.className = "aim-chapter-heading";
        const chapterCopy = document.createElement("div");
        const chapterLabel = document.createElement("p");
        chapterLabel.className = "aim-chapter-label";
        chapterLabel.textContent = `CHAPTER ${String(chapterIndex + 1).padStart(2, "0")}`;
        const chapterTitle = document.createElement("h3");
        chapterTitle.textContent = chapter.title.replace(/^CHAPTER \d+\s*\/\s*/, "");
        chapterCopy.append(chapterLabel, chapterTitle);
        const chapterProgress = document.createElement("span");
        chapterProgress.className = "aim-chapter-progress";
        chapterProgress.textContent = `${chapterCompleted}/${chapter.missions.length}`;
        chapterHeading.append(chapterCopy, chapterProgress);
        chapterSection.append(chapterHeading);

        const progressTrack = document.createElement("div");
        progressTrack.className = "aim-chapter-progress-track";
        progressTrack.setAttribute("role", "progressbar");
        progressTrack.setAttribute("aria-label", `${chapter.title} progress`);
        progressTrack.setAttribute("aria-valuemin", "0");
        progressTrack.setAttribute("aria-valuemax", String(chapter.missions.length));
        progressTrack.setAttribute("aria-valuenow", String(chapterCompleted));
        const progressFill = document.createElement("span");
        progressFill.style.width = `${(chapterCompleted / chapter.missions.length) * 100}%`;
        progressTrack.append(progressFill);
        chapterSection.append(progressTrack);

        for (const mission of chapter.missions) {
            const currentIndex = missionIndex;
            missionIndex += 1;
            const isCompleted = completed.has(mission.id);
            const isLocked = currentIndex >= unlockedCount;
            const button = document.createElement("button");
            button.type = "button";
            button.className = `aim-mission-button${isCompleted ? " is-completed" : ""}` +
                `${isLocked ? " is-locked" : ""}` +
                `${mission.id === selectedMissionId ? " is-selected" : ""}`;
            button.dataset.missionId = mission.id;
            button.disabled = isLocked;
            button.setAttribute("aria-pressed", String(mission.id === selectedMissionId));
            button.setAttribute("aria-label", `${mission.title}: ${
                isLocked ? "đang khóa" : isCompleted ? "đã hoàn thành" : "đã mở khóa"
            }`);

            const number = document.createElement("span");
            number.className = "aim-mission-number";
            number.textContent = String(currentIndex + 1).padStart(2, "0");

            const copy = document.createElement("span");
            copy.className = "aim-mission-copy";
            const title = document.createElement("strong");
            title.textContent = mission.title;
            const subtitle = document.createElement("small");
            subtitle.textContent = `${mission.seconds} GIÂY · ${mission.difficulty}`;
            copy.append(title, subtitle);

            const state = document.createElement("span");
            state.className = `aim-mission-state${isCompleted ? " is-completed" : ""}`;
            const stateIcon = document.createElement("i");
            stateIcon.className = isLocked
                ? "fa-solid fa-lock"
                : isCompleted
                    ? "fa-solid fa-circle-check"
                    : "fa-solid fa-play";
            stateIcon.setAttribute("aria-hidden", "true");
            state.append(stateIcon);

            const bestScore = bests.get(mission.id);
            if (bestScore) {
                const best = document.createElement("small");
                best.className = "aim-mission-best";
                best.textContent = `${bestScore} điểm`;
                state.append(best);
            }

            button.append(number, copy, state);
            button.addEventListener("click", () => selectMission(mission.id));
            chapterSection.append(button);
        }
        fragment.append(chapterSection);
    }
    missionList.replaceChildren(fragment);
}

function renderDailyChallenge() {
    const dailyDateElement = document.getElementById("aim-daily-date");
    const [year, month, day] = dailyDate.split("-").map(Number);
    dailyDateElement.textContent = new Date(year, month - 1, day).toLocaleDateString("vi-VN");
    document.getElementById("aim-daily-title").textContent = dailyMission.title;
    document.getElementById("aim-daily-description").textContent =
        `${dailyMission.description} Thời lượng: ${dailyMission.seconds} giây · ${dailyMission.difficulty}.`;
    const completed = savedRuns.some((run) =>
        run.mode === "daily" && run.dailyKey === dailyDate && run.dailyComplete === true
    );
    document.getElementById("aim-daily-status").textContent = completed
        ? "Đã hoàn thành thử thách hôm nay"
        : "Chưa hoàn thành hôm nay";
    document.getElementById("aim-daily-status").classList.toggle("is-complete", completed);
    document.getElementById("aim-daily-start").disabled = !renderer || runActive || startPending;
}

function selectMission(missionId, isDaily = false) {
    if (runActive || startPending) return;
    const mission = getMission(missionId);
    if (!mission) return;
    if (!isDaily) {
        const missionIndex = missions.findIndex((item) => item.id === missionId);
        if (missionIndex >= getUnlockedMissionCount(getCompletedMissionIds())) return;
    }
    selectedMission = mission;
    selectedMissionId = mission.id;
    dailyRun = isDaily;
    document.getElementById("aim-workspace").classList.remove("is-training-hidden");
    const trainingRange = document.getElementById("training-range");
    trainingRange.hidden = false;
    resizeRenderer();
    document.getElementById("aim-current-chapter").textContent = mission.chapterTitle;
    document.getElementById("aim-current-title").textContent = mission.title;
    document.getElementById("aim-current-description").textContent = mission.description;
    document.getElementById("aim-timer").textContent = String(mission.seconds);
    renderMissions();
    document.getElementById("aim-overlay-title").textContent =
        isDaily ? "Thử thách daily đã sẵn sàng" : "Sẵn sàng luyện tập?";
    document.getElementById("aim-overlay-copy").textContent =
        `${isDaily ? "Bài daily hôm nay: " : ""}${mission.description} ` +
        `Thời lượng ${mission.seconds} giây. Nhấn chuột trái để bắn mục tiêu; nhấn Esc để kết thúc.`;
    overlayStartButton.disabled = !renderer;
    overlay.hidden = false;
    if (window.matchMedia("(max-width: 760px)").matches) {
        trainingRange.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

function initializeArena() {
    try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setClearColor(0x050912);
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x050912);
        scene.fog = new THREE.Fog(0x050912, 22, 65);
        camera = new THREE.PerspectiveCamera(76, 1, 0.1, 100);
        camera.position.set(0, 1.65, 5);
        controls = new PointerLockControls(camera, renderer.domElement);
        controls.addEventListener("lock", onControlsLock);
        controls.addEventListener("unlock", onControlsUnlock);
        addArenaGeometry();
        resizeRenderer();
        window.addEventListener("resize", resizeRenderer);
        renderer.setAnimationLoop(renderFrame);
        document.addEventListener("mousedown", (event) => {
            if (event.button === 0) shoot();
        });
        document.addEventListener("pointerlockerror", onPointerLockError);
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        startButton.disabled = false;
        overlayStartButton.disabled = false;
        renderDailyChallenge();
        setStatus("Phòng tập đã sẵn sàng. Chọn bài tập để bắt đầu.");
    } catch (error) {
        console.error("Không thể khởi tạo phòng tập aim 3D:", error);
        setStatus("Không thể khởi tạo đồ họa 3D. Hãy thử trình duyệt có hỗ trợ WebGL.", true);
        document.getElementById("aim-overlay-title").textContent = "Không khởi tạo được phòng tập";
        document.getElementById("aim-overlay-copy").textContent =
            "Trình duyệt hoặc thiết bị hiện tại chưa hỗ trợ WebGL. Hãy thử lại bằng trình duyệt khác.";
        startButton.disabled = true;
        overlayStartButton.disabled = true;
    }
}

function addArenaGeometry() {
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(90, 90),
        new THREE.MeshBasicMaterial({ color: 0x080d18 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.02;
    scene.add(floor);

    const grid = new THREE.GridHelper(80, 40, 0x1d4560, 0x102033);
    grid.position.y = 0.005;
    scene.add(grid);

    const backWall = new THREE.Mesh(
        new THREE.PlaneGeometry(60, 25),
        new THREE.MeshBasicMaterial({ color: 0x0b1524 })
    );
    backWall.position.set(0, 8, -27);
    scene.add(backWall);

    const pillarMaterial = new THREE.MeshBasicMaterial({ color: 0x101d30 });
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x176188 });
    for (const x of [-9, -6, 6, 9]) {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 7, 0.55), pillarMaterial);
        pillar.position.set(x, 3.5, -17 - (Math.abs(x) > 8 ? 5 : 0));
        scene.add(pillar);
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(pillar.geometry), edgeMaterial);
        edges.position.copy(pillar.position);
        scene.add(edges);
    }
}

function resizeRenderer() {
    if (!renderer || !camera) return;
    const bounds = arena.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    renderer.setSize(bounds.width, bounds.height, false);
    camera.aspect = bounds.width / bounds.height;
    camera.updateProjectionMatrix();
}

function spawnTarget(now = performance.now()) {
    if (activeTarget) {
        scene.remove(activeTarget);
        activeTarget.traverse((object) => {
            if (!object.isMesh) return;
            object.geometry.dispose();
            object.material.dispose();
        });
    }
    const radius = selectedMission.radius;
    const group = new THREE.Group();
    const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 28, 20),
        new THREE.MeshBasicMaterial({ color: 0xffc72b })
    );
    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 1.32, Math.max(0.025, radius * 0.055), 8, 40),
        new THREE.MeshBasicMaterial({ color: 0x44c8ff })
    );
    group.add(sphere, ring);
    group.position.set(
        THREE.MathUtils.randFloat(-5.3, 5.3),
        THREE.MathUtils.randFloat(1.05, 5.2),
        THREE.MathUtils.randFloat(-17, -10)
    );
    group.userData.baseX = group.position.x;
    group.userData.baseY = group.position.y;
    group.userData.phase = Math.random() * Math.PI * 2;
    group.userData.spawnedAt = now;
    activeTarget = group;
    scene.add(group);
}

function onControlsLock() {
    if (!startPending) return;
    pointerLockReady = true;
    startRunIfReady();
}

function startRunIfReady() {
    if (!startPending || !fullscreenReady || !pointerLockReady) return;
    startPending = false;
    runActive = true;
    shots = 0;
    hits = 0;
    score = 0;
    remainingSeconds = selectedMission.seconds;
    runStartedAt = performance.now();
    document.getElementById("aim-hits").textContent = "0";
    document.getElementById("aim-score").textContent = "0";
    document.getElementById("aim-timer").textContent = String(remainingSeconds);
    document.getElementById("aim-daily-start").disabled = true;
    overlay.hidden = true;
    spawnTarget(runStartedAt);
    setStatus("Đang luyện tập — nhấn Esc để kết thúc sớm.");
    runTimer = window.setInterval(() => {
        remainingSeconds = Math.max(0, selectedMission.seconds - Math.floor((performance.now() - runStartedAt) / 1000));
        document.getElementById("aim-timer").textContent = String(remainingSeconds);
        if (remainingSeconds <= 0) finishRun("Hết giờ!");
    }, 100);
}

function onControlsUnlock() {
    pointerLockReady = false;
    if (runActive) {
        finishRun("Đã kết thúc lượt tập.");
    }
    if (startPending) {
        startPending = false;
        fullscreenReady = false;
        startButton.disabled = false;
        overlayStartButton.disabled = false;
        document.getElementById("aim-daily-start").disabled = false;
        exitTrainingFullscreen();
    }
}

function onPointerLockError() {
    startPending = false;
    fullscreenReady = false;
    pointerLockReady = false;
    startButton.disabled = false;
    overlayStartButton.disabled = false;
    document.getElementById("aim-daily-start").disabled = false;
    setStatus("Trình duyệt không cấp quyền điều khiển chuột. Hãy cho phép Pointer Lock rồi thử lại.", true);
    exitTrainingFullscreen();
}

function handleFullscreenChange() {
    fullscreenReady = document.fullscreenElement === arena;
    resizeRenderer();
    if (fullscreenReady) startRunIfReady();
    if (!fullscreenReady && runActive) {
        if (controls.isLocked) controls.unlock();
        else finishRun("Đã thoát chế độ toàn màn hình.");
    }
}

function requestStart() {
    if (!renderer || !controls || runActive || startPending) return;
    if (typeof arena.requestFullscreen !== "function") {
        setStatus("Trình duyệt không hỗ trợ chế độ toàn màn hình. Hãy thử trình duyệt mới hơn.", true);
        return;
    }
    startPending = true;
    fullscreenReady = false;
    pointerLockReady = false;
    startButton.disabled = true;
    overlayStartButton.disabled = true;
    document.getElementById("aim-daily-start").disabled = true;
    setStatus("Đang mở phòng tập toàn màn hình...");

    try {
        const fullscreenRequest = arena.requestFullscreen({ navigationUI: "hide" });
        fullscreenRequest.then(() => {
            if (!startPending) return;
            fullscreenReady = document.fullscreenElement === arena;
            resizeRenderer();
            if (!fullscreenReady) {
                throw new Error("The browser did not enter fullscreen mode.");
            }
            startRunIfReady();
        }).catch((error) => {
            console.error("Không thể mở phòng tập toàn màn hình:", error);
            if (controls.isLocked) controls.unlock();
            startPending = false;
            fullscreenReady = false;
            pointerLockReady = false;
            startButton.disabled = false;
            overlayStartButton.disabled = false;
            document.getElementById("aim-daily-start").disabled = false;
            setStatus("Không thể mở toàn màn hình. Hãy cho phép chế độ fullscreen rồi thử lại.", true);
            exitTrainingFullscreen();
        });
        controls.lock();
    } catch (error) {
        console.error("Không thể yêu cầu chế độ toàn màn hình:", error);
        startPending = false;
        fullscreenReady = false;
        pointerLockReady = false;
        startButton.disabled = false;
        overlayStartButton.disabled = false;
        document.getElementById("aim-daily-start").disabled = false;
        setStatus("Không thể mở toàn màn hình. Hãy thử lại từ nút bắt đầu.", true);
        exitTrainingFullscreen();
    }
}

function exitTrainingFullscreen() {
    if (document.fullscreenElement === arena) {
        document.exitFullscreen().catch((error) => {
            console.error("Không thể thoát chế độ toàn màn hình:", error);
        });
    }
}

function shoot() {
    if (!runActive || !activeTarget) return;
    shots += 1;
    raycaster.setFromCamera(crosshair, camera);
    const intersections = raycaster.intersectObject(activeTarget, true);
    if (intersections.length > 0) {
        hits += 1;
        score += 100;
        document.getElementById("aim-hits").textContent = String(hits);
        document.getElementById("aim-score").textContent = String(score);
        spawnTarget();
    }
}

function renderFrame(now) {
    if (runActive && activeTarget && selectedMission.moving) {
        const elapsed = (now - activeTarget.userData.spawnedAt) / 1000;
        const speed = selectedMission.speed ??
            (selectedMission.id === "tracking_sweep" || selectedMission.id === "switching_triad" ? 2.4 : 1.5);
        activeTarget.position.x = activeTarget.userData.baseX + Math.sin(elapsed * speed + activeTarget.userData.phase) * 1.7;
        activeTarget.position.y = activeTarget.userData.baseY + Math.sin(elapsed * speed * 0.72) * 0.55;
    }
    if (renderer && scene && camera) renderer.render(scene, camera);
}

async function finishRun(message) {
    if (!runActive) return;
    runActive = false;
    window.clearInterval(runTimer);
    const durationSeconds = Math.min(
        selectedMission.seconds,
        Math.max(0, Math.floor((performance.now() - runStartedAt) / 1000))
    );
    const completedMission = selectedMission;
    const completedAsDaily = dailyRun;
    const result = {
        missionId: completedMission.id,
        chapterId: completedMission.chapterId,
        mode: dailyRun ? "daily" : "practice",
        dailyKey: dailyRun ? dailyDate : "",
        dailyComplete: dailyRun && durationSeconds >= completedMission.seconds,
        score,
        hits,
        shots,
        accuracy: shots > 0 ? Math.round((hits / shots) * 100) : 0,
        durationSeconds
    };
    if (activeTarget) {
        scene.remove(activeTarget);
        activeTarget = null;
    }
    if (controls.isLocked) controls.unlock();
    startButton.disabled = false;
    overlayStartButton.disabled = false;
    document.getElementById("aim-overlay-title").textContent = message;
    document.getElementById("aim-overlay-copy").textContent =
        `${completedMission.title}: ${result.hits} mục tiêu trúng / ${result.shots} lần bắn · ` +
        `${result.accuracy}% chính xác · ${result.score} điểm.`;
    overlay.hidden = false;
    dailyRun = false;
    exitTrainingFullscreen();
    selectedMissionId = completedAsDaily ? null : completedMission.id;
    renderMissions();
    document.getElementById("aim-daily-start").disabled = false;

    if (durationSeconds < 5 && shots === 0) {
        setStatus("Lượt quá ngắn và chưa có phát bắn nên không được lưu.");
        return;
    }

    try {
        await addDoc(collection(db, "aimProgress", currentUser.uid, "runs"), {
            ...result,
            createdAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Không thể lưu thành tích aim:", error);
        setStatus("Đã chơi xong nhưng không lưu được thành tích. Hãy kiểm tra kết nối và Firestore Rules.", true);
        return;
    }

    setStatus(result.durationSeconds >= completedMission.seconds
        ? "Đã lưu thành tích. Bài tập hoàn thành, bài kế tiếp đã được mở khóa."
        : "Đã lưu thành tích. Hãy chạy hết thời gian để hoàn thành và mở khóa bài kế tiếp.");
    try {
        await loadRuns();
    } catch (error) {
        console.error("Không thể tải lại thành tích sau khi lưu:", error);
        setStatus("Lượt tập đã được lưu, nhưng không thể tải lại bảng thành tích. Hãy tải lại trang.", true);
    }
}

function formatDate(value) {
    if (!value || typeof value.toDate !== "function") return "Vừa xong";
    return value.toDate().toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function renderRuns() {
    const totalHits = savedRuns.reduce((sum, run) => sum + (Number(run.hits) || 0), 0);
    const bestScore = savedRuns.reduce((best, run) => Math.max(best, Number(run.score) || 0), 0);
    document.getElementById("aim-session-count").textContent = savedRuns.length.toLocaleString("vi-VN");
    document.getElementById("aim-best-score").textContent = bestScore.toLocaleString("vi-VN");
    document.getElementById("aim-total-hits").textContent = totalHits.toLocaleString("vi-VN");
    document.getElementById("aim-record-note").textContent = `${savedRuns.length} lượt được đồng bộ`;
    renderMissions();
    renderDailyChallenge();

    if (savedRuns.length === 0) {
        recordBody.innerHTML = '<tr><td colspan="5">Chưa có thành tích. Hoàn thành một lượt tập để bắt đầu lưu kỷ lục.</td></tr>';
        return;
    }

    const fragment = document.createDocumentFragment();
    for (const run of savedRuns.slice(0, 12)) {
        const mission = getMission(run.missionId);
        const row = document.createElement("tr");
        for (const value of [
            `${mission?.title ?? "Bài tập không xác định"}${run.mode === "daily" ? " · DAILY" : ""}`,
            formatDate(run.createdAt),
            `${run.hits ?? 0} / ${run.shots ?? 0}`,
            `${run.accuracy ?? 0}%`,
            `${Number(run.score ?? 0).toLocaleString("vi-VN")} điểm`
        ]) {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.append(cell);
        }
        fragment.append(row);
    }
    recordBody.replaceChildren(fragment);
}

async function loadRuns() {
    const runsQuery = query(
        collection(db, "aimProgress", currentUser.uid, "runs"),
        orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(runsQuery);
    savedRuns = snapshot.docs.map((runDoc) => runDoc.data());
    renderRuns();
}

async function loadUser(user) {
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
        await loadRuns();
    } catch (error) {
        console.error("Không thể tải thành tích aim:", error);
        document.getElementById("aim-session-count").textContent = "—";
        document.getElementById("aim-best-score").textContent = "—";
        document.getElementById("aim-total-hits").textContent = "—";
        document.getElementById("aim-record-note").textContent = "Không tải được dữ liệu";
        recordBody.innerHTML = '<tr><td colspan="5">Không thể tải thành tích. Hãy kiểm tra kết nối hoặc quyền Firestore.</td></tr>';
        setStatus("Không tải được thành tích đã lưu. Bạn vẫn có thể luyện tập.", true);
    }

}

startButton.addEventListener("click", requestStart);
overlayStartButton.addEventListener("click", requestStart);
document.getElementById("aim-daily-start").addEventListener("click", () => {
    selectMission(dailyMission.id, true);
    requestStart();
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

renderMissions();
renderDailyChallenge();
initializeArena();

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.replace("auth.html");
        return;
    }
    await loadUser(user);
});
