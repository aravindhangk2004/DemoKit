

const STORAGE = {
    kits: "demokit_kits_v3",
    users: "demokit_users_v3",
    bookings: "demokit_bookings_v3",
    logs: "demokit_logs_v3",
    purchases: "demokit_purchases_v3",
    currentUser: "demokit_current_user_v3"
};



let selectedRole = "admin";
let currentUser = null;
let resetEmail = "";
let resetOtp = "";

let kits = [];
let users = [];
let bookings = [];
let logs = [];
let purchases = [];



function saveData() {

    localStorage.setItem(STORAGE.kits, JSON.stringify(kits));
    localStorage.setItem(STORAGE.users, JSON.stringify(users));
    localStorage.setItem(STORAGE.bookings, JSON.stringify(bookings));
    localStorage.setItem(STORAGE.logs, JSON.stringify(logs));
    localStorage.setItem(STORAGE.purchases, JSON.stringify(purchases));

}


function loadData() {

    kits = JSON.parse(localStorage.getItem(STORAGE.kits) || "[]");
    users = JSON.parse(localStorage.getItem(STORAGE.users) || "[]");
    bookings = JSON.parse(localStorage.getItem(STORAGE.bookings) || "[]");
    logs = JSON.parse(localStorage.getItem(STORAGE.logs) || "[]");
    purchases = JSON.parse(localStorage.getItem(STORAGE.purchases) || "[]");

    if (!kits.length) {
        createInitialKits();
    }

    if (!users.length) {
        createInitialUsers();
    }

    cleanupExpiredBookings();

}


function uid(prefix) {

    return prefix +
        Date.now().toString().slice(-6) +
        Math.floor(Math.random() * 100);

}


function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function money(value) {

    return "₹" + Number(value || 0).toLocaleString("en-IN");

}


function formatDate(dateString) {

    if (!dateString) {
        return "-";
    }

    const date = new Date(dateString + "T00:00:00");

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });

}


function todayISO() {

    const d = new Date();

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;

}


function addDays(dateString, amount) {

    const date = new Date(dateString + "T00:00:00");

    date.setDate(date.getDate() + amount);

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");

    return `${y}-${m}-${d}`;

}


function dateRangesOverlap(start1, end1, start2, end2) {

    return start1 <= end2 && end1 >= start2;

}


function getKit(kitId) {

    return kits.find(k => k.id === kitId);

}


function getUser(userId) {

    return users.find(u => u.id === userId);

}


/* =========================================================
   INITIAL DATA
========================================================= */

function createInitialUsers() {

    users = [

        {
            id: "admin",
            name: "System Administrator",
            email: "admin@demokit.local",
            password: "admin123",
            role: "admin",
            region: "Chennai",
            status: "ACTIVE",
            lastLogin: null
        },

        {
            id: "user1",
            name: "Demo User",
            email: "user1@demokit.local",
            password: "user123",
            role: "user",
            region: "Chennai",
            status: "ACTIVE",
            lastLogin: null
        },

        {
            id: "user2",
            name: "Sales User",
            email: "user2@demokit.local",
            password: "user123",
            role: "user",
            region: "Bangalore",
            status: "ACTIVE",
            lastLogin: null
        },

        {
            id: "manager1",
            name: "Regional Manager",
            email: "manager@demokit.local",
            password: "manager123",
            role: "manager",
            region: "Hyderabad",
            status: "ACTIVE",
            lastLogin: null
        }

    ];

    saveData();

}


function createInitialKits() {

    const categories = [
        "Laptop",
        "Mobile",
        "Tablet",
        "IoT"
    ];

    const regions = [
        "Chennai",
        "Bangalore",
        "Hyderabad",
        "Coimbatore"
    ];

    kits = [];

    for (let i = 1; i <= 20; i++) {

        const number = String(i).padStart(2, "0");

        const category =
            categories[(i - 1) % categories.length];

        const region =
            regions[(i - 1) % regions.length];

        kits.push({

            id: `DK-${number}`,

            name: `Demo Kit ${number}`,

            serial:
                `SN-DK-${2026}${number}`,

            model:
                `${category} Demo Model ${number}`,

            category,

            homeRegion: region,

            status: "AVAILABLE",

            assignedUser: null,

            assignedFrom: null,

            assignedUntil: null,

            purchaseCost:
                50000 + (i * 2500),

            accessoriesCost:
                3000 + (i * 200),

            otherCost:
                i * 500,

            transportCost: 0,

            maintenanceCost: 0,

            purchaseDate: "2026-01-10",

            notes:
                "Demo kit available for regional customer demonstrations."

        });

    }

    saveData();

}


/* =========================================================
   LOGIN
========================================================= */

function selectRole(role) {

    selectedRole = role;

    const adminBtn =
        document.getElementById("adminRoleBtn");

    const userBtn =
        document.getElementById("userRoleBtn");

    const label =
        document.getElementById("loginIdLabel");

    const input =
        document.getElementById("loginUsername");

    if (role === "admin") {

        adminBtn.classList.add("active");
        userBtn.classList.remove("active");

        label.textContent = "Admin User ID";

        input.placeholder =
            "Enter Admin User ID";

    } else {

        userBtn.classList.add("active");
        adminBtn.classList.remove("active");

        label.textContent = "User ID";

        input.placeholder =
            "Enter User ID";

    }

}


function togglePassword() {

    const input =
        document.getElementById("loginPassword");

    const icon =
        document.querySelector(".password-box button i");

    if (input.type === "password") {

        input.type = "text";

        icon.className =
            "fa-solid fa-eye-slash";

    } else {

        input.type = "password";

        icon.className =
            "fa-solid fa-eye";

    }

}


document
    .getElementById("loginForm")
    .addEventListener("submit", function (event) {

        event.preventDefault();

        const username =
            document
                .getElementById("loginUsername")
                .value
                .trim();

        const password =
            document
                .getElementById("loginPassword")
                .value;

        const error =
            document.getElementById("loginError");

        const user =
            users.find(u =>
                u.id.toLowerCase() === username.toLowerCase()
                &&
                u.password === password
            );

        if (!user) {

            error.textContent =
                "Invalid User ID or password.";

            return;

        }

        if (user.status !== "ACTIVE") {

            error.textContent =
                "This account is inactive.";

            return;

        }

        if (
            selectedRole === "admin"
            &&
            user.role !== "admin"
        ) {

            error.textContent =
                "This account does not have Admin access.";

            return;

        }

        if (
            selectedRole === "user"
            &&
            user.role === "admin"
        ) {

            error.textContent =
                "Please select the Admin login.";

            return;

        }

        currentUser = user;

        user.lastLogin =
            new Date().toISOString();

        saveData();

        localStorage.setItem(
            STORAGE.currentUser,
            JSON.stringify(currentUser)
        );

        error.textContent = "";

        document
            .getElementById("loginScreen")
            .classList.add("hidden");

        document
            .getElementById("appContent")
            .classList.remove("hidden");

        setupUserInterface();

        addLog(
            "LOGIN",
            null,
            `User ${user.name} logged into the system.`
        );

        renderAll();

    });


