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

        const response = await fetch(
            `http://127.0.0.1:8000/items/${itemId}`
        );

        if (!response.ok) {
            throw new Error("Item not found");
        }

        const item = await response.json();


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

                </div>

            </div>

        `;

    } catch (error) {

        console.error(error);

        itemDetail.innerHTML = `
            <h2>Unable to load item</h2>
            <p>Something went wrong while loading the item.</p>
        `;
    }
}


loadItem();