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

/* =========================================================
   NOTIFICATIONS SYSTEM - OPTIMIZED
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

const deleteAllButton =
    document.getElementById("deleteAllBtn");

const navBadge =
    document.getElementById("navBadge");

const deleteConfirmModal =
    document.getElementById("deleteConfirmModal");

const confirmCancelBtn =
    document.getElementById("confirmCancelBtn");

const confirmDeleteBtn =
    document.getElementById("confirmDeleteBtn");

const confirmModalTitle =
    document.getElementById("confirmModalTitle");

const confirmModalMessage =
    document.getElementById("confirmModalMessage");

let pendingDeleteNotificationId = null;
let pendingDeleteCard = null;
let pendingDeleteAll = false;


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

        currentUser = JSON.parse(storedUser);

        if (
            !currentUser ||
            !currentUser.id
        ) {
            throw new Error("Invalid user.");
        }

    } catch (error) {

        console.error(
            "Invalid user data:",
            error
        );

        localStorage.removeItem("user");

        currentUser = null;

        showInvalidSession();
    }
}


/* =========================================================
   LOGIN REQUIRED
========================================================= */

function showLoginRequired() {

    if (!notificationList) {
        return;
    }

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

    disableNotificationButtons();
}


/* =========================================================
   INVALID SESSION
========================================================= */

function showInvalidSession() {

    if (!notificationList) {
        return;
    }

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

    disableNotificationButtons();
}


/* =========================================================
   DISABLE BUTTONS
========================================================= */

function disableNotificationButtons() {

    if (markAllButton) {
        markAllButton.disabled = true;
    }

    if (deleteAllButton) {
        deleteAllButton.disabled = true;
    }
}


/* =========================================================
   NAVBAR
========================================================= */