function logout() {

    if (currentUser) {

        addLog(
            "LOGOUT",
            null,
            `${currentUser.name} logged out.`
        );

    }

    currentUser = null;

    localStorage.removeItem(
        STORAGE.currentUser
    );

    document
        .getElementById("appContent")
        .classList.add("hidden");

    document
        .getElementById("loginScreen")
        .classList.remove("hidden");

    document
        .getElementById("loginPassword")
        .value = "";

}


function setupUserInterface() {

    const roleBadge =
        document.getElementById("roleBadge");

    const userBadge =
        document.getElementById("currentUserBadge");

    if (!currentUser) {
        return;
    }

    if (currentUser.role === "admin") {

        roleBadge.className =
            "admin-badge";

        roleBadge.textContent =
            "ADMIN";

    } else {

        roleBadge.className =
            "user-badge";

        roleBadge.textContent =
            currentUser.role.toUpperCase();

    }

    userBadge.textContent =
        `${currentUser.name} · ${currentUser.region}`;

    document
        .querySelectorAll(".admin-only")
        .forEach(element => {

            if (currentUser.role === "admin") {

                element.classList.remove("hidden");

            } else {

                element.classList.add("hidden");

            }

        });

}


/* =========================================================
   NAVIGATION
========================================================= */

function showSection(sectionId) {

    if (
        (sectionId === "users" || sectionId === "logs")
        &&
        currentUser?.role !== "admin"
    ) {

        showToast(
            "Admin access required.",
            "error"
        );

        return;

    }

    document
        .querySelectorAll(".page-section")
        .forEach(section => {

            section.classList.add("hidden");

        });

    const target =
        document.getElementById(sectionId);

    if (target) {

        target.classList.remove("hidden");

    }

    document
        .querySelectorAll(".nav-tab")
        .forEach(button => {

            button.classList.remove("active");

            if (
                button.dataset.section === sectionId
            ) {

                button.classList.add("active");

            }

        });

    if (sectionId === "booking") {

        renderBookingPage();

    }

}


/* =========================================================
   MODALS
========================================================= */

function openModal(id) {

    const modal =
        document.getElementById(id);

    if (modal) {

        modal.classList.add("show");

    }

}


function closeModal(id) {

    const modal =
        document.getElementById(id);

    if (modal) {

        modal.classList.remove("show");

    }

}


window.addEventListener("click", function (event) {

    if (event.target.classList.contains("modal")) {

        event.target.classList.remove("show");

    }

});


/* =========================================================
   KIT MANAGEMENT
========================================================= */

function openKitModal(kitId = null) {

    if (currentUser?.role !== "admin") {

        showToast(
            "Only Admin can manage demo kits.",
            "error"
        );

        return;

    }

    const form =
        document.getElementById("kitForm");

    form.reset();

    document.getElementById("kitId").value = "";

    document.getElementById("kitModalTitle")
        .textContent = "New Demo Kit";

    if (kitId) {

        const kit = getKit(kitId);

        if (!kit) return;

        document.getElementById("kitModalTitle")
            .textContent = "Edit Demo Kit";

        document.getElementById("kitId").value =
            kit.id;

        document.getElementById("kitName").value =
            kit.name;

        document.getElementById("serialNumber").value =
            kit.serial;

        document.getElementById("model").value =
            kit.model;

        document.getElementById("category").value =
            kit.category;

        document.getElementById("homeRegion").value =
            kit.homeRegion;

        document.getElementById("purchaseCost").value =
            kit.purchaseCost;

        document.getElementById("accessoriesCost").value =
            kit.accessoriesCost;

        document.getElementById("otherCost").value =
            kit.otherCost;

        document.getElementById("purchaseDate").value =
            kit.purchaseDate || "";

        document.getElementById("kitNotes").value =
            kit.notes || "";

    }

    openModal("kitModal");

}


document
    .getElementById("kitForm")
    .addEventListener("submit", function (event) {

        event.preventDefault();

        if (currentUser?.role !== "admin") {

            showToast(
                "Admin access required.",
                "error"
            );

            return;

        }

        const id =
            document.getElementById("kitId").value;

        const data = {

            name:
                document.getElementById("kitName").value.trim(),

            serial:
                document.getElementById("serialNumber").value.trim(),

            model:
                document.getElementById("model").value.trim(),

            category:
                document.getElementById("category").value,

            homeRegion:
                document.getElementById("homeRegion").value,

            purchaseCost:
                Number(document.getElementById("purchaseCost").value || 0),

            accessoriesCost:
                Number(document.getElementById("accessoriesCost").value || 0),

            otherCost:
                Number(document.getElementById("otherCost").value || 0),

            purchaseDate:
                document.getElementById("purchaseDate").value,

            notes:
                document.getElementById("kitNotes").value.trim()

        };

        if (id) {

            const kit =
                getKit(id);

            Object.assign(
                kit,
                data
            );

            addLog(
                "KIT_UPDATED",
                id,
                `${kit.name} was updated.`
            );

            showToast(
                "Demo Kit updated successfully.",
                "success"
            );

        } else {

            const newKit = {

                id:
                    generateKitId(),

                ...data,

                status: "AVAILABLE",

                assignedUser: null,

                assignedFrom: null,

                assignedUntil: null,

                transportCost: 0,

                maintenanceCost: 0

            };

            kits.push(newKit);

            addLog(
                "KIT_CREATED",
                newKit.id,
                `${newKit.name} was created.`
            );

            showToast(
                "New Demo Kit created.",
                "success"
            );

        }

        saveData();

        closeModal("kitModal");

        renderAll();

    });


function generateKitId() {

    let number = kits.length + 1;

    let id;

    do {

        id =
            `DK-${String(number).padStart(2, "0")}`;

        number++;

    } while (getKit(id));

    return id;

}


function deleteKit(kitId) {

    if (currentUser?.role !== "admin") {

        showToast(
            "Admin access required.",
            "error"
        );

        return;

    }

    const kit =
        getKit(kitId);

    if (!kit) return;

    const hasBookings =
        bookings.some(
            b =>
                b.kitId === kitId
                &&
                ["PENDING", "APPROVED"].includes(b.status)
        );

    if (hasBookings) {

        showToast(
            "This kit has active bookings and cannot be deleted.",
            "error"
        );

        return;

    }

    if (
        !confirm(
            `Delete ${kit.name}?`
        )
    ) {
        return;
    }

    kits =
        kits.filter(k => k.id !== kitId);

    addLog(
        "KIT_DELETED",
        kitId,
        `${kit.name} was deleted.`
    );

    saveData();

    renderAll();

    showToast(
        "Demo Kit deleted.",
        "success"
    );

}


/* =========================================================
   KIT TABLE
========================================================= */

