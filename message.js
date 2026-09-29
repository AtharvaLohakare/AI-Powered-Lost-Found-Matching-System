// =========================================================
// LOST & FOUND AI
// MESSAGES / COMMUNICATION
// =========================================================


// =========================================================
// GET ELEMENTS
// =========================================================

const conversation =
    document.getElementById("conversation");

const messageForm =
    document.getElementById("messageForm");

const messageInput =
    document.getElementById("messageInput");

const itemInfo =
    document.getElementById("item-info");


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


let currentUser;


try {

    currentUser =
        JSON.parse(storedUser);

}
catch (error) {

    localStorage.removeItem("user");

    window.location.href =
        "login.html";

}


// =========================================================
// VALIDATE ITEM
// =========================================================

if (!itemId) {

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

    messageForm.style.display =
        "none";

}


// =========================================================
// LOAD ITEM INFORMATION
// =========================================================

async function loadItemInfo() {

    try {

        const response =
            await fetch(
                `${API_URL}/items/${itemId}`
            );


        if (!response.ok) {

            throw new Error(
                "Item not found"
            );

        }


        const item =
            await response.json();


        itemInfo.innerHTML = `

            Communication regarding:

            <strong>
                ${item.item_name}
            </strong>

            (${item.item_type})

        `;

    }
    catch (error) {

        console.error(
            "Item loading error:",
            error
        );

        itemInfo.textContent =
            "Unable to load item information.";

    }

}


// =========================================================
// LOAD MESSAGES
// =========================================================

async function loadMessages() {

    try {

        const response =
            await fetch(
                `${API_URL}/messages/${currentUser.id}/${itemId}`
            );


        if (!response.ok) {

            throw new Error(
                "Unable to load messages"
            );

        }


        const data =
            await response.json();


        if (
            !data.messages ||
            data.messages.length === 0
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


        conversation.innerHTML =
            data.messages
                .map(message => {

                    const isSent =
                        Number(message.sender_id) ===
                        Number(currentUser.id);


                    const messageClass =
                        isSent
                            ? "sent"
                            : "received";


                    return `

                        <div
                            class="message ${messageClass}"
                        >

                            <div
                                class="message-name"
                            >

                                ${
                                    isSent
                                        ? "You"
                                        : message.sender_name
                                }

                            </div>


                            <div>

                                ${escapeHtml(
                                    message.message
                                )}

                            </div>


                            <div
                                class="message-time"
                            >

                                ${formatDate(
                                    message.created_at
                                )}

                            </div>

                        </div>

                    `;

                })
                .join("");


        // Scroll to bottom

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

                ❌ Unable to load messages.

            </div>

        `;

    }

}


// =========================================================
// SEND MESSAGE
// =========================================================

messageForm.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();


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


        try {

            const response =
                await fetch(
                    `${API_URL}/messages/send`,
                    {
                        method: "POST",
                        body: formData
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.detail ||
                    "Unable to send message."
                );

            }


            messageInput.value = "";


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

    }
);


// =========================================================
// ESCAPE HTML
// =========================================================

function escapeHtml(text) {

    const div =
        document.createElement("div");

    div.textContent =
        text;

    return div.innerHTML;

}


// =========================================================
// FORMAT DATE
// =========================================================

function formatDate(dateString) {

    if (!dateString) {
        return "";
    }


    const date =
        new Date(dateString);


    if (isNaN(date.getTime())) {

        return dateString;

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
// START
// =========================================================

if (itemId && currentUser) {

    loadItemInfo();

    loadMessages();

}