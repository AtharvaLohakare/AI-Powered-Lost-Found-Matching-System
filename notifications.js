/* =========================================================
   NOTIFICATIONS CENTER
========================================================= */


/* =========================================================
   ELEMENTS
========================================================= */

const notificationList =
    document.getElementById("notificationList");

const notificationSummary =
    document.getElementById("notificationSummary");

const markAllButton =
    document.getElementById("markAllBtn");

const navBadge =
    document.getElementById("navBadge");


/* =========================================================
   CHECK LOGIN
========================================================= */

const storedUser =
    localStorage.getItem("user");


if (!storedUser) {

    notificationList.innerHTML = `
        <div class="empty-notifications">

            <div class="empty-icon">
                🔒
            </div>

            <h3>
                Please login
            </h3>

            <p>
                Please login to view your notifications.
            </p>

        </div>
    `;

    throw new Error(
        "User not logged in."
    );
}


let currentUser;


try {

    currentUser =
        JSON.parse(storedUser);


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


    localStorage.removeItem("user");


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

        </div>
    `;

    throw error;
}


/* =========================================================
   NAVBAR USER
========================================================= */

function setupNavbar(user) {

    const navButtons =
        document.getElementById(
            "navButtons"
        );


    if (
        !navButtons ||
        !user
    ) {

        return;

    }


    navButtons.innerHTML = `
        <span class="user-welcome">
            Hi, ${escapeHTML(
                user.name || "User"
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

    try {

        notificationList.innerHTML = `
            <div class="loading">
                Loading notifications...
            </div>
        `;


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
                    No notifications
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


    notificationList.innerHTML = "";


    notifications.forEach(
        function (notification) {


            const card =
                document.createElement(
                    "div"
                );


            const notificationType =
                String(
                    notification.notification_type || ""
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


            const unreadBadge =
                isUnread

                    ? `
                        <span class="new-badge">
                            NEW
                        </span>
                      `

                    : `
                        <span class="read-label">
                            ✓ Read
                        </span>
                      `;


            const markReadButton =
                isUnread

                    ? `
                        <button
                            type="button"
                            class="mark-read-btn"
                            data-notification-id="${notification.id}">

                            Mark as read

                        </button>
                      `

                    : "";


            /* =================================================
               ACTION BUTTON
            ================================================= */

            let actionButton = "";


            /* MESSAGE */

            if (
                notificationType === "message" &&
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
                notificationType === "verification"
            ) {

                actionButton = `
                    <a
                        href="verification-requests.html"
                        class="view-item-btn verification-action">

                        🛡️ Review Ownership Claim

                    </a>
                `;

            }


            /* OWNERSHIP RESULT */

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


            /* OTHER ITEM NOTIFICATION */

            else if (
                notification.item_id
            ) {

                actionButton = `
                    <a
                        href="item.html?id=${encodeURIComponent(
                            notification.item_id
                        )}"
                        class="view-item-btn">

                        View Item

                    </a>
                `;

            }


            /* =================================================
               CARD
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


                    <p class="notification-message">

                        ${escapeHTML(
                            notification.message ||
                            ""
                        )}

                    </p>


                    <div class="notification-footer">

                        <span class="notification-date">
                            ${createdAt}
                        </span>


                        ${actionButton}


                        ${markReadButton}

                    </div>


                </div>

            `;


            notificationList.appendChild(
                card
            );


            /* =================================================
               MARK READ
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

        }
    );


    /* =================================================
       SUMMARY
    ================================================= */

    if (notificationSummary) {

        const unread =
            notifications.filter(
                function (notification) {

                    return Number(
                        notification.is_read
                    ) === 0;

                }
            ).length;


        if (unread === 0) {

            notificationSummary.textContent =
                `You have ${notifications.length} notification${
                    notifications.length === 1
                        ? ""
                        : "s"
                }.`;

        } else {

            notificationSummary.textContent =
                `You have ${unread} unread notification${
                    unread === 1
                        ? ""
                        : "s"
                }.`;

        }

    }

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


        if (unread === 0) {

            navBadge.style.display =
                "none";

        } else {

            navBadge.style.display =
                "inline-flex";

        }

    }

}


/* =========================================================
   MARK ONE AS READ
========================================================= */

async function markAsRead(
    notificationId
) {

    try {

        const response =
            await fetch(
                `${API_URL}/notifications/${encodeURIComponent(
                    notificationId
                )}/read`,
                {
                    method: "PUT"
                }
            );


        if (!response.ok) {

            throw new Error(
                `Server error: ${response.status}`
            );

        }


        const data =
            await response.json();


        console.log(
            "Mark as read response:",
            data
        );


        if (
            data.status !== "success"
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
            "Unable to mark notification as read."
        );

    }

}


/* =========================================================
   MARK ALL AS READ
========================================================= */

async function markAllAsRead() {

    try {

        const response =
            await fetch(
                `${API_URL}/notifications/user/${encodeURIComponent(
                    currentUser.id
                )}/read-all`,
                {
                    method: "PUT"
                }
            );


        if (!response.ok) {

            throw new Error(
                `Server error: ${response.status}`
            );

        }


        const data =
            await response.json();


        console.log(
            "Mark all as read response:",
            data
        );


        if (
            data.status !== "success"
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
            "Unable to mark all notifications as read."
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

        setupNavbar(
            currentUser
        );


        loadNotifications();

    }
);


/* =========================================================
   AUTO REFRESH
========================================================= */

setInterval(
    loadNotifications,
    15000
);