function renderKits() {

    const table =
        document.getElementById("kitTable");

    if (!table) return;

    const search =
        (
            document.getElementById("searchInput")?.value
            || ""
        ).toLowerCase();

    const region =
        document.getElementById("regionFilter")?.value
        || "ALL";

    const status =
        document.getElementById("statusFilter")?.value
        || "ALL";

    const category =
        document.getElementById("categoryFilter")?.value
        || "ALL";

    const filtered =
        kits.filter(kit => {

            const text =
                `${kit.id} ${kit.name} ${kit.serial} ${kit.model} ${kit.category}`
                    .toLowerCase();

            return (

                (!search || text.includes(search))

                &&

                (region === "ALL"
                    || kit.homeRegion === region)

                &&

                (status === "ALL"
                    || getDisplayKitStatus(kit) === status)

                &&

                (category === "ALL"
                    || kit.category === category)

            );

        });

    if (!filtered.length) {

        table.innerHTML = `
            <tr>
                <td colspan="10" class="empty">
                    No demo kits found.
                </td>
            </tr>
        `;

        return;

    }

    table.innerHTML =
        filtered.map(kit => {

            const status =
                getDisplayKitStatus(kit);

            const nextBooking =
                getNextBooking(kit.id);

            const totalCost =
                Number(kit.purchaseCost || 0)
                +
                Number(kit.accessoriesCost || 0)
                +
                Number(kit.otherCost || 0)
                +
                Number(kit.transportCost || 0)
                +
                Number(kit.maintenanceCost || 0);

            return `

                <tr>

                    <td>
                        <strong>${escapeHTML(kit.id)}</strong>
                    </td>

                    <td>
                        ${escapeHTML(kit.name)}
                        <small>
                            ${escapeHTML(kit.model)}
                        </small>
                    </td>

                    <td>
                        ${escapeHTML(kit.serial)}
                    </td>

                    <td>
                        ${escapeHTML(kit.category)}
                    </td>

                    <td>
                        ${kit.assignedUser
                            ? escapeHTML(
                                getUser(kit.assignedUser)?.name
                                || kit.assignedUser
                              )
                            : "-"
                        }
                    </td>

                    <td>
                        ${escapeHTML(kit.homeRegion)}
                    </td>

                    <td>
                        ${statusBadge(status)}
                    </td>

                    <td>
                        ${
                            nextBooking
                            ?
                            `${formatDate(nextBooking.from)}
                             → 
                             ${formatDate(nextBooking.until)}`
                            :
                            "-"
                        }
                    </td>

                    <td>
                        ${money(totalCost)}
                    </td>

                    <td>

                        <div class="action-buttons">

                            <button
                                class="action-btn"
                                title="Pre-Book"
                                onclick="openBookingModal('${kit.id}')">

                                <i class="fa-solid fa-calendar-plus"></i>

                            </button>

                            ${
                                currentUser?.role === "admin"
                                ?
                                `
                                <button
                                    class="action-btn"
                                    title="Edit"
                                    onclick="openKitModal('${kit.id}')">

                                    <i class="fa-solid fa-pen"></i>

                                </button>

                                <button
                                    class="action-btn"
                                    title="Delete"
                                    onclick="deleteKit('${kit.id}')">

                                    <i class="fa-solid fa-trash"></i>

                                </button>
                                `
                                :
                                ""
                            }

                        </div>

                    </td>

                </tr>

            `;

        }).join("");

}


function getDisplayKitStatus(kit) {

    if (
        [
            "MAINTENANCE",
            "BLOCKED",
            "IN_USE",
            "TRANSPORT",
            "ASSIGNED"
        ].includes(kit.status)
    ) {

        return kit.status;

    }

    const activeBooking =
        bookings.find(
            b =>
                b.kitId === kit.id
                &&
                b.status === "APPROVED"
                &&
                dateRangesOverlap(
                    b.from,
                    b.until,
                    todayISO(),
                    todayISO()
                )
        );

    if (activeBooking) {

        return "RESERVED";

    }

    return "AVAILABLE";

}


function statusBadge(status) {

    const css =
        status
            .toLowerCase()
            .replaceAll(" ", "_");

    return `
        <span class="status ${css}">
            ${escapeHTML(status)}
        </span>
    `;

}


/* =========================================================
   BOOKING
========================================================= */

function openBookingModal(kitId = null) {

    if (!currentUser) {

        showToast(
            "Please login first.",
            "error"
        );

        return;

    }

    const select =
        document.getElementById("bookingKit");

    select.innerHTML =
        kits.map(kit => {

            const disabled =
                [
                    "MAINTENANCE",
                    "BLOCKED",
                    "IN_USE",
                    "TRANSPORT",
                    "ASSIGNED"
                ].includes(kit.status);

            return `
                <option
                    value="${escapeHTML(kit.id)}"
                    ${kitId === kit.id ? "selected" : ""}
                    ${disabled ? "disabled" : ""}>

                    ${escapeHTML(kit.id)}
                    - 
                    ${escapeHTML(kit.name)}
                    (${escapeHTML(kit.category)})
                    ${disabled ? "- " + kit.status : ""}

                </option>
            `;

        }).join("");

    const from =
        document.getElementById("bookingFrom");

    const until =
        document.getElementById("bookingUntil");

    const today =
        todayISO();

    from.min = today;
    until.min = today;

    if (!from.value) {
        from.value = addDays(today, 1);
    }

    if (!until.value) {
        until.value = addDays(today, 3);
    }

    if (kitId) {

        select.value = kitId;

    }

    document.getElementById("bookingCustomer").value =
        currentUser.name;

    document.getElementById("bookingPurpose").value =
        "";

    document.getElementById("bookingBudget").value =
        "0";

    document.getElementById("bookingRemarks").value =
        "";

    updateBookingKitInfo();

    validateBookingDates();

    openModal("bookingModal");

}


function updateBookingKitInfo() {

    const kitId =
        document.getElementById("bookingKit").value;

    const kit =
        getKit(kitId);

    const box =
        document.getElementById("selectedKitInfo");

    if (!kit) {

        box.innerHTML = "";

        return;

    }

    const totalCost =
        Number(kit.purchaseCost || 0)
        +
        Number(kit.accessoriesCost || 0)
        +
        Number(kit.otherCost || 0);

    box.innerHTML = `

        <strong>
            ${escapeHTML(kit.name)}
        </strong>

        <div>
            Model: ${escapeHTML(kit.model)}
        </div>

        <div>
            Category: ${escapeHTML(kit.category)}
        </div>

        <div>
            Region: ${escapeHTML(kit.homeRegion)}
        </div>

        <div>
            Investment: ${money(totalCost)}
        </div>

    `;

}


