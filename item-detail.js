// =========================================================
// LOST & FOUND AI
// ITEM DETAIL + AI MATCHING
// =========================================================

const itemDetail = document.getElementById("item-detail");

const params = new URLSearchParams(window.location.search);
const itemId = params.get("id");


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
            `${API_URL}/items/${itemId}`
        );

        if (!response.ok) {
            throw new Error("Item not found");
        }

        const item = await response.json();

        itemDetail.innerHTML = `

            <div class="detail-card">

                <div class="detail-image">

                    <img
                        src="${API_URL}/uploads/${item.image_name}"
                        alt="${item.item_name}"
                    >

                </div>


                <div class="detail-content">

                    <span class="item-type">
                        ${item.item_type.toUpperCase()}
                    </span>


                    <h1>
                        ${item.item_name}
                    </h1>


                    <p>
                        <strong>Category:</strong>
                        ${item.category}
                    </p>


                    <p>
                        <strong>Description:</strong>
                        ${item.description}
                    </p>


                    <p>
                        <strong>Color:</strong>
                        ${item.color || "Not specified"}
                    </p>


                    <p>
                        <strong>Brand:</strong>
                        ${item.brand || "Not specified"}
                    </p>


                    <p>
                        <strong>Location:</strong>
                        ${item.location}
                    </p>


                    <p>
                        <strong>Date:</strong>
                        ${item.item_date}
                    </p>


                    ${item.item_type === "lost"
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
                    Something went wrong while loading
                    the item.
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


    // Show loading animation

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


    // Toast notification

    if (typeof showToast === "function") {

        showToast(
            "🤖 AI matching started...",
            "success"
        );

    }


    try {

        // Call backend AI matching API

        const response = await fetch(
            `${API_URL}/match/${id}`
        );


        if (!response.ok) {

            throw new Error(
                "Matching failed"
            );

        }


        const data = await response.json();


        console.log(
            "AI Match Results:",
            data
        );


        // =================================================
        // NO MATCH FOUND
        // =================================================

        if (
            !data.matches ||
            data.matches.length === 0
        ) {

            matchResults.innerHTML = `

                <div class="no-match">

                    <h2>
                        ⚠️ No strong match found
                    </h2>

                    <p>
                        The AI could not find a
                        strong matching found item.
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


                <!-- AI SUMMARY -->

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
            }

                        for this lost item.

                    </p>


                    <p>

                        The results are based on

                        <strong>
                            image similarity
                        </strong>,

                        <strong>
                            description similarity
                        </strong>,

                        and

                        <strong>
                            item information
                        </strong>.

                    </p>

                </div>


                <!-- MATCH HEADING -->

                <h2>
                    🤖 AI Possible Matches
                </h2>


                <p class="ai-subtitle">

                    Matches are ranked using
                    image similarity, text similarity
                    and item metadata.

                </p>


                <!-- MATCH CARDS -->

                ${topMatches
                .map(match => {

                    // =================================
                    // CONFIDENCE LEVEL
                    // =================================

                    let confidence =
                        "Low Match";


                    if (
                        match.match_score >= 90
                    ) {

                        confidence =
                            "Very High Match";

                    }

                    else if (
                        match.match_score >= 75
                    ) {

                        confidence =
                            "High Match";

                    }

                    else if (
                        match.match_score >= 50
                    ) {

                        confidence =
                            "Possible Match";

                    }


                    // =================================
                    // RETURN MATCH CARD
                    // =================================

                    return `

                                <div class="match-card">


                                    <!-- MATCH IMAGE -->

                                    <div class="match-image">

                                        <img
                                            src="${API_URL}/uploads/${match.image_name}"
                                            alt="${match.item_name}"
                                        >

                                    </div>


                                    <!-- MATCH INFORMATION -->

                                    <div class="match-info">


                                        <h3>
                                            ${match.item_name}
                                        </h3>


                                        <!-- MATCH SCORE -->

                                        <div class="match-score">

                                            ${match.match_score}%

                                        </div>


                                        <!-- CONFIDENCE -->

                                        <p>

                                            <strong>
                                                ${confidence}
                                            </strong>

                                        </p>


                                        <!-- IMAGE SCORE -->

                                        <p>

                                            🖼️
                                            Image Similarity:

                                            ${match.image_similarity}%

                                        </p>


                                        <!-- TEXT SCORE -->

                                        <p>

                                            📝
                                            Text Similarity:

                                            ${match.text_similarity}%

                                        </p>


                                        <!-- METADATA SCORE -->

                                        <p>

                                            📋
                                            Metadata Score:

                                            ${match.metadata_score}%

                                        </p>


                                        <!-- REASONS -->

                                        <h4>
                                            Why this may be a match:
                                        </h4>


                                        <ul>

                                            ${match.reasons &&
                            match.reasons.length > 0

                            ?

                            match.reasons
                                .map(
                                    reason =>
                                        `<li>${reason}</li>`
                                )
                                .join("")

                            :

                            `
                                                    <li>
                                                        No strong matching features
                                                    </li>
                                                `
                        }

                                        </ul>


                                        <!-- VIEW MATCH BUTTON -->

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

                })
                .join("")
            }


            </div>

        `;


        // =================================================
        // SUCCESS TOAST
        // =================================================

        // =================================================
        // MATCH ALERT
        // =================================================

        if (typeof showToast === "function") {

            const topMatch = data.matches[0];
            const score = topMatch.match_score;

            let alertMessage = "";

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


        // =================================================
        // ERROR MESSAGE
        // =================================================

        matchResults.innerHTML = `

            <div class="no-match">

                <h2>
                    ❌ Unable to find matches
                </h2>

                <p>

                    The AI matching service could
                    not be reached.

                </p>

            </div>

        `;


        // =================================================
        // ERROR TOAST
        // =================================================

        if (typeof showToast === "function") {

            showToast(

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
        `item-detail.html?id=${id}`;

}
// =========================================================
// CONTACT REPORTER
// =========================================================

async function contactReporter(id) {

    const storedUser = localStorage.getItem("user");


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

        user = JSON.parse(storedUser);

    } catch (error) {

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
        // GET MATCHED ITEM
        // -------------------------------------------------

        const response = await fetch(
            `${API_URL}/items/${id}`
        );


        if (!response.ok) {

            throw new Error(
                "Unable to get item information."
            );

        }


        const item = await response.json();


        // -------------------------------------------------
        // CHECK REPORTER
        // -------------------------------------------------

        if (!item.user_id) {

            showToast(
                "Reporter information is unavailable.",
                "error"
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

        window.location.href =
            `messages.html?item_id=${encodeURIComponent(id)}`;

    }

    catch (error) {

        console.error(
            "Contact Reporter Error:",
            error
        );

        showToast(
            "Unable to contact reporter.",
            "error"
        );

    }
}
// =========================================================
// START
// =========================================================

loadItem();