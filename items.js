const itemsContainer = document.getElementById("items-container");

async function loadItems() {

    try {

        const response = await fetch("http://127.0.0.1:8000/items");

        if (!response.ok) {
            throw new Error("Failed to fetch items");
        }

        const items = await response.json();

        itemsContainer.innerHTML = "";

        if (items.length === 0) {

            itemsContainer.innerHTML = `
                <p>No lost or found items reported yet.</p>
            `;

            return;
        }

        items.forEach(item => {

            const card = document.createElement("div");

            card.className = "item-card";
            card.style.cursor = "pointer";

            card.addEventListener("click", function () {
                window.location.href = `item-detail.html?id=${item.id}`;
            });

            card.innerHTML = `
                <img 
                    src="http://127.0.0.1:8000/uploads/${item.image_name}"
                    alt="${item.item_name}"
                >

                <div class="item-card-content">

                    <span class="item-type">
                        ${item.item_type.toUpperCase()}
                    </span>

                    <h2>${item.item_name}</h2>

                    <p>
                        <strong>Category:</strong>
                        ${item.category}
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

                </div>
            `;

            itemsContainer.appendChild(card);

        });

    } catch (error) {

        console.error(error);

        itemsContainer.innerHTML = `
            <p>
                Could not load items.
                Make sure FastAPI is running.
            </p>
        `;
    }
}


loadItems();