function validateBookingDates() {

    const kitId =
        document.getElementById("bookingKit").value;

    const from =
        document.getElementById("bookingFrom").value;

    const until =
        document.getElementById("bookingUntil").value;

    const result =
        document.getElementById("bookingAvailability");

    const button =
        document.getElementById("preBookButton");

    button.disabled = false;

    if (!kitId || !from || !until) {

        result.innerHTML = "";

        return false;

    }

    if (until < from) {

        result.className =
            "booking-availability unavailable";

        result.innerHTML =
            "Booking Until date must be after Booking From date.";

        button.disabled = true;

        return false;

    }

    const kit =
        getKit(kitId);

    if (!kit) {

        button.disabled = true;

        return false;

    }

    if (
        [
            "MAINTENANCE",
            "BLOCKED",
            "IN_USE",
            "TRANSPORT",
            "ASSIGNED"
        ].includes(kit.status)
    ) {

        result.className =
            "booking-availability unavailable";

        result.innerHTML =
            `❌ ${kit.name} is currently ${kit.status}.`;

        button.disabled = true;

        return false;

    }

    const conflict =
        findBookingConflict(
            kitId,
            from,
            until
        );

    if (conflict) {

        result.className =
            "booking-availability unavailable";

        result.innerHTML = `

            ❌ <strong>Not Available</strong>

            <br>

            This kit is already booked from
            <strong>${formatDate(conflict.from)}</strong>
            to
            <strong>${formatDate(conflict.until)}</strong>.

            <br>

            Booking ID:
            ${escapeHTML(conflict.id)}

        `;

        button.disabled = true;

        return false;

    }

    result.className =
        "booking-availability available";

    result.innerHTML = `

        ✓ <strong>Available</strong>

        <br>

        ${escapeHTML(kit.name)}
        is available from
        <strong>${formatDate(from)}</strong>
        to
        <strong>${formatDate(until)}</strong>.

    `;

    return true;

}


function findBookingConflict(
    kitId,
    from,
    until,
    excludeBookingId = null
) {

    return bookings.find(b => {

        if (b.id === excludeBookingId) {
            return false;
        }

        if (b.kitId !== kitId) {
            return false;
        }

        if (
            !["PENDING", "APPROVED"].includes(
                b.status
            )
        ) {

            return false;

        }

        return dateRangesOverlap(
            b.from,
            b.until,
            from,
            until
        );

    });

}


document
    .getElementById("bookingForm")
    .addEventListener("submit", function (event) {

        event.preventDefault();

        if (!currentUser) {
            return;
        }

        const kitId =
            document.getElementById("bookingKit").value;

        const from =
            document.getElementById("bookingFrom").value;

        const until =
            document.getElementById("bookingUntil").value;

        if (!validateBookingDates()) {

            showToast(
                "The selected kit is not available for these dates.",
                "error"
            );

            return;

        }

        const kit =
            getKit(kitId);

        const booking = {

            id: uid("BK-"),

            kitId,

            userId:
                currentUser.id,

            userName:
                currentUser.name,

            userEmail:
                currentUser.email,

            from,

            until,

            customer:
                document.getElementById("bookingCustomer").value.trim(),

            purpose:
                document.getElementById("bookingPurpose").value.trim(),

            region:
                document.getElementById("bookingRegion").value,

            budget:
                Number(
                    document.getElementById("bookingBudget").value
                    || 0
                ),

            remarks:
                document.getElementById("bookingRemarks").value.trim(),

            status:
                "PENDING",

            createdAt:
                new Date().toISOString(),

            approvedAt:
                null,

            approvedBy:
                null

        };

        bookings.push(booking);

        addLog(
            "PRE_BOOKING_CREATED",
            kitId,
            `${booking.id}: ${kit.name} requested from ${from} to ${until}.`
        );

        saveData();

        closeModal("bookingModal");

        renderAll();

        showToast(
            `Pre-booking ${booking.id} submitted for Admin approval.`,
            "success"
        );

    });


/* =========================================================
   BOOKING CONFLICT / DATE MANAGEMENT
========================================================= */

function getNextBooking(kitId) {

    const today =
        todayISO();

    return bookings
        .filter(
            b =>
                b.kitId === kitId
                &&
                b.status === "APPROVED"
                &&
                b.until >= today
        )
        .sort(
            (a, b) =>
                a.from.localeCompare(b.from)
        )[0] || null;

}


function cleanupExpiredBookings() {

    let changed = false;

    bookings.forEach(booking => {

        if (
            booking.status === "APPROVED"
            &&
            booking.until < todayISO()
        ) {

            booking.status = "COMPLETED";

            changed = true;

            const kit =
                getKit(booking.kitId);

            if (kit) {

                if (
                    kit.assignedUser === booking.userId
                ) {

                    kit.assignedUser = null;
                    kit.assignedFrom = null;
                    kit.assignedUntil = null;

                }

                if (
                    [
                        "RESERVED",
                        "ASSIGNED",
                        "IN_USE"
                    ].includes(kit.status)
                ) {

                    kit.status =
                        "AVAILABLE";

                }

            }

        }

    });

    if (changed) {

        saveData();

    }

}


/* =========================================================
   BOOKING PAGE
========================================================= */

function renderBookingPage() {

    renderAvailabilityCalendar();

    renderMyBookings();

}


function renderMyBookings() {

    const table =
        document.getElementById("myBookingTable");

    if (!table || !currentUser) {
        return;
    }

    let list;

    if (currentUser.role === "admin") {

        list = bookings;

    } else {

        list =
            bookings.filter(
                b =>
                    b.userId === currentUser.id
            );

    }

    list =
        [...list].sort(
            (a, b) =>
                b.createdAt.localeCompare(a.createdAt)
        );

    if (!list.length) {

        table.innerHTML = `
            <tr>
                <td colspan="7" class="empty">
                    No bookings found.
                </td>
            </tr>
        `;

        return;

    }

    table.innerHTML =
        list.map(booking => {

            const kit =
                getKit(booking.kitId);

            return `

                <tr>

                    <td>
                        <strong>
                            ${escapeHTML(booking.id)}
                        </strong>
                    </td>

                    <td>
                        ${escapeHTML(kit?.name || booking.kitId)}
                    </td>

                    <td>
                        ${formatDate(booking.from)}
                    </td>

                    <td>
                        ${formatDate(booking.until)}
                    </td>

                    <td>
                        ${escapeHTML(booking.purpose)}
                    </td>

                    <td>
                        ${statusBadge(booking.status)}
                    </td>

                    <td>

                        ${
                            ["PENDING", "APPROVED"]
                                .includes(booking.status)
                            ?
                            `
                            <button
                                class="btn danger small"
                                onclick="cancelBooking('${booking.id}')">

                                Cancel

                            </button>
                            `
                            :
                            "-"
                        }

                    </td>

                </tr>

            `;

        }).join("");

}


function cancelBooking(bookingId) {

    const booking =
        bookings.find(
            b => b.id === bookingId
        );

    if (!booking) {
        return;
    }

    if (
        currentUser.role !== "admin"
        &&
        booking.userId !== currentUser.id
    ) {

        showToast(
            "You cannot cancel this booking.",
            "error"
        );

        return;

    }

    if (
        !confirm(
            `Cancel booking ${booking.id}?`
        )
    ) {
        return;
    }

    booking.status =
        "CANCELLED";

    addLog(
        "BOOKING_CANCELLED",
        booking.kitId,
        `${booking.id} was cancelled.`
    );

    saveData();

    renderAll();

    showToast(
        "Booking cancelled.",
        "success"
    );

}


