/* =========================================================
   NOTIFICATIONS SYSTEM
========================================================= */


/* =========================================================
   ELEMENTS
========================================================= */

const notificationList =
    document.getElementById(
        "notificationList"
    );

const notificationSummary =
    document.getElementById(
        "notificationSummary"
    );

const markAllButton =
    document.getElementById(
        "markAllBtn"
    );

const deleteAllButton =
    document.getElementById(
        "deleteAllBtn"
    );

const navBadge =
    document.getElementById(
        "navBadge"
    );


/* =========================================================
   USER
========================================================= */

const storedUser =
    localStorage.getItem("user");

let currentUser = null;


/* =========================================================
   CHECK LOGIN
========================================================= */

if (!storedUser) {

    showLoginRequired();

} else {

    try {

        currentUser =
            JSON.parse(
                storedUser
            );


        if (
            !currentUser ||
            !currentUser.id
        ) {

            throw new Error(
                "Invalid user."
            );

        }

    } catch (error) {

        console.error(
            "Invalid user data:",
            error
        );

        localStorage.removeItem(
            "user"
        );

        currentUser = null;

        showInvalidSession();

    }

}


/* =========================================================
   LOGIN REQUIRED
========================================================= */

function showLoginRequired() {

    if (notificationList) {

        notificationList.innerHTML = `

            <div class="empty-notifications">

                <div class="empty-icon">
                    🔒
                </div>

                <h3>
                    Please Login
                </h3>

                <p>
                    Please login to view your notifications.
                </p>

                <a
                    href="login.html"
                    class="view-item-btn">

                    Login

                </a>

            </div>

        `;

    }


    disableNotificationButtons();

}


/* =========================================================
   INVALID SESSION
========================================================= */

function showInvalidSession() {

    if (notificationList) {

        notificationList.innerHTML = `

            <div class="empty-notifications">

                <div class="empty-icon">
                    🔒
                </div>

                <h3>
                    Invalid Login Session
                </h3>

                <p>
                    Please login again.
                </p>

                <a
                    href="login.html"
                    class="view-item-btn">

                    Login Again

                </a>

            </div>

        `;

    }


    disableNotificationButtons();

}


/* =========================================================
   DISABLE BUTTONS
========================================================= */

function disableNotificationButtons() {

    if (markAllButton) {

        markAllButton.disabled =
            true;

    }


    if (deleteAllButton) {

        deleteAllButton.disabled =
            true;

    }

}


/* =========================================================
   NAVBAR
========================================================= */

function setupNavbar() {

    const navButtons =
        document.getElementById(
            "navButtons"
        );


    if (
        !navButtons ||
        !currentUser
    ) {

        return;

    }


    navButtons.innerHTML = `

        <span class="user-welcome">

            Hi, ${escapeHTML(
                currentUser.name ||
                "User"
            )} 👋

        </span>


        <a
            href="my-reports.html"
            class="login-btn">

            My Reports

        </a>


        <a
            href="#"
            class="signup-btn"
            id="logoutBtn">

            Logout

        </a>

    `;


    const logoutBtn =
        document.getElementById(
            "logoutBtn"
        );


    if (logoutBtn) {

        logoutBtn.addEventListener(
            "click",
            function (event) {

                event.preventDefault();


                localStorage.removeItem(
                    "user"
                );


                window.location.href =
                    "index.html";

            }
        );

    }

}


/* =========================================================
   LOAD NOTIFICATIONS
========================================================= */

