const API_URL = "https://shopsphere-backend-4aji.onrender.com";


// Get logged-in user
function getLoggedInUser() {

    const userData =
        localStorage.getItem("shopsphere_user");

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


// Load cart when checkout page opens
async function loadCheckout() {

    const user = getLoggedInUser();

    // User is not logged in
    if (!user) {

        alert("⚠️ Please sign in first.");

        window.location.href = "login.html";

        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/api/cart/${user.user_id}`
            );


        if (!response.ok) {

            throw new Error(
                "Failed to load cart"
            );

        }


        const data =
            await response.json();


        displayCheckout(data);


    } catch (error) {

        console.error(error);


        document.getElementById(
            "checkout-items"
        ).innerHTML = `

            <div class="checkout-error">

                <i class="fa-solid fa-triangle-exclamation"></i>

                <p>
                    Unable to load your cart.
                </p>

            </div>

        `;
    }
}



// Display cart items
function displayCheckout(data) {

    const container =
        document.getElementById(
            "checkout-items"
        );


    const items =
        data.items || [];


    const itemCount =
        items.reduce(
            (total, item) =>
                total + item.quantity,
            0
        );


    // Item count
    document.getElementById(
        "checkout-item-count"
    ).textContent =
        `${itemCount} item${itemCount !== 1 ? "s" : ""}`;


    // Subtotal
    document.getElementById(
        "checkout-subtotal"
    ).textContent =
        `₹${Number(data.total).toLocaleString("en-IN")}`;


    // Total
    document.getElementById(
        "checkout-total"
    ).textContent =
        `₹${Number(data.total).toLocaleString("en-IN")}`;


    // Empty cart
    if (items.length === 0) {

        container.innerHTML = `

            <div class="checkout-empty">

                <i class="fa-solid fa-cart-shopping"></i>

                <h3>
                    Your cart is empty
                </h3>

                <p>
                    Add some products before checking out.
                </p>

                <a href="index.html">
                    Start Shopping
                </a>

            </div>

        `;

        return;
    }


    // Display products
    container.innerHTML = "";


    items.forEach(item => {

        const itemElement =
            document.createElement("div");


        itemElement.className =
            "checkout-item";


        itemElement.innerHTML = `

            <div class="checkout-item-image">

                <i class="fa-solid fa-box"></i>

            </div>


            <div class="checkout-item-info">

                <strong>
                    ${item.product_name}
                </strong>

                <span>
                    Qty: ${item.quantity}
                </span>

            </div>


            <strong class="checkout-item-price">

                ₹${Number(
                    item.subtotal
                ).toLocaleString("en-IN")}

            </strong>

        `;


        container.appendChild(
            itemElement
        );

    });
}



// Place order
async function placeOrder() {

    // Get logged-in user
    const user = getLoggedInUser();


    if (!user) {

        alert(
            "⚠️ Please sign in first."
        );

        window.location.href =
            "login.html";

        return;
    }


    // Get delivery details
    const fullName =
        document.getElementById(
            "full-name"
        ).value.trim();


    const phone =
        document.getElementById(
            "phone"
        ).value.trim();


    const address =
        document.getElementById(
            "address"
        ).value.trim();


    const city =
        document.getElementById(
            "city"
        ).value.trim();


    const state =
        document.getElementById(
            "state"
        ).value.trim();


    const postalCode =
        document.getElementById(
            "postal-code"
        ).value.trim();



    // Get selected payment method
    const selectedPayment =
        document.querySelector(
            'input[name="payment"]:checked'
        );


    if (!selectedPayment) {

        alert(
            "⚠️ Please select a payment method."
        );

        return;
    }


    const paymentMethod =
        selectedPayment.value;



    // Basic validation
    if (
        !fullName ||
        !phone ||
        !address ||
        !city ||
        !state ||
        !postalCode
    ) {

        alert(
            "⚠️ Please fill in all delivery details."
        );

        return;
    }



    // Disable button while processing
    const button =
        document.querySelector(
            ".place-order-btn"
        );


    button.disabled = true;


    button.innerHTML = `

        <i class="fa-solid fa-spinner fa-spin"></i>

        Processing Order...

    `;



    try {

        const response =
            await fetch(
                `${API_URL}/api/orders`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        user_id:
                            user.user_id,

                        full_name:
                            fullName,

                        phone:
                            phone,

                        address:
                            address,

                        city:
                            city,

                        state:
                            state,

                        postal_code:
                            postalCode,

                        payment_method:
                            paymentMethod

                    })
                }
            );



        const data =
            await response.json();



        if (!response.ok) {

            throw new Error(
                data.error ||
                "Order could not be placed"
            );

        }



        // Successful order
        alert(
            `✅ Order placed successfully!\n\nOrder ID: #${data.order_id}`
        );


        // Redirect to orders page
        window.location.href =
            "orders.html";



    } catch (error) {

        console.error(error);


        alert(
            `❌ ${error.message}`
        );


        // Re-enable button
        button.disabled = false;


        button.innerHTML = `

            <i class="fa-solid fa-lock"></i>

            Place Order

        `;

    }

}



// Start checkout page
document.addEventListener(
    "DOMContentLoaded",
    loadCheckout
);
