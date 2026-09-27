// Lost & Found AI
// Frontend → FastAPI connection


const lostForm = document.getElementById("lost-item-form");
const foundForm = document.getElementById("found-item-form");


// =========================================================
// TOAST NOTIFICATION
// =========================================================

function showToast(message, type = "success") {

    let container = document.querySelector(".toast-container");

    if (!container) {
        container = document.createElement("div");
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");

    toast.className = `toast ${type}`;

    let icon = "✓";

    if (type === "error") {
        icon = "✕";
    }
    else if (type === "warning") {
        icon = "⚠";
    }

    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {

        toast.classList.add("hide");

        setTimeout(() => {
            toast.remove();
        }, 400);

    }, 3000);
}


// =========================================================
// SUBMIT ITEM
// =========================================================

async function handleFormSubmit(event, type) {

    event.preventDefault();

    const form = event.target;


    // -----------------------------------------------------
    // GET FORM DATA
    // -----------------------------------------------------

    const formData = new FormData();

    formData.append(
        "item_type",
        type
    );

    formData.append(
        "item_name",
        form.querySelector('[name="item_name"]').value
    );

    formData.append(
        "category",
        form.querySelector('[name="category"]').value
    );

    formData.append(
        "description",
        form.querySelector('[name="description"]').value
    );

    formData.append(
        "color",
        form.querySelector('[name="color"]').value
    );

    formData.append(
        "brand",
        form.querySelector('[name="brand"]').value
    );

    formData.append(
        "location",
        form.querySelector('[name="location"]').value
    );

    formData.append(
        "date",
        form.querySelector('[name="date"]').value
    );


    // -----------------------------------------------------
    // GET IMAGE
    // -----------------------------------------------------

    const imageInput =
        form.querySelector('[name="image"]');


    if (!imageInput.files.length) {

        showToast(
            "Please upload an item image.",
            "warning"
        );

        return;
    }


    formData.append(
        "image",
        imageInput.files[0]
    );


    // -----------------------------------------------------
    // SEND DATA TO FASTAPI
    // -----------------------------------------------------

    try {

        const response = await fetch(
            `${API_URL}/report-item`,
            {
                method: "POST",
                body: formData
            }
        );


        // -------------------------------------------------
        // CHECK RESPONSE
        // -------------------------------------------------

        if (!response.ok) {

            throw new Error(
                "Server returned an error."
            );
        }


        const result =
            await response.json();


        console.log(
            "Backend Response:",
            result
        );


        // -------------------------------------------------
        // SUCCESS TOAST
        // -------------------------------------------------

        showToast(
            type === "lost"
                ? "Lost item submitted successfully!"
                : "Found item submitted successfully!",
            "success"
        );


        // -------------------------------------------------
        // RESET FORM
        // -------------------------------------------------

        form.reset();

    }


    catch (error) {

        console.error(
            "Error:",
            error
        );


        showToast(
            "Could not connect to the backend. Make sure FastAPI is running.",
            "error"
        );

    }
}


// =========================================================
// LOST FORM
// =========================================================

if (lostForm) {

    lostForm.addEventListener(
        "submit",
        function (event) {

            handleFormSubmit(
                event,
                "lost"
            );

        }
    );

}


// =========================================================
// FOUND FORM
// =========================================================

if (foundForm) {

    foundForm.addEventListener(
        "submit",
        function (event) {

            handleFormSubmit(
                event,
                "found"
            );

        }
    );

}