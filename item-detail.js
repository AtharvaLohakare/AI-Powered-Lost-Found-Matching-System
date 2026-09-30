
// =========================================================
// LOST & FOUND AI
// ITEM DETAIL + AI MATCHING + LOCATION MAP
// =========================================================

const itemDetail = document.getElementById("item-detail");

const params = new URLSearchParams(window.location.search);
const itemId = params.get("id");

// Store current item for map
let currentItem = null;

// Store Leaflet map
let matchMap = null;


// =========================================================
// HELPER - ESCAPE HTML
// =========================================================

function escapeHtml(value) {
    if (value === null || value === undefined) {
        return "";
    }

    const div = document.createElement("div");
    div.textContent = String(value);

    return div.innerHTML;
}


// =========================================================
// HELPER - IMAGE URL
// =========================================================

function getImageUrl(item) {

    if (!item) {
        return "";
    }

    if (item.image_url) {
        return item.image_url;
    }

    if (!item.image_name) {
        return "";
    }

    return `${API_URL}/uploads/${encodeURIComponent(item.image_name)}`;
}


// =========================================================
// IMAGE ERROR FALLBACK
// =========================================================

function imageErrorHandler(img) {

    img.onerror = null;
    img.style.display = "none";

    if (img.parentElement) {

        img.parentElement.classList.add("image-failed");

        img.parentElement.innerHTML = `
            <div class="image-placeholder">
                📦
                <span>Image unavailable</span>
            </div>
        `;
    }
}


// =========================================================
// LOAD LEAFLET CSS + JS
// =========================================================

function loadLeaflet() {

    return new Promise((resolve, reject) => {

        // Already loaded
        if (window.L) {
            resolve();
            return;
        }

        // -------------------------------
        // Leaflet CSS
        // -------------------------------

        if (!document.getElementById("leaflet-css")) {

            const css = document.createElement("link");

            css.id = "leaflet-css";
            css.rel = "stylesheet";
            css.href =
                "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

            document.head.appendChild(css);
        }


        // -------------------------------
        // Leaflet JS
        // -------------------------------

        const script = document.createElement("script");

        script.src =
            "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

        script.onload = () => resolve();

        script.onerror = () => {
            reject(
                new Error("Unable to load map library.")
            );
        };

        document.head.appendChild(script);
    });
}


// =========================================================
// CHECK GPS COORDINATES
// =========================================================

function hasCoordinates(item) {

    if (!item) {
        return false;
    }

    const lat = Number(item.latitude);
    const lon = Number(item.longitude);

    return (
        Number.isFinite(lat) &&
        Number.isFinite(lon) &&
        lat >= -90 &&
        lat <= 90 &&
        lon >= -180 &&
        lon <= 180
    );
}


// =========================================================
// CREATE LOCATION MAP
// =========================================================