async function loadNotifications() {

    if (!currentUser) {

        return;

    }


    try {

        notificationList.innerHTML = `

            <div class="loading">

                Loading notifications...

            </div>

        `;


        /*
         * FIRST:
         *
         * Check reports for possible matches.
         *
         * This allows older reports to generate
         * notifications when the notification page
         * is opened.
         */

        try {

            const matchResponse =
                await fetch(
                    `${API_URL}/notifications/check-matches/${encodeURIComponent(
                        currentUser.id
                    )}`,
                    {
                        method: "POST"
                    }
                );


            if (!matchResponse.ok) {

                console.warn(
                    "Match notification check failed:",
                    matchResponse.status
                );

            }

        } catch (matchError) {

            console.warn(
                "Match notification check error:",
                matchError
            );

        }


        /*
         * SECOND:
         *
         * Get notifications belonging ONLY
         * to the current user.
         */

        const response =
            await fetch(
                `${API_URL}/notifications/${encodeURIComponent(
                    currentUser.id
                )}`
            );


        console.log(
            "Notification API status:",
            response.status
        );


        if (!response.ok) {

            throw new Error(
                `Server error: ${response.status}`
            );

        }


        const data =
            await response.json();


        console.log(
            "Notifications API response:",
            data
        );


        if (
            data.status !== "success" ||
            !Array.isArray(
                data.notifications
            )
        ) {

            throw new Error(
                "Invalid notification response."
            );

        }


        displayNotifications(
            data.notifications
        );


        updateUnreadCount(
            data.notifications
        );


    } catch (error) {

        console.error(
            "Unable to load notifications:",
            error
        );


        notificationList.innerHTML = `

            <div class="empty-notifications">

                <div class="empty-icon">
                    ⚠️
                </div>

                <h3>
                    Unable to Load Notifications
                </h3>

                <p>
                    ${escapeHTML(
                        error.message ||
                        "Please try again."
                    )}
                </p>


                <button
                    type="button"
                    class="view-item-btn"
                    onclick="loadNotifications()">

                    Try Again

                </button>

            </div>

        `;


        if (notificationSummary) {

            notificationSummary.textContent =
                "Unable to load notifications.";

        }

    }

}


/* =========================================================
   DISPLAY NOTIFICATIONS
========================================================= */

