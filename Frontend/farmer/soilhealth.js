// =========================================
// GLOBAL CONFIGURATION
// =========================================
// PUT YOUR REAL GEMINI API KEY HERE FROM AI STUDIO
const GEMINI_API_KEY = "YAIzaSyDaAXG7PtQz9BSsxYDRE8ymjbbWH0aW2uc"; 

// Data mapping for State Government Portals
// Data mapping for State Government Portals
const STATE_PORTAL_DB = {
    "AN": { name: "Andaman & Nicobar Agriculture", url: "http://agri.and.nic.in", hindi: "अंडमान और निकोबार कृषि पोर्टल पर जाएं।" },
    "AP": { name: "Andhra Pradesh Agriculture", url: "http://www.apagrisnet.gov.in", hindi: "आंध्र प्रदेश कृषि विभाग पोर्टल पर जाने के लिए नीचे क्लिक करें।" },
    "AR": { name: "Arunachal Pradesh Agriculture", url: "http://www.agri.arunachal.gov.in/", hindi: "अरुणाचल प्रदेश कृषि पोर्टल पर जाएं।" },
    "AS": { name: "Assam Agriculture", url: "https://agri-horti.assam.gov.in/", hindi: "असम कृषि विभाग पोर्टल पर जाएं।" },
    "BR": { name: "Bihar Agriculture", url: "http://krishi.bih.nic.in", hindi: "बिहार कृषि विभाग पोर्टल पर जाने के लिए नीचे क्लिक करें।" },
    "CH": { name: "Chandigarh Agriculture", url: "http://agripb.gov.in", hindi: "चंडीगढ़ कृषि पोर्टल पर जाएं।" },
    "CG": { name: "Chhattisgarh Agriculture", url: "https://agriportal.cg.nic.in", hindi: "छत्तीसगढ़ कृषि विभाग पोर्टल पर जाएं।" },
    "DN": { name: "Dadra & Nagar Haveli Agriculture", url: "https://ddd.gov.in/Departments/Agriculture.aspx", hindi: "दादरा और नगर हवेली कृषि पोर्टल पर जाएं।" },
    "DL": { name: "Delhi Agriculture", url: "http://agricoop.nic.in/", hindi: "दिल्ली कृषि विभाग पोर्टल पर जाएं।" },
    "GA": { name: "Goa Agriculture", url: "http://agri.goa.gov.in", hindi: "गोवा कृषि विभाग पोर्टल पर जाएं।" },
    "GJ": { name: "Gujarat Agriculture", url: "https://agri.gujarat.gov.in/", hindi: "गुजरात कृषि विभाग पोर्टल पर जाने के लिए नीचे क्लिक करें।" },
    "HR": { name: "Haryana Agriculture", url: "http://agriharyana.gov.in/", hindi: "हरियाणा कृषि विभाग पोर्टल पर जाएं।" },
    "HP": { name: "Himachal Pradesh Agriculture", url: "http://www.hpagriculture.com/", hindi: "हिमाचल प्रदेश कृषि पोर्टल पर जाएं।" },
    "JK": { name: "J&K Agriculture", url: "http://www.jkapd.nic.in/", hindi: "जम्मू और कश्मीर कृषि पोर्टल पर जाएं।" },
    "JH": { name: "Jharkhand Agriculture", url: "https://agri.jharkhand.gov.in/", hindi: "झारखंड कृषि विभाग पोर्टल पर जाएं।" },
    "KA": { name: "Karnataka Agriculture", url: "http://raitamitra.kar.nic.in/KAN/index.asp", hindi: "कर्नाटक कृषि विभाग पोर्टल पर जाने के लिए नीचे क्लिक करें।" },
    "KL": { name: "Kerala Agriculture", url: "http://www.keralaagriculture.gov.in/", hindi: "केरल कृषि विभाग पोर्टल पर जाएं।" },
    "LD": { name: "Lakshadweep Agriculture", url: "http://lakagri.nic.in/", hindi: "लक्षद्वीप कृषि पोर्टल पर जाएं।" },
    "MP": { name: "Madhya Pradesh Agriculture", url: "http://mpkrishi.mp.gov.in/", hindi: "मध्य प्रदेश कृषि विभाग पोर्टल पर जाने के लिए नीचे क्लिक करें।" },
    "MH": { name: "Maharashtra Agriculture", url: "http://krishi.maharashtra.gov.in", hindi: "महाराष्ट्र कृषी विभागाच्या पोर्टलला भेट देण्यासाठी खाली क्लिक करा." },
    "MN": { name: "Manipur Agriculture", url: "http://agrimanipur.gov.in/", hindi: "मणिपुर कृषि पोर्टल पर जाएं।" },
    "ML": { name: "Meghalaya Agriculture", url: "http://www.megagriculture.gov.in/", hindi: "मेघालय कृषि पोर्टल पर जाएं।" },
    "MZ": { name: "Mizoram Agriculture", url: "http://agriculturemizoram.nic.in/", hindi: "मिजोरम कृषि पोर्टल पर जाएं।" },
    "NL": { name: "Nagaland Agriculture", url: "http://agringl.nic.in/", hindi: "नागालैंड कृषि पोर्टल पर जाएं।" },
    "OR": { name: "Odisha Agriculture", url: "http://agriodisha.nic.in/", hindi: "ओडिशा कृषि विभाग पोर्टल पर जाएं।" },
    "PY": { name: "Puducherry Agriculture", url: "http://agri.puducherry.gov.in/", hindi: "पुडुचेरी कृषि पोर्टल पर जाएं।" },
    "PB": { name: "Punjab Agriculture", url: "http://agripb.gov.in/", hindi: "पंजाब कृषि विभाग पोर्टल पर जाएं।" },
    "RJ": { name: "Rajasthan Agriculture", url: "http://www.krishi.rajasthan.gov.in", hindi: "राजस्थान कृषि विभाग पोर्टल पर जाने के लिए नीचे क्लिक करें।" },
    "SK": { name: "Sikkim Agriculture", url: "http://www.sikkimagrisnet.org", hindi: "सिक्किम कृषि पोर्टल पर जाएं।" },
    "TN": { name: "Tamil Nadu Agriculture", url: "http://www.tn.gov.in/department/2", hindi: "तमिलनाडु कृषि विभाग पोर्टल पर जाएं।" },
    "TG": { name: "Telangana Agriculture", url: "http://agri.telangana.gov.in/", hindi: "तेलंगाना कृषि विभाग पोर्टल पर जाएं।" },
    "TR": { name: "Tripura Agriculture", url: "http://agri.tripura.gov.in/", hindi: "त्रिपुरा कृषि पोर्टल पर जाएं।" },
    "UP": { name: "Uttar Pradesh Agriculture", url: "http://upagripardarshi.gov.in/StaticPages/UttarPradesh4.aspx", hindi: "उत्तर प्रदेश कृषि विभाग पोर्टल पर जाने के लिए नीचे क्लिक करें।" },
    "UK": { name: "Uttarakhand Agriculture", url: "http://agriculture.uk.gov.in/", hindi: "उत्तराखंड कृषि विभाग पोर्टल पर जाएं।" },
    "WB": { name: "West Bengal Agriculture", url: "https://wb.gov.in/portal/web/guest/agriculture", hindi: "पश्चिम बंगाल कृषि विभाग पोर्टल पर जाने के लिए नीचे क्लिक करें।" }
};