function setupNavbar() {

    const navButtons =
        document.getElementById("navButtons");

    if (
        !navButtons ||
        !currentUser
    ) {
        return;
    }

    navButtons.innerHTML = `
        <span class="user-welcome">
            Hi, ${escapeHTML(
        currentUser.name || "User"
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
        document.getElementById("logoutBtn");

    if (logoutBtn) {

        logoutBtn.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                localStorage.removeItem("user");

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

    if (
        !currentUser ||
        !notificationList
    ) {
        return;
    }

    try {

        notificationList.innerHTML = `
            <div class="loading">
                Loading notifications...
            </div>
        `;


        /*
         * IMPORTANT
         *
         * DO NOT call:
         *
         * /notifications/check-matches/{user_id}
         *
         * here.
         *
         * Match notifications are already created
         * when reports are submitted.
         *
         * Calling the endpoint here makes notification
         * loading unnecessarily slow.
         */


        const response =
            await fetch(
                `${API_URL}/notifications/${encodeURIComponent(
                    currentUser.id
                )}`,
                {
                    method: "GET",
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                `Server error: ${response.status}`
            );
        }


        const data =
            await response.json();


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


        if (markAllButton) {
            markAllButton.disabled = true;
        }

        if (deleteAllButton) {
            deleteAllButton.disabled = true;
        }

        return;
    }


    notificationList.innerHTML = "";


    if (markAllButton) {
        markAllButton.disabled = false;
    }

    if (deleteAllButton) {
        deleteAllButton.disabled = false;
    }


    notifications.forEach(
        function (notification) {

            const card =
                document.createElement("div");


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


            card.classList.add(
                isUnread
                    ? "unread"
                    : "read"
            );


            const icon =
                getNotificationIcon(
                    notificationType
                );


            const createdAt =
                formatDate(
                    notification.created_at
                );


            /* READ STATUS */

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


            /* MARK READ BUTTON */

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


            /* ACTION BUTTON */

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
                "sighting_alert" &&
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


            /* CARD */

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
                notification.message || ""
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


            notificationList.appendChild(card);


            /* MARK READ */

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
                            notificationId,
                            card
                        );
                    }
                );
            }


            /* DELETE */

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
                            notificationId,
                            card
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

function getNotificationIcon(type) {

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
        `${notifications.length} notification${notifications.length === 1
            ? ""
            : "s"
        } • ${unread} unread`;
}


/* =========================================================
   MARK ONE AS READ
========================================================= */

async function markAsRead(
    notificationId,
    card
) {

    if (!currentUser) {
        return;
    }


    try {

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
            data.status !== "success"
        ) {

            throw new Error(
                data.message ||
                "Unable to mark notification as read."
            );
        }


        /* UPDATE UI WITHOUT RELOADING */

        if (card) {

            card.classList.remove("unread");

            card.classList.add("read");


            const badge =
                card.querySelector(
                    ".new-badge"
                );

            if (badge) {

                badge.className =
                    "read-label";

                badge.textContent =
                    "✓ Read";
            }


            const button =
                card.querySelector(
                    ".mark-read-btn"
                );

            if (button) {
                button.remove();
            }
        }


        /* UPDATE BADGE */

        if (navBadge) {

            const currentCount =
                Number(
                    navBadge.textContent || 0
                );

            const newCount =
                Math.max(
                    0,
                    currentCount - 1
                );

            navBadge.textContent =
                newCount;

            navBadge.style.display =
                newCount > 0
                    ? "inline-flex"
                    : "none";
        }


        refreshSummaryFromDOM();


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

        if (markAllButton) {
            markAllButton.disabled = true;
        }


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
            data.status !== "success"
        ) {

            throw new Error(
                data.message ||
                "Unable to mark notifications as read."
            );
        }


        /* UPDATE UI DIRECTLY */

        document
            .querySelectorAll(
                ".notification-card.unread"
            )
            .forEach(
                function (card) {

                    card.classList.remove(
                        "unread"
                    );

                    card.classList.add(
                        "read"
                    );


                    const badge =
                        card.querySelector(
                            ".new-badge"
                        );

                    if (badge) {

                        badge.className =
                            "read-label";

                        badge.textContent =
                            "✓ Read";
                    }


                    const button =
                        card.querySelector(
                            ".mark-read-btn"
                        );

                    if (button) {
                        button.remove();
                    }
                }
            );


        if (navBadge) {

            navBadge.textContent = "0";

            navBadge.style.display =
                "none";
        }


        refreshSummaryFromDOM();


    } catch (error) {

        console.error(
            "Unable to mark all notifications:",
            error
        );


        alert(
            error.message ||
            "Unable to mark all notifications as read."
        );


    } finally {

        if (markAllButton) {
            markAllButton.disabled = false;
        }
    }
}


/* =========================================================
   DELETE ONE NOTIFICATION
========================================================= */

function deleteNotification(
    notificationId,
    card
) {
    if (!currentUser) {
        return;
    }

    showDeleteConfirmation(
        notificationId,
        card
    );
}


/* =========================================================
   DELETE ALL NOTIFICATIONS
========================================================= */

function deleteAllNotifications() {

    if (!currentUser) {
        return;
    }

    pendingDeleteNotificationId = null;
    pendingDeleteCard = null;
    pendingDeleteAll = true;

    if (confirmModalTitle) {
        confirmModalTitle.textContent =
            "Delete All Notifications?";
    }

    if (confirmModalMessage) {
        confirmModalMessage.textContent =
            "Are you sure you want to delete all your notifications? This action cannot be undone.";
    }

    if (deleteConfirmModal) {
        deleteConfirmModal.classList.add("active");
    }
}


/* =========================================================
   EMPTY STATE
========================================================= */

function checkEmptyState() {

    const cards =
        document.querySelectorAll(
            ".notification-card"
        );


    if (cards.length === 0) {

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


        if (markAllButton) {
            markAllButton.disabled = true;
        }


        if (deleteAllButton) {
            deleteAllButton.disabled = true;
        }
    }
}


/* =========================================================
   SUMMARY FROM CURRENT UI
========================================================= */

function refreshSummaryFromDOM() {

    if (!notificationSummary) {
        return;
    }


    const cards =
        document.querySelectorAll(
            ".notification-card"
        );


    const unread =
        document.querySelectorAll(
            ".notification-card.unread"
        ).length;


    notificationSummary.textContent =
        `${cards.length} notification${cards.length === 1
            ? ""
            : "s"
        } • ${unread} unread`;
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value) {

    const div =
        document.createElement("div");

    div.textContent =
        value ?? "";

    return div.innerHTML;
}


/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(dateValue) {

    if (!dateValue) {
        return "Just now";
    }


    const date =
        new Date(dateValue);


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
   BUTTON EVENTS
========================================================= */

if (markAllButton) {

    markAllButton.addEventListener(
        "click",
        markAllAsRead
    );
}


if (deleteAllButton) {

    deleteAllButton.addEventListener(
        "click",
        deleteAllNotifications
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


        /*
         * Load notifications ONLY ONCE
         * when page opens.
         */

        loadNotifications();
    }
);


/* =========================================================
   IMPORTANT
=========================================================

   NO AUTO REFRESH.

   Previously:

   setInterval(loadNotifications, 15000);

   That caused repeated backend requests.

   Notifications now load once when the page opens.

========================================================= */

function showDeleteConfirmation(
    notificationId,
    card
) {

    pendingDeleteNotificationId =
        notificationId;

    pendingDeleteCard =
        card;

    pendingDeleteAll =
        false;

    if (confirmModalTitle) {

        confirmModalTitle.textContent =
            "Delete Notification?";
    }

    if (confirmModalMessage) {

        confirmModalMessage.textContent =
            "Are you sure you want to delete this notification? This action cannot be undone.";
    }

    if (deleteConfirmModal) {

        deleteConfirmModal.classList.add(
            "active"
        );
    }
}


async function performDeleteNotification() {

    if (!currentUser) {
        closeDeleteConfirmation();
        return;
    }

    try {

        if (confirmDeleteBtn) {
            confirmDeleteBtn.disabled = true;
            confirmDeleteBtn.textContent = "Deleting...";
        }


        /* =====================================================
           DELETE ALL
        ===================================================== */

        if (pendingDeleteAll) {

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


            if (data.status !== "success") {

                throw new Error(
                    data.message ||
                    "Unable to delete notifications."
                );
            }


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


            if (navBadge) {

                navBadge.textContent = "0";

                navBadge.style.display = "none";
            }


            if (markAllButton) {
                markAllButton.disabled = true;
            }


            if (deleteAllButton) {
                deleteAllButton.disabled = true;
            }


            closeDeleteConfirmation();

            return;
        }


        /* =====================================================
           DELETE ONE
        ===================================================== */

        if (!pendingDeleteNotificationId) {

            closeDeleteConfirmation();
            return;
        }


        const response =
            await fetch(
                `${API_URL}/notifications/${encodeURIComponent(
                    pendingDeleteNotificationId
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


        if (data.status !== "success") {

            throw new Error(
                data.message ||
                "Unable to delete notification."
            );
        }


        /* Remove card immediately */

        if (pendingDeleteCard) {

            const wasUnread =
                pendingDeleteCard.classList.contains(
                    "unread"
                );


            pendingDeleteCard.remove();


            if (
                wasUnread &&
                navBadge
            ) {

                const currentCount =
                    Number(
                        navBadge.textContent || 0
                    );


                const newCount =
                    Math.max(
                        0,
                        currentCount - 1
                    );


                navBadge.textContent =
                    newCount;


                navBadge.style.display =
                    newCount > 0
                        ? "inline-flex"
                        : "none";
            }
        }


        closeDeleteConfirmation();

        checkEmptyState();

        refreshSummaryFromDOM();


    } catch (error) {

        console.error(
            "Unable to delete notification:",
            error
        );


        alert(
            error.message ||
            "Unable to delete notification."
        );


        if (confirmDeleteBtn) {

            confirmDeleteBtn.disabled =
                false;

            confirmDeleteBtn.textContent =
                "🗑️ Delete";
        }
    }
}


function closeDeleteConfirmation() {

    if (deleteConfirmModal) {

        deleteConfirmModal.classList.remove(
            "active"
        );
    }


    pendingDeleteNotificationId =
        null;

    pendingDeleteCard =
        null;

    pendingDeleteAll =
        false;


    if (confirmDeleteBtn) {

        confirmDeleteBtn.disabled =
            false;

        confirmDeleteBtn.textContent =
            "🗑️ Delete";
    }
}

if (confirmCancelBtn) {

    confirmCancelBtn.addEventListener(
        "click",
        closeDeleteConfirmation
    );
}


if (confirmDeleteBtn) {

    confirmDeleteBtn.addEventListener(
        "click",
        performDeleteNotification
    );
}


/* Close when clicking outside */

const confirmModalOverlay =
    document.querySelector(
        ".confirm-modal-overlay"
    );

if (confirmModalOverlay) {

    confirmModalOverlay.addEventListener(
        "click",
        closeDeleteConfirmation
    );
}


/* Close with Escape */

document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Escape" &&
            deleteConfirmModal &&
            deleteConfirmModal.classList.contains(
                "active"
            )
        ) {

            closeDeleteConfirmation();
        }
    }
);