function displayNotifications(
    notifications
) {


    if (!notifications.length) {

        notificationList.innerHTML = `

            <div class="empty-notifications">

                <div class="empty-icon">
                    🔔
                </div>

                <h3>
                    No Notifications
                </h3>

                <p>
                    You're all caught up!
                </p>

            </div>

        `;


        if (notificationSummary) {

            notificationSummary.textContent =
                "You're all caught up.";

        }


        return;

    }


    notificationList.innerHTML =
        "";


    notifications.forEach(
        function (notification) {


            const card =
                document.createElement(
                    "div"
                );


            const notificationType =
                String(
                    notification.notification_type ||
                    ""
                ).toLowerCase();


            const isUnread =
                Number(
                    notification.is_read
                ) === 0;


            card.className =
                "notification-card";


            if (isUnread) {

                card.classList.add(
                    "unread"
                );

            } else {

                card.classList.add(
                    "read"
                );

            }


            const icon =
                getNotificationIcon(
                    notificationType
                );


            const createdAt =
                formatDate(
                    notification.created_at
                );


            /* =================================================
               READ STATUS
            ================================================= */

            const unreadBadge =
                isUnread

                    ? `

                        <span
                            class="new-badge">

                            NEW

                        </span>

                    `

                    : `

                        <span
                            class="read-label">

                            ✓ Read

                        </span>

                    `;


            /* =================================================
               MARK READ BUTTON
            ================================================= */

            const markReadButton =
                isUnread

                    ? `

                        <button
                            type="button"
                            class="mark-read-btn"
                            data-notification-id="${notification.id}">

                            ✓ Mark as read

                        </button>

                    `

                    : "";


            /* =================================================
               ACTION BUTTON
            ================================================= */

            let actionButton =
                "";


            /* MESSAGE */

            if (

                notificationType ===
                    "message"

                &&

                notification.item_id

            ) {

                actionButton = `

                    <a
                        href="messages.html?item_id=${encodeURIComponent(
                            notification.item_id
                        )}"
                        class="view-item-btn">

                        💬 Open Conversation

                    </a>

                `;

            }


            /* OWNERSHIP CLAIM */

            else if (

                notificationType ===
                    "verification"

            ) {

                actionButton = `

                    <a
                        href="verification-requests.html"
                        class="view-item-btn verification-action">

                        🛡️ Review Ownership Claim

                    </a>

                `;

            }


            /* OWNERSHIP RESPONSE */

            else if (

                notificationType ===
                    "verification_response"

            ) {

                actionButton = `

                    <a
                        href="my-reports.html"
                        class="view-item-btn verification-action">

                        ✅ View Claim Result

                    </a>

                `;

            }


            /* SIGHTING ALERT */

            else if (

                notificationType ===
                    "sighting_alert"

                &&

                notification.item_id

            ) {

                actionButton = `

                    <a
                        href="item-detail.html?id=${encodeURIComponent(
                            notification.item_id
                        )}"
                        class="view-item-btn">

                        👀 View Sighting

                    </a>

                `;

            }


            /* NORMAL ITEM / MATCH */

            else if (

                notification.item_id

            ) {

                actionButton = `

                    <a
                        href="item-detail.html?id=${encodeURIComponent(
                            notification.item_id
                        )}"
                        class="view-item-btn">

                        🔎 View Report

                    </a>

                `;

            }


            /* =================================================
               CARD HTML
            ================================================= */

            card.innerHTML = `

                <div class="notification-icon">

                    ${icon}

                </div>


                <div class="notification-content">


                    <div class="notification-header">

                        <h3>

                            ${escapeHTML(
                                notification.title ||
                                "Notification"
                            )}

                        </h3>


                        ${unreadBadge}

                    </div>


                    <p
                        class="notification-message">

                        ${escapeHTML(
                            notification.message ||
                            ""
                        )}

                    </p>


                    <div
                        class="notification-footer">


                        <span
                            class="notification-date">

                            ${createdAt}

                        </span>


                        ${actionButton}


                        ${markReadButton}


                        <button
                            type="button"
                            class="delete-notification-btn"
                            data-notification-id="${notification.id}">

                            🗑️ Delete

                        </button>


                    </div>


                </div>

            `;


            notificationList.appendChild(
                card
            );


            /* =================================================
               MARK READ EVENT
            ================================================= */

            const readButton =
                card.querySelector(
                    ".mark-read-btn"
                );


            if (readButton) {

                readButton.addEventListener(
                    "click",
                    function () {

                        const notificationId =
                            readButton.dataset
                                .notificationId;


                        markAsRead(
                            notificationId
                        );

                    }
                );

            }


            /* =================================================
               DELETE EVENT
            ================================================= */

            const deleteButton =
                card.querySelector(
                    ".delete-notification-btn"
                );


            if (deleteButton) {

                deleteButton.addEventListener(
                    "click",
                    function () {

                        const notificationId =
                            deleteButton.dataset
                                .notificationId;


                        deleteNotification(
                            notificationId
                        );

                    }
                );

            }

        }
    );


    updateSummary(
        notifications
    );

}


/* =========================================================
   NOTIFICATION ICON
========================================================= */

function getNotificationIcon(
    type
) {

    switch (

        String(type || "")
            .toLowerCase()

    ) {

        case "match":

            return "🔎";


        case "message":

            return "💬";


        case "verification":

            return "🛡️";


        case "verification_response":

            return "✅";


        case "item_returned":

            return "📦";


        case "sighting_alert":

            return "👀";


        default:

            return "🔔";

    }

}


/* =========================================================
   UPDATE UNREAD COUNT
========================================================= */

function updateUnreadCount(
    notifications
) {

    const unread =
        notifications.filter(
            function (notification) {

                return Number(
                    notification.is_read
                ) === 0;

            }
        ).length;


    if (navBadge) {

        navBadge.textContent =
            unread;


        navBadge.style.display =
            unread > 0
                ? "inline-flex"
                : "none";

    }

}


/* =========================================================
   UPDATE SUMMARY
========================================================= */

function updateSummary(
    notifications
) {

    if (!notificationSummary) {

        return;

    }


    const unread =
        notifications.filter(
            function (notification) {

                return Number(
                    notification.is_read
                ) === 0;

            }
        ).length;


    notificationSummary.textContent =
        `${notifications.length} notification${
            notifications.length === 1
                ? ""
                : "s"
        } • ${unread} unread`;

}


/* =========================================================
   MARK ONE AS READ
========================================================= */

