const API_URL = "https://shopsphere-backend-4aji.onrender.com";


// ==================================================
// LOAD PRODUCTS
// ==================================================

async function loadProducts() {

    const container =
        document.getElementById("products-container");

    container.innerHTML = `
        <div class="loading">
            <i class="fa-solid fa-spinner fa-spin"></i>
            Loading products...
        </div>
    `;

    try {

        const response =
            await fetch(`${API_URL}/api/products`);

        if (!response.ok) {
            throw new Error("Failed to load products");
        }

        const products =
            await response.json();

        container.innerHTML = "";


        products.forEach(product => {

            const card =
                document.createElement("div");

            card.className = "product-card";


            card.innerHTML = `

                <div class="product-image">

                    <i class="fa-solid fa-box"></i>

                    <span class="product-category">
                        ${product.category_name}
                    </span>

                </div>


                <div class="product-info">

                    <span class="product-brand">
                        ${product.brand || "ShopSphere"}
                    </span>

                    <h3>
                        ${product.product_name}
                    </h3>

                    <p>
                        ${product.description || ""}
                    </p>


                    <div class="product-meta">

                        <strong>
                            ₹${Number(product.price)
                                .toLocaleString("en-IN")}
                        </strong>

                        <span>
                            ${product.quantity} in stock
                        </span>

                    </div>


                    <div class="product-seller">

                        <i class="fa-solid fa-store"></i>

                        ${product.store_name}

                    </div>


                    <!-- ADD TO CART -->

                    <button
                        class="add-cart-btn"
                        onclick="addToCart(${product.product_id})"
                        type="button"
                    >

                        <i class="fa-solid fa-cart-shopping"></i>

                        Add to Cart

                    </button>


                    <!-- WISHLIST -->

                    <button
                        class="wishlist-btn"
                        onclick="addToWishlist(${product.product_id})"
                        type="button"
                    >

                        <i class="fa-solid fa-heart"></i>

                        Wishlist

                    </button>

                </div>
            `;


            container.appendChild(card);

        });


    } catch (error) {

        console.error(error);

        container.innerHTML = `

            <div class="error-message">

                <i class="fa-solid fa-triangle-exclamation"></i>

                <h3>
                    Unable to load products
                </h3>

                <p>
                    Make sure the ShopSphere backend is running.
                </p>

            </div>

        `;
    }
}


// ==================================================
// ADD TO CART
// ==================================================

async function addToCart(productId) {

    const user = JSON.parse(
        localStorage.getItem("shopsphere_user")
    );

    if (!user) {
        alert("⚠️ Please sign in first.");
        window.location.href = "login.html";
        return;
    }

    try {

        const response = await fetch(
            `${API_URL}/api/cart/add`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    user_id: user.user_id,
                    product_id: Number(productId),
                    quantity: 1
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error ||
                "Could not add product to cart"
            );
        }

        alert("✅ Product added to cart!");

    } catch (error) {

        console.error(error);

        alert(`❌ ${error.message}`);
    }
}

// ==================================================
// ADD TO WISHLIST
// ==================================================

async function addToWishlist(productId) {

    const user = JSON.parse(
        localStorage.getItem("shopsphere_user")
    );

    if (!user) {
        alert("⚠️ Please sign in first.");
        window.location.href = "login.html";
        return;
    }

    try {

        const response = await fetch(
            `${API_URL}/api/wishlist`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    user_id: user.user_id,
                    product_id: Number(productId)
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error ||
                "Could not add product to wishlist"
            );
        }

        alert("❤️ Product added to wishlist!");

    } catch (error) {

        console.error(error);

        alert(`❌ ${error.message}`);
    }
}

// ==================================================
// START
// ==================================================

document.addEventListener(
    "DOMContentLoaded",
    loadProducts
);

function handleAccountButton() {
    const userData = localStorage.getItem("shopsphere_user");

    if (!userData) {
        window.location.href = "login.html";
        return;
    }

    const user = JSON.parse(userData);

    if (user.role === "customer") {
        window.location.href = "orders.html";
    } else if (user.role === "seller") {
        window.location.href = "seller.html";
    } else if (user.role === "admin") {
        window.location.href = "admin.html";
    }
}
document.addEventListener("DOMContentLoaded", () => {
    const accountBtn = document.getElementById("account-btn");

    if (!accountBtn) return;

    const userData = localStorage.getItem("shopsphere_user");

    if (!userData) {
        accountBtn.textContent = "Sign In";
        return;
    }

    try {
        const user = JSON.parse(userData);

        if (user.role === "customer") {
            accountBtn.textContent = "My Orders";
        } else if (user.role === "seller") {
            accountBtn.textContent = "Seller Dashboard";
        } else if (user.role === "admin") {
            accountBtn.textContent = "Admin Dashboard";
        }

    } catch (error) {
        localStorage.removeItem("shopsphere_user");
        accountBtn.textContent = "Sign In";
    }
});

async function updateHeaderCounts() {
    const userData = localStorage.getItem("shopsphere_user");

    const wishlistBadge = document.getElementById("wishlist-count");
    const cartBadge = document.getElementById("cart-count");

    if (!wishlistBadge || !cartBadge) return;

    // Hide badges when nobody is logged in
    if (!userData) {
        wishlistBadge.style.display = "none";
        cartBadge.style.display = "none";
        return;
    }

    try {
        const user = JSON.parse(userData);

        if (!user.user_id) return;

        // Get wishlist
        const wishlistResponse = await fetch(
            `${API_URL}/api/wishlist/${user.user_id}`
        );

        const wishlist = await wishlistResponse.json();

        // Get cart
        const cartResponse = await fetch(
            `${API_URL}/api/cart/${user.user_id}`
        );

        const cart = await cartResponse.json();

        // Wishlist = number of products
        const wishlistCount = Array.isArray(wishlist)
            ? wishlist.length
            : 0;

        // Cart = total quantity
        const cartCount = Array.isArray(cart)
            ? cart.reduce((total, item) => {
                return total + Number(item.quantity || 0);
            }, 0)
            : 0;

        updateBadge(wishlistBadge, wishlistCount);
        updateBadge(cartBadge, cartCount);

    } catch (error) {
        console.error("Unable to load cart/wishlist counts:", error);

        wishlistBadge.style.display = "none";
        cartBadge.style.display = "none";
    }
}


function updateBadge(badge, count) {

    if (count > 0) {
        badge.textContent = count > 99 ? "99+" : count;
        badge.style.display = "flex";
    } else {
        badge.style.display = "none";
    }
}


document.addEventListener("DOMContentLoaded", () => {
    updateHeaderCounts();
});
