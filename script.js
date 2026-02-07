// --- 1. LOCAL DATABASE SIMULATION ---
const PRODUCT_DB = {
    "DATA-TRUST-101": { status: "SAFE", name: "Mahyco Cotton Seeds (Bt)", message: "✅ GENUINE. Batch #MH-2025 verified.", expiry: "Dec 2025" },
    "FAKE-PESTICIDE-99": { status: "FAKE", name: "Counterfeit / Unknown", message: "❌ WARNING: Fake Product Detected!", expiry: "N/A" }
};

const LOCATION_DATA = {
    "Maharashtra": { "Pune": ["Haveli", "Baramati"], "Nashik": ["Malegaon", "Sinnar"] },
    "Gujarat": { "Ahmedabad": ["Sanand", "Dholka"], "Surat": ["Bardoli", "Mandvi"] },
    "Punjab": { "Ludhiana": ["Khanna", "Jagraon"], "Amritsar": ["Ajnala", "Baba Bakala"] }
};

// Simulated Mandi Data
const MANDI_DATA = {
    "Maharashtra": [
        { crop: "Onion", price: "₹2,400/q", trend: "up" },
        { crop: "Cotton", price: "₹7,800/q", trend: "down" },
        { crop: "Soybean", price: "₹4,600/q", trend: "up" }
    ],
    "Gujarat": [
        { crop: "Groundnut", price: "₹6,200/q", trend: "up" },
        { crop: "Cotton", price: "₹7,900/q", trend: "up" },
        { crop: "Jeera", price: "₹25,000/q", trend: "down" }
    ],
    "Punjab": [
        { crop: "Wheat", price: "₹2,275/q", trend: "up" },
        { crop: "Paddy", price: "₹2,203/q", trend: "up" },
        { crop: "Maize", price: "₹2,090/q", trend: "down" }
    ]
};

// --- 2. INITIALIZATION ---
let currentUserState = "Maharashtra"; // Default

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

// --- 3. REGISTRATION LOGIC ---
function loadDistricts() {
    const s = document.getElementById("state-select").value;
    const dSel = document.getElementById("district-select");
    const vSel = document.getElementById("village-select");
    dSel.innerHTML = '<option value="">-- Select District --</option>'; vSel.innerHTML = '<option value="">-- Select Village --</option>';
    vSel.disabled = true;
    if (s && LOCATION_DATA[s]) {
        dSel.disabled = false;
        for (let d in LOCATION_DATA[s]) { let opt = document.createElement("option"); opt.value = d; opt.text = d; dSel.appendChild(opt); }
    } else { dSel.disabled = true; }
}

function loadVillages() {
    const s = document.getElementById("state-select").value;
    const d = document.getElementById("district-select").value;
    const vSel = document.getElementById("village-select");
    vSel.innerHTML = '<option value="">-- Select Village --</option>';
    if (s && d && LOCATION_DATA[s][d]) {
        vSel.disabled = false;
        LOCATION_DATA[s][d].forEach(v => { let opt = document.createElement("option"); opt.value = v; opt.text = v; vSel.appendChild(opt); });
    } else { vSel.disabled = true; }
}

function generateCropFields() {
    const c = document.getElementById("crop-count").value;
    const con = document.getElementById("dynamic-crop-area"); con.innerHTML = "";
    if (c > 0 && c <= 10) {
        for (let i = 1; i <= c; i++) {
            con.innerHTML += `<div class="crop-row"><div style="flex:2"><label style="margin:0;font-size:10px">Crop ${i}</label><input class="crop-name"></div><div style="flex:1"><label style="margin:0;font-size:10px">Acres</label><input type="number" class="crop-area"></div></div>`;
        }
    }
}

function submitRegistration() {
    const name = document.getElementById("fname").value;
    const state = document.getElementById("state-select").value;
    const v = document.getElementById("village-select").value;
    
    if (!name || !v || !state) { alert("Please fill all details!"); return; }

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
    
    // FETCH WEATHER FOR REGISTERED LOCATION
    getWeatherForLocation(village, state);
}

// --- REAL WEATHER API LOGIC (OPEN-METEO + GEOCODING) ---

