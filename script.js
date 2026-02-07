// --- 1. CONFIGURATION & DATA ---
const PRODUCT_DB = {
    "DATA-TRUST-101": { status: "SAFE", name: "Mahyco Cotton Seeds (Bt)", message: "✅ GENUINE. Batch #MH-2025 verified.", expiry: "Dec 2025" },
    "FAKE-PESTICIDE-99": { status: "FAKE", name: "Counterfeit / Unknown", message: "❌ WARNING: Fake Product Detected!", expiry: "N/A" },
    "1234567890128": { status: "SAFE", name: "Generic Urea Bag (50kg)", message: "✅ Verified IFFCO Standard.", expiry: "Mar 2026" } // Example Barcode
};

const KEYWORDS_DB = ["UREA", "DAP", "ZINC", "NPK", "COTTON", "PESTICIDE", "SEED", "IFFCO", "MAHYCO"];

const CROP_LIST = ["Wheat", "Rice (Paddy)", "Cotton", "Sugarcane", "Maize", "Soybean", "Groundnut", "Mustard", "Turmeric", "Tomato", "Potato", "Onion"];

const LOCATION_DATA = {
    "Maharashtra": { "Pune": ["Haveli", "Baramati"], "Nashik": ["Malegaon", "Sinnar"] },
    "Gujarat": { "Ahmedabad": ["Sanand", "Dholka"], "Surat": ["Bardoli", "Mandvi"] },
    "Punjab": { "Ludhiana": ["Khanna", "Jagraon"], "Amritsar": ["Ajnala", "Baba Bakala"] }
};

const MANDI_DATA = {
    "Maharashtra": [ { crop: "Onion", price: "₹2,400/q", trend: "up" }, { crop: "Cotton", price: "₹7,800/q", trend: "down" } ],
    "Gujarat": [ { crop: "Groundnut", price: "₹6,200/q", trend: "up" }, { crop: "Cotton", price: "₹7,900/q", trend: "up" } ],
    "Punjab": [ { crop: "Wheat", price: "₹2,275/q", trend: "up" }, { crop: "Paddy", price: "₹2,203/q", trend: "up" } ]
};

let currentUserState = "Maharashtra";
let html5QrcodeScanner = null;
let scanTimeout = null;
let isScanningText = false;

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

// --- 3. VALIDATION LOGIC ---
function validateField(input, type) {
    let isValid = false;
    const val = input.value;
    
    if (type === 'text' && val.trim().length > 2) isValid = true;
    if (type === 'select' && val !== "") isValid = true;
    if (type === 'number') {
        if (val !== "" && !isNaN(val) && Number(val) > 0) isValid = true;
    }

    if (isValid) {
        input.classList.add("input-valid");
    } else {
        input.classList.remove("input-valid");
    }
}

// --- 4. REGISTRATION ---
function loadDistricts() {
    const s = document.getElementById("state-select").value;
    const dSel = document.getElementById("district-select");
    const vSel = document.getElementById("village-select");
    
    dSel.innerHTML = '<option value="">-- Select District --</option>'; 
    vSel.innerHTML = '<option value="">-- Select Village --</option>';
    vSel.disabled = true; dSel.disabled = true; dSel.classList.remove("input-valid"); vSel.classList.remove("input-valid");

    if (s && LOCATION_DATA[s]) {
        dSel.disabled = false;
        for (let d in LOCATION_DATA[s]) { let opt = document.createElement("option"); opt.value = d; opt.text = d; dSel.appendChild(opt); }
    }
}

function loadVillages() {
    const s = document.getElementById("state-select").value;
    const d = document.getElementById("district-select").value;
    const vSel = document.getElementById("village-select");
    vSel.innerHTML = '<option value="">-- Select Village --</option>';
    vSel.disabled = true; vSel.classList.remove("input-valid");
    
    if (s && d && LOCATION_DATA[s][d]) {
        vSel.disabled = false;
        LOCATION_DATA[s][d].forEach(v => { let opt = document.createElement("option"); opt.value = v; opt.text = v; vSel.appendChild(opt); });
    }
}

function generateCropFields() {
    const count = document.getElementById("crop-count").value;
    const container = document.getElementById("dynamic-crop-area"); 
    container.innerHTML = "";
    
    if (count > 0 && count <= 10) {
        let cropOptions = '<option value="">Select Crop</option>';
        CROP_LIST.forEach(c => { cropOptions += `<option value="${c}">${c}</option>`; });

        for (let i = 1; i <= count; i++) {
            container.innerHTML += `
            <div class="crop-row">
                <div style="flex:2">
                    <label style="margin:0;font-size:10px">Crop ${i}</label>
                    <div class="valid-wrap">
                        <select class="crop-name" onchange="validateField(this, 'select')">${cropOptions}</select>
                        <span class="tick-mark">✔</span>
                    </div>
                </div>
                <div style="flex:1">
                    <label style="margin:0;font-size:10px">Acres</label>
                    <div class="valid-wrap">
                        <input type="number" class="crop-area" min="0.1" step="0.1" placeholder="0.0" oninput="validateField(this, 'number')">
                        <span class="tick-mark">✔</span>
                    </div>
                </div>
            </div>`;
        }
    }
}

