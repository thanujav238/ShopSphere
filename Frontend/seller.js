const API_URL = "http://localhost:5000";


// ==========================================
// GET LOGGED-IN SELLER
// ==========================================

function getLoggedInSeller() {

    const userData =
        localStorage.getItem("shopsphere_user");

    if (!userData) {
        return null;
    }

    try {

        const user = JSON.parse(userData);

        if (
            user.role !== "seller" ||
            !user.seller_id
        ) {
            return null;
        }

        return user;

    } catch (error) {

        console.error(
            "Invalid seller data:",
            error
        );

        localStorage.removeItem(
            "shopsphere_user"
        );

        return null;
    }
}



// ==========================================
// LOAD SELLER DASHBOARD
// ==========================================

async function loadSellerDashboard() {

    const user = getLoggedInSeller();

    if (!user) {

        alert(
            "⚠️ Please sign in as a seller."
        );

        window.location.href =
            "login.html";

        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/api/seller/dashboard/${user.seller_id}`
            );


        if (!response.ok) {

            throw new Error(
                "Failed to load seller dashboard"
            );

        }


        const data =
            await response.json();


        // Store information
        if (data.store) {

            document.getElementById(
                "store-name"
            ).textContent =
                data.store.store_name ||
                "My Store";

        }


        // Dashboard statistics
        if (data.stats) {

            document.getElementById(
                "total-products"
            ).textContent =
                data.stats.total_products || 0;


            document.getElementById(
                "total-stock"
            ).textContent =
                data.stats.total_stock || 0;


            document.getElementById(
                "total-orders"
            ).textContent =
                data.stats.total_orders || 0;


            document.getElementById(
                "total-sales"
            ).textContent =
                `₹${Number(
                    data.stats.total_sales || 0
                ).toLocaleString("en-IN")}`;

        }


        // Inventory
        displayInventory(
            data.inventory || []
        );


        // Low stock products
        displayLowStock(
            data.low_stock || []
        );


        // Sales data
        displaySales(
            data.sales || []
        );


    } catch (error) {

        console.error(error);

        alert(
            `❌ ${error.message}`
        );

    }
}



// ==========================================
// DISPLAY INVENTORY
// ==========================================

function displayInventory(inventory) {

    const container =
        document.getElementById(
            "inventory-container"
        );


    if (!container) return;


    if (
        !inventory ||
        inventory.length === 0
    ) {

        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-box-open"></i>
                <p>No products found.</p>
            </div>
        `;

        return;
    }


    container.innerHTML = "";


    inventory.forEach(product => {

        const item =
            document.createElement("div");


        item.className =
            "inventory-item";


        item.innerHTML = `

            <div class="inventory-product">

                <strong>
                    ${product.product_name}
                </strong>

                <span>
                    ${product.brand || ""}
                </span>

            </div>


            <div class="inventory-category">

                ${product.category_name || "N/A"}

            </div>


            <div class="inventory-price">

                ₹${Number(
                    product.price || 0
                ).toLocaleString("en-IN")}

            </div>


            <div class="inventory-stock">

                ${product.quantity || 0}

            </div>

        `;


        container.appendChild(item);

    });
}



// ==========================================
// DISPLAY LOW STOCK PRODUCTS
// ==========================================

function displayLowStock(products) {

    const container =
        document.getElementById(
            "low-stock-container"
        );


    if (!container) return;


    if (
        !products ||
        products.length === 0
    ) {

        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-circle-check"></i>
                <p>No low-stock products.</p>
            </div>
        `;

        return;
    }


    container.innerHTML = "";


    products.forEach(product => {

        const item =
            document.createElement("div");


        item.className =
            "low-stock-item";


        item.innerHTML = `

            <div>

                <strong>
                    ${product.product_name}
                </strong>

                <span>
                    ${product.brand || ""}
                </span>

            </div>


            <strong>
                ${product.quantity || 0}
                left
            </strong>

        `;


        container.appendChild(item);

    });
}



// ==========================================
// DISPLAY SALES
// ==========================================

function displaySales(sales) {

    const container =
        document.getElementById(
            "sales-container"
        );


    if (!container) return;


    if (
        !sales ||
        sales.length === 0
    ) {

        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-chart-line"></i>
                <p>No sales data available.</p>
            </div>
        `;

        return;
    }


    container.innerHTML = "";


    sales.forEach(sale => {

        const item =
            document.createElement("div");


        item.className =
            "sales-item";


        item.innerHTML = `

            <div>

                <strong>
                    ${sale.product_name || "Product"}
                </strong>

            </div>


            <div>

                ${sale.quantity || 0} sold

            </div>


            <strong>

                ₹${Number(
                    sale.total_sales || 0
                ).toLocaleString("en-IN")}

            </strong>

        `;


        container.appendChild(item);

    });
}



// ==========================================
// ADD PRODUCT
// ==========================================

function openAddProductModal() {

    const modal =
        document.getElementById(
            "product-modal"
        );


    if (modal) {

        modal.style.display = "flex";

    }
}



function closeAddProductModal() {

    const modal =
        document.getElementById(
            "product-modal"
        );


    if (modal) {

        modal.style.display = "none";

    }
}