/* =========================================================
   AVAILABILITY CHECK
========================================================= */

function checkCalendarAvailability() {

    const from =
        document.getElementById("calendarFrom").value;

    const until =
        document.getElementById("calendarTo").value;

    const result =
        document.getElementById("availabilityResult");

    if (!from || !until) {

        result.innerHTML = `
            <div class="availability-card unavailable">
                Please select both booking dates.
            </div>
        `;

        return;

    }

    if (until < from) {

        result.innerHTML = `
            <div class="availability-card unavailable">
                Booking Until date must be after Booking From date.
            </div>
        `;

        return;

    }

    const available =
        [];

    const unavailable =
        [];

    kits.forEach(kit => {

        if (
            [
                "MAINTENANCE",
                "BLOCKED",
                "IN_USE",
                "TRANSPORT",
                "ASSIGNED"
            ].includes(kit.status)
        ) {

            unavailable.push({
                kit,
                reason: kit.status
            });

            return;

        }

        const conflict =
            findBookingConflict(
                kit.id,
                from,
                until
            );

        if (conflict) {

            unavailable.push({
                kit,
                reason:
                    `Booked ${formatDate(conflict.from)}
                     to ${formatDate(conflict.until)}`
            });

        } else {

            available.push(kit);

        }

    });


    result.innerHTML = `

        <div class="availability-card available">

            <h4>
                ✓ ${available.length} Demo Kits Available
            </h4>

            <p>
                ${formatDate(from)}
                →
                ${formatDate(until)}
            </p>

            <div class="quick-actions">

                ${
                    available.slice(0, 8).map(kit => `
                        <button
                            class="btn success small"
                            onclick="openBookingModal('${kit.id}')">

                            ${escapeHTML(kit.id)}

                        </button>
                    `).join("")
                }

            </div>

        </div>


        <div class="availability-card unavailable">

            <h4>
                ${unavailable.length} Kits Unavailable
            </h4>

            <p>
                ${unavailable.slice(0, 8).map(
                    x =>
                        `${escapeHTML(x.kit.id)} - ${escapeHTML(x.reason)}`
                ).join("<br>")}
            </p>

        </div>

    `;

}


/* =========================================================
   BOOKING CALENDAR
========================================================= */

function renderAvailabilityCalendar() {

    const container =
        document.getElementById("bookingCalendar");

    if (!container) {
        return;
    }

    const start =
        todayISO();

    const days = [];

    for (let i = 0; i < 14; i++) {

        days.push(
            addDays(start, i)
        );

    }

    const columns =
        days.length + 1;

    let html = `
        <div
            class="calendar-grid"
            style="grid-template-columns: 150px repeat(${days.length}, 1fr);">

            <div class="calendar-cell calendar-header">
                Demo Kit
            </div>
    `;

    days.forEach(day => {

        const date =
            new Date(day + "T00:00:00");

        html += `
            <div class="calendar-cell calendar-header">
                ${date.toLocaleDateString(
                    "en-IN",
                    {
                        day: "2-digit",
                        month: "short"
                    }
                )}
            </div>
        `;

    });

    kits.forEach(kit => {

        html += `
            <div class="calendar-cell calendar-kit">
                ${escapeHTML(kit.id)}
                <small>
                    ${escapeHTML(kit.category)}
                </small>
            </div>
        `;

        days.forEach(day => {

            const state =
                getCalendarState(
                    kit,
                    day
                );

            html += `
                <div
                    class="calendar-cell calendar-day ${state}"
                    title="${escapeHTML(kit.name)} - ${day}">

                    ${
                        state === "available"
                        ? "Available"
                        : state === "reserved"
                            ? "Reserved"
                            : state === "pending"
                                ? "Pending"
                                : "Blocked"
                    }

                </div>
            `;

        });

    });

    html += `</div>`;

    container.innerHTML = html;

}


function getCalendarState(kit, day) {

    if (
        [
            "MAINTENANCE",
            "BLOCKED",
            "IN_USE",
            "TRANSPORT",
            "ASSIGNED"
        ].includes(kit.status)
    ) {

        return "blocked";

    }

    const booking =
        bookings.find(
            b =>
                b.kitId === kit.id
                &&
                ["PENDING", "APPROVED"].includes(b.status)
                &&
                day >= b.from
                &&
                day <= b.until
        );

    if (!booking) {

        return "available";

    }

    if (booking.status === "APPROVED") {

        return "reserved";

    }

    return "pending";

}


/* =========================================================
   ADMIN BOOKING REQUESTS
========================================================= */

function renderRequests() {

    const table =
        document.getElementById("requestTable");

    if (!table) return;

    let list = bookings;

    if (
        currentUser
        &&
        currentUser.role !== "admin"
    ) {

        list =
            bookings.filter(
                b =>
                    b.userId === currentUser.id
            );

    }

    list =
        [...list].sort(
            (a, b) =>
                b.createdAt.localeCompare(a.createdAt)
        );

    if (!list.length) {

        table.innerHTML = `
            <tr>
                <td colspan="9" class="empty">
                    No booking requests found.
                </td>
            </tr>
        `;

        return;

    }

    table.innerHTML =
        list.map(booking => {

            const kit =
                getKit(booking.kitId);

            return `

                <tr>

                    <td>
                        <strong>
                            ${escapeHTML(booking.id)}
                        </strong>
                    </td>

                    <td>
                        ${escapeHTML(booking.userName)}
                        <small>
                            ${escapeHTML(booking.userEmail)}
                        </small>
                    </td>

                    <td>
                        ${escapeHTML(kit?.name || booking.kitId)}
                    </td>

                    <td>
                        ${formatDate(booking.from)}
                    </td>

                    <td>
                        ${formatDate(booking.until)}
                    </td>

                    <td>
                        ${escapeHTML(booking.purpose)}
                    </td>

                    <td>
                        ${money(booking.budget)}
                    </td>

                    <td>
                        ${statusBadge(booking.status)}
                    </td>

                    <td>

                        ${
                            currentUser?.role === "admin"
                            &&
                            booking.status === "PENDING"
                            ?
                            `
                            <div class="action-buttons">

                                <button
                                    class="btn success small"
                                    onclick="approveBooking('${booking.id}')">

                                    Approve

                                </button>

                                <button
                                    class="btn danger small"
                                    onclick="rejectBooking('${booking.id}')">

                                    Reject

                                </button>

                            </div>
                            `
                            :
                            booking.status === "APPROVED"
                            ?
                            `
                            <button
                                class="btn danger small"
                                onclick="cancelBooking('${booking.id}')">

                                Cancel

                            </button>
                            `
                            :
                            "-"
                        }

                    </td>

                </tr>

            `;

        }).join("");

}