async function createMatchMap(item, matches) {

    const mapContainer =
        document.getElementById("match-map");

    const mapStatus =
        document.getElementById("map-status");

    if (!mapContainer) {
        return;
    }


    // -----------------------------------------
    // Check current item GPS
    // -----------------------------------------

    const currentHasGPS = hasCoordinates(item);


    // -----------------------------------------
    // Find matches having GPS
    // -----------------------------------------

    const matchesWithGPS = matches.filter(
        match => hasCoordinates(match)
    );


    // -----------------------------------------
    // If nothing has GPS
    // -----------------------------------------

    if (!currentHasGPS && matchesWithGPS.length === 0) {

        if (mapStatus) {

            mapStatus.innerHTML = `
                📍 Location data is not available
                for these items.
            `;
        }

        mapContainer.style.display = "none";

        return;
    }


    try {

        await loadLeaflet();

        mapContainer.style.display = "block";

        if (mapStatus) {
            mapStatus.innerHTML =
                "📍 Showing reported item locations";
        }


        // -----------------------------------------
        // Remove old map
        // -----------------------------------------

        if (matchMap) {

            matchMap.remove();

            matchMap = null;
        }


        // -----------------------------------------
        // Create map
        // -----------------------------------------

        matchMap = L.map("match-map");


        // -----------------------------------------
        // OpenStreetMap tiles
        // -----------------------------------------

        L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
                maxZoom: 19,
                attribution:
                    '&copy; OpenStreetMap contributors'
            }
        ).addTo(matchMap);


        // -----------------------------------------
        // Markers
        // -----------------------------------------

        const mapPoints = [];


        // -----------------------------------------
        // Current item marker
        // -----------------------------------------

        if (currentHasGPS) {

            const lat =
                Number(item.latitude);

            const lon =
                Number(item.longitude);

            const marker =
                L.marker([lat, lon])
                    .addTo(matchMap);

            marker.bindPopup(`
                <strong>Current Item</strong><br>
                ${escapeHtml(
                    item.item_name || "Reported Item"
                )}<br>
                ${escapeHtml(
                    item.location || "Location unavailable"
                )}
            `);

            mapPoints.push([lat, lon]);
        }


        // -----------------------------------------
        // Match markers
        // -----------------------------------------

        matchesWithGPS.forEach((match, index) => {

            const lat =
                Number(match.latitude);

            const lon =
                Number(match.longitude);

            const marker =
                L.marker([lat, lon])
                    .addTo(matchMap);

            const score =
                Number(match.match_score || 0);

            marker.bindPopup(`
                <strong>Possible Match #${index + 1}</strong><br>
                ${escapeHtml(
                    match.item_name || "Possible Match"
                )}<br>
                Match: ${score.toFixed(1)}%<br>
                ${escapeHtml(
                    match.location || "Location unavailable"
                )}
            `);

            mapPoints.push([lat, lon]);
        });


        // -----------------------------------------
        // Fit map to all markers
        // -----------------------------------------

        if (mapPoints.length === 1) {

            matchMap.setView(
                mapPoints[0],
                14
            );

        }
        else if (mapPoints.length > 1) {

            const bounds =
                L.latLngBounds(mapPoints);

            matchMap.fitBounds(
                bounds,
                {
                    padding: [50, 50]
                }
            );

        }
        else {

            matchMap.setView(
                [20.5937, 78.9629],
                5
            );
        }


        // -----------------------------------------
        // Fix Leaflet rendering
        // -----------------------------------------

        setTimeout(() => {

            if (matchMap) {
                matchMap.invalidateSize();
            }

        }, 300);


    }
    catch (error) {

        console.error(
            "Map Error:",
            error
        );

        mapContainer.style.display = "none";

        if (mapStatus) {

            mapStatus.innerHTML =
                "Unable to load location map.";
        }
    }
}


// =========================================================
// LOAD ITEM DETAILS
// =========================================================

