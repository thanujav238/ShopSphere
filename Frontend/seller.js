const API_URL =
    "https://shopsphere-backend-4aji.onrender.com";


// ============================================================
// GET LOGGED-IN SELLER
// ============================================================

function getLoggedInSeller() {

    const userData =
        localStorage.getItem("shopsphere_user");

    if (!userData) {
        return null;
    }

    try {

        const user =
            JSON.parse(userData);

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


// ============================================================
// PRODUCT IMAGE HELPER
// ============================================================

function getProductImage(productName) {

    const name =
        String(productName || "").toLowerCase();

    if (name.includes("headphone")) {
        return "images/wireless-headphones.jpg";
    }

    if (name.includes("watch")) {
        return "images/smartwatch.jpg";
    }

    if (name.includes("mouse")) {
        return "images/gaming-mouse.jpg";
    }

    if (
        name.includes("hoodie") ||
        name.includes("shirt")
    ) {
        return "images/oversized-hoodie.jpg";
    }

    if (
        name.includes("sneaker") ||
        name.includes("shoe")
    ) {
        return "images/classic-sneakers.jpg";
    }

    if (
        name.includes("organizer") ||
        name.includes("storage")
    ) {
        return "images/storage-organizer.jpg";
    }

    if (name.includes("lamp")) {
        return "images/table-lamp.jpg";
    }

    return "images/wireless-headphones.jpg";
}


// ============================================================
// LOAD SELLER DASHBOARD
// ============================================================

async function loadSellerDashboard() {

    const user =
        getLoggedInSeller();

    if (!user) {

        alert(
            "Please sign in as a seller."
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
                "Failed to load seller dashboard."
            );
        }

        const data =
            await response.json();


        // ====================================================
        // STORE
        // ====================================================

        const storeName =
            document.getElementById(
                "store-name"
            );

        if (
            storeName &&
            data.seller
        ) {

            storeName.textContent =
                data.seller.store_name ||
                "My Store";
        }


        // ====================================================
        // STATISTICS
        // ====================================================

        const stats =
            data.statistics || {};

        const totalProducts =
            document.getElementById(
                "total-products"
            );

        const totalStock =
            document.getElementById(
                "total-stock"
            );

        const totalOrders =
            document.getElementById(
                "total-orders"
            );

        const totalSales =
            document.getElementById(
                "total-sales"
            );


        if (totalProducts) {

            totalProducts.textContent =
                Number(
                    stats.total_products || 0
                );
        }


        if (totalStock) {

            totalStock.textContent =
                Number(
                    stats.total_stock || 0
                ).toLocaleString("en-IN");
        }


        if (totalOrders) {

            totalOrders.textContent =
                Number(
                    stats.total_orders || 0
                ).toLocaleString("en-IN");
        }


        if (totalSales) {

            totalSales.textContent =
                `₹${Number(
                    stats.total_sales || 0
                ).toLocaleString("en-IN")}`;
        }


        // ====================================================
        // INVENTORY
        // ====================================================

        displayInventory(
            data.inventory || []
        );


        // ====================================================
        // SALES
        // ====================================================

        displaySalesSummary(
            stats
        );

    } catch (error) {

        console.error(
            "Dashboard error:",
            error
        );


        const inventory =
            document.getElementById(
                "inventory-container"
            );

        if (inventory) {

            inventory.innerHTML = `

                <div class="empty-state">

                    <i class="fa-solid fa-triangle-exclamation"></i>

                    <p>
                        Unable to load inventory.
                    </p>

                </div>

            `;
        }
    }
}


// ============================================================
// DISPLAY INVENTORY
// ============================================================

function displayInventory(inventory) {

    const container =
        document.getElementById(
            "inventory-container"
        );

    if (!container) {
        return;
    }


    if (
        !inventory ||
        inventory.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-state">

                <i class="fa-solid fa-box-open"></i>

                <p>
                    No products found.
                </p>

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


        const image =
            getProductImage(
                product.product_name
            );


        const quantity =
            Number(
                product.quantity || 0
            );


        item.innerHTML = `

            <div class="inventory-product">

                <img
                    src="${image}"
                    alt="${escapeHTML(
                        product.product_name
                    )}"
                    class="inventory-product-image"
                    onerror="this.style.display='none'"
                >

                <div class="inventory-product-info">

                    <strong>
                        ${escapeHTML(
                            product.product_name
                        )}
                    </strong>

                    <span>
                        ${escapeHTML(
                            product.brand ||
                            "ShopSphere"
                        )}
                    </span>

                </div>

            </div>


            <div class="inventory-category">

                ${escapeHTML(
                    product.category_name ||
                    "N/A"
                )}

            </div>


            <div class="inventory-price">

                ₹${Number(
                    product.price || 0
                ).toLocaleString("en-IN")}

            </div>


            <div>

                <span class="inventory-stock">

                    ${quantity}

                </span>

            </div>


            <div class="inventory-actions">

                <button
                    class="inventory-edit-btn"
                    type="button"
                    title="Edit Product"
                    onclick='openEditProduct(${JSON.stringify(product).replace(/'/g, "&#39;")})'
                >

                    <i class="fa-solid fa-pen"></i>

                </button>


                <button
                    class="inventory-delete-btn"
                    type="button"
                    title="Delete Product"
                    onclick="deleteProduct(${Number(product.product_id)})"
                >

                    <i class="fa-solid fa-trash"></i>

                </button>

            </div>

        `;


        container.appendChild(item);

    });
}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHTML(value) {

    return String(value || "")

        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ============================================================
// SALES SUMMARY
// ============================================================

function displaySalesSummary(stats) {

    const container =
        document.getElementById(
            "sales-container"
        );

    if (!container) {
        return;
    }


    const totalSales =
        Number(
            stats.total_sales || 0
        );


    const totalOrders =
        Number(
            stats.total_orders || 0
        );


    container.innerHTML = `

        <div class="sales-item">

            <div>

                <strong>
                    Total Revenue
                </strong>

            </div>

            <div>
                ${totalOrders} orders
            </div>

            <strong>
                ₹${totalSales.toLocaleString("en-IN")}
            </strong>

        </div>


        <div class="sales-item">

            <div>

                <strong>
                    Average Order Value
                </strong>

            </div>

            <div>
                Based on completed orders
            </div>

            <strong>

                ₹${(
                    totalOrders > 0
                        ? totalSales / totalOrders
                        : 0
                ).toLocaleString(
                    "en-IN",
                    {
                        maximumFractionDigits: 0
                    }
                )}

            </strong>

        </div>

    `;
}


// ============================================================
// ADD PRODUCT MODAL
// ============================================================

function openAddProductModal() {

    const modal =
        document.getElementById(
            "product-modal"
        );

    if (modal) {

        modal.style.display =
            "flex";
    }
}


function closeProductModal() {

    const modal =
        document.getElementById(
            "product-modal"
        );

    if (modal) {

        modal.style.display =
            "none";
    }
}


// Backward compatibility
function closeAddProductModal() {

    closeProductModal();
}


// ============================================================
// ADD PRODUCT
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const form =
            document.getElementById(
                "add-product-form"
            );

        if (!form) {
            return;
        }


        form.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                const user =
                    getLoggedInSeller();


                if (!user) {

                    alert(
                        "Please sign in as a seller."
                    );

                    window.location.href =
                        "login.html";

                    return;
                }


                const productData = {

                    seller_id:
                        user.seller_id,

                    category_id:
                        Number(
                            document.getElementById(
                                "product-category"
                            ).value
                        ),

                    product_name:
                        document.getElementById(
                            "product-name"
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
                            "Failed to add product."
                        );
                    }


                    alert(
                        "Product added successfully!"
                    );


                    closeProductModal();


                    form.reset();


                    loadSellerDashboard();

                } catch (error) {

                    console.error(
                        "Add product error:",
                        error
                    );

                    alert(
                        error.message
                    );
                }

            }
        );

    }
);