function approveBooking(bookingId) {

    if (currentUser?.role !== "admin") {

        showToast(
            "Only Admin can approve bookings.",
            "error"
        );

        return;

    }

    const booking =
        bookings.find(
            b => b.id === bookingId
        );

    if (!booking) return;

    const conflict =
        findBookingConflict(
            booking.kitId,
            booking.from,
            booking.until,
            booking.id
        );

    if (conflict) {

        booking.status =
            "REJECTED";

        addLog(
            "BOOKING_AUTO_REJECTED",
            booking.kitId,
            `${booking.id} conflicted with ${conflict.id}.`
        );

        saveData();

        renderAll();

        showToast(
            "Booking rejected because the date range is no longer available.",
            "error"
        );

        return;

    }

    booking.status =
        "APPROVED";

    booking.approvedAt =
        new Date().toISOString();

    booking.approvedBy =
        currentUser.id;

    const kit =
        getKit(booking.kitId);

    if (kit) {

        kit.status =
            "RESERVED";

    }

    addLog(
        "BOOKING_APPROVED",
        booking.kitId,
        `${booking.id} approved from ${booking.from} to ${booking.until}.`
    );

    saveData();

    renderAll();

    showToast(
        `${booking.id} approved successfully.`,
        "success"
    );

}


function rejectBooking(bookingId) {

    if (currentUser?.role !== "admin") {

        showToast(
            "Only Admin can reject bookings.",
            "error"
        );

        return;

    }

    const booking =
        bookings.find(
            b => b.id === bookingId
        );

    if (!booking) return;

    booking.status =
        "REJECTED";

    addLog(
        "BOOKING_REJECTED",
        booking.kitId,
        `${booking.id} was rejected by Admin.`
    );

    saveData();

    renderAll();

    showToast(
        `${booking.id} rejected.`,
        "warning"
    );

}


/* =========================================================
   USERS
========================================================= */

function openUserModal() {

    if (currentUser?.role !== "admin") {

        showToast(
            "Admin access required.",
            "error"
        );

        return;

    }

    document
        .getElementById("userForm")
        .reset();

    openModal("userModal");

}


document
    .getElementById("userForm")
    .addEventListener("submit", function (event) {

        event.preventDefault();

        if (currentUser?.role !== "admin") {
            return;
        }

        const id =
            document.getElementById("newUserId")
                .value
                .trim();

        if (
            users.some(
                u =>
                    u.id.toLowerCase() === id.toLowerCase()
            )
        ) {

            showToast(
                "User ID already exists.",
                "error"
            );

            return;

        }

        const email =
            document.getElementById("newUserEmail")
                .value
                .trim();

        if (
            users.some(
                u =>
                    u.email.toLowerCase() === email.toLowerCase()
            )
        ) {

            showToast(
                "Email already exists.",
                "error"
            );

            return;

        }

        const user = {

            id,

            name:
                document.getElementById("newUserName")
                    .value
                    .trim(),

            email,

            password:
                document.getElementById("newUserPassword")
                    .value,

            role:
                document.getElementById("newUserRole")
                    .value,

            region:
                document.getElementById("newUserRegion")
                    .value,

            status: "ACTIVE",

            lastLogin: null

        };

        users.push(user);

        addLog(
            "USER_CREATED",
            null,
            `${user.name} (${user.id}) was created.`
        );

        saveData();

        closeModal("userModal");

        renderAll();

        showToast(
            "User account created.",
            "success"
        );

    });


function renderUsers() {

    const table =
        document.getElementById("userTable");

    if (!table) return;

    table.innerHTML =
        users.map(user => {

            return `

                <tr>

                    <td>
                        ${escapeHTML(user.id)}
                    </td>

                    <td>
                        ${escapeHTML(user.name)}
                    </td>

                    <td>
                        ${escapeHTML(user.email)}
                    </td>

                    <td>
                        ${escapeHTML(user.role)}
                    </td>

                    <td>
                        ${escapeHTML(user.region)}
                    </td>

                    <td>
                        ${statusBadge(
                            user.status === "ACTIVE"
                            ? "AVAILABLE"
                            : "BLOCKED"
                        )}
                    </td>

                    <td>

                        ${
                            user.id !== "admin"
                            ?
                            `
                            <button
                                class="btn ${user.status === "ACTIVE" ? "danger" : "success"} small"
                                onclick="toggleUser('${user.id}')">

                                ${
                                    user.status === "ACTIVE"
                                    ? "Deactivate"
                                    : "Activate"
                                }

                            </button>
                            `
                            :
                            "System Admin"
                        }

                    </td>

                </tr>

            `;

        }).join("");

}


function toggleUser(userId) {

    if (currentUser?.role !== "admin") {
        return;
    }

    const user =
        getUser(userId);

    if (!user) return;

    user.status =
        user.status === "ACTIVE"
        ? "INACTIVE"
        : "ACTIVE";

    addLog(
        "USER_STATUS_CHANGED",
        null,
        `${user.id} changed to ${user.status}.`
    );

    saveData();

    renderAll();

}


/* =========================================================
   COST
========================================================= */

function renderCosts() {

    const purchase =
        kits.reduce(
            (sum, kit) =>
                sum + Number(kit.purchaseCost || 0),
            0
        );

    const transport =
        kits.reduce(
            (sum, kit) =>
                sum + Number(kit.transportCost || 0),
            0
        );

    const maintenance =
        kits.reduce(
            (sum, kit) =>
                sum + Number(kit.maintenanceCost || 0),
            0
        );

    const other =
        kits.reduce(
            (sum, kit) =>
                sum
                +
                Number(kit.accessoriesCost || 0)
                +
                Number(kit.otherCost || 0),
            0
        );

    const total =
        purchase
        +
        transport
        +
        maintenance
        +
        other;

    const reuseSaving =
        Math.round(
            total * 0.25
        );

    setText(
        "purchaseTotal",
        money(purchase)
    );

    setText(
        "transportTotal",
        money(transport)
    );

    setText(
        "maintenanceTotal",
        money(maintenance)
    );

    setText(
        "otherTotal",
        money(other)
    );

    setText(
        "lifecycleTotal",
        money(total)
    );

    setText(
        "reuseSaving",
        money(reuseSaving)
    );

    const bars =
        document.getElementById("costBars");

    if (bars) {

        const values = [
            ["Purchase", purchase],
            ["Transport", transport],
            ["Maintenance", maintenance],
            ["Other", other]
        ];

        const max =
            Math.max(
                ...values.map(x => x[1]),
                1
            );

        bars.innerHTML =
            values.map(x => `

                <div class="cost-bar-row">

                    <strong>
                        ${x[0]}
                    </strong>

                    <div class="cost-bar">

                        <div
                            class="cost-bar-fill"
                            style="width:${(x[1] / max) * 100}%">
                        </div>

                    </div>

                    <span>
                        ${money(x[1])}
                    </span>

                </div>

            `).join("");

    }

    const roi =
        document.getElementById("roiTable");

    if (roi) {

        roi.innerHTML = `

            <table>

                <tr>
                    <th>Metric</th>
                    <th>Value</th>
                </tr>

                <tr>
                    <td>Total Lifecycle Cost</td>
                    <td>${money(total)}</td>
                </tr>

                <tr>
                    <td>Estimated Reuse Saving</td>
                    <td>${money(reuseSaving)}</td>
                </tr>

                <tr>
                    <td>Reuse Percentage</td>
                    <td>25%</td>
                </tr>

            </table>

        `;

    }

}