async function loadItem() {

    if (!itemId) {

        itemDetail.innerHTML = `
            <div class="detail-card">
                <h2>Item not found</h2>
                <p>No item ID was provided.</p>
            </div>
        `;

        return;
    }


    try {

        const response = await fetch(
            `${API_URL}/items/${encodeURIComponent(itemId)}`
        );


        let data = null;

        try {

            data = await response.json();

        }
        catch {

            data = null;
        }


        if (!response.ok) {

            throw new Error(
                data?.detail ||
                data?.message ||
                "Item not found"
            );
        }


        const item = data;

        // Store globally for map
        currentItem = item;


        const imageUrl =
            getImageUrl(item);


        const imageHTML = imageUrl

            ? `
                <img
                    src="${escapeHtml(imageUrl)}"
                    alt="${escapeHtml(item.item_name)}"
                    onerror="imageErrorHandler(this)"
                >
              `

            : `
                <div class="image-placeholder">
                    📦
                    <span>No image available</span>
                </div>
              `;


        itemDetail.innerHTML = `

            <div class="detail-card">

                <div class="detail-image">
                    ${imageHTML}
                </div>


                <div class="detail-content">

                    <span class="item-type">

                        ${escapeHtml(
                            String(
                                item.item_type || ""
                            ).toUpperCase()
                        )}

                    </span>


                    <h1>

                        ${escapeHtml(
                            item.item_name ||
                            "Unnamed Item"
                        )}

                    </h1>


                    <p>

                        <strong>Category:</strong>

                        ${escapeHtml(
                            item.category ||
                            "Not specified"
                        )}

                    </p>


                    <p>

                        <strong>Description:</strong>

                        ${escapeHtml(
                            item.description ||
                            "Not specified"
                        )}

                    </p>


                    <p>

                        <strong>Color:</strong>

                        ${escapeHtml(
                            item.color ||
                            "Not specified"
                        )}

                    </p>


                    <p>

                        <strong>Brand:</strong>

                        ${escapeHtml(
                            item.brand ||
                            "Not specified"
                        )}

                    </p>


                    <p>

                        <strong>Location:</strong>

                        ${escapeHtml(
                            item.location ||
                            "Not specified"
                        )}

                    </p>


                    <p>

                        <strong>Date:</strong>

                        ${escapeHtml(
                            item.item_date ||
                            "Not specified"
                        )}

                    </p>


                    ${
                        item.item_type === "lost" ||
                        item.item_type === "found"

                        ?

                        `
                            <button
                                class="match-btn"
                                onclick="findMatches(${item.id})"
                            >
                                🤖 Find AI Matches
                            </button>
                        `

                        :

                        ""
                    }

                </div>

            </div>


            <div id="match-results"></div>

        `;
    }


    catch (error) {

        console.error(
            "Error loading item:",
            error
        );


        itemDetail.innerHTML = `

            <div class="detail-card">

                <h2>
                    Unable to load item
                </h2>

                <p>

                    ${escapeHtml(
                        error.message ||
                        "Something went wrong while loading the item."
                    )}

                </p>

            </div>

        `;
    }
}


// =========================================================
// FIND AI MATCHES
// =========================================================