// ============================================================
// EDIT PRODUCT
// ============================================================

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
        product.category_id ||
        product.category ||
        "1";


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

        modal.style.display =
            "flex";
    }
}


function closeEditProductModal() {

    const modal =
        document.getElementById(
            "edit-product-modal"
        );


    if (modal) {

        modal.style.display =
            "none";
    }
}


// ============================================================
// UPDATE PRODUCT
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const form =
            document.getElementById(
                "edit-product-form"
            );

        if (!form) {
            return;
        }


        form.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                const user =
                    getLoggedInSeller();


                if (!user) {

                    alert(
                        "Please sign in as a seller."
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

                    category_id:
                        Number(
                            document.getElementById(
                                "edit-product-category"
                            ).value
                        ),

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
                        )
                };


                const quantity =
                    Number(
                        document.getElementById(
                            "edit-product-quantity"
                        ).value
                    );


                const reorderLevel =
                    Number(
                        document.getElementById(
                            "edit-product-reorder"
                        ).value
                    );


                try {

                    // =================================================
                    // UPDATE PRODUCT DETAILS
                    // =================================================

                    const productResponse =
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


                    const productResult =
                        await productResponse.json();


                    if (!productResponse.ok) {

                        throw new Error(
                            productResult.error ||
                            "Failed to update product."
                        );
                    }


                    // =================================================
                    // UPDATE INVENTORY
                    // =================================================

                    const inventoryResponse =
                        await fetch(
                            `${API_URL}/api/seller/inventory/${productId}`,
                            {
                                method: "PUT",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify({

                                        quantity:
                                            quantity,

                                        reorder_level:
                                            reorderLevel

                                    })
                            }
                        );


                    const inventoryResult =
                        await inventoryResponse.json();


                    if (!inventoryResponse.ok) {

                        throw new Error(
                            inventoryResult.error ||
                            "Product updated but stock could not be updated."
                        );
                    }


                    alert(
                        "Product updated successfully!"
                    );


                    closeEditProductModal();


                    loadSellerDashboard();


                } catch (error) {

                    console.error(
                        "Update product error:",
                        error
                    );


                    alert(
                        error.message
                    );
                }

            }
        );

    }
);


