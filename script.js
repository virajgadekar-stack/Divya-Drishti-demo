// --- 1. CONFIGURATION & DATA ---
const PRODUCT_DB = {
    "DATA-TRUST-101": { status: "SAFE", name: "Mahyco Cotton Seeds (Bt)", message: "✅ GENUINE. Batch #MH-2025 verified.", expiry: "2026-12-31" },
    "FAKE-PESTICIDE-99": { status: "FAKE", name: "Counterfeit / Unknown", message: "❌ WARNING: Fake Product Detected!", expiry: "N/A" },
    "OLD-FERT-2020": { status: "SAFE", name: "DAP Fertilizer (Old Batch)", message: "⚠️ Verified but Check Date.", expiry: "2022-01-01" },
    "1234567890128": { status: "SAFE", name: "Generic Urea Bag (50kg)", message: "✅ Verified IFFCO Standard.", expiry: "2026-03-15" }
};

const KEYWORDS_DB = ["UREA", "DAP", "ZINC", "NPK", "COTTON", "PESTICIDE", "SEED", "IFFCO", "MAHYCO"];

const FERTILIZER_ADVISORY_DB = {
    "Wheat": [ { days: 21, msg: "CRI Stage: Apply Urea + Zinc. Irrigate now." }, { days: 45, msg: "Tillering: Apply Urea. Check for yellowing." }, { days: 65, msg: "Flowering: Spray NPK 0:52:34." } ],
    "Rice (Paddy)": [ { days: 15, msg: "Seedling: Apply Zinc Sulfate." }, { days: 30, msg: "Tillering: Top dress with Urea." } ],
    "Cotton": [ { days: 45, msg: "Square Formation: Magnesium Sulfate + NPK 19:19:19." }, { days: 70, msg: "Flowering: Spray Boron." } ],
    "General": [ { days: 0, msg: "Basal Dose: Ensure DAP/SSP is applied." } ]
};

const CROP_LIST = ["Wheat", "Rice (Paddy)", "Cotton", "Sugarcane", "Maize", "Soybean", "Groundnut", "Mustard", "Turmeric", "Tomato", "Potato", "Onion"];
const LOCATION_DATA = { "Maharashtra": { "Pune": ["Haveli", "Baramati"], "Nashik": ["Malegaon", "Sinnar"] }, "Gujarat": { "Ahmedabad": ["Sanand", "Dholka"], "Surat": ["Bardoli", "Mandvi"] }, "Punjab": { "Ludhiana": ["Khanna", "Jagraon"], "Amritsar": ["Ajnala", "Baba Bakala"] } };
const MANDI_DATA = { "Maharashtra": [ { crop: "Onion", price: "₹2,400/q", trend: "up" }, { crop: "Cotton", price: "₹7,800/q", trend: "down" } ], "Gujarat": [ { crop: "Groundnut", price: "₹6,200/q", trend: "up" }, { crop: "Cotton", price: "₹7,900/q", trend: "up" } ], "Punjab": [ { crop: "Wheat", price: "₹2,275/q", trend: "up" }, { crop: "Paddy", price: "₹2,203/q", trend: "up" } ] };

let currentUserState = "Maharashtra";
let html5QrcodeScanner = null;
let scanTimeout = null;

// --- 2. INITIALIZATION ---
window.onload = function() {
    const savedUser = localStorage.getItem("farmerUser");
    if (savedUser) {
        const user = JSON.parse(savedUser);
        loginUser(user.name, user.village, user.state);
    }
    const stateSelect = document.getElementById("state-select");
    if(stateSelect) {
        for (let state in LOCATION_DATA) {
            let opt = document.createElement("option"); opt.value = state; opt.text = state;
            stateSelect.appendChild(opt);
        }
    }
};

// --- 3. VALIDATION & FORMS ---
function validateField(input, type) {
    let isValid = false;
    const val = input.value;
    if (type === 'text' && val.trim().length > 2) isValid = true;
    if (type === 'select' && val !== "") isValid = true;
    if (type === 'number' && val !== "" && !isNaN(val) && Number(val) > 0) isValid = true;
    
    if (isValid) input.classList.add("input-valid");
    else input.classList.remove("input-valid");
}