async function findMatches(id) {

    const matchResults =
        document.getElementById("match-results");


    if (!matchResults) {
        return;
    }


    matchResults.innerHTML = `

        <div class="ai-loading">

            <div class="ai-spinner"></div>

            <h3>
                🤖 AI is analyzing...
            </h3>

            <p>
                Comparing images, descriptions
                and item information.
            </p>

        </div>

    `;


    if (typeof showToast === "function") {

        showToast(
            "🤖 AI matching started...",
            "success"
        );
    }


    try {

        const response = await fetch(
            `${API_URL}/match/${encodeURIComponent(id)}`
        );


        let data = null;

        try {

            data = await response.json();

        }
        catch {

            data = null;
        }


        if (!response.ok) {

            throw new Error(
                data?.detail ||
                data?.message ||
                "Matching failed"
            );
        }


        console.log(
            "AI Match Results:",
            data
        );


        // =================================================
        // NO MATCH FOUND
        // =================================================

        if (
            !data.matches ||
            !Array.isArray(data.matches) ||
            data.matches.length === 0
        ) {

            matchResults.innerHTML = `

                <div class="no-match">

                    <h2>
                        ⚠️ No strong match found
                    </h2>

                    <p>
                        The AI could not find a strong
                        matching found item.
                    </p>

                </div>

            `;


            if (typeof showToast === "function") {

                showToast(
                    "No strong match found.",
                    "warning"
                );
            }


            return;
        }


        // =================================================
        // TAKE TOP 5 MATCHES
        // =================================================

        const topMatches =
            data.matches.slice(0, 5);


        // =================================================
        // DISPLAY AI RESULTS
        // =================================================

        matchResults.innerHTML = `

            <div class="ai-results">


                <div class="ai-summary">

                    <h2>
                        🤖 AI Analysis Complete
                    </h2>

                    <p>

                        We found

                        <strong>
                            ${data.matches.length}
                        </strong>

                        possible match${
                            data.matches.length === 1
                                ? ""
                                : "es"
                        }

                        for this lost item.

                    </p>


                    <p>

                        Results are based on

                        <strong>
                            image similarity
                        </strong>,

                        <strong>
                            description similarity
                        </strong>

                        and

                        <strong>
                            item information
                        </strong>.

                    </p>

                </div>


                <h2>
                    🤖 AI Possible Matches
                </h2>


                <p class="ai-subtitle">

                    Matches are ranked using image similarity,
                    text similarity and item metadata.

                </p>


                ${
                    topMatches.map(match => {

                        const score =
                            Math.max(
                                0,
                                Math.min(
                                    100,
                                    Number(
                                        match.match_score || 0
                                    )
                                )
                            );


                        const imageScore =
                            Math.max(
                                0,
                                Math.min(
                                    100,
                                    Number(
                                        match.image_similarity || 0
                                    )
                                )
                            );


                        const textScore =
                            Math.max(
                                0,
                                Math.min(
                                    100,
                                    Number(
                                        match.text_similarity || 0
                                    )
                                )
                            );


                        const metadataScore =
                            Math.max(
                                0,
                                Math.min(
                                    100,
                                    Number(
                                        match.metadata_score || 0
                                    )
                                )
                            );


                        let confidence =
                            "Low Match";


                        if (score >= 90) {

                            confidence =
                                "Very High Match";

                        }
                        else if (score >= 75) {

                            confidence =
                                "High Match";

                        }
                        else if (score >= 50) {

                            confidence =
                                "Possible Match";
                        }


                        const imageUrl =
                            getImageUrl(match);


                        const matchImage = imageUrl

                            ?

                            `
                                <img
                                    src="${escapeHtml(imageUrl)}"
                                    alt="${escapeHtml(
                                        match.item_name ||
                                        "Possible match"
                                    )}"
                                    onerror="imageErrorHandler(this)"
                                >
                            `

                            :

                            `
                                <div class="image-placeholder">

                                    📦

                                    <span>
                                        No image
                                    </span>

                                </div>
                            `;


                        const reasons =
                            Array.isArray(match.reasons)
                                ? match.reasons
                                : [];


                        return `

                            <div class="match-card">


                                <div class="match-image">

                                    ${matchImage}

                                </div>


                                <div class="match-info">


                                    <h3>

                                        ${escapeHtml(
                                            match.item_name ||
                                            "Possible Match"
                                        )}

                                    </h3>


                                    <div class="match-score">

                                        ${score.toFixed(1)}%

                                    </div>


                                    <p>

                                        <strong>
                                            ${confidence}
                                        </strong>

                                    </p>


                                    <p>

                                        🖼️
                                        Image Similarity:

                                        ${imageScore.toFixed(1)}%

                                    </p>


                                    <p>

                                        📝
                                        Text Similarity:

                                        ${textScore.toFixed(1)}%

                                    </p>


                                    <p>

                                        📋
                                        Metadata Score:

                                        ${metadataScore.toFixed(1)}%

                                    </p>


                                    <h4>

                                        Why this may be a match:

                                    </h4>


                                    <ul>

                                        ${
                                            reasons.length > 0

                                                ?

                                                reasons
                                                    .map(
                                                        reason =>
                                                            `
                                                            <li>
                                                                ${escapeHtml(reason)}
                                                            </li>
                                                            `
                                                    )
                                                    .join("")

                                                :

                                                `
                                                    <li>
                                                        No strong matching features found.
                                                    </li>
                                                `
                                        }

                                    </ul>


                                    <div class="match-actions">


                                        <button
                                            class="view-match-btn"
                                            onclick="viewItem(${Number(match.item_id)})"
                                        >

                                            View Possible Match

                                        </button>


                                        <button
                                            class="contact-btn"
                                            onclick="contactReporter(${Number(match.item_id)})"
                                        >

                                            📩 Contact Reporter

                                        </button>


                                    </div>


                                </div>

                            </div>

                        `;
                    }).join("")
                }


                <!-- MAP -->

                <div class="location-map-section">

                    <h2>
                        📍 Item Locations
                    </h2>

                    <p id="map-status">
                        Loading location map...
                    </p>

                    <div
                        id="match-map"
                        style="
                            width: 100%;
                            height: 450px;
                            border-radius: 15px;
                            overflow: hidden;
                            margin-top: 15px;
                        "
                    ></div>

                </div>


            </div>

        `;


        // =================================================
        // CREATE MAP AFTER RESULTS ARE DISPLAYED
        // =================================================

        await createMatchMap(
            currentItem,
            topMatches
        );


        // =================================================
        // MATCH ALERT
        // =================================================

        if (typeof showToast === "function") {

            const topMatch =
                data.matches[0];


            const score =
                Math.max(
                    0,
                    Math.min(
                        100,
                        Number(
                            topMatch.match_score || 0
                        )
                    )
                );


            let alertMessage;


            if (score >= 90) {

                alertMessage =
                    `🔔 Very High Match Found! ${score.toFixed(1)}%`;

            }

            else if (score >= 75) {

                alertMessage =
                    `🔔 High Match Found! ${score.toFixed(1)}%`;

            }

            else {

                alertMessage =
                    `🔔 Possible Match Found! ${score.toFixed(1)}%`;
            }


            showToast(
                alertMessage,
                "success"
            );
        }

    }


    catch (error) {

        console.error(
            "AI Matching Error:",
            error
        );


        matchResults.innerHTML = `

            <div class="no-match">

                <h2>
                    ❌ Unable to find matches
                </h2>

                <p>

                    ${escapeHtml(
                        error.message ||
                        "The AI matching service could not be reached."
                    )}

                </p>

            </div>

        `;


        if (typeof showToast === "function") {

            showToast(
                error.message ||
                "AI matching service could not be reached.",
                "error"
            );
        }
    }
}


