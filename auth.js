const API_URL = "https://ai-powered-lost-found-matching-system.onrender.com";


// ====================
// SIGNUP
// ====================

const signupForm = document.getElementById("signupForm");

if (signupForm) {

    signupForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const name = document.getElementById("name").value;
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        const formData = new FormData();

        formData.append("name", name);
        formData.append("email", email);
        formData.append("password", password);

        try {

            const response = await fetch(
                `${API_URL}/signup`,
                {
                    method: "POST",
                    body: formData
                }
            );

            const data = await response.json();

            if (response.ok) {

                document.getElementById("message").textContent =
                    "Account created successfully!";

                signupForm.reset();

                setTimeout(() => {
                    window.location.href = "login.html";
                }, 1500);

            } else {

                document.getElementById("message").textContent =
                    data.detail || "Signup failed.";

            }

        } catch (error) {

            document.getElementById("message").textContent =
                "Could not connect to backend.";

            console.error(error);
        }

    });
}


// ====================
// LOGIN
// ====================

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        const formData = new FormData();

        formData.append("email", email);
        formData.append("password", password);

        try {

            const response = await fetch(
                `${API_URL}/login`,
                {
                    method: "POST",
                    body: formData
                }
            );

            const data = await response.json();

            if (response.ok) {

                localStorage.setItem(
                    "user",
                    JSON.stringify({
                        id: data.user_id,
                        name: data.name,
                        email: data.email
                    })
                );

                document.getElementById("message").textContent =
                    "Login successful!";

                setTimeout(() => {

                    window.location.href = "index.html";

                }, 1000);

            } else {

                document.getElementById("message").textContent =
                    data.detail || "Login failed.";

            }

        } catch (error) {

            document.getElementById("message").textContent =
                "Could not connect to backend.";

            console.error(error);
        }

    });
}