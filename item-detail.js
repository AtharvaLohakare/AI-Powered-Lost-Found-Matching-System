
// =========================================================
// LOST & FOUND AI
// ITEM DETAIL + AI MATCHING + OWNERSHIP VERIFICATION
// =========================================================

const itemDetail = document.getElementById("item-detail");

const params = new URLSearchParams(window.location.search);
const itemId = params.get("id");


// =========================================================
// GET CURRENT USER
// =========================================================

function getCurrentUser() {

    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
        return null;
    }

    try {

        const user = JSON.parse(storedUser);

        if (!user || !user.id) {
            return null;
        }

        return user;

    }
    catch (error) {

        console.error("Invalid user:", error);

        localStorage.removeItem("user");

        return null;
    }
}


// =========================================================
// SAFE HTML
// =========================================================

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


// =========================================================
// IMAGE URL
// =========================================================

function getImageUrl(item) {

    if (!item) {
        return null;
    }

    if (item.image_url) {

        if (item.image_url.startsWith("http")) {
            return item.image_url;
        }

        return `${API_URL}${item.image_url}`;
    }

    if (item.image_name) {
        return `${API_URL}/uploads/${item.image_name}`;
    }

    return null;
}


// =========================================================
// LOAD ITEM
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

        const currentUser = getCurrentUser();

        const imageUrl = getImageUrl(item);


        // =================================================
        // IMAGE
        // =================================================

        const imageHTML = imageUrl

            ? `
                <img
                    src="${escapeHtml(imageUrl)}"
                    alt="${escapeHtml(item.item_name)}"
                    onerror="this.style.display='none';"
                >
              `

            : `
                <div class="image-placeholder">
                    📦
                    <span>No image available</span>
                </div>
              `;


        // =================================================
        // USER ROLE
        // =================================================

        const isOwner =
            currentUser &&
            Number(currentUser.id) === Number(item.user_id);


        // =================================================
        // ACTIONS
        // =================================================

        let actionHTML = "";


        // -------------------------------------------------
        // LOST ITEM
        // -------------------------------------------------

        if (item.item_type === "lost") {

            actionHTML += `

                <button
                    class="match-btn"
                    onclick="findMatches(${item.id})"
                >
                    🤖 Find AI Matches
                </button>

            `;


            // Owner sees their own report
            if (isOwner) {

                actionHTML += `

                    <div class="verification-info">

                        <p>
                            📋 This is your lost-item report.
                        </p>

                        <p>
                            AI matching will search for
                            matching found items.
                        </p>

                    </div>

                `;

            }

            // Other users can contact lost-item reporter
            else if (currentUser) {

                actionHTML += `

                    <button
                        class="contact-btn"
                        onclick="contactReporter(${item.id})"
                    >
                        📩 Contact Reporter
                    </button>

                `;

            }

            else {

                actionHTML += `

                    <p class="login-note">
                        Login to contact the reporter.
                    </p>

                `;

            }

        }


        // -------------------------------------------------
        // FOUND ITEM
        // -------------------------------------------------

        else if (item.item_type === "found") {


            // ---------------------------------------------
            // FOUND ITEM OWNER / REPORTER
            // ---------------------------------------------

            if (isOwner) {

                actionHTML += `

                    <div class="verification-owner-box">

                        <h3>
                            📦 Your Found Item
                        </h3>

                        <p>
                            You reported this found item.
                        </p>

                        <p>
                            If someone claims this item,
                            their ownership proof will
                            appear in your verification
                            requests.
                        </p>

                        <a
                            href="my-reports.html"
                            class="contact-btn"
                        >
                            🔍 View Verification Requests
                        </a>

                    </div>

                `;

            }


            // ---------------------------------------------
            // OTHER USER = POSSIBLE CLAIMANT
            // ---------------------------------------------

            else if (currentUser) {

                actionHTML += `

                    <div class="verification-claim-box">

                        <h3>
                            🔐 Claim This Found Item
                        </h3>

                        <p>
                            If this item belongs to you,
                            submit ownership proof to
                            the person who reported it.
                        </p>

                        <textarea
                            id="ownership-proof"
                            rows="5"
                            placeholder="Explain why this item belongs to you. Mention identifying details, purchase information, unique marks, etc."
                        ></textarea>

                        <button
                            class="match-btn"
                            onclick="submitOwnershipClaim(${item.id})"
                        >
                            🔐 Submit Ownership Proof
                        </button>

                    </div>

                `;

            }


            // ---------------------------------------------
            // NOT LOGGED IN
            // ---------------------------------------------

            else {

                actionHTML += `

                    <div class="login-note">

                        <p>
                            🔐 Login to submit an ownership claim.
                        </p>

                        <a
                            href="login.html"
                            class="login-btn"
                        >
                            Login
                        </a>

                    </div>

                `;

            }

        }


        // =================================================
        // DISPLAY ITEM
        // =================================================

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


                    <div class="item-actions">

                        ${actionHTML}

                    </div>

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
                        "Something went wrong."
                    )}
                </p>

            </div>

        `;

    }

}


// =========================================================
// SUBMIT OWNERSHIP CLAIM
// =========================================================

async function submitOwnershipClaim(id) {

    const currentUser = getCurrentUser();


    // -----------------------------------------------------
    // LOGIN CHECK
    // -----------------------------------------------------

    if (!currentUser) {

        showToast(
            "Please login before submitting an ownership claim.",
            "warning"
        );

        return;
    }


    const proofElement =
        document.getElementById("ownership-proof");


    if (!proofElement) {
        return;
    }


    const proof =
        proofElement.value.trim();


    // -----------------------------------------------------
    // PROOF CHECK
    // -----------------------------------------------------

    if (!proof) {

        showToast(
            "Please provide ownership proof.",
            "warning"
        );

        proofElement.focus();

        return;
    }


    if (proof.length < 10) {

        showToast(
            "Please provide more detailed ownership proof.",
            "warning"
        );

        proofElement.focus();

        return;
    }


    // -----------------------------------------------------
    // BUTTON
    // -----------------------------------------------------

    const buttons =
        document.querySelectorAll(
            ".verification-claim-box button"
        );


    buttons.forEach(button => {

        button.disabled = true;

        button.textContent =
            "Submitting...";

    });


    try {

        // =================================================
        // SEND QUERY PARAMETERS
        // Backend expects:
        // item_id
        // claimant_id
        // proof
        // =================================================

        const url =
            `${API_URL}/verification/request` +
            `?item_id=${encodeURIComponent(id)}` +
            `&claimant_id=${encodeURIComponent(currentUser.id)}` +
            `&proof=${encodeURIComponent(proof)}`;


        const response = await fetch(
            url,
            {
                method: "POST"
            }
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
                "Unable to submit ownership claim."
            );

        }


        showToast(
            "🔐 Ownership proof submitted successfully!",
            "success"
        );


        // Replace form with submitted message

        const claimBox =
            document.querySelector(
                ".verification-claim-box"
            );


        if (claimBox) {

            claimBox.innerHTML = `

                <h3>
                    ✅ Claim Submitted
                </h3>

                <p>
                    Your ownership proof has been
                    sent to the person who reported
                    this found item.
                </p>

                <p>
                    Please wait for their response.
                </p>

            `;

        }

    }


    catch (error) {

        console.error(
            "Ownership Claim Error:",
            error
        );


        showToast(
            error.message ||
            "Unable to submit ownership claim.",
            "error"
        );


        buttons.forEach(button => {

            button.disabled = false;

            button.textContent =
                "🔐 Submit Ownership Proof";

        });

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
            `${API_URL}/match/${id}`
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
        // NO MATCH
        // =================================================

        if (
            !data.matches ||
            data.matches.length === 0
        ) {

            matchResults.innerHTML = `

                <div class="no-match">

                    <h2>
                        ⚠️ No opposite item found
                    </h2>

                    <p>
                        The AI could not find a
                        matching found item.
                    </p>

                </div>

            `;


            if (typeof showToast === "function") {

                showToast(
                    "No matching item found.",
                    "warning"
                );

            }

            return;
        }


        // =================================================
        // TOP 5
        // =================================================

        const topMatches =
            data.matches.slice(0, 5);


        // =================================================
        // DISPLAY
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

                        possible match${data.matches.length === 1
                            ? ""
                            : "es"
                        }.

                    </p>

                    <p>
                        Results are based on image,
                        description and item information.
                    </p>

                </div>


                <h2>
                    🤖 AI Possible Matches
                </h2>


                <p class="ai-subtitle">

                    Matches are ranked using image
                    similarity, text similarity
                    and item metadata.

                </p>


                ${topMatches.map(match => {

                    const score =
                        Number(match.match_score || 0);


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


                    const imageScore =
                        Number(
                            match.image_score || 0
                        );


                    const textScore =
                        Number(
                            match.text_score || 0
                        );


                    const metadataScore =
                        Number(
                            match.metadata_score || 0
                        );


                    const imageUrl =
                        match.image_url
                            ? (
                                match.image_url.startsWith("http")
                                    ? match.image_url
                                    : `${API_URL}${match.image_url}`
                              )
                            : (
                                match.image_name
                                    ? `${API_URL}/uploads/${match.image_name}`
                                    : null
                              );


                    return `

                        <div class="match-card">


                            <div class="match-image">

                                ${
                                    imageUrl

                                    ? `

                                        <img
                                            src="${escapeHtml(imageUrl)}"
                                            alt="${escapeHtml(
                                                match.item_name ||
                                                "Possible match"
                                            )}"
                                        >

                                      `

                                    : `

                                        <div class="image-placeholder">
                                            📦
                                        </div>

                                      `
                                }

                            </div>


                            <div class="match-info">


                                <h3>

                                    ${escapeHtml(
                                        match.item_name ||
                                        "Unnamed Item"
                                    )}

                                </h3>


                                <div class="match-score">

                                    ${score}%

                                </div>


                                <p>

                                    <strong>
                                        ${confidence}
                                    </strong>

                                </p>


                                <p>

                                    🖼️ Image Similarity:

                                    ${imageScore}%

                                </p>


                                <p>

                                    📝 Text Similarity:

                                    ${textScore}%

                                </p>


                                <p>

                                    📋 Metadata Score:

                                    ${metadataScore}%

                                </p>


                                ${
                                    match.distance_km !== null &&
                                    match.distance_km !== undefined

                                    ? `

                                        <p>
                                            📍 Distance:
                                            ${match.distance_km} km
                                        </p>

                                      `

                                    : ""
                                }


                                <div class="match-actions">


                                    <button
                                        class="view-match-btn"
                                        onclick="viewItem(${match.item_id})"
                                    >
                                        View Possible Match
                                    </button>


                                    <button
                                        class="contact-btn"
                                        onclick="contactReporter(${match.item_id})"
                                    >
                                        📩 Contact Reporter
                                    </button>


                                </div>


                            </div>

                        </div>

                    `;

                }).join("")}


            </div>

        `;


        // =================================================
        // MATCH TOAST
        // =================================================

        if (typeof showToast === "function") {

            const topMatch =
                data.matches[0];


            const score =
                Number(topMatch.match_score || 0);


            let alertMessage =
                "🔔 Possible Match Found!";


            if (score >= 90) {

                alertMessage =
                    `🔔 Very High Match Found! ${score}%`;

            }

            else if (score >= 75) {

                alertMessage =
                    `🔔 High Match Found! ${score}%`;

            }

            else {

                alertMessage =
                    `🔔 Possible Match Found! ${score}%`;

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

    window.location.href =
        `item-detail.html?id=${encodeURIComponent(id)}`;

}


// =========================================================
// CONTACT REPORTER
// =========================================================

async function contactReporter(id) {

    const currentUser =
        getCurrentUser();


    // -----------------------------------------------------
    // LOGIN
    // -----------------------------------------------------

    if (!currentUser) {

        showToast(
            "Please login before contacting the reporter.",
            "warning"
        );

        return;
    }


    try {

        const response = await fetch(
            `${API_URL}/items/${encodeURIComponent(id)}`
        );


        let item = null;


        try {

            item = await response.json();

        }
        catch {

            item = null;

        }


        if (!response.ok || !item) {

            throw new Error(
                item?.detail ||
                "Unable to get item information."
            );

        }


        // -------------------------------------------------
        // REPORTER CHECK
        // -------------------------------------------------

        if (!item.user_id) {

            showToast(
                "Reporter information is unavailable.",
                "error"
            );

            return;
        }


        // -------------------------------------------------
        // SELF CHECK
        // -------------------------------------------------

        if (
            Number(item.user_id) ===
            Number(currentUser.id)
        ) {

            showToast(
                "This is your own reported item.",
                "warning"
            );

            return;
        }


        // -------------------------------------------------
        // OPEN MESSAGES
        // -------------------------------------------------

        window.location.href =
            `messages.html?item_id=${encodeURIComponent(id)}`;

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


