const API_URL = "https://shopsphere-backend-4aji.onrender.com";


/* =========================================
   GET LOGGED-IN USER
========================================= */

function getLoggedInUser() {

    const userData = localStorage.getItem("shopsphere_user");

    if (!userData) {
        return null;
    }

    try {

        return JSON.parse(userData);

    } catch (error) {

        console.error("Invalid user data:", error);

        localStorage.removeItem("shopsphere_user");

        return null;
    }
}


/* =========================================
   CHECK LOGIN
========================================= */

function checkLogin() {

    const user = getLoggedInUser();

    if (!user) {

        alert("⚠️ Please sign in to view your orders.");

        window.location.href = "login.html";

        return null;
    }

    return user;
}


/* =========================================
   ORDER STATUS LEVEL
========================================= */

function isStatusAtLeast(status, targetStatus) {

    const levels = {

        pending: 0,
        confirmed: 1,
        shipped: 2,
        delivered: 3,
        cancelled: 0

    };

    const current =
        levels[(status || "pending").toLowerCase()] ?? 0;

    const target =
        levels[(targetStatus || "pending").toLowerCase()] ?? 0;

    return current >= target;
}


/* =========================================
   LOAD ORDERS
========================================= */

async function loadOrders() {

    const user = checkLogin();

    if (!user) {
        return;
    }

    const container =
        document.getElementById("orders-container");

    if (!container) {
        console.error("orders-container not found.");
        return;
    }


    container.innerHTML = `
        <div class="loading">
            <i class="fa-solid fa-spinner fa-spin"></i>
            Loading your orders...
        </div>
    `;


    try {

        const response = await fetch(
            `${API_URL}/api/orders/${user.user_id}`
        );


        if (!response.ok) {

            const errorData = await response.json().catch(() => ({}));

            throw new Error(
                errorData.error || "Failed to load orders."
            );
        }


        const orders = await response.json();


        if (!orders || orders.length === 0) {

            container.innerHTML = `
                <div class="empty-orders">

                    <i class="fa-solid fa-box-open"></i>

                    <h3>No orders yet</h3>

                    <p>
                        You haven't placed any orders yet.
                    </p>

                    <button
                        type="button"
                        onclick="window.location.href='index.html'"
                    >
                        Start Shopping
                    </button>

                </div>
            `;

            return;
        }


        displayOrders(orders);


    } catch (error) {

        console.error("Error loading orders:", error);

        container.innerHTML = `
            <div class="orders-error">

                <i class="fa-solid fa-triangle-exclamation"></i>

                <h3>Unable to load orders</h3>

                <p>
                    ${error.message}
                </p>

                <button
                    type="button"
                    onclick="loadOrders()"
                >
                    Try Again
                </button>

            </div>
        `;
    }
}


/* =========================================
   DISPLAY ORDERS
========================================= */

