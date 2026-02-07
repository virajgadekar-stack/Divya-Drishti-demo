// --- 1. LOCAL DATABASE SIMULATION ---
const PRODUCT_DB = {
    "DATA-TRUST-101": {
        status: "SAFE",
        name: "Mahyco Cotton Seeds (Bt)",
        message: "✅ GENUINE. Batch #MH-2025 verified.",
        expiry: "Dec 2025"
    },
    "FAKE-PESTICIDE-99": {
        status: "FAKE",
        name: "Counterfeit / Unknown",
        message: "❌ WARNING: Fake Product Detected!",
        expiry: "N/A"
    }
};

const LOCATION_DATA = {
    "Maharashtra": { "Pune": ["Haveli", "Baramati"], "Nashik": ["Malegaon", "Sinnar"] },
    "Gujarat": { "Ahmedabad": ["Sanand", "Dholka"], "Surat": ["Bardoli", "Mandvi"] },
    "Punjab": { "Ludhiana": ["Khanna", "Jagraon"], "Amritsar": ["Ajnala", "Baba Bakala"] }
};

// --- 2. INITIALIZATION ---
window.onload = function() {
    const savedUser = localStorage.getItem("farmerUser");
    if (savedUser) {
        const user = JSON.parse(savedUser);
        loginUser(user.name, user.village);
    }

    const stateSelect = document.getElementById("state-select");
    for (let state in LOCATION_DATA) {
        let opt = document.createElement("option"); opt.value = state; opt.text = state;
        stateSelect.appendChild(opt);
    }
};

// --- 3. REGISTRATION LOGIC ---
function loadDistricts() {
    const s = document.getElementById("state-select").value;
    const dSel = document.getElementById("district-select");
    const vSel = document.getElementById("village-select");
    dSel.innerHTML = '<option value="">-- Select District --</option>'; 
    vSel.innerHTML = '<option value="">-- Select Village --</option>';
    vSel.disabled = true;

    if (s && LOCATION_DATA[s]) {
        dSel.disabled = false;
        for (let d in LOCATION_DATA[s]) {
            let opt = document.createElement("option"); opt.value = d; opt.text = d; dSel.appendChild(opt);
        }
    } else { dSel.disabled = true; }
}

function loadVillages() {
    const s = document.getElementById("state-select").value;
    const d = document.getElementById("district-select").value;
    const vSel = document.getElementById("village-select");
    vSel.innerHTML = '<option value="">-- Select Village --</option>';
    
    if (s && d && LOCATION_DATA[s][d]) {
        vSel.disabled = false;
        LOCATION_DATA[s][d].forEach(v => {
            let opt = document.createElement("option"); opt.value = v; opt.text = v; vSel.appendChild(opt);
        });
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
    const v = document.getElementById("village-select").value;
    
    if (!name || !v) { alert("Please fill all details!"); return; }

    const userData = { name: name, village: v };
    localStorage.setItem("farmerUser", JSON.stringify(userData));

    document.getElementById("success-msg").style.display = "flex";
    setTimeout(() => {
        document.getElementById("success-msg").style.display = "none";
        loginUser(name, v);
    }, 2000);
}

function loginUser(name, village) {
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("dashboard-screen").style.display = "block";
    document.getElementById("welcome-text").innerText = `Namaste, ${name} ji!`;
    document.getElementById("location-text").innerText = `📍 ${village}`;
}

// --- 4. LOGOUT LOGIC (NEW) ---
function logoutUser() {
    // 1. Clear saved data
    localStorage.removeItem("farmerUser");

    // 2. Hide Dashboard
    document.getElementById("dashboard-screen").style.display = "none";

    // 3. Show Login Screen
    document.getElementById("login-screen").style.display = "block";

    // 4. Reset Inputs (Optional)
    document.getElementById("fname").value = "";
    document.getElementById("state-select").value = "";
    document.getElementById("district-select").innerHTML = '<option value="">-- Select District --</option>';
    document.getElementById("district-select").disabled = true;
    document.getElementById("village-select").innerHTML = '<option value="">-- Select Village --</option>';
    document.getElementById("village-select").disabled = true;
    document.getElementById("crop-count").value = "";
    document.getElementById("dynamic-crop-area").innerHTML = "";
}

// --- 5. NAVIGATION ---
let html5QrcodeScanner = null;

async function goHome() {
    if (html5QrcodeScanner) {
        try { await html5QrcodeScanner.stop(); await html5QrcodeScanner.clear(); } catch(e){}
        html5QrcodeScanner = null;
    }
    document.getElementById("scan-interface").style.display = "none";
    document.getElementById("advisor-interface").style.display = "none";
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

// --- 6. SCANNER LOGIC ---
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

// --- 7. ADVISOR & VOICE LOGIC ---
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