// ==========================================
// ADD PRODUCT FORM
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const form =
            document.getElementById(
                "add-product-form"
            );


        if (!form) return;


        form.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();


                const user =
                    getLoggedInSeller();


                if (!user) {

                    alert(
                        "⚠️ Please sign in as a seller."
                    );

                    window.location.href =
                        "login.html";

                    return;
                }


                const productData = {

                    seller_id:
                        user.seller_id,

                    product_name:
                        document.getElementById(
                            "product-name"
                        ).value.trim(),

                    category:
                        document.getElementById(
                            "product-category"
                        ).value.trim(),

                    brand:
                        document.getElementById(
                            "product-brand"
                        ).value.trim(),

                    description:
                        document.getElementById(
                            "product-description"
                        ).value.trim(),

                    price:
                        Number(
                            document.getElementById(
                                "product-price"
                            ).value
                        ),

                    quantity:
                        Number(
                            document.getElementById(
                                "product-quantity"
                            ).value
                        ),

                    reorder_level:
                        Number(
                            document.getElementById(
                                "product-reorder"
                            ).value
                        )

                };


                try {

                    const response =
                        await fetch(
                            `${API_URL}/api/seller/products`,
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify(
                                        productData
                                    )
                            }
                        );


                    const data =
                        await response.json();


                    if (!response.ok) {

                        throw new Error(
                            data.error ||
                            "Failed to add product"
                        );

                    }


                    alert(
                        "✅ Product added successfully!"
                    );


                    closeAddProductModal();


                    form.reset();


                    loadSellerDashboard();


                } catch (error) {

                    console.error(error);

                    alert(
                        `❌ ${error.message}`
                    );

                }

            }
        );

    }
);



// ==========================================
// EDIT PRODUCT
// ==========================================

function openEditProduct(product) {

    document.getElementById(
        "edit-product-id"
    ).value =
        product.product_id;


    document.getElementById(
        "edit-product-name"
    ).value =
        product.product_name || "";


    document.getElementById(
        "edit-product-category"
    ).value =
        product.category || "";


    document.getElementById(
        "edit-product-brand"
    ).value =
        product.brand || "";


    document.getElementById(
        "edit-product-description"
    ).value =
        product.description || "";


    document.getElementById(
        "edit-product-price"
    ).value =
        product.price || "";


    document.getElementById(
        "edit-product-quantity"
    ).value =
        product.quantity || 0;


    document.getElementById(
        "edit-product-reorder"
    ).value =
        product.reorder_level || 0;


    const modal =
        document.getElementById(
            "edit-product-modal"
        );


    if (modal) {

        modal.style.display = "flex";

    }
}



function closeEditProductModal() {

    const modal =
        document.getElementById(
            "edit-product-modal"
        );


    if (modal) {

        modal.style.display = "none";

    }
}



// ==========================================
// UPDATE PRODUCT
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const form =
            document.getElementById(
                "edit-product-form"
            );


        if (!form) return;


        form.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();


                const user =
                    getLoggedInSeller();


                if (!user) {

                    alert(
                        "⚠️ Please sign in as a seller."
                    );

                    window.location.href =
                        "login.html";

                    return;
                }


                const productId =
                    document.getElementById(
                        "edit-product-id"
                    ).value;


                const productData = {

                    product_name:
                        document.getElementById(
                            "edit-product-name"
                        ).value.trim(),

                    category:
                        document.getElementById(
                            "edit-product-category"
                        ).value.trim(),

                    brand:
                        document.getElementById(
                            "edit-product-brand"
                        ).value.trim(),

                    description:
                        document.getElementById(
                            "edit-product-description"
                        ).value.trim(),

                    price:
                        Number(
                            document.getElementById(
                                "edit-product-price"
                            ).value
                        ),

                    quantity:
                        Number(
                            document.getElementById(
                                "edit-product-quantity"
                            ).value
                        ),

                    reorder_level:
                        Number(
                            document.getElementById(
                                "edit-product-reorder"
                            ).value
                        )

                };


                try {

                    const response =
                        await fetch(
                            `${API_URL}/api/seller/products/${productId}`,
                            {
                                method: "PUT",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify(
                                        productData
                                    )
                            }
                        );


                    const data =
                        await response.json();


                    if (!response.ok) {

                        throw new Error(
                            data.error ||
                            "Failed to update product"
                        );

                    }


                    alert(
                        "✅ Product updated successfully!"
                    );


                    closeEditProductModal();


                    loadSellerDashboard();


                } catch (error) {

                    console.error(error);

                    alert(
                        `❌ ${error.message}`
                    );

                }

            }
        );

    }
);



// ==========================================
// DELETE PRODUCT
// ==========================================

async function deleteProduct(productId) {

    const user =
        getLoggedInSeller();


    if (!user) {

        alert(
            "⚠️ Please sign in as a seller."
        );

        window.location.href =
            "login.html";

        return;
    }


    const confirmed =
        confirm(
            "Are you sure you want to delete this product?"
        );


    if (!confirmed) return;


    try {

        const response =
            await fetch(
                `${API_URL}/api/seller/products/${productId}`,
                {
                    method: "DELETE"
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Failed to delete product"
            );

        }


        alert(
            "✅ Product deleted successfully!"
        );


        loadSellerDashboard();


    } catch (error) {

        console.error(error);

        alert(
            `❌ ${error.message}`
        );

    }
}



