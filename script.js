// =========================================================
// LOST & FOUND AI
// MAIN FRONTEND SCRIPT
// =========================================================

const lostForm =
    document.getElementById("lost-item-form");

const foundForm =
    document.getElementById("found-item-form");


// =========================================================
// TOAST NOTIFICATION
// =========================================================

function showToast(message, type = "success") {

    let container =
        document.querySelector(".toast-container");


    if (!container) {

        container =
            document.createElement("div");

        container.className =
            "toast-container";

        document.body.appendChild(
            container
        );

    }


    const toast =
        document.createElement("div");

    toast.className =
        `toast ${type}`;


    let icon = "✓";


    if (type === "error") {

        icon = "✕";

    }
    else if (type === "warning") {

        icon = "⚠";

    }


    const iconSpan =
        document.createElement("span");

    iconSpan.className =
        "toast-icon";

    iconSpan.textContent =
        icon;


    const messageSpan =
        document.createElement("span");

    messageSpan.textContent =
        message;


    toast.appendChild(
        iconSpan
    );

    toast.appendChild(
        messageSpan
    );


    container.appendChild(
        toast
    );


    setTimeout(() => {

        toast.classList.add(
            "hide"
        );


        setTimeout(() => {

            toast.remove();

        }, 400);

    }, 3000);

}


// =========================================================
// SUBMIT ITEM
// =========================================================

async function handleFormSubmit(
    event,
    type
) {

    console.log(
        "FORM HANDLER STARTED:",
        type
    );


    event.preventDefault();


    const form =
        event.target;


    // -----------------------------------------------------
    // CHECK LOGIN
    // -----------------------------------------------------

    const storedUser =
        localStorage.getItem("user");


    if (!storedUser) {

        showToast(
            "Please login before reporting an item.",
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
            "Invalid user data:",
            error
        );

        localStorage.removeItem(
            "user"
        );

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


    console.log(
        "Logged in user:",
        user
    );


    // -----------------------------------------------------
    // GET FORM FIELDS
    // -----------------------------------------------------

    const itemName =
        form.querySelector(
            '[name="item_name"]'
        );

    const category =
        form.querySelector(
            '[name="category"]'
        );

    const description =
        form.querySelector(
            '[name="description"]'
        );

    const color =
        form.querySelector(
            '[name="color"]'
        );

    const brand =
        form.querySelector(
            '[name="brand"]'
        );

    const location =
        form.querySelector(
            '[name="location"]'
        );

    const date =
        form.querySelector(
            '[name="date"]'
        );

    const imageInput =
        form.querySelector(
            '[name="image"]'
        );


    // -----------------------------------------------------
    // VALIDATE REQUIRED FIELDS
    // -----------------------------------------------------

    if (
        !itemName ||
        !itemName.value.trim()
    ) {

        showToast(
            "Please enter the item name.",
            "warning"
        );

        return;
    }


    if (
        !category ||
        !category.value.trim()
    ) {

        showToast(
            "Please select a category.",
            "warning"
        );

        return;
    }


    if (
        !description ||
        !description.value.trim()
    ) {

        showToast(
            "Please enter a description.",
            "warning"
        );

        return;
    }


    if (
        !location ||
        !location.value.trim()
    ) {

        showToast(
            "Please enter the location.",
            "warning"
        );

        return;
    }


    if (
        !date ||
        !date.value
    ) {

        showToast(
            "Please select the date.",
            "warning"
        );

        return;
    }


    // -----------------------------------------------------
    // IMAGE VALIDATION
    // -----------------------------------------------------

    if (
        !imageInput ||
        !imageInput.files ||
        imageInput.files.length === 0
    ) {

        showToast(
            "Please upload an item image.",
            "warning"
        );

        return;
    }


    const image =
        imageInput.files[0];


    // Maximum 10 MB frontend validation

    const maxSize =
        10 * 1024 * 1024;


    if (image.size > maxSize) {

        showToast(
            "Image must be smaller than 10 MB.",
            "warning"
        );

        return;
    }


    // -----------------------------------------------------
    // IMAGE TYPE VALIDATION
    // -----------------------------------------------------

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/jpg"
    ];


    if (
        !allowedTypes.includes(
            image.type
        )
    ) {

        showToast(
            "Please upload JPG, PNG or WEBP image.",
            "warning"
        );

        return;
    }


    // -----------------------------------------------------
    // CREATE FORM DATA
    // -----------------------------------------------------

    const formData =
        new FormData();


    formData.append(
        "user_id",
        user.id
    );


    formData.append(
        "item_type",
        type
    );


    formData.append(
        "item_name",
        itemName.value.trim()
    );


    formData.append(
        "category",
        category.value.trim()
    );


    formData.append(
        "description",
        description.value.trim()
    );


    formData.append(
        "color",
        color
            ? color.value.trim()
            : ""
    );


    formData.append(
        "brand",
        brand
            ? brand.value.trim()
            : ""
    );


    formData.append(
        "location",
        location.value.trim()
    );


    formData.append(
        "date",
        date.value
    );


    formData.append(
        "image",
        image
    );


    console.log(
        "Submitting item:",
        {
            user_id: user.id,
            item_type: type,
            item_name: itemName.value
        }
    );


    // -----------------------------------------------------
    // DISABLE SUBMIT BUTTON
    // -----------------------------------------------------

    const submitButton =
        form.querySelector(
            'button[type="submit"]'
        );


    const originalButtonText =
        submitButton
            ? submitButton.textContent
            : "";


    if (submitButton) {

        submitButton.disabled =
            true;

        submitButton.textContent =
            "Submitting...";

    }


    // -----------------------------------------------------
    // SEND TO BACKEND
    // -----------------------------------------------------

    try {

        const response =
            await fetch(
                `${API_URL}/report-item`,
                {
                    method: "POST",
                    body: formData
                }
            );


        let result = null;


        try {

            result =
                await response.json();

        }
        catch {

            result = null;

        }


        console.log(
            "Backend Response:",
            result
        );


        if (!response.ok) {

            throw new Error(
                result?.detail ||
                result?.message ||
                "Server returned an error."
            );

        }


        // -------------------------------------------------
        // SUCCESS
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


        // -------------------------------------------------
        // OPTIONAL REDIRECT
        // -------------------------------------------------

        if (
            result &&
            result.id
        ) {

            setTimeout(() => {

                window.location.href =
                    `item-detail.html?id=${encodeURIComponent(
                        result.id
                    )}`;

            }, 1000);

        }

    }


    catch (error) {

        console.error(
            "Report submission error:",
            error
        );


        showToast(
            error.message ||
            "Could not connect to the backend.",
            "error"
        );

    }


    finally {

        if (submitButton) {

            submitButton.disabled =
                false;

            submitButton.textContent =
                originalButtonText;

        }

    }

}


// =========================================================
// LOST FORM
// =========================================================

if (lostForm) {

    lostForm.addEventListener(
        "submit",
        function(event) {

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
        function(event) {

            handleFormSubmit(
                event,
                "found"
            );

        }
    );

}