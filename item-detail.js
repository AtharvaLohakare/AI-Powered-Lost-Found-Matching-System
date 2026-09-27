const itemDetail = document.getElementById("item-detail");

const params = new URLSearchParams(window.location.search);
const itemId = params.get("id");

async function loadItem() {

    if (!itemId) {
        itemDetail.innerHTML = `
            <h2>Item not found</h2>
            <p>No item ID was provided.</p>
        `;
        return;
    }

    try {

        // Get item details
        const response = await fetch(
            `http://127.0.0.1:8000/items/${itemId}`
        );

        if (!response.ok) {
            throw new Error("Item not found");
        }

        const item = await response.json();

        // Display item
        itemDetail.innerHTML = `
            <div class="detail-card">

                <div class="detail-image">
                    <img
                        src="http://127.0.0.1:8000/uploads/${item.image_name}"
                        alt="${item.item_name}"
                    >
                </div>

                <div class="detail-content">

                    <span class="item-type">
                        ${item.item_type.toUpperCase()}
                    </span>

                    <h1>${item.item_name}</h1>

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

                    ${
                        item.item_type === "lost"
                        ? `
                            <button
                                class="match-btn"
                                onclick="findMatches(${item.id})"
                            >
                                🤖 Find AI Matches
                            </button>
                          `
                        : ""
                    }

                </div>

            </div>

            <div id="match-results"></div>
        `;

    } catch (error) {

        console.error(error);

        itemDetail.innerHTML = `
            <h2>Unable to load item</h2>
            <p>Something went wrong while loading the item.</p>
        `;
    }
}


async function findMatches(id) {

    const matchResults = document.getElementById("match-results");

    matchResults.innerHTML = `
        <div class="ai-loading">
            <h2>🤖 AI is analyzing...</h2>
            <p>Comparing images, descriptions and item details.</p>
        </div>
    `;

    try {

        const response = await fetch(
            `http://127.0.0.1:8000/match/${id}`
        );

        if (!response.ok) {
            throw new Error("Matching failed");
        }

        const data = await response.json();

        if (
            !data.matches ||
            data.matches.length === 0
        ) {
            matchResults.innerHTML = `
                <div class="no-match">
                    <h2>No matches found</h2>
                    <p>No found items are currently available for comparison.</p>
                </div>
            `;
            return;
        }

        // Show top 5 matches
        const topMatches = data.matches.slice(0, 5);

        matchResults.innerHTML = `
            <div class="ai-results">
                <div class="ai-summary">
                <h2>🤖 AI Analysis Complete</h2>
                <p>
                    We found ${data.matches.length} possible match${data.matches.length === 1 ? "" : "es"}
                    for this lost item.
                </p>
                <p>
                    The results are based on <strong>image similarity</strong>,
                    <strong>description similarity</strong>, and
                    <strong>item information</strong>.
                </p>
                </div>

                <h2>🤖 AI Possible Matches</h2>

                <p class="ai-subtitle">
                    Matches are ranked using image similarity,
                    text similarity and item metadata.
                </p>

                ${topMatches.map(match => {

                    let confidence = "Low Match";

                    if (match.match_score >= 90) {
                        confidence = "Very High Match";
                    } else if (match.match_score >= 75) {
                        confidence = "High Match";
                    } else if (match.match_score >= 50) {
                        confidence = "Possible Match";
                    }

                    return `
                        <div class="match-card">

                            <div class="match-image">

                                <img
                                    src="http://127.0.0.1:8000/uploads/${match.image_name}"
                                    alt="${match.item_name}"
                                >

                            </div>

                            <div class="match-info">

                                <h3>${match.item_name}</h3>

                                <div class="match-score">
                                    ${match.match_score}%
                                </div>

                                <p>
                                    <strong>${confidence}</strong>
                                </p>

                                <p>
                                    🖼️ Image Similarity:
                                    ${match.image_similarity}%
                                </p>

                                <p>
                                    📝 Text Similarity:
                                    ${match.text_similarity}%
                                </p>

                                <p>
                                    📋 Metadata Score:
                                    ${match.metadata_score}%
                                </p>

                                <h4>Why this may be a match:</h4>

                                <ul>
                                    ${
                                        match.reasons.length > 0
                                        ? match.reasons
                                            .map(reason => `<li>${reason}</li>`)
                                            .join("")
                                        : "<li>No strong matching features</li>"
                                    }
                                </ul>

                                <button
                                    class="view-match-btn"
                                    onclick="viewItem(${match.item_id})"
                                >
                                    View Possible Match
                                </button>

                            </div>

                        </div>
                    `;

                }).join("")}

            </div>
        `;

    } catch (error) {

        console.error(error);

        matchResults.innerHTML = `
            <div class="no-match">

                <h2>Unable to find matches</h2>

                <p>
                    The AI matching service could not be reached.
                </p>

            </div>
        `;
    }
}


function viewItem(id) {

    window.location.href =
        `item-detail.html?id=${id}`;
}


loadItem();