// ==========================================
// UPDATE INVENTORY
// ==========================================

async function updateInventory(
    productId,
    quantity
) {

    const user =
        getLoggedInSeller();


    if (!user) {

        alert(
            "⚠️ Please sign in as a seller."
        );

        window.location.href =
            "login.html";

        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/api/seller/inventory/${productId}`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        quantity:
                            Number(quantity)
                    })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Failed to update inventory"
            );

        }


        alert(
            "✅ Inventory updated successfully!"
        );


        loadSellerDashboard();


    } catch (error) {

        console.error(error);

        alert(
            `❌ ${error.message}`
        );

    }
}



// ==========================================
// LOAD SELLER ORDERS
// ==========================================

async function loadSellerOrders() {

    const user =
        getLoggedInSeller();


    if (!user) {

        alert(
            "⚠️ Please sign in as a seller."
        );

        window.location.href =
            "login.html";

        return;
    }


    const container =
        document.getElementById(
            "seller-orders-container"
        );


    try {

        const response =
            await fetch(
                `${API_URL}/api/seller/orders/${user.seller_id}`
            );


        if (!response.ok) {

            throw new Error(
                "Failed to load seller orders"
            );

        }


        const orders =
            await response.json();


        displaySellerOrders(
            orders,
            container
        );


    } catch (error) {

        console.error(error);


        if (container) {

            container.innerHTML = `

                <div class="orders-error">

                    <i class="fa-solid fa-triangle-exclamation"></i>

                    <p>
                        Unable to load seller orders.
                    </p>

                </div>

            `;

        }

    }
}



// ==========================================
// DISPLAY SELLER ORDERS
// ==========================================

function displaySellerOrders(
    orders,
    container
) {

    if (!container) return;


    if (
        !orders ||
        orders.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-state">

                <i class="fa-solid fa-box-open"></i>

                <p>
                    No orders yet.
                </p>

            </div>

        `;

        return;
    }


    container.innerHTML = "";


    orders.forEach(order => {

        const item =
            document.createElement("div");


        item.className =
            "seller-order-item";


        const status =
            (
                order.order_status ||
                "pending"
            ).toLowerCase();


        item.innerHTML = `

            <div>

                <strong>
                    Order #${order.order_id}
                </strong>

                <span>
                    ${order.product_name || "Product"}
                </span>

            </div>


            <div>

                Qty:
                ${order.quantity || 0}

            </div>


            <div>

                ₹${Number(
                    order.subtotal ||
                    0
                ).toLocaleString("en-IN")}

            </div>


            <div>

                <select
                    onchange="updateOrderStatus(
                        ${order.order_id},
                        this.value
                    )"
                >

                    <option
                        value="pending"
                        ${status === "pending" ? "selected" : ""}
                    >
                        Pending
                    </option>

                    <option
                        value="confirmed"
                        ${status === "confirmed" ? "selected" : ""}
                    >
                        Confirmed
                    </option>

                    <option
                        value="shipped"
                        ${status === "shipped" ? "selected" : ""}
                    >
                        Shipped
                    </option>

                    <option
                        value="delivered"
                        ${status === "delivered" ? "selected" : ""}
                    >
                        Delivered
                    </option>

                    <option
                        value="cancelled"
                        ${status === "cancelled" ? "selected" : ""}
                    >
                        Cancelled
                    </option>

                </select>

            </div>

        `;


        container.appendChild(item);

    });
}



// ==========================================
// UPDATE ORDER STATUS
// ==========================================

async function updateOrderStatus(
    orderId,
    status
) {

    const user =
        getLoggedInSeller();


    if (!user) {

        alert(
            "⚠️ Please sign in as a seller."
        );

        window.location.href =
            "login.html";

        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/api/seller/orders/${orderId}/status`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        status: status
                    })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Failed to update order status"
            );

        }


        alert(
            "✅ Order status updated!"
        );


        loadSellerOrders();


    } catch (error) {

        console.error(error);

        alert(
            `❌ ${error.message}`
        );

    }
}



// ==========================================
// CLOSE MODALS WHEN CLICKING OUTSIDE
// ==========================================

window.addEventListener(
    "click",
    (event) => {

        const addModal =
            document.getElementById(
                "product-modal"
            );

        const editModal =
            document.getElementById(
                "edit-product-modal"
            );


        if (
            event.target === addModal
        ) {

            addModal.style.display =
                "none";

        }


        if (
            event.target === editModal
        ) {

            editModal.style.display =
                "none";

        }

    }
);



// ==========================================
// LOAD SELLER PAGE
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const user =
            getLoggedInSeller();


        if (!user) {

            alert(
                "⚠️ Please sign in as a seller."
            );

            window.location.href =
                "login.html";

            return;
        }


        loadSellerDashboard();

        loadSellerOrders();

    }
);