const menuToggle = document.getElementById("menuToggle");
const navMenu = document.getElementById("navMenu");

if (menuToggle && navMenu) {

    menuToggle.addEventListener("click", function () {

        navMenu.classList.toggle("active");

        // Change hamburger icon
        if (navMenu.classList.contains("active")) {
            menuToggle.textContent = "✕";
        } else {
            menuToggle.textContent = "☰";
        }

    });


    // Close menu after clicking a navigation link
    const navLinks = navMenu.querySelectorAll("a");

    navLinks.forEach(function (link) {

        link.addEventListener("click", function () {

            navMenu.classList.remove("active");

            menuToggle.textContent = "☰";

        });

    });


    // Close menu when screen becomes desktop
    window.addEventListener("resize", function () {

        if (window.innerWidth > 800) {

            navMenu.classList.remove("active");

            menuToggle.textContent = "☰";

        }

    });

}


// =========================================================
// LOST & FOUND AI
// MESSAGES / COMMUNICATION
// =========================================================


// =========================================================
// GET ELEMENTS
// =========================================================

const conversation =
    document.getElementById(
        "conversation"
    );

const messageForm =
    document.getElementById(
        "messageForm"
    );

const messageInput =
    document.getElementById(
        "messageInput"
    );

const itemInfo =
    document.getElementById(
        "item-info"
    );


// =========================================================
// GET ITEM ID
// =========================================================

const params =
    new URLSearchParams(
        window.location.search
    );

const itemId =
    params.get("item_id");


// =========================================================
// GET LOGGED-IN USER
// =========================================================

const storedUser =
    localStorage.getItem("user");


if (!storedUser) {

    window.location.href =
        "login.html";

}


let currentUser = null;


try {

    currentUser =
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

    window.location.href =
        "login.html";

}


// =========================================================
// CHECK USER
// =========================================================

if (
    !currentUser ||
    !currentUser.id
) {

    localStorage.removeItem(
        "user"
    );

    window.location.href =
        "login.html";

}


// =========================================================
// ESCAPE HTML
// =========================================================

function escapeHtml(text) {

    if (
        text === null ||
        text === undefined
    ) {
        return "";
    }


    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        String(text);


    return div.innerHTML;

}


// =========================================================
// FORMAT DATE
// =========================================================

function formatDate(
    dateString
) {

    if (!dateString) {
        return "";
    }


    const date =
        new Date(dateString);


    if (
        isNaN(
            date.getTime()
        )
    ) {

        return String(
            dateString
        );

    }


    return date.toLocaleString(
        "en-IN",
        {
            dateStyle: "short",
            timeStyle: "short"
        }
    );

}


// =========================================================
// VALIDATE ITEM
// =========================================================

if (!itemId) {

    if (conversation) {

        conversation.innerHTML = `

            <div class="empty-messages">

                <h3>
                    No item selected
                </h3>

                <p>
                    Please open communication
                    from a possible match.
                </p>

            </div>

        `;

    }


    if (messageForm) {

        messageForm.style.display =
            "none";

    }

}


// =========================================================
// LOAD ITEM INFORMATION
// =========================================================