// 1. Convert "Village, State" to Lat/Lon
async function getWeatherForLocation(village, state) {
    const tempDiv = document.getElementById("weather-temp");
    const descDiv = document.getElementById("weather-desc");
    
    tempDiv.innerHTML = "--";
    descDiv.innerHTML = "Fetching Location...";

    try {
        // Search for the location name
        const searchQuery = `${village}, ${state}, India`;
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=1&format=json`;
        
        const geoRes = await fetch(geoUrl);
        const geoData = await geoRes.json();

        if (geoData.results && geoData.results.length > 0) {
            const lat = geoData.results[0].latitude;
            const lon = geoData.results[0].longitude;
            
            descDiv.innerHTML = "Loading Weather...";
            fetchWeather(lat, lon);
        } else {
            // Fallback: If village not found, try just the State
            console.log("Village not found, trying state...");
            const stateUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(state)}&count=1&format=json`;
            const stateRes = await fetch(stateUrl);
            const stateData = await stateRes.json();
            
            if (stateData.results && stateData.results.length > 0) {
                 fetchWeather(stateData.results[0].latitude, stateData.results[0].longitude);
            } else {
                 descDiv.innerHTML = "Location Not Found";
            }
        }
    } catch (error) {
        console.error(error);
        descDiv.innerHTML = "Connection Error";
    }
}

// 2. Get Weather using Lat/Lon (Same as before)
async function fetchWeather(lat, lon) {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.current_weather) {
            const t = data.current_weather.temperature;
            const code = data.current_weather.weathercode;
            
            document.getElementById("weather-temp").innerText = `${t}°C`;
            document.getElementById("weather-desc").innerText = getWeatherDescription(code);
        }
    } catch (err) {
        document.getElementById("weather-desc").innerText = "Network Error";
    }
}

function getWeatherDescription(code) {
    // WMO Weather interpretation codes
    if (code === 0) return "☀️ Clear Sky";
    if (code === 1 || code === 2 || code === 3) return "⛅ Partly Cloudy";
    if (code >= 45 && code <= 48) return "🌫️ Foggy";
    if (code >= 51 && code <= 55) return "🌧️ Drizzle";
    if (code >= 61 && code <= 67) return "🌧️ Rain";
    if (code >= 71 && code <= 77) return "❄️ Snow";
    if (code >= 80 && code <= 82) return "🌦️ Showers";
    if (code >= 95) return "⛈️ Thunderstorm";
    return "Unknown";
}

// --- Manual Refresh Button (GPS Fallback) ---
function getRealWeather() {
    // If user clicks the refresh button, we try GPS as a fallback or update
    if (navigator.geolocation) {
         document.getElementById("weather-desc").innerText = "Using GPS...";
        navigator.geolocation.getCurrentPosition(
            (position) => {
                fetchWeather(position.coords.latitude, position.coords.longitude);
            },
            (error) => {
                alert("GPS permission denied. Showing registered location weather.");
            }
        );
    } else {
        alert("GPS not supported.");
    }
}

function logoutUser() {
    localStorage.removeItem("farmerUser");
    document.getElementById("dashboard-screen").style.display = "none";
    document.getElementById("login-screen").style.display = "block";
    document.getElementById("fname").value = "";
    document.getElementById("state-select").value = "";
    document.getElementById("district-select").innerHTML = '<option value="">-- Select District --</option>';
    document.getElementById("district-select").disabled = true;
    document.getElementById("village-select").innerHTML = '<option value="">-- Select Village --</option>';
    document.getElementById("village-select").disabled = true;
    document.getElementById("crop-count").value = "";
    document.getElementById("dynamic-crop-area").innerHTML = "";
}

// --- 4. NAVIGATION ---
let html5QrcodeScanner = null;

async function goHome() {
    if (html5QrcodeScanner) {
        try { await html5QrcodeScanner.stop(); await html5QrcodeScanner.clear(); } catch(e){}
        html5QrcodeScanner = null;
    }
    document.getElementById("scan-interface").style.display = "none";
    document.getElementById("advisor-interface").style.display = "none";
    document.getElementById("mandi-interface").style.display = "none";
    document.getElementById("dashboard-screen").style.display = "block";
}

function openScanner() {
    document.getElementById("dashboard-screen").style.display = "none";
    document.getElementById("scan-interface").style.display = "block";
    document.getElementById("scan-btn").style.display = "block";
}

function openAdvisor() {
    document.getElementById("dashboard-screen").style.display = "none";
    document.getElementById("advisor-interface").style.display = "block";
}

function openMandi() {
    document.getElementById("dashboard-screen").style.display = "none";
    document.getElementById("mandi-interface").style.display = "block";

    const container = document.getElementById("mandi-table-container");
    const rates = MANDI_DATA[currentUserState] || MANDI_DATA["Maharashtra"];

    let html = `<table class="mandi-table"><tr><th>Crop</th><th>Price (per Quintal)</th><th>Trend</th></tr>`;
    rates.forEach(item => {
        const arrow = item.trend === "up" ? "▲" : "▼";
        const colorClass = item.trend === "up" ? "price-up" : "price-down";
        html += `<tr>
            <td>${item.crop}</td>
            <td>${item.price}</td>
            <td class="${colorClass}">${arrow}</td>
        </tr>`;
    });
    html += `</table>`;
    container.innerHTML = html;
}

