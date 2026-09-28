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
    console.log("FORM HANDLER STARTED:", type);

    event.preventDefault();

    const form = event.target;


    // -----------------------------------------------------
    // CHECK LOGIN
    // -----------------------------------------------------

    const storedUser = localStorage.getItem("user");

    if (!storedUser) {

        showToast(
            "Please login before reporting an item.",
            "warning"
        );

        return;
    }


    let user;

    try {

        user = JSON.parse(storedUser);

    }
    catch (error) {

        console.error("Invalid user data:", error);

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


    console.log("Logged in user:", user);
    console.log("User ID:", user.id);


    // -----------------------------------------------------
    // CREATE FORM DATA
    // -----------------------------------------------------

    const formData = new FormData();


    // IMPORTANT:
    // Send logged-in user's ID

    formData.append(
        "user_id",
        user.id
    );


    // -----------------------------------------------------
    // ITEM TYPE
    // -----------------------------------------------------

    formData.append(
        "item_type",
        type
    );


    // -----------------------------------------------------
    // ITEM NAME
    // -----------------------------------------------------

    formData.append(
        "item_name",
        form.querySelector('[name="item_name"]').value
    );


    // -----------------------------------------------------
    // CATEGORY
    // -----------------------------------------------------

    formData.append(
        "category",
        form.querySelector('[name="category"]').value
    );


    // -----------------------------------------------------
    // DESCRIPTION
    // -----------------------------------------------------

    formData.append(
        "description",
        form.querySelector('[name="description"]').value
    );


    // -----------------------------------------------------
    // COLOR
    // -----------------------------------------------------

    formData.append(
        "color",
        form.querySelector('[name="color"]').value
    );


    // -----------------------------------------------------
    // BRAND
    // -----------------------------------------------------

    formData.append(
        "brand",
        form.querySelector('[name="brand"]').value
    );


    // -----------------------------------------------------
    // LOCATION
    // -----------------------------------------------------

    formData.append(
        "location",
        form.querySelector('[name="location"]').value
    );


    // -----------------------------------------------------
    // DATE
    // -----------------------------------------------------

    formData.append(
        "date",
        form.querySelector('[name="date"]').value
    );


    // -----------------------------------------------------
    // IMAGE
    // -----------------------------------------------------

    const imageInput =
        form.querySelector('[name="image"]');


    if (!imageInput || !imageInput.files.length) {

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
    // DEBUG FORM DATA
    // -----------------------------------------------------

    console.log(
        "Submitting report for user ID:",
        user.id
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
        // GET RESPONSE
        // -------------------------------------------------

        const result = await response.json();


        console.log(
            "Backend Response:",
            result
        );


        // -------------------------------------------------
        // CHECK RESPONSE
        // -------------------------------------------------

        if (!response.ok) {

            throw new Error(
                result.detail ||
                "Server returned an error."
            );
        }


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
            error.message ||
            "Could not connect to the backend.",
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