function displayOrders(orders) {

    const container =
        document.getElementById("orders-container");


    /*
       Group database rows by order_id.

       One order can contain multiple products.
    */

    const groupedOrders = {};


    orders.forEach(order => {

        if (!groupedOrders[order.order_id]) {

            groupedOrders[order.order_id] = {

                order_id: order.order_id,

                order_date: order.order_date,

                order_status: order.order_status,

                tracking_number: order.tracking_number,

                payment_method: order.payment_method,

                payment_status: order.payment_status,

                total_amount: order.total_amount,

                products: []

            };
        }


        groupedOrders[order.order_id].products.push({

            product_id: order.product_id,

            product_name: order.product_name,

            quantity: order.quantity,

            price: order.price,

            brand: order.brand,

            category: order.category

        });

    });


    const orderList =
        Object.values(groupedOrders);


    let html = "";


    orderList.forEach(order => {

        const status =
            (order.order_status || "pending").toLowerCase();


        let statusClass = status;

        let productsHTML = "";


        /* =====================================
           PRODUCTS INSIDE ORDER
        ===================================== */

        order.products.forEach(item => {

            /*
               Return and Review are primarily
               available after delivery.
            */

            let actionButtons = "";


            if (status === "delivered") {

                actionButtons = `
                    <div class="order-actions">

                        <button
                            type="button"
                            onclick="goToReturn(
                                ${order.order_id},
                                ${item.product_id}
                            )"
                        >
                            <i class="fa-solid fa-rotate-left"></i>
                            Return Product
                        </button>

                        <button
                            type="button"
                            onclick="goToReview(
                                ${item.product_id}
                            )"
                        >
                            <i class="fa-solid fa-star"></i>
                            Write Review
                        </button>

                    </div>
                `;
            }


            productsHTML += `

                <div class="order-product">

                    <div class="order-product-info">

                        <h4>
                            ${item.product_name || "Product"}
                        </h4>

                        ${
                            item.brand
                            ? `<p>Brand: ${item.brand}</p>`
                            : ""
                        }

                        ${
                            item.category
                            ? `<p>Category: ${item.category}</p>`
                            : ""
                        }

                        <p>
                            Quantity:
                            ${item.quantity}
                        </p>

                    </div>


                    <div class="order-product-price">

                        ₹${Number(item.price || 0).toFixed(2)}

                    </div>

                    ${actionButtons}

                </div>

            `;
        });


        /* =====================================
           ORDER CARD
        ===================================== */

        html += `

            <div class="order-card">

                <div class="order-header">

                    <div>

                        <h3>
                            Order #${order.order_id}
                        </h3>

                        <p>
                            ${
                                order.order_date
                                    ? new Date(
                                        order.order_date
                                      ).toLocaleDateString(
                                        "en-IN",
                                        {
                                            day: "2-digit",
                                            month: "short",
                                            year: "numeric"
                                        }
                                      )
                                    : ""
                            }
                        </p>

                    </div>


                    <span class="order-status ${statusClass}">
                        ${formatStatus(status)}
                    </span>

                </div>


                <div class="order-products">

                    ${productsHTML}

                </div>


                <div class="order-footer">

                    <div class="order-payment">

                        ${
                            order.payment_method
                                ? `
                                    <span>
                                        <strong>Payment:</strong>
                                        ${formatPaymentMethod(
                                            order.payment_method
                                        )}
                                    </span>
                                `
                                : ""
                        }

                        ${
                            order.payment_status
                                ? `
                                    <span>
                                        <strong>Payment Status:</strong>
                                        ${formatStatus(
                                            order.payment_status
                                        )}
                                    </span>
                                `
                                : ""
                        }

                        ${
                            order.tracking_number
                                ? `
                                    <span>
                                        <strong>Tracking:</strong>
                                        ${order.tracking_number}
                                    </span>
                                `
                                : ""
                        }

                    </div>


                    <div class="order-total">

                        <span>Total</span>

                        <strong>
                            ₹${Number(
                                order.total_amount || 0
                            ).toFixed(2)}
                        </strong>

                    </div>

                </div>

            </div>

        `;
    });


    container.innerHTML = html;
}


/* =========================================
   GO TO RETURNS
========================================= */

function goToReturn(orderId, productId) {

    if (!orderId || !productId) {

        alert("Unable to identify this order or product.");

        return;
    }


    window.location.href =
        `returns.html?order_id=${encodeURIComponent(orderId)}&product_id=${encodeURIComponent(productId)}`;
}


/* =========================================
   GO TO REVIEWS
========================================= */

function goToReview(productId) {

    if (!productId) {

        alert("Unable to identify this product.");

        return;
    }


    window.location.href =
        `reviews.html?product_id=${encodeURIComponent(productId)}`;
}


/* =========================================
   FORMAT ORDER STATUS
========================================= */

function formatStatus(status) {

    if (!status) {
        return "Pending";
    }


    return status
        .toString()
        .replace(/_/g, " ")
        .replace(/\b\w/g, letter =>
            letter.toUpperCase()
        );
}


/* =========================================
   FORMAT PAYMENT METHOD
========================================= */

function formatPaymentMethod(method) {

    if (!method) {
        return "Not specified";
    }


    const methods = {

        upi: "UPI",

        card: "Card",

        net_banking: "Net Banking",

        cod: "Cash on Delivery"

    };


    const key =
        method.toString().toLowerCase();


    return methods[key] || formatStatus(method);
}


/* =========================================
   PAGE LOAD
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    loadOrders
);