async function markAsRead(
    notificationId
) {

    try {

        /*
         * IMPORTANT:
         *
         * user_id is required by backend.
         */

        const response =
            await fetch(

                `${API_URL}/notifications/${encodeURIComponent(
                    notificationId
                )}/read?user_id=${encodeURIComponent(
                    currentUser.id
                )}`,

                {
                    method: "PUT"
                }

            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                `Server error: ${response.status}`
            );

        }


        if (
            data.status !==
            "success"
        ) {

            throw new Error(
                data.message ||
                "Unable to mark notification as read."
            );

        }


        await loadNotifications();


    } catch (error) {

        console.error(
            "Unable to mark notification as read:",
            error
        );


        alert(
            error.message ||
            "Unable to mark notification as read."
        );

    }

}


/* =========================================================
   MARK ALL AS READ
========================================================= */

async function markAllAsRead() {

    if (!currentUser) {

        return;

    }


    try {

        const response =
            await fetch(

                `${API_URL}/notifications/read-all/${encodeURIComponent(
                    currentUser.id
                )}`,

                {
                    method: "PUT"
                }

            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                `Server error: ${response.status}`
            );

        }


        if (
            data.status !==
            "success"
        ) {

            throw new Error(
                data.message ||
                "Unable to mark notifications as read."
            );

        }


        await loadNotifications();


    } catch (error) {

        console.error(
            "Unable to mark all notifications:",
            error
        );


        alert(
            error.message ||
            "Unable to mark all notifications as read."
        );

    }

}


/* =========================================================
   DELETE ONE NOTIFICATION
========================================================= */

async function deleteNotification(
    notificationId
) {

    if (!currentUser) {

        return;

    }


    const confirmed =
        window.confirm(
            "Delete this notification?"
        );


    if (!confirmed) {

        return;

    }


    try {

        const response =
            await fetch(

                `${API_URL}/notifications/${encodeURIComponent(
                    notificationId
                )}?user_id=${encodeURIComponent(
                    currentUser.id
                )}`,

                {
                    method: "DELETE"
                }

            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                `Server error: ${response.status}`
            );

        }


        if (
            data.status !==
            "success"
        ) {

            throw new Error(
                data.message ||
                "Unable to delete notification."
            );

        }


        await loadNotifications();


    } catch (error) {

        console.error(
            "Unable to delete notification:",
            error
        );


        alert(
            error.message ||
            "Unable to delete notification."
        );

    }

}


/* =========================================================
   DELETE ALL NOTIFICATIONS
========================================================= */

async function deleteAllNotifications() {

    if (!currentUser) {

        return;

    }


    const confirmed =
        window.confirm(
            "Delete ALL your notifications? This cannot be undone."
        );


    if (!confirmed) {

        return;

    }


    try {

        const response =
            await fetch(

                `${API_URL}/notifications/user/${encodeURIComponent(
                    currentUser.id
                )}`,

                {
                    method: "DELETE"
                }

            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                `Server error: ${response.status}`
            );

        }


        if (
            data.status !==
            "success"
        ) {

            throw new Error(
                data.message ||
                "Unable to delete notifications."
            );

        }


        await loadNotifications();


    } catch (error) {

        console.error(
            "Unable to delete all notifications:",
            error
        );


        alert(
            error.message ||
            "Unable to delete notifications."
        );

    }

}


/* =========================================================
   MARK ALL BUTTON
========================================================= */

if (markAllButton) {

    markAllButton.addEventListener(
        "click",
        markAllAsRead
    );

}


/* =========================================================
   DELETE ALL BUTTON
========================================================= */

if (deleteAllButton) {

    deleteAllButton.addEventListener(
        "click",
        deleteAllNotifications
    );

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
    value
) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        value ?? "";


    return div.innerHTML;

}


/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(
    dateValue
) {

    if (!dateValue) {

        return "Just now";

    }


    const date =
        new Date(
            dateValue
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(
            dateValue
        );

    }


    return date.toLocaleString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        if (!currentUser) {

            return;

        }


        setupNavbar();


        loadNotifications();

    }
);


/* =========================================================
   AUTO REFRESH
========================================================= */

setInterval(
    function () {

        if (currentUser) {

            loadNotifications();

        }

    },
    15000
);