function loadDistricts() {
    const s = document.getElementById("state-select").value;
    const dSel = document.getElementById("district-select");
    const vSel = document.getElementById("village-select");
    dSel.innerHTML = '<option value="">-- Select District --</option>'; vSel.innerHTML = '<option value="">-- Select Village --</option>';
    vSel.disabled = true; dSel.disabled = true; dSel.classList.remove("input-valid"); vSel.classList.remove("input-valid");
    if (s && LOCATION_DATA[s]) { dSel.disabled = false; for (let d in LOCATION_DATA[s]) { let opt = document.createElement("option"); opt.value = d; opt.text = d; dSel.appendChild(opt); } }
}
function loadVillages() {
    const s = document.getElementById("state-select").value;
    const d = document.getElementById("district-select").value;
    const vSel = document.getElementById("village-select");
    vSel.innerHTML = '<option value="">-- Select Village --</option>'; vSel.disabled = true; vSel.classList.remove("input-valid");
    if (s && d && LOCATION_DATA[s][d]) { vSel.disabled = false; LOCATION_DATA[s][d].forEach(v => { let opt = document.createElement("option"); opt.value = v; opt.text = v; vSel.appendChild(opt); }); }
}
function generateCropFields() {
    const count = document.getElementById("crop-count").value;
    const container = document.getElementById("dynamic-crop-area"); container.innerHTML = "";
    if (count > 0 && count <= 10) {
        let cropOptions = '<option value="">Select Crop</option>';
        CROP_LIST.forEach(c => { cropOptions += `<option value="${c}">${c}</option>`; });
        for (let i = 1; i <= count; i++) {
            container.innerHTML += `<div class="crop-row"><div style="flex:2"><label style="margin:0;font-size:10px">Crop ${i}</label><div class="valid-wrap"><select class="crop-name" onchange="validateField(this, 'select')">${cropOptions}</select><span class="tick-mark">✔</span></div></div><div style="flex:1"><label style="margin:0;font-size:10px">Acres</label><div class="valid-wrap"><input type="number" class="crop-area" min="0.1" step="0.1" placeholder="0.0" oninput="validateField(this, 'number')"><span class="tick-mark">✔</span></div></div></div>`;
        }
    }
}

function submitRegistration() {
    const inputs = document.querySelectorAll("#login-screen input, #login-screen select");
    let allValid = true;
    inputs.forEach(i => { if (!i.disabled && i.value === "") allValid = false; if (i.type === "number" && i.value <= 0) allValid = false; });
    if (!allValid) { alert("Please fill all fields correctly."); return; }

    const name = document.getElementById("fname").value;
    const state = document.getElementById("state-select").value;
    const v = document.getElementById("village-select").value;
    
    // Save Crops
    const cropSelects = document.querySelectorAll(".crop-name");
    let myCrops = [];
    cropSelects.forEach(s => { if(s.value) myCrops.push(s.value); });

    const userData = { name: name, village: v, state: state, crops: myCrops };
    localStorage.setItem("farmerUser", JSON.stringify(userData));

    document.getElementById("success-msg").style.display = "flex";
    setTimeout(() => { document.getElementById("success-msg").style.display = "none"; loginUser(name, v, state); }, 2000);
}

function loginUser(name, village, state) {
    currentUserState = state || "Maharashtra";
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("dashboard-screen").style.display = "block";
    document.getElementById("welcome-text").innerText = `Namaste, ${name} ji!`;
    document.getElementById("location-text").innerText = `📍 ${village}, ${state || ""}`;
    getWeatherForLocation(village, state);
}

// --- 4. NAVIGATION & FEATURES ---
function goHome() {
    stopScanner();
    document.querySelectorAll(".container > div").forEach(d => {
        if(d.id !== 'success-msg') d.style.display = "none";
    });
    document.getElementById("dashboard-screen").style.display = "block";
}
function logoutUser() { localStorage.removeItem("farmerUser"); location.reload(); }

