// =========================================================
// LOST & FOUND AI
// ITEMS PAGE
// =========================================================

const itemsContainer =
    document.getElementById("items-container");


// =========================================================
// LOAD ALL ITEMS
// =========================================================

async function loadItems() {

    try {

        const response = await fetch(
            `${API_URL}/items`
        );


        if (!response.ok) {

            throw new Error(
                "Failed to fetch items"
            );

        }


        const items = await response.json();


        // Clear existing items

        itemsContainer.innerHTML = "";


        // =================================================
        // NO ITEMS
        // =================================================

        if (items.length === 0) {

            itemsContainer.innerHTML = `

                <p>
                    No lost or found items
                    reported yet.
                </p>

            `;

            return;
        }


        // =================================================
        // CREATE ITEM CARDS
        // =================================================

        items.forEach(item => {

            const card =
                document.createElement("div");


            card.className =
                "item-card";


            card.style.cursor =
                "pointer";


            // =================================================
            // CLICK ITEM CARD
            // =================================================

            card.addEventListener(
                "click",
                function () {

                    window.location.href =
                        `item-detail.html?id=${item.id}`;

                }
            );


            // =================================================
            // CARD HTML
            // =================================================

            card.innerHTML = `

                <img
                    src="${API_URL}/uploads/${item.image_name}"
                    alt="${item.item_name}"
                >


                <div class="item-card-content">


                    <span class="item-type">

                        ${item.item_type.toUpperCase()}

                    </span>


                    <h2>

                        ${item.item_name}

                    </h2>


                    <p>

                        <strong>
                            Category:
                        </strong>

                        ${item.category}

                    </p>


                    <p>

                        <strong>
                            Color:
                        </strong>

                        ${item.color || "Not specified"}

                    </p>


                    <p>

                        <strong>
                            Brand:
                        </strong>

                        ${item.brand || "Not specified"}

                    </p>


                    <p>

                        <strong>
                            Location:
                        </strong>

                        ${item.location}

                    </p>


                    <p>

                        <strong>
                            Date:
                        </strong>

                        ${item.item_date}

                    </p>


                </div>

            `;


            // Add card to container

            itemsContainer.appendChild(card);

        });

    }


    // =====================================================
    // ERROR HANDLING
    // =====================================================

    catch (error) {

        console.error(
            "Error loading items:",
            error
        );


        itemsContainer.innerHTML = `

            <p>

                Could not load items.

                Make sure FastAPI is running.

            </p>

        `;

    }

}


// =========================================================
// START LOADING ITEMS
// =========================================================

loadItems();