// --- 5. SCANNER LOGIC ---
async function startScanner() {
    document.getElementById('scan-btn').style.display = 'none';
    if (html5QrcodeScanner) { try { await html5QrcodeScanner.clear(); } catch(e){} }
    html5QrcodeScanner = new Html5Qrcode("reader");
    try {
        await html5QrcodeScanner.start(
            { facingMode: "environment" }, 
            { fps: 10, qrbox: 250 },
            (decodedText) => { handleScanSuccess(decodedText); },
            (errorMessage) => { }
        );
    } catch (err) {
        alert("Camera Error: " + err);
        document.getElementById('scan-btn').style.display = 'block';
    }
}

async function handleScanSuccess(code) {
    if (html5QrcodeScanner) {
        await html5QrcodeScanner.stop();
        await html5QrcodeScanner.clear();
        html5QrcodeScanner = null;
    }
    document.getElementById("scan-interface").style.display = "none";
    document.getElementById("scan-result-screen").style.display = "block";
    document.getElementById("res-code-top").innerText = code;
    const resBox = document.getElementById("res-box-large");
    resBox.className = "result-large";
    resBox.innerHTML = "<h3>🔄 Verifying...</h3>";
    
    setTimeout(() => {
        const data = PRODUCT_DB[code];
        if (data) {
            if (data.status === "SAFE") {
                resBox.className = "result-large safe";
                resBox.innerHTML = `<h2 style="margin:0">✅ GENUINE</h2><h4>${data.name}</h4><p>${data.message}</p><small>Expiry: ${data.expiry}</small>`;
            } else {
                resBox.className = "result-large fake";
                resBox.innerHTML = `<h2 style="margin:0">❌ ALERT</h2><h4>${data.name}</h4><p>${data.message}</p>`;
            }
        } else {
            resBox.className = "result-large";
            resBox.style.background = "#fff3cd"; 
            resBox.style.border = "2px solid #ffc107";
            resBox.style.color = "#856404";
            resBox.innerHTML = `<h2 style="margin:0">⚠️ UNKNOWN</h2><p>Product code not found in database.</p>`;
        }
    }, 800);
}

function exitScanResult() {
    document.getElementById("scan-result-screen").style.display = "none";
    openScanner(); 
}

// --- 6. ADVISOR & VOICE LOGIC ---
function startVoiceInput() {
    if (!('webkitSpeechRecognition' in window)) { alert("Voice not supported in this browser. Try Chrome."); return; }
    const recognition = new webkitSpeechRecognition();
    recognition.lang = 'en-US'; 
    recognition.continuous = false;
    const micBtn = document.getElementById("mic-btn");
    micBtn.classList.add("mic-listening");
    recognition.onstart = function() { document.getElementById("advice-query").placeholder = "Listening..."; };
    recognition.onresult = function(event) {
        const txt = event.results[0][0].transcript;
        document.getElementById("advice-query").value = txt;
        micBtn.classList.remove("mic-listening");
        getAdvice();
    };
    recognition.onerror = function() { micBtn.classList.remove("mic-listening"); };
    recognition.onend = function() { micBtn.classList.remove("mic-listening"); };
    recognition.start();
}

function getAdvice() {
    const query = document.getElementById("advice-query").value.toLowerCase();
    const res = document.getElementById("advice-result");
    res.innerHTML = "Thinking...";
    setTimeout(() => {
        let advice = "";
        if (query.includes("yellow") || query.includes("leaf")) {
            advice = "🍂 <b>Diagnosis:</b> Nitrogen Deficiency.\n👉 <b>Remedy:</b> Apply Urea (20kg/acre) or spray NPK 19:19:19.";
        } else if (query.includes("price") || query.includes("rate")) {
            advice = "💰 <b>Market Intelligence:</b>\nGovt Rate: ₹266 per bag.\n⚠️ <b>Alert:</b> Do not pay more than ₹270.";
        } else if (query.includes("weather")) {
            advice = "🌤️ <b>Weather Alert:</b>\nLight rain expected in next 24 hours. Hold irrigation.";
        } else {
            advice = "🙏 I am your Agri-Gyani.\nAsk about 'Yellow leaves', 'Fertilizer Price', or 'Weather'.";
        }
        res.innerHTML = advice;
    }, 500);
}
