
/* =========================================================
   LOST & FOUND AI - ITEM DETAIL PAGE
   Complete replacement
   ========================================================= */

/* =========================================================
   BACKEND CONFIGURATION
   ========================================================= */

// IMPORTANT:
// config.js may already define API_URL.
// We therefore use a different variable name here to avoid:
// "Identifier 'API_URL' has already been declared"

const BACKEND_URL =
    "https://ai-powered-lost-found-matching-system.onrender.com";


/* =========================================================
   GLOBAL VARIABLES
   ========================================================= */

let itemDetail = document.getElementById("item-detail");
let currentItem = null;
let map = null;


/* =========================================================
   GET ITEM ID FROM URL
   ========================================================= */

const urlParams = new URLSearchParams(window.location.search);
const itemId = urlParams.get("id");

console.log("=================================");
console.log("ITEM DETAIL JS LOADED");
console.log("Item ID:", itemId);
console.log("Backend:", BACKEND_URL);
console.log("=================================");


/* =========================================================
   IMAGE HELPERS
   ========================================================= */

function getImageUrl(imageUrl) {

    if (!imageUrl) {
        return "";
    }

    // Already a complete URL
    if (
        imageUrl.startsWith("http://") ||
        imageUrl.startsWith("https://") ||
        imageUrl.startsWith("data:")
    ) {
        return imageUrl;
    }

    // Remove starting slash
    imageUrl = imageUrl.replace(/^\/+/, "");

    // Backend-hosted image
    return `${BACKEND_URL}/${imageUrl}`;
}