/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard() {

    setText(
        "totalKits",
        kits.length
    );

    setText(
        "availableKits",
        kits.filter(
            k =>
                getDisplayKitStatus(k) === "AVAILABLE"
        ).length
    );

    setText(
        "reservedKits",
        kits.filter(
            k =>
                getDisplayKitStatus(k) === "RESERVED"
        ).length
    );

    setText(
        "assignedKits",
        kits.filter(
            k =>
                ["ASSIGNED", "IN_USE"]
                    .includes(k.status)
        ).length
    );

    setText(
        "transportKits",
        kits.filter(
            k => k.status === "TRANSPORT"
        ).length
    );

    setText(
        "maintenanceKits",
        kits.filter(
            k => k.status === "MAINTENANCE"
        ).length
    );

    setText(
        "blockedKits",
        kits.filter(
            k => k.status === "BLOCKED"
        ).length
    );

    setText(
        "pendingBookings",
        bookings.filter(
            b => b.status === "PENDING"
        ).length
    );

    setText(
        "requestBadge",
        bookings.filter(
            b => b.status === "PENDING"
        ).length
    );

    renderUpcomingBookings();

}


function renderUpcomingBookings() {

    const container =
        document.getElementById("upcomingBookings");

    if (!container) return;

    const upcoming =
        bookings
            .filter(
                b =>
                    b.status === "APPROVED"
                    &&
                    b.until >= todayISO()
            )
            .sort(
                (a, b) =>
                    a.from.localeCompare(b.from)
            )
            .slice(0, 5);

    if (!upcoming.length) {

        container.innerHTML = `
            <div class="empty">
                No upcoming reservations.
            </div>
        `;

        return;

    }

    container.innerHTML =
        upcoming.map(b => {

            const kit =
                getKit(b.kitId);

            return `

                <div class="activity-item">

                    <div class="activity-icon">
                        <i class="fa-solid fa-calendar-check"></i>
                    </div>

                    <div>

                        <strong>
                            ${escapeHTML(kit?.name || b.kitId)}
                        </strong>

                        <p>
                            ${formatDate(b.from)}
                            →
                            ${formatDate(b.until)}
                        </p>

                        <small>
                            ${escapeHTML(b.userName)}
                            ·
                            ${escapeHTML(b.purpose)}
                        </small>

                    </div>

                </div>

            `;

        }).join("");

}


/* =========================================================
   ACTIVITY LOG
========================================================= */

function addLog(action, kitId, details) {

    const now =
        new Date();

    logs.unshift({

        id:
            uid("LOG-"),

        date:
            now.toISOString().split("T")[0],

        time:
            now.toLocaleTimeString("en-IN"),

        user:
            currentUser?.name || "System",

        kitId:
            kitId || "-",

        action,

        details

    });

    if (logs.length > 500) {

        logs =
            logs.slice(0, 500);

    }

    localStorage.setItem(
        STORAGE.logs,
        JSON.stringify(logs)
    );

}


function renderLogs() {

    const table =
        document.getElementById("logTable");

    if (!table) return;

    const search =
        (
            document.getElementById("logSearch")
                ?.value
            || ""
        ).toLowerCase();

    const action =
        document.getElementById("logActionFilter")
            ?.value
        || "ALL";

    const filtered =
        logs.filter(log => {

            const text =
                `${log.date}
                 ${log.time}
                 ${log.user}
                 ${log.kitId}
                 ${log.action}
                 ${log.details}`
                    .toLowerCase();

            return (

                (!search || text.includes(search))

                &&

                (
                    action === "ALL"
                    ||
                    log.action === action
                )

            );

        });

    if (!filtered.length) {

        table.innerHTML = `
            <tr>
                <td colspan="6" class="empty">
                    No activity logs found.
                </td>
            </tr>
        `;

        return;

    }

    table.innerHTML =
        filtered.map(log => `

            <tr>

                <td>
                    ${escapeHTML(log.date)}
                </td>

                <td>
                    ${escapeHTML(log.time)}
                </td>

                <td>
                    ${escapeHTML(log.user)}
                </td>

                <td>
                    ${escapeHTML(log.kitId)}
                </td>

                <td>
                    ${escapeHTML(log.action)}
                </td>

                <td>
                    ${escapeHTML(log.details)}
                </td>

            </tr>

        `).join("");

    populateLogActions();

}


function populateLogActions() {

    const select =
        document.getElementById("logActionFilter");

    if (!select) return;

    const current =
        select.value;

    const actions =
        [...new Set(
            logs.map(
                log => log.action
            )
        )].sort();

    select.innerHTML = `
        <option value="ALL">
            All Actions
        </option>

        ${
            actions.map(action => `
                <option value="${escapeHTML(action)}">
                    ${escapeHTML(action)}
                </option>
            `).join("")
        }
    `;

    select.value =
        actions.includes(current)
        ? current
        : "ALL";

}


function clearLogs() {

    if (currentUser?.role !== "admin") {

        showToast(
            "Admin access required.",
            "error"
        );

        return;

    }

    if (
        !confirm(
            "Clear all activity logs?"
        )
    ) {
        return;
    }

    logs = [];

    saveData();

    renderLogs();

    showToast(
        "Activity logs cleared.",
        "success"
    );

}


/* =========================================================
   EXPORT KITS CSV
========================================================= */

function downloadKits() {

    const rows =
        kits.map(kit => {

            const totalCost =
                Number(kit.purchaseCost || 0)
                +
                Number(kit.accessoriesCost || 0)
                +
                Number(kit.otherCost || 0)
                +
                Number(kit.transportCost || 0)
                +
                Number(kit.maintenanceCost || 0);

            return {

                "Kit ID": kit.id,

                "Kit Name": kit.name,

                "Serial": kit.serial,

                "Model": kit.model,

                "Category": kit.category,

                "Region": kit.homeRegion,

                "Status":
                    getDisplayKitStatus(kit),

                "Purchase Cost":
                    kit.purchaseCost,

                "Accessories Cost":
                    kit.accessoriesCost,

                "Other Cost":
                    kit.otherCost,

                "Transport Cost":
                    kit.transportCost,

                "Maintenance Cost":
                    kit.maintenanceCost,

                "Total Cost":
                    totalCost

            };

        });

    downloadCSV(
        rows,
        "demokit_inventory.csv"
    );

}