async function loadItemInfo() {

    if (!itemId) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/items/${encodeURIComponent(
                    itemId
                )}`
            );


        let item = null;


        try {

            item =
                await response.json();

        }
        catch {

            item = null;

        }


        if (!response.ok) {

            throw new Error(
                item?.detail ||
                item?.message ||
                "Item not found"
            );

        }


        if (itemInfo) {

            itemInfo.innerHTML = `

                Communication regarding:

                <strong>

                    ${escapeHtml(
                item.item_name ||
                "Item"
            )}

                </strong>

                (${escapeHtml(
                item.item_type ||
                ""
            )})

            `;

        }

    }


    catch (error) {

        console.error(
            "Item loading error:",
            error
        );


        if (itemInfo) {

            itemInfo.textContent =
                error.message ||
                "Unable to load item information.";

        }

    }

}


// =========================================================
// LOAD MESSAGES
// =========================================================

async function loadMessages() {

    if (
        !itemId ||
        !currentUser ||
        !currentUser.id ||
        !conversation
    ) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/messages/${encodeURIComponent(
                    currentUser.id
                )}/${encodeURIComponent(
                    itemId
                )}`
            );


        let data = null;


        try {

            data =
                await response.json();

        }
        catch {

            data = null;

        }


        if (!response.ok) {

            throw new Error(
                data?.detail ||
                data?.message ||
                "Unable to load messages"
            );

        }


        const messages =
            Array.isArray(data?.messages)
                ? data.messages
                : Array.isArray(data)
                    ? data
                    : [];


        // =================================================
        // NO MESSAGES
        // =================================================

        if (
            messages.length === 0
        ) {

            conversation.innerHTML = `

                <div class="empty-messages">

                    <h3>
                        💬 No messages yet
                    </h3>

                    <p>
                        Start the conversation
                        with the reporter.
                    </p>

                </div>

            `;

            return;

        }


        // =================================================
        // RENDER MESSAGES
        // =================================================

        conversation.innerHTML =
            messages
                .map(
                    message => {

                        const isSent =
                            Number(
                                message.sender_id
                            ) ===
                            Number(
                                currentUser.id
                            );


                        const messageClass =
                            isSent
                                ? "sent"
                                : "received";


                        const senderName =
                            isSent
                                ? "You"
                                : (
                                    message.sender_name ||
                                    "Reporter"
                                );


                        return `

                            <div
                                class="message ${messageClass}"
                            >

                                <div class="message-name">

                                    ${escapeHtml(
                            senderName
                        )}

                                </div>


                                <div>

                                    ${escapeHtml(
                            message.message
                        )}

                                </div>


                                <div class="message-time">

                                    ${escapeHtml(
                            formatDate(
                                message.created_at
                            )
                        )}

                                </div>

                            </div>

                        `;

                    }
                )
                .join("");


        // =================================================
        // SCROLL TO BOTTOM
        // =================================================

        conversation.scrollTop =
            conversation.scrollHeight;

    }


    catch (error) {

        console.error(
            "Message loading error:",
            error
        );


        conversation.innerHTML = `

            <div class="empty-messages">

                <h3>
                    ❌ Unable to load messages
                </h3>

                <p>

                    ${escapeHtml(
            error.message ||
            "Something went wrong."
        )}

                </p>

            </div>

        `;

    }

}


// =========================================================
// SEND MESSAGE
// =========================================================

if (messageForm) {

    messageForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            if (
                !currentUser ||
                !currentUser.id
            ) {

                showToast(
                    "Please login again.",
                    "warning"
                );

                return;

            }


            if (!itemId) {

                showToast(
                    "No item selected.",
                    "warning"
                );

                return;

            }


            const message =
                messageInput.value.trim();


            if (!message) {

                if (
                    typeof showToast ===
                    "function"
                ) {

                    showToast(
                        "Please type a message.",
                        "warning"
                    );

                }

                return;

            }


            if (
                message.length > 2000
            ) {

                showToast(
                    "Message cannot exceed 2000 characters.",
                    "warning"
                );

                return;

            }


            const formData =
                new FormData();


            formData.append(
                "sender_id",
                currentUser.id
            );


            formData.append(
                "item_id",
                itemId
            );


            formData.append(
                "message",
                message
            );


            const submitButton =
                messageForm.querySelector(
                    'button[type="submit"]'
                );


            const originalText =
                submitButton
                    ? submitButton.textContent
                    : "";


            if (submitButton) {

                submitButton.disabled =
                    true;

                submitButton.textContent =
                    "Sending...";

            }


            try {

                const response =
                    await fetch(
                        `${API_URL}/messages/send`,
                        {
                            method: "POST",
                            body: formData
                        }
                    );


                let data = null;


                try {

                    data =
                        await response.json();

                }
                catch {

                    data = null;

                }


                if (!response.ok) {

                    throw new Error(
                        data?.detail ||
                        data?.message ||
                        "Unable to send message."
                    );

                }


                messageInput.value =
                    "";


                if (
                    typeof showToast ===
                    "function"
                ) {

                    showToast(
                        "📩 Message sent successfully!",
                        "success"
                    );

                }


                await loadMessages();

            }


            catch (error) {

                console.error(
                    "Send message error:",
                    error
                );


                if (
                    typeof showToast ===
                    "function"
                ) {

                    showToast(
                        error.message ||
                        "Unable to send message.",
                        "error"
                    );

                }

            }


            finally {

                if (submitButton) {

                    submitButton.disabled =
                        false;

                    submitButton.textContent =
                        originalText;

                }

            }

        }
    );

}


// =========================================================
// START
// =========================================================

if (
    itemId &&
    currentUser
) {

    loadItemInfo();

    loadMessages();

}