function imageErrorHandler(image) {

    if (!image) {
        return;
    }

    image.onerror = null;

    image.src =
        "data:image/svg+xml;charset=UTF-8," +
        encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg"
                 width="500"
                 height="350"
                 viewBox="0 0 500 350">

                <rect width="500"
                      height="350"
                      fill="#f1f5f9"/>

                <text x="250"
                      y="165"
                      text-anchor="middle"
                      font-family="Arial"
                      font-size="24"
                      fill="#64748b">
                    No Image Available
                </text>

                <text x="250"
                      y="200"
                      text-anchor="middle"
                      font-family="Arial"
                      font-size="16"
                      fill="#94a3b8">
                    Lost & Found AI
                </text>
            </svg>
        `);
}


/* =========================================================
   FORMAT DATE
   ========================================================= */

function formatDate(dateValue) {

    if (!dateValue) {
        return "Not available";
    }

    try {

        const date = new Date(dateValue);

        if (isNaN(date.getTime())) {
            return dateValue;
        }

        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });

    } catch (error) {

        return dateValue;
    }
}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   LOAD LEAFLET
   ========================================================= */

function loadLeaflet() {

    return new Promise((resolve) => {

        // Leaflet already loaded
        if (window.L) {
            resolve();
            return;
        }

        // Check whether script is already being loaded
        const existingScript =
            document.querySelector(
                'script[src*="leaflet"]'
            );

        if (existingScript) {

            const checkLeaflet = setInterval(() => {

                if (window.L) {

                    clearInterval(checkLeaflet);
                    resolve();
                }

            }, 100);

            setTimeout(() => {

                clearInterval(checkLeaflet);
                resolve();

            }, 10000);

            return;
        }

        // Load Leaflet JS
        const script =
            document.createElement("script");

        script.src =
            "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

        script.onload = () => {
            resolve();
        };

        script.onerror = () => {
            console.warn("Leaflet could not be loaded.");
            resolve();
        };

        document.head.appendChild(script);
    });
}


/* =========================================================
   INITIALIZE MAP
   ========================================================= */

async function initializeMap(item) {

    const mapElement =
        document.getElementById("item-map");

    if (!mapElement) {
        return;
    }

    // Get latitude / longitude from different possible fields
    const latitude =
        item.latitude ??
        item.lat ??
        item.location_latitude ??
        item.location_lat ??
        item.location?.latitude ??
        item.location?.lat;

    const longitude =
        item.longitude ??
        item.lng ??
        item.lon ??
        item.location_longitude ??
        item.location_lng ??
        item.location?.longitude ??
        item.location?.lng;

    if (
        latitude === undefined ||
        latitude === null ||
        longitude === undefined ||
        longitude === null
    ) {

        mapElement.innerHTML = `
            <div style="
                display:flex;
                align-items:center;
                justify-content:center;
                height:100%;
                color:#64748b;
                text-align:center;
                padding:20px;
            ">
                📍 Location information is not available.
            </div>
        `;

        return;
    }

    await loadLeaflet();

    if (!window.L) {

        mapElement.innerHTML = `
            <div style="
                display:flex;
                align-items:center;
                justify-content:center;
                height:100%;
                color:#64748b;
            ">
                Map could not be loaded.
            </div>
        `;

        return;
    }

    try {

        if (map) {
            map.remove();
            map = null;
        }

        map =
            L.map("item-map").setView(
                [parseFloat(latitude), parseFloat(longitude)],
                15
            );

        L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
                attribution:
                    "&copy; OpenStreetMap contributors"
            }
        ).addTo(map);

        L.marker([
            parseFloat(latitude),
            parseFloat(longitude)
        ])
            .addTo(map)
            .bindPopup(
                `<b>${escapeHtml(
                    item.location ||
                    item.place ||
                    "Reported Location"
                )}</b>`
            )
            .openPopup();

    } catch (error) {

        console.error(
            "Map initialization error:",
            error
        );
    }
}


/* =========================================================
   GET LOGGED-IN USER
   ========================================================= */

function getLoggedInUser() {

    try {

        const user =
            localStorage.getItem("user");

        if (!user) {
            return null;
        }

        return JSON.parse(user);

    } catch (error) {

        console.error(
            "Unable to read logged-in user:",
            error
        );

        return null;
    }
}


/* =========================================================
   LOAD ITEM
   ========================================================= */

async function loadItem() {

    if (!itemDetail) {

        itemDetail =
            document.getElementById("item-detail");
    }

    if (!itemDetail) {

        console.error(
            "Element #item-detail was not found."
        );

        return;
    }

    // No ID in URL
    if (!itemId) {

        itemDetail.innerHTML = `
            <div style="
                padding:40px;
                text-align:center;
            ">
                <h2>Item Not Found</h2>

                <p>
                    No item ID was provided in the URL.
                </p>

                <a href="items.html"
                   style="
                       display:inline-block;
                       margin-top:15px;
                       padding:10px 18px;
                       background:#2563eb;
                       color:white;
                       text-decoration:none;
                       border-radius:8px;
                   ">
                    ← Back to Items
                </a>
            </div>
        `;

        console.error(
            "No item ID found in URL."
        );

        return;
    }

    itemDetail.innerHTML = `
        <div style="
            padding:40px;
            text-align:center;
        ">
            <h2>Loading item...</h2>
            <p>Please wait.</p>
        </div>
    `;

    try {

        const url =
            `${BACKEND_URL}/items/${encodeURIComponent(itemId)}`;

        console.log(
            "Fetching item:",
            url
        );

        const response =
            await fetch(url);

        console.log(
            "Item response status:",
            response.status
        );

        if (!response.ok) {

            let errorMessage =
                `Server returned ${response.status}`;

            try {

                const errorData =
                    await response.json();

                if (errorData.detail) {
                    errorMessage =
                        errorData.detail;
                }

            } catch (e) {
                // Response was not JSON
            }

            throw new Error(errorMessage);
        }

        const data =
            await response.json();

        console.log(
            "Item data:",
            data
        );

        // Some APIs return { item: {...} }
        // while others return the item directly.
        currentItem =
            data.item ||
            data.data ||
            data;

        if (!currentItem) {
            throw new Error(
                "Item data was empty."
            );
        }

        renderItem(currentItem);

        // Initialize map after HTML exists
        setTimeout(() => {
            initializeMap(currentItem);
        }, 100);

    } catch (error) {

        console.error(
            "Error loading item:",
            error
        );

        itemDetail.innerHTML = `
            <div style="
                max-width:700px;
                margin:40px auto;
                padding:30px;
                text-align:center;
                border-radius:12px;
                background:#fff;
                box-shadow:0 4px 20px rgba(0,0,0,0.08);
            ">

                <div style="
                    font-size:50px;
                    margin-bottom:15px;
                ">
                    ⚠️
                </div>

                <h2>
                    Unable to Load Item
                </h2>

                <p style="
                    color:#64748b;
                    margin:15px 0;
                ">
                    ${escapeHtml(error.message)}
                </p>

                <div style="
                    display:flex;
                    gap:10px;
                    justify-content:center;
                    flex-wrap:wrap;
                    margin-top:20px;
                ">

                    <button
                        onclick="loadItem()"
                        style="
                            padding:10px 18px;
                            border:none;
                            border-radius:8px;
                            background:#2563eb;
                            color:white;
                            cursor:pointer;
                        ">
                        🔄 Try Again
                    </button>

                    <a
                        href="items.html"
                        style="
                            padding:10px 18px;
                            border-radius:8px;
                            background:#e2e8f0;
                            color:#334155;
                            text-decoration:none;
                        ">
                        ← Back to Items
                    </a>

                </div>

            </div>
        `;
    }
}


/* =========================================================
   RENDER ITEM
   ========================================================= */

function renderItem(item) {

    if (!itemDetail) {
        return;
    }

    const id =
        item.id ??
        item._id ??
        item.item_id ??
        itemId;

    const name =
        item.name ??
        item.title ??
        item.item_name ??
        "Unnamed Item";

    const description =
        item.description ??
        item.details ??
        item.item_description ??
        "No description available.";

    const category =
        item.category ??
        item.item_category ??
        "Not specified";

    const type =
        item.type ??
        item.item_type ??
        item.report_type ??
        item.status ??
        "Not specified";

    const location =
        item.location ??
        item.place ??
        item.location_name ??
        "Not specified";

    const date =
        item.date ??
        item.created_at ??
        item.reported_date ??
        item.date_found ??
        item.date_lost ??
        null;

    const reporter =
        item.reporter_name ??
        item.user_name ??
        item.username ??
        item.reporter ??
        "Anonymous";

    const image =
        item.image_url ??
        item.image ??
        item.photo ??
        item.image_path ??
        item.photo_url ??
        "";

    const imageSrc =
        getImageUrl(image);

    itemDetail.innerHTML = `

        <div class="item-detail-container">

            <div class="item-detail-header">

                <a href="items.html"
                   class="back-btn">
                    ← Back to Items
                </a>

            </div>


            <div class="item-detail-card">


                <!-- IMAGE -->

                <div class="item-detail-image-section">

                    ${
                        imageSrc
                        ?
                        `
                        <img
                            src="${escapeHtml(imageSrc)}"
                            alt="${escapeHtml(name)}"
                            class="item-detail-image"
                            onerror="imageErrorHandler(this)"
                        >
                        `
                        :
                        `
                        <div class="no-image">
                            <div>
                                📷
                            </div>
                            <span>
                                No Image Available
                            </span>
                        </div>
                        `
                    }

                </div>


                <!-- DETAILS -->

                <div class="item-detail-info">

                    <div class="item-status">

                        <span class="status-badge">
                            ${escapeHtml(type)}
                        </span>

                    </div>


                    <h1>
                        ${escapeHtml(name)}
                    </h1>


                    <div class="item-info-grid">


                        <div class="info-box">

                            <span class="info-label">
                                Category
                            </span>

                            <span class="info-value">
                                ${escapeHtml(category)}
                            </span>

                        </div>


                        <div class="info-box">

                            <span class="info-label">
                                Location
                            </span>

                            <span class="info-value">
                                ${escapeHtml(location)}
                            </span>

                        </div>


                        <div class="info-box">

                            <span class="info-label">
                                Date
                            </span>

                            <span class="info-value">
                                ${escapeHtml(
                                    formatDate(date)
                                )}
                            </span>

                        </div>


                        <div class="info-box">

                            <span class="info-label">
                                Reporter
                            </span>

                            <span class="info-value">
                                ${escapeHtml(reporter)}
                            </span>

                        </div>


                    </div>


                    <div class="description-section">

                        <h3>
                            Description
                        </h3>

                        <p>
                            ${escapeHtml(description)}
                        </p>

                    </div>


                    <!-- ACTIONS -->

                    <div class="item-actions">


                        <button
                            class="ai-match-btn"
                            onclick="findMatches('${escapeHtml(id)}')">

                            🤖 Find AI Matches

                        </button>


                        <button
                            class="verify-ownership-btn"
                            data-item-id="${escapeHtml(id)}"
                            data-item-name="${escapeHtml(name)}"
                            onclick="openVerification(
                                '${escapeHtml(id)}',
                                '${escapeHtml(name).replace(/'/g, "\\'")}'
                            )">

                            🛡️ Verify Ownership

                        </button>


                        <button
                            class="contact-reporter-btn"
                            onclick="contactReporter('${escapeHtml(id)}')">

                            📩 Contact Reporter

                        </button>


                    </div>


                </div>

            </div>


            <!-- MAP -->

            <div class="location-section">

                <h2>
                    📍 Reported Location
                </h2>

                <div
                    id="item-map"
                    class="item-map">
                </div>

            </div>


            <!-- AI MATCHES -->

            <div
                id="ai-matches-section"
                class="ai-matches-section"
                style="display:none;">

                <div class="ai-section-header">

                    <h2>
                        🤖 AI Possible Matches
                    </h2>

                    <p>
                        AI-generated matches based on
                        image, description and metadata.
                    </p>

                </div>

                <div
                    id="ai-matches"
                    class="ai-matches">
                </div>

            </div>

        </div>
    `;
}


/* =========================================================
   AI MATCHING
   ========================================================= */

async function findMatches(id) {

    const matchesSection =
        document.getElementById(
            "ai-matches-section"
        );

    const matchesContainer =
        document.getElementById(
            "ai-matches"
        );

    if (!matchesSection ||
        !matchesContainer) {

        console.error(
            "AI matches container not found."
        );

        return;
    }

    matchesSection.style.display =
        "block";

    matchesContainer.innerHTML = `
        <div style="
            padding:30px;
            text-align:center;
        ">
            <div style="
                font-size:40px;
                margin-bottom:10px;
            ">
                🤖
            </div>

            <h3>
                Finding possible matches...
            </h3>

            <p>
                AI is comparing reported items.
            </p>
        </div>
    `;

    try {

        const url =
            `${BACKEND_URL}/match/${encodeURIComponent(id)}`;

        console.log(
            "Finding matches:",
            url
        );

        const response =
            await fetch(url);

        if (!response.ok) {

            let message =
                `Match request failed (${response.status})`;

            try {

                const errorData =
                    await response.json();

                if (errorData.detail) {
                    message =
                        errorData.detail;
                }

            } catch (e) {}

            throw new Error(message);
        }

        const data =
            await response.json();

        console.log(
            "AI match response:",
            data
        );

        const matches =
            data.matches ||
            data.results ||
            data.possible_matches ||
            data.data ||
            [];

        if (!Array.isArray(matches) ||
            matches.length === 0) {

            matchesContainer.innerHTML = `
                <div style="
                    padding:30px;
                    text-align:center;
                ">

                    <div style="
                        font-size:45px;
                    ">
                        🔍
                    </div>

                    <h3>
                        No Possible Matches Found
                    </h3>

                    <p>
                        The AI could not find
                        a suitable matching item.
                    </p>

                </div>
            `;

            return;
        }

        // Top 5 matches
        const topMatches =
            matches
                .sort((a, b) =>
                    getMatchScore(b) -
                    getMatchScore(a)
                )
                .slice(0, 5);

        renderMatches(topMatches);

    } catch (error) {

        console.error(
            "AI matching error:",
            error
        );

        matchesContainer.innerHTML = `
            <div style="
                padding:25px;
                text-align:center;
            ">

                <div style="
                    font-size:40px;
                ">
                    ⚠️
                </div>

                <h3>
                    Unable to Find Matches
                </h3>

                <p>
                    ${escapeHtml(error.message)}
                </p>

                <button
                    onclick="findMatches('${escapeHtml(id)}')"
                    style="
                        margin-top:15px;
                        padding:10px 18px;
                        border:none;
                        border-radius:8px;
                        background:#2563eb;
                        color:white;
                        cursor:pointer;
                    ">
                    🔄 Try Again
                </button>

            </div>
        `;
    }
}


/* =========================================================
   MATCH SCORE
   ========================================================= */

function getMatchScore(match) {

    const score =
        match.match_score ??
        match.score ??
        match.similarity_score ??
        match.confidence ??
        match.match_percentage ??
        0;

    let numericScore =
        parseFloat(score);

    if (isNaN(numericScore)) {
        numericScore = 0;
    }

    // Convert decimal score to percentage
    if (
        numericScore > 0 &&
        numericScore <= 1
    ) {
        numericScore *= 100;
    }

    return Math.round(numericScore);
}


/* =========================================================
   IMAGE SIMILARITY
   ========================================================= */

function getImageSimilarity(match) {

    const value =
        match.image_similarity ??
        match.image_similarity_score ??
        match.image_score ??
        match.visual_similarity ??
        null;

    if (value === null ||
        value === undefined) {

        return "N/A";
    }

    let score =
        parseFloat(value);

    if (isNaN(score)) {
        return "N/A";
    }

    if (score <= 1) {
        score *= 100;
    }

    return `${Math.round(score)}%`;
}


/* =========================================================
   TEXT SIMILARITY
   ========================================================= */

function getTextSimilarity(match) {

    const value =
        match.text_similarity ??
        match.text_similarity_score ??
        match.text_score ??
        null;

    if (value === null ||
        value === undefined) {

        return "N/A";
    }

    let score =
        parseFloat(value);

    if (isNaN(score)) {
        return "N/A";
    }

    if (score <= 1) {
        score *= 100;
    }

    return `${Math.round(score)}%`;
}


/* =========================================================
   METADATA SCORE
   ========================================================= */

function getMetadataScore(match) {

    const value =
        match.metadata_score ??
        match.metadata_similarity ??
        match.metadata_match ??
        null;

    if (value === null ||
        value === undefined) {

        return "N/A";
    }

    let score =
        parseFloat(value);

    if (isNaN(score)) {
        return "N/A";
    }

    if (score <= 1) {
        score *= 100;
    }

    return `${Math.round(score)}%`;
}


/* =========================================================
   CONFIDENCE
   ========================================================= */

function getConfidence(match) {

    const value =
        match.confidence ??
        match.confidence_score ??
        match.match_confidence ??
        null;

    if (value === null ||
        value === undefined) {

        return "N/A";
    }

    if (
        typeof value === "string" &&
        value.includes("%")
    ) {
        return value;
    }

    let score =
        parseFloat(value);

    if (isNaN(score)) {
        return value;
    }

    if (score <= 1) {
        score *= 100;
    }

    return `${Math.round(score)}%`;
}


/* =========================================================
   MATCH REASONS
   ========================================================= */

function getMatchReasons(match) {

    const reasons =
        match.reasons ??
        match.match_reasons ??
        match.reason ??
        match.explanation ??
        [];

    if (Array.isArray(reasons)) {
        return reasons;
    }

    if (typeof reasons === "string") {
        return [reasons];
    }

    return [];
}


/* =========================================================
   RENDER MATCHES
   ========================================================= */

function renderMatches(matches) {

    const container =
        document.getElementById(
            "ai-matches"
        );

    if (!container) {
        return;
    }

    container.innerHTML = "";

    matches.forEach((match, index) => {

        const matchedItem =
            match.item ??
            match.matched_item ??
            match.result ??
            match;

        const id =
            matchedItem.id ??
            matchedItem._id ??
            matchedItem.item_id;

        const name =
            matchedItem.name ??
            matchedItem.title ??
            matchedItem.item_name ??
            "Unnamed Item";

        const description =
            matchedItem.description ??
            matchedItem.details ??
            "No description available.";

        const category =
            matchedItem.category ??
            "Not specified";

        const location =
            matchedItem.location ??
            matchedItem.place ??
            "Not specified";

        const image =
            matchedItem.image_url ??
            matchedItem.image ??
            matchedItem.photo ??
            matchedItem.image_path ??
            "";

        const imageSrc =
            getImageUrl(image);

        const score =
            getMatchScore(match);

        const imageSimilarity =
            getImageSimilarity(match);

        const textSimilarity =
            getTextSimilarity(match);

        const metadataScore =
            getMetadataScore(match);

        const confidence =
            getConfidence(match);

        const reasons =
            getMatchReasons(match);

        const card =
            document.createElement("div");

        card.className =
            "ai-match-card";


        let reasonsHTML = "";

        if (reasons.length > 0) {

            reasonsHTML = `
                <div class="match-reasons">

                    <h4>
                        Why this may match
                    </h4>

                    <ul>

                        ${reasons.map(reason => `
                            <li>
                                ${escapeHtml(reason)}
                            </li>
                        `).join("")}

                    </ul>

                </div>
            `;
        }


        card.innerHTML = `

            <div class="match-rank">
                #${index + 1}
            </div>


            <div class="match-image">

                ${
                    imageSrc
                    ?
                    `
                    <img
                        src="${escapeHtml(imageSrc)}"
                        alt="${escapeHtml(name)}"
                        onerror="imageErrorHandler(this)"
                    >
                    `
                    :
                    `
                    <div class="no-match-image">
                        📷
                    </div>
                    `
                }

            </div>


            <div class="match-content">

                <div class="match-title-row">

                    <h3>
                        ${escapeHtml(name)}
                    </h3>

                    <span class="match-score">
                        ${score}%
                    </span>

                </div>


                <p class="match-description">
                    ${escapeHtml(description)}
                </p>


                <div class="match-details">

                    <span>
                        📂 ${escapeHtml(category)}
                    </span>

                    <span>
                        📍 ${escapeHtml(location)}
                    </span>

                </div>


                <div class="similarity-grid">

                    <div>
                        <small>
                            Image Similarity
                        </small>

                        <strong>
                            ${imageSimilarity}
                        </strong>
                    </div>


                    <div>
                        <small>
                            Text Similarity
                        </small>

                        <strong>
                            ${textSimilarity}
                        </strong>
                    </div>


                    <div>
                        <small>
                            Metadata
                        </small>

                        <strong>
                            ${metadataScore}
                        </strong>
                    </div>


                    <div>
                        <small>
                            Confidence
                        </small>

                        <strong>
                            ${confidence}
                        </strong>
                    </div>

                </div>


                ${reasonsHTML}


                ${
                    id
                    ?
                    `
                    <button
                        class="view-match-btn"
                        onclick="viewItem('${escapeHtml(id)}')">

                        View Possible Match →

                    </button>
                    `
                    :
                    ""
                }

            </div>
        `;


        container.appendChild(card);

    });
}


/* =========================================================
   VIEW ITEM
   ========================================================= */

function viewItem(id) {

    if (!id) {

        console.error(
            "Cannot view item: ID missing."
        );

        return;
    }

    window.location.href =
        `item-detail.html?id=${encodeURIComponent(id)}`;
}


/* =========================================================
   OWNERSHIP VERIFICATION MODAL
   ========================================================= */

function ensureVerificationModal() {

    if (
        document.getElementById(
            "verification-modal"
        )
    ) {
        return;
    }

    const modal =
        document.createElement("div");

    modal.id =
        "verification-modal";

    modal.innerHTML = `

        <div
            class="verification-overlay"
            onclick="closeVerification(event)"
            style="
                position:fixed;
                inset:0;
                background:rgba(0,0,0,0.6);
                display:flex;
                align-items:center;
                justify-content:center;
                z-index:9999;
                padding:20px;
            "
        >

            <div
                class="verification-modal-content"
                onclick="event.stopPropagation()"
                style="
                    width:100%;
                    max-width:550px;
                    background:white;
                    border-radius:16px;
                    padding:30px;
                    box-shadow:0 20px 50px rgba(0,0,0,0.25);
                    max-height:90vh;
                    overflow-y:auto;
                "
            >

                <div style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    margin-bottom:20px;
                ">

                    <h2 style="
                        margin:0;
                    ">
                        🛡️ Ownership Verification
                    </h2>

                    <button
                        type="button"
                        onclick="closeVerification()"
                        style="
                            border:none;
                            background:none;
                            font-size:24px;
                            cursor:pointer;
                        "
                    >
                        ×
                    </button>

                </div>


                <p style="
                    color:#64748b;
                    line-height:1.6;
                ">
                    Provide information that proves
                    you are the genuine owner of this item.
                </p>


                <form
                    id="verification-form"
                    onsubmit="submitOwnershipVerification(event)"
                >

                    <input
                        type="hidden"
                        id="verification-item-id"
                    >


                    <div style="
                        margin-top:18px;
                    ">

                        <label
                            for="verification-item-name"
                            style="
                                display:block;
                                font-weight:600;
                                margin-bottom:7px;
                            "
                        >
                            Item
                        </label>

                        <input
                            type="text"
                            id="verification-item-name"
                            readonly
                            style="
                                width:100%;
                                box-sizing:border-box;
                                padding:11px;
                                border:1px solid #cbd5e1;
                                border-radius:8px;
                                background:#f8fafc;
                            "
                        >

                    </div>


                    <div style="
                        margin-top:18px;
                    ">

                        <label
                            for="verification-details"
                            style="
                                display:block;
                                font-weight:600;
                                margin-bottom:7px;
                            "
                        >
                            Ownership Details
                        </label>

                        <textarea
                            id="verification-details"
                            rows="5"
                            required
                            placeholder="Describe unique details that prove this item belongs to you..."
                            style="
                                width:100%;
                                box-sizing:border-box;
                                padding:11px;
                                border:1px solid #cbd5e1;
                                border-radius:8px;
                                resize:vertical;
                            "
                        ></textarea>

                    </div>


                    <div style="
                        margin-top:18px;
                    ">

                        <label
                            for="verification-proof"
                            style="
                                display:block;
                                font-weight:600;
                                margin-bottom:7px;
                            "
                        >
                            Proof / Additional Information
                        </label>

                        <textarea
                            id="verification-proof"
                            rows="4"
                            placeholder="Serial number, unique mark, purchase information, etc."
                            style="
                                width:100%;
                                box-sizing:border-box;
                                padding:11px;
                                border:1px solid #cbd5e1;
                                border-radius:8px;
                                resize:vertical;
                            "
                        ></textarea>

                    </div>


                    <div
                        id="verification-message"
                        style="
                            margin-top:15px;
                        "
                    ></div>


                    <button
                        type="submit"
                        style="
                            width:100%;
                            margin-top:20px;
                            padding:13px;
                            border:none;
                            border-radius:9px;
                            background:#2563eb;
                            color:white;
                            font-size:16px;
                            font-weight:600;
                            cursor:pointer;
                        "
                    >
                        Submit Verification Request
                    </button>

                </form>

            </div>

        </div>
    `;

    document.body.appendChild(modal);
}


/* =========================================================
   OPEN VERIFICATION
   ========================================================= */

function openVerification(id, name) {

    ensureVerificationModal();

    const user =
        getLoggedInUser();

    if (!user) {

        alert(
            "Please login first to request ownership verification."
        );

        window.location.href =
            "login.html";

        return;
    }

    const modal =
        document.getElementById(
            "verification-modal"
        );

    const itemIdInput =
        document.getElementById(
            "verification-item-id"
        );

    const itemNameInput =
        document.getElementById(
            "verification-item-name"
        );

    const detailsInput =
        document.getElementById(
            "verification-details"
        );

    const proofInput =
        document.getElementById(
            "verification-proof"
        );

    const message =
        document.getElementById(
            "verification-message"
        );

    if (itemIdInput) {
        itemIdInput.value = id || "";
    }

    if (itemNameInput) {
        itemNameInput.value = name || "";
    }

    if (detailsInput) {
        detailsInput.value = "";
    }

    if (proofInput) {
        proofInput.value = "";
    }

    if (message) {
        message.innerHTML = "";
    }

    if (modal) {
        modal.style.display = "block";
    }
}


/* =========================================================
   CLOSE VERIFICATION
   ========================================================= */

function closeVerification(event) {

    if (
        event &&
        event.target &&
        !event.target.classList.contains(
            "verification-overlay"
        )
    ) {
        return;
    }

    const modal =
        document.getElementById(
            "verification-modal"
        );

    if (modal) {
        modal.style.display = "none";
    }
}


/* =========================================================
   SUBMIT OWNERSHIP VERIFICATION
   ========================================================= */

async function submitOwnershipVerification(event) {

    if (event) {
        event.preventDefault();
    }

    const user =
        getLoggedInUser();

    if (!user) {

        alert(
            "Please login first."
        );

        return;
    }

    const id =
        document.getElementById(
            "verification-item-id"
        )?.value;

    const details =
        document.getElementById(
            "verification-details"
        )?.value.trim();

    const proof =
        document.getElementById(
            "verification-proof"
        )?.value.trim();

    const message =
        document.getElementById(
            "verification-message"
        );

    if (!id) {

        showOwnershipMessage(
            "Item ID is missing.",
            "error"
        );

        return;
    }

    if (!details) {

        showOwnershipMessage(
            "Please provide ownership details.",
            "error"
        );

        return;
    }

    showOwnershipMessage(
        "Submitting verification request...",
        "loading"
    );

    try {

        const params =
            new URLSearchParams();

        params.append(
            "item_id",
            id
        );

        params.append(
            "ownership_details",
            details
        );

        if (proof) {

            params.append(
                "proof",
                proof
            );
        }

        // Add user information if available
        if (user.id) {

            params.append(
                "user_id",
                user.id
            );
        }

        if (user.email) {

            params.append(
                "user_email",
                user.email
            );
        }

        const url =
            `${BACKEND_URL}/verification/request?${params.toString()}`;

        console.log(
            "Ownership verification request:",
            url
        );

        const response =
            await fetch(url, {
                method: "POST"
            });

        if (!response.ok) {

            let errorMessage =
                `Verification request failed (${response.status})`;

            try {

                const errorData =
                    await response.json();

                if (errorData.detail) {
                    errorMessage =
                        errorData.detail;
                }

            } catch (e) {}

            throw new Error(
                errorMessage
            );
        }

        const data =
            await response.json();

        console.log(
            "Verification response:",
            data
        );

        showOwnershipMessage(
            "✅ Ownership verification request submitted successfully!",
            "success"
        );

        setTimeout(() => {

            const modal =
                document.getElementById(
                    "verification-modal"
                );

            if (modal) {
                modal.style.display = "none";
            }

        }, 2000);

    } catch (error) {

        console.error(
            "Ownership verification error:",
            error
        );

        showOwnershipMessage(
            `❌ ${error.message}`,
            "error"
        );
    }
}


/* =========================================================
   OWNERSHIP MESSAGE
   ========================================================= */

function showOwnershipMessage(
    message,
    type
) {

    const element =
        document.getElementById(
            "verification-message"
        );

    if (!element) {
        return;
    }

    let background =
        "#eff6ff";

    let color =
        "#1d4ed8";

    if (type === "success") {

        background =
            "#ecfdf5";

        color =
            "#047857";
    }

    if (type === "error") {

        background =
            "#fef2f2";

        color =
            "#b91c1c";
    }

    element.innerHTML = `
        <div style="
            padding:12px;
            border-radius:8px;
            background:${background};
            color:${color};
            line-height:1.5;
        ">
            ${escapeHtml(message)}
        </div>
    `;
}


/* =========================================================
   CONTACT REPORTER
   ========================================================= */

async function contactReporter(id) {

    const user =
        getLoggedInUser();

    if (!user) {

        alert(
            "Please login first to contact the reporter."
        );

        window.location.href =
            "login.html";

        return;
    }

    try {

        const response =
            await fetch(
                `${BACKEND_URL}/items/${encodeURIComponent(id)}`
            );

        if (!response.ok) {
            throw new Error(
                `Unable to retrieve reporter information (${response.status})`
            );
        }

        const data =
            await response.json();

        const item =
            data.item ||
            data.data ||
            data;

        const reporterEmail =
            item.reporter_email ??
            item.user_email ??
            item.email ??
            item.contact_email;

        const reporterName =
            item.reporter_name ??
            item.user_name ??
            item.username ??
            "Reporter";

        if (reporterEmail) {

            const subject =
                encodeURIComponent(
                    `Regarding Lost & Found Item: ${
                        item.name ||
                        item.title ||
                        "Item"
                    }`
                );

            const body =
                encodeURIComponent(
                    `Hello ${reporterName},

I am contacting you regarding the item reported on Lost & Found AI.

Item: ${
                        item.name ||
                        item.title ||
                        "Item"
                    }

Please let me know if we can discuss the item.

Thank you.`
                );

            window.location.href =
                `mailto:${reporterEmail}?subject=${subject}&body=${body}`;

            return;
        }

        alert(
            "Reporter contact information is not available."
        );

    } catch (error) {

        console.error(
            "Contact reporter error:",
            error
        );

        alert(
            "Unable to contact the reporter right now."
        );
    }
}


/* =========================================================
   MAKE FUNCTIONS AVAILABLE TO INLINE HTML
   ========================================================= */

window.loadItem =
    loadItem;

window.findMatches =
    findMatches;

window.openVerification =
    openVerification;

window.closeVerification =
    closeVerification;

window.submitOwnershipVerification =
    submitOwnershipVerification;

window.viewItem =
    viewItem;

window.contactReporter =
    contactReporter;

window.imageErrorHandler =
    imageErrorHandler;


/* =========================================================
   PAGE START
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        console.log(
            "DOM loaded - starting item loading..."
        );

        loadItem();
    }
);

