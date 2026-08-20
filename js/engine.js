// js/engine.js

// PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE:
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbze1WdL4lUn_6W3kYqJKcIJAND6M2t0CpWNrb3XbmMD3pG2gHSoRSUSXSOzQJkUmMP0/exec";

// Global Session Variables
let className = "";
let classNo = "";
let studentName = "";
let startTime = null;
let currentQ = 0;
let score = 0;
let questions = [];
let userAns = "";

// Scratchpad Variables
let canvas, ctx, drawing = false;

/**
 * 1. Initialize Student Session & Start Timer
 */
function startExercise(topicName, levelName, questionList) {
    className = document.getElementById("student-class").value.trim();
    classNo = document.getElementById("student-no").value.trim();
    studentName = document.getElementById("student-name").value.trim();

    if (!className || !classNo || !studentName) {
        alert("Please complete all student details before starting.");
        return;
    }

    questions = questionList;
    document.getElementById("start-modal").style.display = "none";
    startTime = new Date();
    
    loadCurrentQuestion();
    initScratchpad();
}

/**
 * 2. Keypad Input Helper
 */
function pressKey(val) {
    if (val === 'DEL') {
        userAns = userAns.slice(0, -1);
    } else if (val === 'CLR') {
        userAns = "";
    } else {
        userAns += val;
    }
    
    const display = document.getElementById("user-input");
    if (display) {
        display.innerText = "= " + userAns;
    }
}

/**
 * 3. Question Loader
 */
function loadCurrentQuestion() {
    const qCountElem = document.getElementById("q-count");
    const qLabelElem = document.getElementById("q-label");
    const problemElem = document.getElementById("math-problem");
    const displayElem = document.getElementById("user-input");

    if (qCountElem) qCountElem.innerText = currentQ + 1;
    if (qLabelElem) qLabelElem.innerText = `Question ${currentQ + 1}`;
    if (problemElem) problemElem.innerHTML = questions[currentQ].expr;
    
    userAns = "";
    if (displayElem) displayElem.innerText = "= ";
}

/**
 * 4. Submit Answer & Grade
 */
function submitAnswer(topicName, levelName) {
    if (!userAns) return;

    const cleanInput = userAns.replace(/\s+/g, '').toLowerCase();
    const currentValid = questions[currentQ].valid.map(v => v.toLowerCase());

    if (currentValid.includes(cleanInput)) {
        score++;
        const scoreElem = document.getElementById("score-count");
        if (scoreElem) scoreElem.innerText = score;
    }

    currentQ++;
    if (currentQ < 10) {
        loadCurrentQuestion();
    } else {
        finishExerciseSession(topicName, levelName);
    }
}

/**
 * 5. Complete Session & Post Data to Google Sheets
 */
function finishExerciseSession(topicName, levelName) {
    const endTime = new Date();
    const responseTime = Math.round((endTime - startTime) / 1000); // Time in seconds

    const workspaceElem = document.querySelector(".workspace");
    if (workspaceElem) {
        workspaceElem.innerHTML = `
            <div class="panel" style="grid-column: span 2; text-align: center; justify-content: center; padding: 40px;">
                <h2 style="color:#16a34a; font-size:2rem; margin-top:0;">Exercise Complete! 🎉</h2>
                <p style="font-size:1.2rem;">Score: <b>${score} / 10</b></p>
                <p style="font-size:1.2rem;">Time Spent: <b>${responseTime} seconds</b></p>
                <p id="status-msg" style="color:#64748b; font-weight: 500;">Submitting results to Google Sheets...</p>
                <br>
                <a href="index.html" style="display:inline-block; padding:12px 24px; background:#4f46e5; color:white; text-decoration:none; border-radius:8px; font-weight:600;">Return to Homepage</a>
            </div>
        `;
    }

    // Submit payload to Google Apps Script
    if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL !== "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE") {
        fetch(GOOGLE_SCRIPT_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                className: className,
                classNo: classNo,
                studentName: studentName,
                topic: topicName,
                level: levelName,
                score: `${score}/10`,
                responseTime: responseTime
            })
        })
        .then(() => {
            const msgElem = document.getElementById("status-msg");
            if (msgElem) {
                msgElem.innerText = "Result saved successfully to Google Sheets!";
                msgElem.style.color = "#16a34a";
            }
        })
        .catch(() => {
            const msgElem = document.getElementById("status-msg");
            if (msgElem) {
                msgElem.innerText = "Error saving result to server.";
                msgElem.style.color = "#dc2626";
            }
        });
    }
}

/**
 * 6. Scratchpad Canvas Logic (Mouse + iPad Touch/Apple Pencil)
 */
function initScratchpad(bgType = "blank") {
    canvas = document.getElementById("scratchpad");
    if (!canvas) return;

    ctx = canvas.getContext("2d");
    
    // Scale canvas resolution to display size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1e293b";

    if (bgType === "grid") {
        drawGridBackground();
    }

    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    }

    function startDraw(e) {
        drawing = true;
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    }

    function draw(e) {
        if (!drawing) return;
        const pos = getPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    }

    function stopDraw() { drawing = false; }

    canvas.addEventListener("mousedown", startDraw);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDraw);

    canvas.addEventListener("touchstart", (e) => { startDraw(e); e.preventDefault(); });
    canvas.addEventListener("touchmove", (e) => { draw(e); e.preventDefault(); });
    canvas.addEventListener("touchend", stopDraw);
}

function clearScratchpad(bgType = "blank") {
    if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (bgType === "grid") {
            drawGridBackground();
        }
    }
}

function drawGridBackground() {
    if (!ctx || !canvas) return;
    const step = 30;
    ctx.save();
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;

    for (let x = 0; x < canvas.width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    ctx.restore();
}