// =========================================
// GENERIC GEMINI API WRAPPER
// =========================================
// This reusable function handles the heavy lifting for AI calls
async function callGemini(promptText) {
    // Note: Models are sometimes updated, flash-2.0 or 1.5-flash are usually best.
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    try {
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }]
            })
        });

        if (!response.ok) throw new Error("Connection failed or incorrect API Key.");

        const data = await response.json();
        
        // Extract raw text from Gemini's nested payload
        let rawText = data.candidates[0].content.parts[0].text;
        
        // 1. Convert plain text double-line breaks to HTML line breaks
        // 2. Wrap bold text asterisks (**text**) into <strong>text</strong> tags
        // This makes the AI's plain text response look formatted in HTML.
        let formattedText = rawText
            .replace(/\n\n/g, '<br><br>')
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        return { success: true, text: formattedText };

    } catch (error) {
        console.error("Gemini Error:", error);
        return { success: false, text: "⚠️ Unable to connect to Krishi-AI at this moment. Please check your internet connection or try again later." };
    }
}


// =========================================
// 1. SOIL ADVISOR MODULE
// =========================================
document.getElementById('soilForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Gather and format user inputs
    const params = {
        n: document.getElementById('valN').value,
        p: document.getElementById('valP').value,
        k: document.getElementById('valK').value,
        ph: document.getElementById('valPH').value
    };

    // Update UI to Processing State
    document.getElementById('soilInputCard').style.display = 'none';
    document.getElementById('soilResultsCard').style.display = 'none';
    document.getElementById('soilLoadingState').style.display = 'block';

    // Construct the specific agronomy prompt
    const soilPrompt = `
    You are an expert Indian Agronomist for KisanSetu Krishi-AI. 
    A farmer provided the following Soil Health Card data (kg/ha unless stated):
    Nitrogen: ${params.n}, Phosphorus: ${params.p}, Potassium: ${params.k}, Soil pH: ${params.ph}.
    
    Analyze this data and provide exactly three brief, actionable points in plain text.
    Point 1: Assess overall soil condition and dynamic pH.
    Point 2: Recommend specific fertilizers (NPK/Urea/DAP/MOP) or treatments (e.g., liming for low pH) to cope with the values provided.
    Point 3: Suggest exactly 2 suitable crops for these specific conditions.
    Do not use hashtags or markdown bolding. Use line breaks.
    `;

    // Wait for the generic wrapper function to return the data
    const aiResponse = await callGemini(soilPrompt);

    // Render results
    document.getElementById('soilLoadingState').style.display = 'none';
    document.getElementById('soilResultsCard').style.display = 'block';
    document.getElementById('geminiSoilOutput').innerHTML = aiResponse.text;
});