function downloadCSV(rows, filename) {

    if (!rows.length) {

        showToast(
            "No data available.",
            "warning"
        );

        return;

    }

    const headers =
        Object.keys(rows[0]);

    const csv = [

        headers.join(","),

        ...rows.map(row =>
            headers.map(
                header =>
                    `"${String(
                        row[header] ?? ""
                    ).replaceAll('"', '""')}"`
            ).join(",")
        )

    ].join("\n");

    const blob =
        new Blob(
            [csv],
            {
                type: "text/csv;charset=utf-8;"
            }
        );

    const url =
        URL.createObjectURL(blob);

    const a =
        document.createElement("a");

    a.href = url;
    a.download = filename;

    document.body.appendChild(a);

    a.click();

    a.remove();

    URL.revokeObjectURL(url);

}


/* =========================================================
   EXCEL EXPORT
========================================================= */

function downloadCostReport() {

    if (
        typeof XLSX === "undefined"
    ) {

        showToast(
            "Excel library could not be loaded. Use CSV instead.",
            "error"
        );

        return;

    }

    const rows =
        kits.map(kit => ({

            "Kit ID": kit.id,

            "Kit Name": kit.name,

            "Category": kit.category,

            "Region": kit.homeRegion,

            "Purchase Cost": kit.purchaseCost,

            "Accessories Cost": kit.accessoriesCost,

            "Other Cost": kit.otherCost,

            "Transport Cost": kit.transportCost,

            "Maintenance Cost": kit.maintenanceCost,

            "Lifecycle Cost":
                Number(kit.purchaseCost || 0)
                +
                Number(kit.accessoriesCost || 0)
                +
                Number(kit.otherCost || 0)
                +
                Number(kit.transportCost || 0)
                +
                Number(kit.maintenanceCost || 0)

        }));

    const worksheet =
        XLSX.utils.json_to_sheet(rows);

    const workbook =
        XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Cost Report"
    );

    XLSX.writeFile(
        workbook,
        "DemoKit_Cost_Report.xlsx"
    );

}


function downloadLogsExcel() {

    if (
        typeof XLSX === "undefined"
    ) {

        showToast(
            "Excel library could not be loaded.",
            "error"
        );

        return;

    }

    const worksheet =
        XLSX.utils.json_to_sheet(logs);

    const workbook =
        XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Activity Logs"
    );

    XLSX.writeFile(
        workbook,
        "DemoKit_Activity_Logs.xlsx"
    );

}


/* =========================================================
   FORGOT PASSWORD
========================================================= */

function openForgotModal() {

    document
        .getElementById("forgotStep1")
        .classList.remove("hidden");

    document
        .getElementById("forgotStep2")
        .classList.add("hidden");

    document
        .getElementById("forgotEmail")
        .value = "";

    openModal("forgotModal");

}


function sendResetCode() {

    const email =
        document
            .getElementById("forgotEmail")
            .value
            .trim();

    const user =
        users.find(
            u =>
                u.email.toLowerCase() ===
                email.toLowerCase()
        );

    if (!user) {

        showToast(
            "Email address not found.",
            "error"
        );

        return;

    }

    resetEmail =
        user.email;

    resetOtp =
        String(
            Math.floor(
                100000
                +
                Math.random() * 900000
            )
        );

    document
        .getElementById("demoOtp")
        .textContent =
        resetOtp;

    document
        .getElementById("forgotStep1")
        .classList.add("hidden");

    document
        .getElementById("forgotStep2")
        .classList.remove("hidden");

}


function resetPassword() {

    const otp =
        document
            .getElementById("resetOtp")
            .value
            .trim();

    const password =
        document
            .getElementById("resetPassword")
            .value;

    const password2 =
        document
            .getElementById("resetPassword2")
            .value;

    if (otp !== resetOtp) {

        showToast(
            "Invalid OTP.",
            "error"
        );

        return;

    }

    if (
        password.length < 6
        ||
        password !== password2
    ) {

        showToast(
            "Passwords must match and contain at least 6 characters.",
            "error"
        );

        return;

    }

    const user =
        users.find(
            u =>
                u.email.toLowerCase()
                ===
                resetEmail.toLowerCase()
        );

    if (!user) {
        return;
    }

    user.password =
        password;

    addLog(
        "PASSWORD_RESET",
        null,
        `${user.id} reset their password.`
    );

    saveData();

    closeModal("forgotModal");

    showToast(
        "Password reset successfully.",
        "success"
    );

}


/* =========================================================
   TOAST
========================================================= */

function showToast(message, type = "success") {

    const container =
        document.getElementById("toastContainer");

    const toast =
        document.createElement("div");

    toast.className =
        `toast ${type}`;

    toast.textContent =
        message;

    container.appendChild(toast);

    setTimeout(() => {

        toast.remove();

    }, 3500);

}


/* =========================================================
   HELPER
========================================================= */

function setText(id, value) {

    const element =
        document.getElementById(id);

    if (element) {

        element.textContent =
            value;

    }

}


/* =========================================================
   RENDER ALL
========================================================= */

function renderAll() {

    cleanupExpiredBookings();

    setupUserInterface();

    renderDashboard();

    renderKits();

    renderRequests();

    renderUsers();

    renderCosts();

    renderLogs();

    renderBookingPage();

}


/* =========================================================
   FILTER EVENT LISTENERS
========================================================= */

[
    "searchInput",
    "regionFilter",
    "statusFilter",
    "categoryFilter"
].forEach(id => {

    const element =
        document.getElementById(id);

    if (element) {

        element.addEventListener(
            "input",
            renderKits
        );

        element.addEventListener(
            "change",
            renderKits
        );

    }

});


[
    "logSearch",
    "logActionFilter"
].forEach(id => {

    const element =
        document.getElementById(id);

    if (element) {

        element.addEventListener(
            "input",
            renderLogs
        );

        element.addEventListener(
            "change",
            renderLogs
        );

    }

});


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadData();

        const savedUser =
            JSON.parse(
                localStorage.getItem(
                    STORAGE.currentUser
                )
                || "null"
            );

        if (savedUser) {

            const actualUser =
                getUser(savedUser.id);

            if (
                actualUser
                &&
                actualUser.status === "ACTIVE"
            ) {

                currentUser =
                    actualUser;

                document
                    .getElementById("loginScreen")
                    .classList.add("hidden");

                document
                    .getElementById("appContent")
                    .classList.remove("hidden");

                setupUserInterface();

            }

        }

        const today =
            todayISO();

        const calendarFrom =
            document.getElementById("calendarFrom");

        const calendarTo =
            document.getElementById("calendarTo");

        if (calendarFrom) {

            calendarFrom.min =
                today;

            calendarFrom.value =
                addDays(today, 1);

        }

        if (calendarTo) {

            calendarTo.min =
                today;

            calendarTo.value =
                addDays(today, 3);

        }

        renderAll();

    }
);