// ============================================================
// DELETE PRODUCT
// ============================================================

async function deleteProduct(productId) {

    const user =
        getLoggedInSeller();


    if (!user) {

        alert(
            "Please sign in as a seller."
        );

        window.location.href =
            "login.html";

        return;
    }


    const confirmed =
        confirm(
            "Are you sure you want to delete this product?"
        );


    if (!confirmed) {
        return;
    }


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
                "Failed to delete product."
            );
        }


        alert(
            "Product deleted successfully!"
        );


        loadSellerDashboard();


    } catch (error) {

        console.error(
            "Delete product error:",
            error
        );


        alert(
            error.message
        );
    }
}


// ============================================================
// UPDATE INVENTORY
// ============================================================

async function updateInventory(
    productId,
    quantity,
    reorderLevel = 5
) {

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

                    body:
                        JSON.stringify({

                            quantity:
                                Number(quantity),

                            reorder_level:
                                Number(reorderLevel)

                        })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Failed to update inventory."
            );
        }


        loadSellerDashboard();


    } catch (error) {

        console.error(
            "Inventory update error:",
            error
        );


        alert(
            error.message
        );
    }
}


// ============================================================
// LOAD SELLER ORDERS
// ============================================================

async function loadSellerOrders() {

    const user =
        getLoggedInSeller();


    if (!user) {
        return;
    }


    const container =
        document.getElementById(
            "seller-orders-container"
        );


    if (!container) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/api/seller/orders/${user.seller_id}`
            );


        if (!response.ok) {

            throw new Error(
                "Failed to load seller orders."
            );
        }


        const orders =
            await response.json();


        displaySellerOrders(
            orders,
            container
        );


    } catch (error) {

        console.error(
            "Orders error:",
            error
        );


        container.innerHTML = `

            <div class="empty-state">

                <i class="fa-solid fa-triangle-exclamation"></i>

                <p>
                    Unable to load orders.
                </p>

            </div>

        `;
    }
}


// ============================================================
// DISPLAY SELLER ORDERS
// ============================================================

function displaySellerOrders(
    orders,
    container
) {

    if (!container) {
        return;
    }


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


    orders
        .slice(0, 6)
        .forEach(order => {

            const item =
                document.createElement("div");


            item.className =
                "seller-order-item";


            const status =
                String(
                    order.order_status ||
                    "pending"
                ).toLowerCase();


            const amount =
                Number(
                    order.total_amount ||
                    order.unit_price ||
                    0
                );


            item.innerHTML = `

                <div class="seller-order-info">

                    <strong>
                        #${order.order_id}
                    </strong>

                    <span>
                        ${escapeHTML(
                            order.product_name ||
                            "Product"
                        )}
                    </span>

                    <small>
                        ${escapeHTML(
                            order.customer_name ||
                            "Customer"
                        )}
                    </small>

                </div>


                <div class="seller-order-price">

                    ₹${amount.toLocaleString("en-IN")}

                </div>


                <div class="seller-order-status">

                    <select
                        onchange="updateOrderStatus(
                            ${Number(order.order_id)},
                            this.value
                        )"
                    >

                        <option
                            value="pending"
                            ${status === "pending"
                                ? "selected"
                                : ""}
                        >
                            Pending
                        </option>


                        <option
                            value="confirmed"
                            ${status === "confirmed"
                                ? "selected"
                                : ""}
                        >
                            Confirmed
                        </option>


                        <option
                            value="shipped"
                            ${status === "shipped"
                                ? "selected"
                                : ""}
                        >
                            Shipped
                        </option>


                        <option
                            value="delivered"
                            ${status === "delivered"
                                ? "selected"
                                : ""}
                        >
                            Delivered
                        </option>


                        <option
                            value="cancelled"
                            ${status === "cancelled"
                                ? "selected"
                                : ""}
                        >
                            Cancelled
                        </option>

                    </select>

                </div>

            `;


            container.appendChild(item);

        });
}


// ============================================================
// UPDATE ORDER STATUS
// ============================================================

async function updateOrderStatus(
    orderId,
    status
) {

    const user =
        getLoggedInSeller();


    if (!user) {
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

                    body:
                        JSON.stringify({

                            order_status:
                                status

                        })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Failed to update order status."
            );
        }


        loadSellerOrders();


    } catch (error) {

        console.error(
            "Order status error:",
            error
        );


        alert(
            error.message
        );
    }
}


// ============================================================
// CLOSE MODALS WHEN CLICKING OUTSIDE
// ============================================================

window.addEventListener(
    "click",
    event => {

        const addModal =
            document.getElementById(
                "product-modal"
            );


        const editModal =
            document.getElementById(
                "edit-product-modal"
            );


        if (
            addModal &&
            event.target === addModal
        ) {

            closeProductModal();
        }


        if (
            editModal &&
            event.target === editModal
        ) {

            closeEditProductModal();
        }

    }
);


// ============================================================
// LOGOUT
// ============================================================

function logoutSeller() {

    // Remove the actual ShopSphere login session.
    localStorage.removeItem(
        "shopsphere_user"
    );

    // Remove older login keys too.
    localStorage.removeItem(
        "sellerId"
    );

    localStorage.removeItem(
        "userId"
    );

    localStorage.removeItem(
        "user"
    );

    localStorage.removeItem(
        "seller"
    );


    // Go back to login page.
    window.location.href =
        "login.html";
}


// ============================================================
// LOAD PAGE
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const user =
            getLoggedInSeller();


        if (!user) {

            alert(
                "Please sign in as a seller."
            );

            window.location.href =
                "login.html";

            return;
        }


        loadSellerDashboard();

        loadSellerOrders();

    }
);