function resetSoilForm() {
    document.getElementById('soilResultsCard').style.display = 'none';
    document.getElementById('soilForm').reset();
    document.getElementById('soilInputCard').style.display = 'block';
}


// =========================================
// 2. SCHEMES HUB MODULE
// =========================================

// --- A: State Dropdown Logic ---
document.getElementById('stateSelect').addEventListener('change', function(e) {
    const selectedStateCode = e.target.value;
    const resultBox = document.getElementById('stateResult');
    const messageEl = document.getElementById('stateMessage');
    const linkEl = document.getElementById('stateLink');

    // If no state selected, hide the result box
    if (!selectedStateCode || selectedStateCode === "") {
        resultBox.style.display = 'none';
        return;
    }

    // Get data from our local STATE_PORTAL_DB object
    const stateData = STATE_PORTAL_DB[selectedStateCode];
    
    // Update the dynamic content in the HTML
    messageEl.innerText = `${stateData.hindi}`;
    linkEl.href = stateData.url;
    
    // Show the result box
    resultBox.style.display = 'block';
});

// --- B: AI Scheme Explainer Logic ---
document.getElementById('explainerForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const schemeName = document.getElementById('schemeNameInput').value;
    const resultsBox = document.getElementById('explainerResults');
    const loadingState = document.getElementById('explainerLoadingState');

    // Reset UI state
    resultsBox.style.display = 'none';
    loadingState.style.display = 'block';
    
    // Construct the specific helper prompt
    const explainerPrompt = `
    You are a friendly "Helper AI" for Indian farmers called Krishi-AI.
    Explain the following government scheme: "${schemeName}".
    Keep the explanation very simple and brief (4-5 lines max).
    Focus only on:
    1. Who is eligible?
    2. What are the key benefits?
    3. How can they apply (briefly)?
    Tone should be helpful. Do not use complex jargon. No markdown asterisks. Use simple HTML formatting.
    `;

    // Fetch and display
    const aiResponse = await callGemini(explainerPrompt);

    loadingState.style.display = 'none';
    resultsBox.style.display = 'block';
    resultsBox.innerHTML = `<strong>Krishi-AI Explanation of ${schemeName}:</strong><br><br>${aiResponse.text}`;
});