function submitRegistration() {
    const inputs = document.querySelectorAll("#login-screen input, #login-screen select");
    let allValid = true;
    
    // Simple check if all required fields have value
    inputs.forEach(i => {
        if (!i.disabled && i.value === "") allValid = false;
        if (i.type === "number" && i.value <= 0) allValid = false;
    });

    if (!allValid) { alert("Please fill all fields correctly (look for green ticks)."); return; }

    const name = document.getElementById("fname").value;
    const state = document.getElementById("state-select").value;
    const v = document.getElementById("village-select").value;

    const userData = { name: name, village: v, state: state };
    localStorage.setItem("farmerUser", JSON.stringify(userData));

    document.getElementById("success-msg").style.display = "flex";
    setTimeout(() => {
        document.getElementById("success-msg").style.display = "none";
        loginUser(name, v, state);
    }, 2000);
}

function loginUser(name, village, state) {
    currentUserState = state || "Maharashtra";
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("dashboard-screen").style.display = "block";
    document.getElementById("welcome-text").innerText = `Namaste, ${name} ji!`;
    document.getElementById("location-text").innerText = `📍 ${village}, ${state || ""}`;
    getWeatherForLocation(village, state);
}

// --- 5. WEATHER LOGIC (Same as before) ---
async function getWeatherForLocation(village, state) {
    const descDiv = document.getElementById("weather-desc");
    descDiv.innerHTML = "Fetching Location...";
    try {
        const searchQuery = `${village}, ${state}, India`;
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=1&format=json`;
        const geoRes = await fetch(geoUrl);
        const geoData = await geoRes.json();
        if (geoData.results && geoData.results.length > 0) {
            fetchWeather(geoData.results[0].latitude, geoData.results[0].longitude);
        } else {
            descDiv.innerHTML = "Weather Unavail.";
        }
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

// --- 6. NAVIGATION & LOGOUT ---
async function goHome() {
    stopScanner();
    document.getElementById("scan-interface").style.display = "none";
    document.getElementById("advisor-interface").style.display = "none";
    document.getElementById("mandi-interface").style.display = "none";
    document.getElementById("dashboard-screen").style.display = "block";
}

function logoutUser() {
    localStorage.removeItem("farmerUser");
    location.reload(); // Simplest way to reset everything
}

// --- 7. SATYA SCAN LOGIC (Enhanced) ---

function openScanner() {
    document.getElementById("dashboard-screen").style.display = "none";
    document.getElementById("scan-interface").style.display = "block";
    document.getElementById("scan-btn").style.display = "block";
    document.getElementById("scanner-controls").style.display = "none";
    document.getElementById("ocr-status").innerText = "";
}

async function startScanner() {
    document.getElementById('scan-btn').style.display = 'none';
    document.getElementById('scanner-controls').style.display = 'block';
    const timerDisplay = document.getElementById('scan-timer');
    timerDisplay.style.visibility = 'visible';
    timerDisplay.innerText = "02:00";

    // 2-Minute Timer Logic
    let timeLeft = 120;
    if (scanTimeout) clearInterval(scanTimeout);
    scanTimeout = setInterval(() => {
        timeLeft--;
        let min = Math.floor(timeLeft / 60);
        let sec = timeLeft % 60;
        timerDisplay.innerText = `0${min}:${sec < 10 ? '0' + sec : sec}`;
        
        if (timeLeft <= 0) {
            stopScanner();
            alert("⏰ Time Limit Exceeded! Could not detect code. Please try again.");
        }
    }, 1000);

    // Initialize Scanner (Codes & Barcodes)
    if (html5QrcodeScanner) { try { await html5QrcodeScanner.clear(); } catch(e){} }
    html5QrcodeScanner = new Html5Qrcode("reader");
    
    const config = { fps: 10, qrbox: 250, experimentalFeatures: { useBarCodeDetectorIfSupported: true } };
    
    try {
        await html5QrcodeScanner.start(
            { facingMode: "environment" }, 
            config,
            (decodedText) => { handleScanSuccess(decodedText); },
            (errorMessage) => { /* ignore frames without code */ }
        );
    } catch (err) {
        alert("Camera Error: " + err);
        stopScanner();
    }
}

function stopScanner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop().then(() => html5QrcodeScanner.clear()).catch(e=>{});
        html5QrcodeScanner = null;
    }
    if (scanTimeout) clearInterval(scanTimeout);
    document.getElementById('scan-timer').style.visibility = 'hidden';
    document.getElementById('scan-btn').style.display = 'block';
    document.getElementById('scanner-controls').style.display = 'none';
}

function handleScanSuccess(code) {
    stopScanner(); // Stop camera and timer
    showResultScreen(code, "CODE");
}

// --- TEXT SCANNING (OCR) ---
async function captureAndReadText() {
    const statusDiv = document.getElementById("ocr-status");
    statusDiv.innerText = "📸 Capturing & Analyzing Text...";
    
    // We need to grab the video element created by html5-qrcode
    const video = document.querySelector("#reader video");
    if (!video) { statusDiv.innerText = "Error: Camera not active"; return; }

    // Create a canvas to draw the frame
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Stop scanner temporarily to save resources
    stopScanner();
    
    statusDiv.innerText = "🧠 Reading Text (this takes a moment)...";

    try {
        const { data: { text } } = await Tesseract.recognize(canvas, 'eng');
        const upperText = text.toUpperCase();
        console.log("OCR Result:", upperText);

        // Check for keywords
        const foundKeyword = KEYWORDS_DB.find(key => upperText.includes(key));
        
        if (foundKeyword) {
            showResultScreen(foundKeyword, "TEXT");
        } else {
            alert(`No agricultural keywords found in text.\nDetected: "${text.substring(0, 20)}..."\nTry scanning a label with clear text like 'UREA' or 'DAP'.`);
            document.getElementById("scan-btn").style.display = "block"; // Reset
            statusDiv.innerText = "";
        }
    } catch (err) {
        alert("OCR Error: " + err);
        statusDiv.innerText = "";
    }
}

// --- RESULT DISPLAY ---
function showResultScreen(content, type) {
    document.getElementById("scan-interface").style.display = "none";
    document.getElementById("scan-result-screen").style.display = "block";
    document.getElementById("res-code-top").innerText = content;
    
    const resBox = document.getElementById("res-box-large");
    resBox.className = "result-large";
    resBox.innerHTML = "<h3>🔄 Verifying...</h3>";

    setTimeout(() => {
        let data = null;

        if (type === "CODE") {
            data = PRODUCT_DB[content];
        } else if (type === "TEXT") {
            // If it's text, we simulate a finding based on keyword
            data = { 
                status: "SAFE", 
                name: `Verified Product (${content})`, 
                message: `✅ Text Analysis confirmed keyword: ${content}`,
                expiry: "Check package"
            };
        }

        if (data) {
            if (data.status === "SAFE") {
                resBox.className = "result-large safe";
                resBox.innerHTML = `<h2 style="margin:0">✅ GENUINE</h2><h4>${data.name}</h4><p>${data.message}</p><small>Expiry: ${data.expiry}</small>`;
            } else {
                resBox.className = "result-large fake";
                resBox.innerHTML = `<h2 style="margin:0">❌ ALERT</h2><h4>${data.name}</h4><p>${data.message}</p>`;
            }
        } else {
            // Product not found logic
            resBox.className = "result-large";
            resBox.style.background = "#eeeeee"; 
            resBox.style.border = "2px solid #999";
            resBox.style.color = "#555";
            resBox.innerHTML = `<h2 style="margin:0">ℹ️ NO DATA</h2><p>Information for this product is not available in our database.</p>`;
        }
    }, 1000);
}

function exitScanResult() {
    document.getElementById("scan-result-screen").style.display = "none";
    openScanner();
}

function openMandi() {
    document.getElementById("dashboard-screen").style.display = "none";
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
function openAdvisor() {
    document.getElementById("dashboard-screen").style.display = "none";
    document.getElementById("advisor-interface").style.display = "block";
}
function startVoiceInput() {
    if (!('webkitSpeechRecognition' in window)) { alert("Use Chrome for Voice."); return; }
    const r = new webkitSpeechRecognition(); r.lang = 'en-US'; 
    r.onstart = () => document.getElementById("advice-query").placeholder = "Listening...";
    r.onresult = (e) => { document.getElementById("advice-query").value = e.results[0][0].transcript; getAdvice(); };
    r.start();
}
function getAdvice() {
    const q = document.getElementById("advice-query").value.toLowerCase();
    const r = document.getElementById("advice-result");
    r.innerHTML = "Checking...";
    setTimeout(() => {
        if(q.includes("leaf")) r.innerHTML = "🍂 <b>Diagnosis:</b> Deficiency suspected. Spray NPK.";
        else if(q.includes("price")) r.innerHTML = "💰 <b>Market:</b> Rates are stable.";
        else r.innerHTML = "🙏 Ask about Diseases, Prices, or Weather.";
    }, 500);
}