// =========================================================
// VIEW POSSIBLE MATCH
// =========================================================

function viewItem(id) {

    if (!id) {
        return;
    }


    window.location.href =
        `item-detail.html?id=${encodeURIComponent(id)}`;
}


// =========================================================
// CONTACT REPORTER
// =========================================================

async function contactReporter(id) {

    const storedUser =
        localStorage.getItem("user");


    // -----------------------------------------------------
    // CHECK LOGIN
    // -----------------------------------------------------

    if (!storedUser) {

        showToast(
            "Please login before contacting the reporter.",
            "warning"
        );

        return;
    }


    let user;


    try {

        user =
            JSON.parse(storedUser);

    }

    catch (error) {

        console.error(
            "Invalid user:",
            error
        );

        localStorage.removeItem("user");


        showToast(
            "Your login session is invalid. Please login again.",
            "error"
        );

        return;
    }


    if (!user || !user.id) {

        showToast(
            "User information not found. Please login again.",
            "error"
        );

        return;
    }


    try {

        // -------------------------------------------------
        // GET ITEM INFORMATION
        // -------------------------------------------------

        const response =
            await fetch(
                `${API_URL}/items/${encodeURIComponent(id)}`
            );


        let item = null;


        try {

            item =
                await response.json();

        }

        catch {

            item = null;
        }


        if (!response.ok) {

            throw new Error(
                item?.detail ||
                item?.message ||
                "Unable to get item information."
            );
        }


        console.log(
            "Matched item:",
            item
        );


        // -------------------------------------------------
        // CHECK REPORTER
        // -------------------------------------------------

        if (
            item.user_id === null ||
            item.user_id === undefined ||
            item.user_id === ""
        ) {

            showToast(
                "Reporter information is unavailable.",
                "error"
            );


            console.error(
                "Missing user_id in /items response:",
                item
            );

            return;
        }


        // -------------------------------------------------
        // PREVENT CONTACTING YOURSELF
        // -------------------------------------------------

        if (
            Number(item.user_id) ===
            Number(user.id)
        ) {

            showToast(
                "This is your own reported item.",
                "warning"
            );

            return;
        }


        // -------------------------------------------------
        // OPEN MESSAGES PAGE
        // -------------------------------------------------

        const messagesUrl =
            new URL(
                "messages.html",
                window.location.href
            );


        messagesUrl.searchParams.set(
            "item_id",
            id
        );


        window.location.href =
            messagesUrl.toString();
    }


    catch (error) {

        console.error(
            "Contact Reporter Error:",
            error
        );


        showToast(
            error.message ||
            "Unable to contact reporter.",
            "error"
        );
    }
}


// =========================================================
// START
// =========================================================

loadItem();

