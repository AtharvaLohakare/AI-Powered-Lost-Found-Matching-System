const API_URL =
    "https://ai-powered-lost-found-matching-system.onrender.com";

const notificationList =
    document.getElementById("notificationList");

const unreadCount =
    document.getElementById("unreadCount");

const markAllButton =
    document.getElementById("markAllButton");


// =====================================================
// GET LOGGED-IN USER
// =====================================================

const storedUser = localStorage.getItem("user");

if (!storedUser) {

    notificationList.innerHTML = `
        <div class="empty-notifications">
            Please login to view notifications.
        </div>
    `;

    throw new Error("User not logged in.");
}

let currentUser;

try {

    currentUser = JSON.parse(storedUser);

} catch (error) {

    console.error("Invalid user data.");

    localStorage.removeItem("user");

    notificationList.innerHTML = `
        <div class="empty-notifications">
            Invalid login session. Please login again.
        </div>
    `;

    throw error;
}


// =====================================================
// LOAD NOTIFICATIONS
// =====================================================

async function loadNotifications() {

    try {

        notificationList.innerHTML = `
            <div class="loading">
                Loading notifications...
            </div>
        `;

        const response = await fetch(
            `${API_URL}/notifications/${encodeURIComponent(currentUser.id)}`
        );

        if (!response.ok) {

            throw new Error(
                `Server error: ${response.status}`
            );
        }

        const data = await response.json();

        console.log("Notifications:", data);

        if (
            data.status !== "success" ||
            !Array.isArray(data.notifications)
        ) {

            throw new Error(
                "Invalid notification response."
            );
        }

        displayNotifications(data.notifications);

        updateUnreadCount(data.notifications);

    } catch (error) {

        console.error(
            "Unable to load notifications:",
            error
        );

        notificationList.innerHTML = `
            <div class="empty-notifications">
                Unable to load notifications.
                <br>
                Please try again.
            </div>
        `;
    }
}


// =====================================================
// DISPLAY NOTIFICATIONS
// =====================================================

function displayNotifications(notifications) {

    if (!notifications.length) {

        notificationList.innerHTML = `
            <div class="empty-notifications">
                <div class="empty-icon">🔔</div>

                <h3>No notifications</h3>

                <p>
                    You're all caught up!
                </p>
            </div>
        `;

        return;
    }


    notificationList.innerHTML = "";


    notifications.forEach(notification => {

        const card =
            document.createElement("div");

        card.className =
            "notification-card";


        if (
            Number(notification.is_read) === 0
        ) {

            card.classList.add("unread");
        }


        const icon =
            getNotificationIcon(
                notification.notification_type
            );


        const createdAt =
            formatDate(
                notification.created_at
            );


        const unreadBadge =
            Number(notification.is_read) === 0
                ? `<span class="new-badge">NEW</span>`
                : "";


        const markReadButton =
            Number(notification.is_read) === 0
                ? `
                    <button
                        class="mark-read-btn"
                        onclick="markAsRead(${notification.id})"
                    >
                        Mark as read
                    </button>
                  `
                : `
                    <span class="read-label">
                        ✓ Read
                    </span>
                  `;


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
                        notification.message || ""
                    )}

                </p>


                <div class="notification-footer">

                    <span class="notification-date">

                        ${createdAt}

                    </span>

                    ${
                        notification.item_id
                        ? `
                            <a
                                href="item.html?id=${encodeURIComponent(
                                    notification.item_id
                                )}"
                                class="view-item-btn"
                            >
                                View Item
                            </a>
                          `
                        : ""
                    }

                    ${markReadButton}

                </div>

            </div>
        `;


        notificationList.appendChild(card);

    });
}


// =====================================================
// NOTIFICATION ICON
// =====================================================

function getNotificationIcon(type) {

    switch (
        String(type || "").toLowerCase()
    ) {

        case "match":
            return "🔎";

        case "message":
            return "💬";

        case "verification":
            return "📩";

        case "claim":
            return "📩";

        case "approved":
            return "✅";

        case "rejected":
            return "❌";

        default:
            return "🔔";
    }
}


// =====================================================
// UPDATE UNREAD COUNT
// =====================================================

function updateUnreadCount(notifications) {

    const unread =
        notifications.filter(
            notification =>
                Number(notification.is_read) === 0
        ).length;


    if (unreadCount) {

        unreadCount.textContent =
            unread;
    }


    // Optional navbar badge
    const navBadge =
        document.getElementById("navBadge");

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


// =====================================================
// MARK ONE NOTIFICATION AS READ
// =====================================================

async function markAsRead(notificationId) {

    try {

        const response = await fetch(
            `${API_URL}/notifications/${notificationId}/read`,
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
            "Mark as read:",
            data
        );


        if (data.status !== "success") {

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


// =====================================================
// MARK ALL NOTIFICATIONS AS READ
// =====================================================

async function markAllAsRead() {

    try {

        const response = await fetch(
            `${API_URL}/notifications/user/${currentUser.id}/read-all`,
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
            "Mark all as read:",
            data
        );


        if (data.status !== "success") {

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


// =====================================================
// MARK ALL BUTTON
// =====================================================

if (markAllButton) {

    markAllButton.addEventListener(
        "click",
        markAllAsRead
    );
}


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHTML(value) {

    const div =
        document.createElement("div");

    div.textContent =
        value ?? "";

    return div.innerHTML;
}


// =====================================================
// FORMAT DATE
// =====================================================

function formatDate(dateValue) {

    if (!dateValue) {

        return "Just now";
    }


    const date =
        new Date(dateValue);


    if (Number.isNaN(date.getTime())) {

        return String(dateValue);
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


// =====================================================
// INITIAL LOAD
// =====================================================

loadNotifications();


// =====================================================
// AUTO REFRESH
// =====================================================

// Check for new notifications every 15 seconds.

setInterval(
    loadNotifications,
    15000
);