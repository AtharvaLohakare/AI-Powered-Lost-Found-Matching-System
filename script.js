// Lost & Found AI
// Frontend → FastAPI connection


const lostForm = document.getElementById("lost-item-form");
const foundForm = document.getElementById("found-item-form");


// Function to submit item
async function handleFormSubmit(event, type) {

    event.preventDefault();

    const form = event.target;

    // Get form data
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


    // Get image
    const imageInput = form.querySelector('[name="image"]');

    if (!imageInput.files.length) {

        alert("Please upload an item image.");

        return;
    }

    formData.append(
        "image",
        imageInput.files[0]
    );


    try {

        // Send data to FastAPI
        const response = await fetch(
            "http://127.0.0.1:8000/report-item",
            {
                method: "POST",
                body: formData
            }
        );


        // Check response
        if (!response.ok) {

            throw new Error(
                "Server returned an error."
            );

        }


        const result = await response.json();


        console.log(
            "Backend Response:",
            result
        );


        // Success message
        alert(
            type === "lost"
                ? "Lost item submitted successfully!"
                : "Found item submitted successfully!"
        );


        // Reset form
        form.reset();


    } catch (error) {

        console.error(
            "Error:",
            error
        );

        alert(
            "Could not connect to the backend. Make sure FastAPI is running."
        );

    }

}


// Lost form
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


// Found form
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