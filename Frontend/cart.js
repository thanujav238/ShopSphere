// user
function getLoggedInUser() {

    const userData =
        localStorage.getItem("shopsphere_user");

    if (!userData) {
        return null;
    }

    return JSON.parse(userData);
}

async function loadCart() {

    const user = getLoggedInUser();

    if (!user) {
        window.location.href = "login.html";
        return;
    }


    const container = document.getElementById("cart-items");

    try {

        const response = await fetch(
            `${API_URL}/api/cart/${user.user_id}`
        );

        if (!response.ok) {
            throw new Error("Failed to load cart");
        }

        const data = await response.json();

        displayCart(data);

    } catch (error) {

        console.error(error);

        container.innerHTML = `
            <div class="cart-error">
                <i class="fa-solid fa-triangle-exclamation"></i>

                <h3>Unable to load cart</h3>

                <p>
                    Make sure the ShopSphere backend is running.
                </p>
            </div>
        `;
    }
}


function displayCart(data) {

    const container = document.getElementById("cart-items");

    const items = data.items || [];

    document.getElementById("cart-subtotal").textContent =
        `₹${Number(data.total).toLocaleString("en-IN")}`;

    document.getElementById("cart-total").textContent =
        `₹${Number(data.total).toLocaleString("en-IN")}`;

    document.getElementById("item-count").textContent =
        items.reduce((total, item) => total + item.quantity, 0);


    if (items.length === 0) {

        container.innerHTML = `
            <div class="empty-cart">

                <i class="fa-solid fa-cart-shopping"></i>

                <h2>Your cart is empty</h2>

                <p>
                    Looks like you haven't added anything yet.
                </p>

                <a href="index.html">
                    Start Shopping
                    <i class="fa-solid fa-arrow-right"></i>
                </a>

            </div>
        `;

        return;
    }


    container.innerHTML = "";

    items.forEach(item => {

        const cartItem = document.createElement("div");

        cartItem.className = "cart-item";

        cartItem.innerHTML = `

            <div class="cart-product-image">

                <i class="fa-solid fa-box"></i>

            </div>


            <div class="cart-product-info">

                <span>${item.brand}</span>

                <h3>${item.product_name}</h3>

                <p>
                    Sold by ${item.store_name}
                </p>

            </div>


            <div class="cart-quantity">

                <button onclick="changeQuantity(${item.cart_item_id}, -1)">
                    −
                </button>

                <strong>${item.quantity}</strong>

                <button onclick="changeQuantity(${item.cart_item_id}, 1)">
                    +
                </button>

            </div>


            <div class="cart-price">

                <strong>
                    ₹${Number(item.subtotal).toLocaleString("en-IN")}
                </strong>

                <small>
                    ₹${Number(item.price).toLocaleString("en-IN")} each
                </small>

            </div>


            <button
                class="remove-cart-item"
                onclick="removeItem(${item.cart_item_id})"
            >
                <i class="fa-solid fa-trash"></i>
            </button>

        `;

        container.appendChild(cartItem);

    });
}


async function changeQuantity(cartItemId, change) {

    try {

        const user = getLoggedInUser();

if (!user) {
    window.location.href = "login.html";
    return;
}

const response = await fetch(
    `${API_URL}/api/cart/${user.user_id}`
);

        const data = await response.json();

        const item = data.items.find(
            item => item.cart_item_id === cartItemId
        );

        if (!item) {
            return;
        }

        const newQuantity = item.quantity + change;

        if (newQuantity <= 0) {
            await removeItem(cartItemId);
            return;
        }

        const updateResponse = await fetch(
            `${API_URL}/api/cart/update`,
            {
                method: "PUT",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    cart_item_id: cartItemId,
                    quantity: newQuantity
                })
            }
        );

        if (!updateResponse.ok) {
            throw new Error("Failed to update quantity");
        }

        loadCart();

    } catch (error) {

        console.error(error);

        alert("❌ Could not update quantity.");
    }
}

async function removeItem(cartItemId) {

    try {

        const response = await fetch(
            `${API_URL}/api/cart/remove/${cartItemId}`,
            {
                method: "DELETE"
            }
        );

        if (!response.ok) {
            throw new Error("Failed to remove item");
        }

        loadCart();

    } catch (error) {

        console.error(error);

        alert("❌ Could not remove item.");
    }
}

const API_URL = "https://shopsphere-backend-4aji.onrender.com";
document.addEventListener(
    "DOMContentLoaded",
    loadCart
);