// --- 5. WEATHER LOGIC ---
async function getWeatherForLocation(village, state) {
    const descDiv = document.getElementById("weather-desc");
    descDiv.innerHTML = "Fetching Location...";
    try {
        const searchQuery = `${village}, ${state}, India`;
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=1&format=json`;
        const geoRes = await fetch(geoUrl);
        const geoData = await geoRes.json();
        if (geoData.results && geoData.results.length > 0) { fetchWeather(geoData.results[0].latitude, geoData.results[0].longitude); } 
        else { descDiv.innerHTML = "Weather Unavail."; }
    } catch (e) { descDiv.innerHTML = "Offline"; }
}
async function fetchWeather(lat, lon) {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
        const r = await fetch(url);
        const d = await r.json();
        if (d.current_weather) {
            document.getElementById("weather-temp").innerText = `${d.current_weather.temperature}°C`;
            document.getElementById("weather-desc").innerText = "Updated just now";
        }
    } catch (e) {}
}
function getRealWeather() { navigator.geolocation.getCurrentPosition((p) => fetchWeather(p.coords.latitude, p.coords.longitude)); }

// --- 6. SATYA SCAN & EXPIRY LOGIC (FIXED) ---
function openScanner() {
    goHome(); document.getElementById("dashboard-screen").style.display = "none";
    document.getElementById("scan-interface").style.display = "block";
    document.getElementById("scan-btn").style.display = "block";
    document.getElementById("scanner-controls").style.display = "none";
    document.getElementById("ocr-status").innerText = "";
}

async function startScanner() {
    document.getElementById('scan-btn').style.display = 'none';
    document.getElementById('scanner-controls').style.display = 'block';
    const timerDisplay = document.getElementById('scan-timer');
    timerDisplay.style.visibility = 'visible'; timerDisplay.innerText = "02:00";
    
    let timeLeft = 120;
    if (scanTimeout) clearInterval(scanTimeout);
    scanTimeout = setInterval(() => {
        timeLeft--;
        let min = Math.floor(timeLeft / 60), sec = timeLeft % 60;
        timerDisplay.innerText = `0${min}:${sec < 10 ? '0' + sec : sec}`;
        if (timeLeft <= 0) { stopScanner(); alert("⏰ Time Limit Exceeded!"); }
    }, 1000);

    if (html5QrcodeScanner) { try { await html5QrcodeScanner.clear(); } catch(e){} }
    html5QrcodeScanner = new Html5Qrcode("reader");
    
    // Standard Config for QR and Barcode
    const config = { fps: 10, qrbox: 250 };
    
    try { await html5QrcodeScanner.start({ facingMode: "environment" }, config, (t) => { handleScanSuccess(t); }, (e) => {}); }
    catch (err) { alert("Camera Error: " + err); stopScanner(); }
}

function stopScanner() {
    if (html5QrcodeScanner) { html5QrcodeScanner.stop().then(() => html5QrcodeScanner.clear()).catch(e=>{}); html5QrcodeScanner = null; }
    if (scanTimeout) clearInterval(scanTimeout);
    document.getElementById('scan-timer').style.visibility = 'hidden';
}

function handleScanSuccess(code) {
    stopScanner();
    showResultScreen(code, "CODE");
}

function showResultScreen(content, type) {
    document.getElementById("scan-interface").style.display = "none";
    document.getElementById("scan-result-screen").style.display = "block";
    document.getElementById("res-code-top").innerText = content;
    const resBox = document.getElementById("res-box-large");
    resBox.className = "result-large"; resBox.innerHTML = "<h3>🔄 Verifying...</h3>";

    setTimeout(() => {
        let data = (type === "CODE") ? PRODUCT_DB[content] : null;

        // If not found in DB but it's a valid code, show unknown
        if (data) {
            // Expiry Check
            let isExpired = false;
            if (data.expiry && data.expiry !== "N/A") {
                const expDate = new Date(data.expiry);
                const today = new Date();
                // Reset times to compare dates only
                today.setHours(0,0,0,0);
                if (today > expDate) isExpired = true;
            }

            if (data.status === "SAFE") {
                if (isExpired) {
                    resBox.className = "result-large expired";
                    resBox.innerHTML = `<h2 style="margin:0">⚠️ EXPIRED</h2><h4>${data.name}</h4><p>Expired on <b>${data.expiry}</b>.</p><p><b>DO NOT USE.</b></p>`;
                } else {
                    resBox.className = "result-large safe";
                    resBox.innerHTML = `<h2 style="margin:0">✅ GENUINE</h2><h4>${data.name}</h4><p>${data.message}</p><small>Exp: ${data.expiry}</small>`;
                }
            } else {
                resBox.className = "result-large fake";
                resBox.innerHTML = `<h2 style="margin:0">❌ ALERT</h2><h4>${data.name}</h4><p>${data.message}</p>`;
            }
        } else {
            // Check if it's a Text Scan result
            if(type === "TEXT") {
                resBox.className = "result-large safe";
                resBox.innerHTML = `<h2 style="margin:0">✅ TEXT DETECTED</h2><h4>Found: ${content}</h4><p>This keyword indicates a valid agricultural product type.</p>`;
            } else {
                resBox.className = "result-large";
                resBox.style.background = "#eeeeee"; resBox.style.border = "2px solid #999"; resBox.style.color = "#555";
                resBox.innerHTML = `<h2 style="margin:0">ℹ️ NO DATA</h2><p>Product Code: ${content}</p><p>Not found in the database.</p>`;
            }
        }
    }, 1000);
}
function exitScanResult() { document.getElementById("scan-result-screen").style.display = "none"; openScanner(); }

async function captureAndReadText() { 
    const statusDiv = document.getElementById("ocr-status");
    statusDiv.innerText = "📸 Capturing...";
    
    const video = document.querySelector("#reader video");
    if (!video) { statusDiv.innerText = "Camera not active"; return; }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    
    stopScanner(); // Pause camera
    statusDiv.innerText = "🧠 Analyzing Text...";
    
    try {
        const { data: { text } } = await Tesseract.recognize(canvas, 'eng');
        const upper = text.toUpperCase();
        console.log(upper);
        const keyword = KEYWORDS_DB.find(k => upper.includes(k));
        
        if (keyword) showResultScreen(keyword, "TEXT");
        else {
            alert("No agricultural keywords found.");
            openScanner(); // Restart
        }
    } catch(e) { alert("OCR Error"); openScanner(); }
}

// --- 7. POSHAN TRACKER ---
function openPoshan() {
    goHome(); document.getElementById("dashboard-screen").style.display = "none";
    document.getElementById("poshan-interface").style.display = "block";
    const user = JSON.parse(localStorage.getItem("farmerUser"));
    const cropSel = document.getElementById("advisory-crop-select");
    cropSel.innerHTML = "";
    if (user && user.crops && user.crops.length > 0) {
        user.crops.forEach(c => { let opt = document.createElement("option"); opt.value = c; opt.text = c; cropSel.appendChild(opt); });
    } else { cropSel.innerHTML = "<option>No crops registered</option>"; }
}

function switchPoshanTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active-tab'));
    if(tabName === 'log') document.getElementById("btn-log-tab").classList.add('active-tab');
    else document.getElementById("btn-adv-tab").classList.add('active-tab');
    
    document.getElementById('tab-log').style.display = (tabName === 'log') ? 'block' : 'none';
    document.getElementById('tab-advisory').style.display = (tabName === 'advisory') ? 'block' : 'none';
}

function addToLog() {
    const name = document.getElementById("log-item-name").value;
    const date = document.getElementById("log-item-date").value;
    const list = document.getElementById("log-list");
    if (name && date) {
        if(list.querySelector(".empty-msg")) list.querySelector(".empty-msg").style.display = "none";
        const li = document.createElement("li");
        li.innerHTML = `<span>${name}</span> <span style="color:#666; font-size:12px;">${date}</span>`;
        list.appendChild(li);
        document.getElementById("log-item-name").value = "";
    } else alert("Enter details.");
}

function getFertilizerAdvice() {
    const crop = document.getElementById("advisory-crop-select").value;
    const days = parseInt(document.getElementById("crop-age-days").value);
    const out = document.getElementById("advisory-output");
    if (!crop || isNaN(days)) { alert("Enter days."); return; }
    
    let advice = `<b>${crop} (Day ${days}):</b><br>`;
    let found = false;
    if (FERTILIZER_ADVISORY_DB[crop]) {
        for (let s of FERTILIZER_ADVISORY_DB[crop]) {
            if (Math.abs(days - s.days) <= 10) { advice += `👉 ${s.msg}`; found = true; break; }
        }
    }
    if (!found) advice += "✅ Standard growth phase. Maintain irrigation.";
    out.innerHTML = advice; out.style.display = "block";
}

// --- 8. AGRI GYANI (CHAT FIXED) ---
function openAdvisor() { goHome(); document.getElementById("dashboard-screen").style.display = "none"; document.getElementById("advisor-interface").style.display = "flex"; }

function handleChatEnter(e) { if(e.key === "Enter") sendChat(); }

function sendChat() {
    const input = document.getElementById("advice-query");
    const txt = input.value.trim();
    if(!txt) return;
    
    addMessage(txt, "user");
    input.value = "";
    
    setTimeout(() => {
        let response = "I am not sure about that. Try asking about 'Diseases' or 'Prices'.";
        const q = txt.toLowerCase();
        
        if(q.includes("leaf") || q.includes("yellow")) response = "🍂 <b>Diagnosis:</b> Nitrogen Deficiency suspected.\n👉 <b>Remedy:</b> Apply Urea (20kg/acre) or spray NPK 19:19:19.";
        else if(q.includes("price") || q.includes("rate") || q.includes("mandi")) response = "💰 <b>Market Update:</b> Onion prices are up (₹2400/q). Cotton is slightly down.";
        else if(q.includes("weather") || q.includes("rain")) response = "🌤️ <b>Weather:</b> Clear skies expected for the next 3 days. Good for spraying.";
        else if(q.includes("hello") || q.includes("hi")) response = "Namaste! How can I help your farm today?";
        
        addMessage(response, "bot");
    }, 600);
}

function addMessage(txt, sender) {
    const history = document.getElementById("chat-history");
    const div = document.createElement("div");
    div.className = `chat-msg ${sender}-msg`;
    div.innerHTML = txt;
    history.appendChild(div);
    history.scrollTop = history.scrollHeight;
}

function startVoiceInput() {
    if (!('webkitSpeechRecognition' in window)) { alert("Use Chrome for Voice."); return; }
    const r = new webkitSpeechRecognition(); r.lang = 'en-US'; 
    const btn = document.getElementById("mic-btn");
    btn.classList.add("mic-listening");
    r.onresult = (e) => { 
        document.getElementById("advice-query").value = e.results[0][0].transcript; 
        btn.classList.remove("mic-listening");
        sendChat(); // Auto send
    };
    r.onend = () => btn.classList.remove("mic-listening");
    r.start();
}

// --- 9. MANDI ---
function openMandi() {
    goHome(); document.getElementById("dashboard-screen").style.display = "none";
    document.getElementById("mandi-interface").style.display = "block";
    const container = document.getElementById("mandi-table-container");
    const rates = MANDI_DATA[currentUserState] || MANDI_DATA["Maharashtra"];
    let html = `<table class="mandi-table"><tr><th>Crop</th><th>Price</th><th>Trend</th></tr>`;
    rates.forEach(item => {
        const arrow = item.trend === "up" ? "▲" : "▼";
        const colorClass = item.trend === "up" ? "price-up" : "price-down";
        html += `<tr><td>${item.crop}</td><td>${item.price}</td><td class="${colorClass}">${arrow}</td></tr>`;
    });
    html += `</table>`;
    container.innerHTML = html;
}
// Keep existing DB and Logic. Update UI helper functions below:

// --- NAVIGATION HELPERS ---
function showScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active-screen'));
    // Show target
    document.getElementById(screenId).classList.add('active-screen');
    
    // Header logic
    if (screenId === 'dashboard-screen') {
        document.getElementById('main-header').style.display = 'flex';
    } else {
        document.getElementById('main-header').style.display = 'none';
    }
}

function goHome() {
    stopScanner();
    showScreen('dashboard-screen');
}

function openScanner() { showScreen('scan-interface'); }
function openAdvisor() { showScreen('advisor-interface'); }
function openMandi() { showScreen('mandi-interface'); openMandiLogic(); } // Call logic to load table
function openPoshan() { showScreen('poshan-interface'); loadCropsForAdvisory(); }

function loginUser(name, village, state) {
    currentUserState = state || "Maharashtra";
    showScreen('dashboard-screen');
    document.getElementById("location-text").innerText = `📍 ${village}, ${state}`;
    getWeatherForLocation(village, state);
}

// --- SCAN RESULT STYLING ---
function showResultScreen(content, type) {
    showScreen('scan-result-screen');
    const resIcon = document.getElementById("res-icon");
    const resStatus = document.getElementById("res-status");
    const resName = document.getElementById("res-name");
    const resMsg = document.getElementById("res-msg");
    const resExp = document.getElementById("res-exp");

    resStatus.innerText = "Verifying...";
    resIcon.innerText = "🔍";

    setTimeout(() => {
        let data = (type === "CODE") ? PRODUCT_DB[content] : null;

        if (data) {
            let isExpired = false;
            if (data.expiry && data.expiry !== "N/A") {
                const expDate = new Date(data.expiry);
                const today = new Date();
                today.setHours(0,0,0,0);
                if (today > expDate) isExpired = true;
            }

            resName.innerText = data.name;
            resExp.innerText = data.expiry;

            if (data.status === "SAFE") {
                if (isExpired) {
                    resIcon.innerText = "⚠️";
                    resStatus.innerText = "EXPIRED";
                    resStatus.style.color = "#d63031"; // Red
                    resMsg.innerText = "This product has expired. Do not use.";
                } else {
                    resIcon.innerText = "✅";
                    resStatus.innerText = "GENUINE";
                    resStatus.style.color = "#00b894"; // Green
                    resMsg.innerText = data.message;
                }
            } else {
                resIcon.innerText = "❌";
                resStatus.innerText = "FAKE ALERT";
                resStatus.style.color = "#d63031";
                resMsg.innerText = data.message;
            }
        } else if (type === "TEXT") {
            resIcon.innerText = "📝";
            resStatus.innerText = "Text Detected";
            resStatus.style.color = "#0984e3";
            resName.innerText = content;
            resMsg.innerText = "Agricultural keyword found.";
            resExp.innerText = "N/A";
        } else {
            resIcon.innerText = "❔";
            resStatus.innerText = "Unknown";
            resStatus.style.color = "#636e72";
            resName.innerText = "Code: " + content;
            resMsg.innerText = "Product not found in database.";
            resExp.innerText = "--";
        }
    }, 800);
}

// --- CHAT UI UPDATE ---
function addMessage(txt, sender) {
    const history = document.getElementById("chat-history");
    const div = document.createElement("div");
    div.className = `msg ${sender}`;
    div.innerHTML = `<div class="bubble">${txt}</div>`;
    history.appendChild(div);
    history.scrollTop = history.scrollHeight;
}

// Ensure Mandi Table logic uses new class names
function openMandiLogic() {
    const container = document.getElementById("mandi-table-container");
    const rates = MANDI_DATA[currentUserState] || MANDI_DATA["Maharashtra"];
    let html = `<table class="mandi-table"><tr><th>Crop</th><th>Price</th><th>Trend</th></tr>`;
    rates.forEach(item => {
        const arrow = item.trend === "up" ? "▲" : "▼";
        const colorClass = item.trend === "up" ? "trend-up" : "trend-down";
        html += `<tr><td>${item.crop}</td><td>${item.price}</td><td class="${colorClass}">${arrow}</td></tr>`;
    });
    html += `</table>`;
    container.innerHTML = html;
}

// Add these to existing script.js to replace the old navigation logic.
