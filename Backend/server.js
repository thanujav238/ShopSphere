const express = require("express");
const cors = require("cors");

const db = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("ShopSphere Backend is running!");
});
app.get("/api/test-simple", (req, res) => {
    db.query("SELECT 1 AS test", (err, results) => {
        if (err) {
            console.error("Simple query error:", err);
            return res.status(500).json({ error: err.message });
        }

        res.json(results[0]);
    });
});
app.get("/api/test-db", async (req, res) => {
    try {
        const [results] = await db.promise().query(
            "SELECT DATABASE() AS database_name"
        );

        res.json(results[0]);
    } catch (err) {
        console.error("Test DB error:", err);
        res.status(500).json({
            error: err.message
        });
    }
});
app.post("/api/cart/add", (req, res) => {
    const { user_id, product_id, quantity } = req.body;

    if (!user_id || !product_id) {
        return res.status(400).json({
            error: "user_id and product_id are required"
        });
    }

    const qty = quantity || 1;

    // Check whether the user already has a cart
    const findCart = `
        SELECT cart_id
        FROM cart
        WHERE user_id = ?
    `;

    db.query(findCart, [user_id], (err, cartResults) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        const addItem = (cartId) => {

            const sql = `
                INSERT INTO cart_items
                (cart_id, product_id, quantity)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE
                quantity = quantity + ?
            `;

            db.query(
                sql,
                [cartId, product_id, qty, qty],
                (err) => {

                    if (err) {
                        return res.status(500).json({
                            error: err.message
                        });
                    }

                    res.json({
                        message: "Product added to cart successfully!"
                    });
                }
            );
        };

        if (cartResults.length > 0) {

            addItem(cartResults[0].cart_id);

        } else {

            const createCart = `
                INSERT INTO cart (user_id)
                VALUES (?)
            `;

            db.query(createCart, [user_id], (err, result) => {

                if (err) {
                    return res.status(500).json({
                        error: err.message
                    });
                }

                addItem(result.insertId);
            });
        }
    });
});

app.get("/api/cart/:userId", (req, res) => {

    const userId = req.params.userId;

    const sql = `
        SELECT
            ci.cart_item_id,
            ci.product_id,
            ci.quantity,
            p.product_name,
            p.description,
            p.price,
            p.brand,
            s.store_name,
            (ci.quantity * p.price) AS subtotal
        FROM cart_items ci
        JOIN cart c
            ON ci.cart_id = c.cart_id
        JOIN products p
            ON ci.product_id = p.product_id
        JOIN sellers s
            ON p.seller_id = s.seller_id
        WHERE c.user_id = ?
        ORDER BY ci.cart_item_id;
    `;

    db.query(sql, [userId], (err, results) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        const total = results.reduce(
            (sum, item) => sum + Number(item.subtotal),
            0
        );

        res.json({
            items: results,
            total: total
        });
    });
});

app.put("/api/cart/update", (req, res) => {

    const { cart_item_id, quantity } = req.body;

    if (!cart_item_id || quantity === undefined) {
        return res.status(400).json({
            error: "cart_item_id and quantity are required"
        });
    }

    if (quantity <= 0) {
        return res.status(400).json({
            error: "Quantity must be greater than 0"
        });
    }

    const sql = `
        UPDATE cart_items
        SET quantity = ?
        WHERE cart_item_id = ?
    `;

    db.query(sql, [quantity, cart_item_id], (err) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json({
            message: "Cart quantity updated successfully!"
        });
    });
});

app.delete("/api/cart/remove/:cartItemId", (req, res) => {

    const cartItemId = req.params.cartItemId;

    const sql = `
        DELETE FROM cart_items
        WHERE cart_item_id = ?
    `;

    db.query(sql, [cartItemId], (err) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json({
            message: "Item removed from cart!"
        });
    });
});

// ===============================
// CREATE ORDER
// ===============================

app.post("/api/orders", (req, res) => {

    const {
        user_id,
        full_name,
        phone,
        address,
        city,
        state,
        postal_code,
        payment_method
    } = req.body;


    // Validate required fields
    if (
        !user_id ||
        !full_name ||
        !phone ||
        !address ||
        !city ||
        !state ||
        !postal_code ||
        !payment_method
    ) {
        return res.status(400).json({
            error: "All checkout details are required"
        });
    }


    // Start MySQL transaction
    db.beginTransaction((err) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }


        // Get customer's cart
        const cartSQL = `
            SELECT
                ci.cart_item_id,
                ci.product_id,
                ci.quantity,
                p.product_name,
                p.price,
                i.quantity AS stock
            FROM cart_items ci
            JOIN cart c
                ON ci.cart_id = c.cart_id
            JOIN products p
                ON ci.product_id = p.product_id
            JOIN inventory i
                ON p.product_id = i.product_id
            WHERE c.user_id = ?
        `;


        db.query(cartSQL, [user_id], (err, cartItems) => {

            if (err) {
                return rollbackOrder(err);
            }


            // Check whether cart is empty
            if (cartItems.length === 0) {

                return rollbackOrder(
                    new Error("Your cart is empty")
                );

            }


            // Check stock
            for (const item of cartItems) {

                if (item.quantity > item.stock) {

                    return rollbackOrder(
                        new Error(
                            `${item.product_name} does not have enough stock`
                        )
                    );

                }

            }


            // Calculate total
            const totalAmount = cartItems.reduce(
                (total, item) =>
                    total + Number(item.price) * item.quantity,
                0
            );


            // Create order
            const orderSQL = `
                INSERT INTO orders
                (user_id, total_amount, order_status)
                VALUES (?, ?, 'confirmed')
            `;


            db.query(
                orderSQL,
                [user_id, totalAmount],
                (err, orderResult) => {

                    if (err) {
                        return rollbackOrder(err);
                    }


                    const orderId = orderResult.insertId;


                    // Save address
                    const addressSQL = `
                        INSERT INTO addresses
                        (
                            user_id,
                            address_line,
                            city,
                            state,
                            postal_code,
                            country
                        )
                        VALUES (?, ?, ?, ?, ?, 'India')
                    `;


                    db.query(
                        addressSQL,
                        [
                            user_id,
                            address,
                            city,
                            state,
                            postal_code
                        ],
                        (err) => {

                            if (err) {
                                return rollbackOrder(err);
                            }


                            // Insert order items
                            const orderItemSQL = `
                                INSERT INTO order_items
                                (
                                    order_id,
                                    product_id,
                                    quantity,
                                    unit_price
                                )
                                VALUES ?
                            `;


                            const orderItems = cartItems.map(item => [
                                orderId,
                                item.product_id,
                                item.quantity,
                                item.price
                            ]);


                            db.query(
                                orderItemSQL,
                                [orderItems],
                                (err) => {

                                    if (err) {
                                        return rollbackOrder(err);
                                    }


                                    // Create payment
                                    let paymentStatus = "successful";

                                    if (
                                        payment_method ===
                                        "Cash on Delivery"
                                    ) {
                                        paymentStatus = "pending";
                                    }


                                    const transactionId =
                                        payment_method ===
                                        "Cash on Delivery"
                                            ? null
                                            : "TXN" +
                                              Date.now();


                                    const paymentSQL = `
                                        INSERT INTO payments
                                        (
                                            order_id,
                                            payment_method,
                                            payment_status,
                                            transaction_id,
                                            paid_at
                                        )
                                        VALUES (?, ?, ?, ?, ?)
                                    `;


                                    db.query(
                                        paymentSQL,
                                        [
                                            orderId,
                                            payment_method,
                                            paymentStatus,
                                            transactionId,
                                            paymentStatus ===
                                            "successful"
                                                ? new Date()
                                                : null
                                        ],
                                        (err) => {

                                            if (err) {
                                                return rollbackOrder(err);
                                            }


                                            // Reduce inventory
                                            let completed =
                                                0;


                                            cartItems.forEach(item => {

                                                const updateStockSQL = `
                                                    UPDATE inventory
                                                    SET quantity = quantity - ?
                                                    WHERE product_id = ?
                                                `;


                                                db.query(
                                                    updateStockSQL,
                                                    [
                                                        item.quantity,
                                                        item.product_id
                                                    ],
                                                    (err) => {

                                                        if (err) {
                                                            return rollbackOrder(
                                                                err
                                                            );
                                                        }


                                                        completed++;


                                                        // After all stock updates
                                                        if (
                                                            completed ===
                                                            cartItems.length
                                                        ) {

                                                            // Clear cart
                                                            const clearCartSQL = `
                                                                DELETE ci
                                                                FROM cart_items ci
                                                                JOIN cart c
                                                                    ON ci.cart_id = c.cart_id
                                                                WHERE c.user_id = ?
                                                            `;


                                                            db.query(
                                                                clearCartSQL,
                                                                [user_id],
                                                                (err) => {

                                                                    if (err) {
                                                                        return rollbackOrder(
                                                                            err
                                                                        );
                                                                    }


                                                                    // Everything successful
                                                                    db.commit(
                                                                        (err) => {

                                                                            if (err) {
                                                                                return rollbackOrder(
                                                                                    err
                                                                                );
                                                                            }


                                                                            res.json({

                                                                                message:
                                                                                    "Order placed successfully!",

                                                                                order_id:
                                                                                    orderId,

                                                                                total_amount:
                                                                                    totalAmount,

                                                                                payment_status:
                                                                                    paymentStatus

                                                                            });

                                                                        }
                                                                    );

                                                                }
                                                            );

                                                        }

                                                    }
                                                );

                                            });

                                        }
                                    );

                                }
                            );

                        }
                    );

                }
            );

        });


        // Rollback helper
        function rollbackOrder(error) {

            db.rollback(() => {

                res.status(400).json({
                    error: error.message
                });

            });

        }

    });

});

// ===============================
// GET CUSTOMER ORDERS
// ===============================

app.get("/api/orders/:userId", (req, res) => {

    const userId = req.params.userId;

    const sql = `
        SELECT
            o.order_id,
            o.order_date,
            o.total_amount,
            o.order_status,

            p.payment_method,
            p.payment_status,

            oi.product_id,
            oi.quantity,
            oi.unit_price,

            pr.product_name,
            pr.brand

        FROM orders o

        LEFT JOIN payments p
            ON o.order_id = p.order_id

        LEFT JOIN order_items oi
            ON o.order_id = oi.order_id

        LEFT JOIN products pr
            ON oi.product_id = pr.product_id

        WHERE o.user_id = ?

        ORDER BY o.order_date DESC
    `;


    db.query(sql, [userId], (err, results) => {

        if (err) {

            return res.status(500).json({
                error: err.message
            });

        }


        res.json(results);

    });

});

// ===============================
// SELLER DASHBOARD
// ===============================

app.get("/api/seller/dashboard/:sellerId", (req, res) => {

    const sellerId = req.params.sellerId;


    // Get seller/store information
    const sellerSQL = `
        SELECT
            seller_id,
            store_name,
            seller_status
        FROM sellers
        WHERE seller_id = ?
    `;


    db.query(sellerSQL, [sellerId], (err, sellerResults) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }


        if (sellerResults.length === 0) {
            return res.status(404).json({
                error: "Seller not found"
            });
        }


        const seller = sellerResults[0];


        // Get products and inventory
        const inventorySQL = `
            SELECT
                p.product_id,
                p.product_name,
                p.brand,
                p.price,
                c.category_name,
                i.quantity,
                i.reorder_level
            FROM products p

            JOIN categories c
                ON p.category_id = c.category_id

            JOIN inventory i
                ON p.product_id = i.product_id

            WHERE p.seller_id = ?

            ORDER BY p.product_id
        `;


        db.query(
            inventorySQL,
            [sellerId],
            (err, inventoryResults) => {

                if (err) {
                    return res.status(500).json({
                        error: err.message
                    });
                }


                // Calculate inventory statistics
                const totalProducts =
                    inventoryResults.length;


                const totalStock =
                    inventoryResults.reduce(
                        (total, product) =>
                            total + Number(product.quantity),
                        0
                    );


                const lowStock =
                    inventoryResults.filter(
                        product =>
                            Number(product.quantity) <=
                            Number(product.reorder_level)
                    );


                // Get sales information
                const salesSQL = `
                    SELECT

                        COUNT(DISTINCT oi.order_id)
                            AS total_orders,

                        COALESCE(
                            SUM(
                                oi.quantity *
                                oi.unit_price
                            ),
                            0
                        ) AS total_sales

                    FROM order_items oi

                    JOIN products p
                        ON oi.product_id = p.product_id

                    JOIN orders o
                        ON oi.order_id = o.order_id

                    WHERE p.seller_id = ?

                    AND o.order_status != 'cancelled'
                `;


                db.query(
                    salesSQL,
                    [sellerId],
                    (err, salesResults) => {

                        if (err) {
                            return res.status(500).json({
                                error: err.message
                            });
                        }


                        const sales =
                            salesResults[0];


                        // Send dashboard data
                        res.json({

                            seller: seller,

                            statistics: {

                                total_products:
                                    totalProducts,

                                total_stock:
                                    totalStock,

                                total_orders:
                                    Number(
                                        sales.total_orders
                                    ),

                                total_sales:
                                    Number(
                                        sales.total_sales
                                    )

                            },

                            inventory:
                                inventoryResults,

                            low_stock:
                                lowStock

                        });

                    }
                );

            }
        );

    });

});

// =========================
// SELLER INVENTORY MANAGEMENT
// =========================

// ADD PRODUCT
app.post("/api/seller/products", (req, res) => {
    const {
        seller_id,
        category_id,
        product_name,
        description,
        price,
        brand,
        quantity,
        reorder_level
    } = req.body;

    if (
        !seller_id ||
        !category_id ||
        !product_name ||
        price === undefined ||
        quantity === undefined
    ) {
        return res.status(400).json({
            error: "Required product details are missing"
        });
    }

    const productSQL = `
        INSERT INTO products
        (seller_id, category_id, product_name, description, price, brand)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(
        productSQL,
        [
            seller_id,
            category_id,
            product_name,
            description || "",
            price,
            brand || ""
        ],
        (err, result) => {
            if (err) {
                return res.status(500).json({
                    error: err.message
                });
            }

            const productId = result.insertId;

            const inventorySQL = `
                INSERT INTO inventory
                (product_id, quantity, reorder_level)
                VALUES (?, ?, ?)
            `;

            db.query(
                inventorySQL,
                [
                    productId,
                    quantity,
                    reorder_level || 5
                ],
                (err) => {
                    if (err) {
                        return res.status(500).json({
                            error: err.message
                        });
                    }

                    res.json({
                        message: "Product added successfully!",
                        product_id: productId
                    });
                }
            );
        }
    );
});


// UPDATE PRODUCT
app.put("/api/seller/products/:productId", (req, res) => {
    const productId = req.params.productId;

    const {
        product_name,
        description,
        price,
        brand,
        category_id
    } = req.body;

    const sql = `
        UPDATE products
        SET
            product_name = ?,
            description = ?,
            price = ?,
            brand = ?,
            category_id = ?
        WHERE product_id = ?
    `;

    db.query(
        sql,
        [
            product_name,
            description,
            price,
            brand,
            category_id,
            productId
        ],
        (err) => {
            if (err) {
                return res.status(500).json({
                    error: err.message
                });
            }

            res.json({
                message: "Product updated successfully!"
            });
        }
    );
});


// UPDATE STOCK
app.put("/api/seller/inventory/:productId", (req, res) => {
    const productId = req.params.productId;
    const { quantity, reorder_level } = req.body;

    if (quantity === undefined) {
        return res.status(400).json({
            error: "Quantity is required"
        });
    }

    const sql = `
        UPDATE inventory
        SET
            quantity = ?,
            reorder_level = ?
        WHERE product_id = ?
    `;

    db.query(
        sql,
        [
            quantity,
            reorder_level || 5,
            productId
        ],
        (err) => {
            if (err) {
                return res.status(500).json({
                    error: err.message
                });
            }

            res.json({
                message: "Inventory updated successfully!"
            });
        }
    );
});


// DELETE PRODUCT
app.delete("/api/seller/products/:productId", (req, res) => {
    const productId = req.params.productId;

    db.query(
        "DELETE FROM inventory WHERE product_id = ?",
        [productId],
        (err) => {
            if (err) {
                return res.status(500).json({
                    error: err.message
                });
            }

            db.query(
                "DELETE FROM products WHERE product_id = ?",
                [productId],
                (err) => {
                    if (err) {
                        return res.status(500).json({
                            error: err.message
                        });
                    }

                    res.json({
                        message: "Product deleted successfully!"
                    });
                }
            );
        }
    );
});

// ===============================
// SELLER ORDERS
// ===============================

app.get("/api/seller/orders/:sellerId", (req, res) => {

    const sellerId = req.params.sellerId;

    const sql = `
        SELECT
            o.order_id,
            o.order_date,
            o.order_status,
            o.total_amount,
            u.full_name AS customer_name,
            u.phone,
            p.payment_method,
            p.payment_status,
            pr.product_name,
            oi.quantity,
            oi.unit_price
        FROM orders o
        JOIN users u
            ON o.user_id = u.user_id
        JOIN order_items oi
            ON o.order_id = oi.order_id
        JOIN products pr
            ON oi.product_id = pr.product_id
        JOIN payments p
            ON o.order_id = p.order_id
        WHERE pr.seller_id = ?
        ORDER BY o.order_date DESC
    `;

    db.query(sql, [sellerId], (err, results) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json(results);

    });

});


// ===============================
// UPDATE ORDER STATUS
// ===============================

app.put("/api/seller/orders/:orderId/status", (req, res) => {

    const orderId = req.params.orderId;
    const { order_status } = req.body;

    const allowedStatuses = [
        "confirmed",
        "shipped",
        "delivered",
        "cancelled"
    ];

    if (!allowedStatuses.includes(order_status)) {

        return res.status(400).json({
            error: "Invalid order status"
        });

    }

    const sql = `
        UPDATE orders
        SET order_status = ?
        WHERE order_id = ?
    `;

    db.query(
        sql,
        [order_status, orderId],
        (err) => {

            if (err) {

                return res.status(500).json({
                    error: err.message
                });

            }

            res.json({
                message: "Order status updated successfully!"
            });

        }
    );

});

// ===============================
// SMART RETURN ASSISTANT
// ===============================

app.get("/api/returns/check/:userId/:orderId/:productId", (req, res) => {

    const { userId, orderId, productId } = req.params;

    const sql = `
        SELECT
            o.order_id,
            o.order_date,
            o.order_status,
            p.product_name,
            c.category_name,
            rp.return_days,
            rp.returnable,
            DATEDIFF(CURRENT_DATE, DATE(o.order_date)) AS days_since_purchase
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        JOIN products p ON oi.product_id = p.product_id
        JOIN categories c ON p.category_id = c.category_id
        JOIN return_policies rp ON c.category_id = rp.category_id
        WHERE o.order_id = ?
        AND o.user_id = ?
        AND p.product_id = ?
    `;

    db.query(sql, [orderId, userId, productId], (err, results) => {

        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (results.length === 0) {
            return res.status(404).json({
                error: "Order or product not found."
            });
        }

        const item = results[0];

        const eligible =
            item.returnable &&
            item.order_status === "delivered" &&
            item.days_since_purchase <= item.return_days;

        res.json({
            eligible,
            product_name: item.product_name,
            category: item.category_name,
            days_since_purchase: item.days_since_purchase,
            return_days: item.return_days,
            reason: eligible
                ? "Product is eligible for return."
                : item.order_status !== "delivered"
                    ? "Product can only be returned after delivery."
                    : !item.returnable
                        ? "This category is non-returnable."
                        : "Return period has expired."
        });

    });
});


// REQUEST RETURN
app.post("/api/returns", (req, res) => {

    const {
        order_id,
        product_id,
        user_id,
        reason
    } = req.body;

    if (!order_id || !product_id || !user_id || !reason) {
        return res.status(400).json({
            error: "All return details are required."
        });
    }

    const sql = `
        INSERT INTO returns
        (order_id, product_id, user_id, reason)
        VALUES (?, ?, ?, ?)
    `;

    db.query(
        sql,
        [order_id, product_id, user_id, reason],
        (err, result) => {

            if (err) {
                return res.status(500).json({
                    error: err.message
                });
            }

            res.json({
                message: "Return request submitted successfully!",
                return_id: result.insertId
            });

        }
    );
});


// VIEW USER RETURNS
app.get("/api/returns/:userId", (req, res) => {

    const sql = `
        SELECT
            r.return_id,
            r.order_id,
            r.product_id,
            r.reason,
            r.return_status,
            r.requested_at,
            p.product_name
        FROM returns r
        JOIN products p
            ON r.product_id = p.product_id
        WHERE r.user_id = ?
        ORDER BY r.requested_at DESC
    `;

    db.query(sql, [req.params.userId], (err, results) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json(results);

    });
});

// ===============================
// PRODUCT COMPATIBILITY CHECKER
// ===============================

app.get("/api/compatibility/:device", (req, res) => {

    const device = `%${req.params.device}%`;

    const sql = `
        SELECT
            p.product_id,
            p.product_name,
            p.brand,
            p.price,
            pc.compatible_device,
            pc.compatibility_details
        FROM product_compatibility pc
        JOIN products p
            ON pc.product_id = p.product_id
        WHERE pc.compatible_device LIKE ?
        AND p.product_status = 'active'
        ORDER BY p.product_name
    `;

    db.query(sql, [device], (err, results) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json(results);

    });
});

// ===============================
// REVIEWS & RATINGS
// ===============================

app.get("/api/reviews/:productId", (req, res) => {

    const sql = `
        SELECT
            r.review_id,
            r.rating,
            r.review_text,
            r.review_date,
            u.full_name
        FROM reviews r
        JOIN users u ON r.user_id = u.user_id
        WHERE r.product_id = ?
        ORDER BY r.review_date DESC
    `;

    db.query(sql, [req.params.productId], (err, results) => {

        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.json(results);
    });
});


app.post("/api/reviews", (req, res) => {

    const {
        user_id,
        product_id,
        rating,
        review_text
    } = req.body;

    if (!user_id || !product_id || !rating) {
        return res.status(400).json({
            error: "User, product and rating are required."
        });
    }

    if (rating < 1 || rating > 5) {
        return res.status(400).json({
            error: "Rating must be between 1 and 5."
        });
    }

    const sql = `
        INSERT INTO reviews
        (user_id, product_id, rating, review_text)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        rating = VALUES(rating),
        review_text = VALUES(review_text)
    `;

    db.query(
        sql,
        [user_id, product_id, rating, review_text || ""],
        (err, result) => {

            if (err) {
                return res.status(500).json({
                    error: err.message
                });
            }

            res.json({
                message: "Review submitted successfully!"
            });
        }
    );
});

// ===============================
// WISHLIST
// ===============================

app.get("/api/wishlist/:userId", (req, res) => {

    const sql = `
        SELECT
            w.wishlist_id,
            p.product_id,
            p.product_name,
            p.description,
            p.price,
            p.brand,
            c.category_name,
            s.store_name
        FROM wishlist w
        JOIN products p ON w.product_id = p.product_id
        JOIN categories c ON p.category_id = c.category_id
        JOIN sellers s ON p.seller_id = s.seller_id
        WHERE w.user_id = ?
        ORDER BY w.added_at DESC
    `;

    db.query(sql, [req.params.userId], (err, results) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json(results);
    });
});

 
// ===============================
// ADD TO WISHLIST
// ===============================

app.post("/api/wishlist", (req, res) => {

    app.delete("/api/wishlist/:userId/:productId", (req, res) => {

    const { userId, productId } = req.params;

    const sql = `
        DELETE FROM wishlist
        WHERE user_id = ?
        AND product_id = ?
    `;

    db.query(sql, [userId, productId], (err) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json({
            message: "Product removed from wishlist!"
        });
    });
});

    const {
        user_id,
        product_id
    } = req.body;

    console.log("Wishlist request:", user_id, product_id);

    if (!user_id || !product_id) {
        return res.status(400).json({
            error: "user_id and product_id are required"
        });
    }

    const sql = `
        INSERT INTO wishlist
        (user_id, product_id)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE
        added_at = CURRENT_TIMESTAMP
    `;

    db.query(
        sql,
        [user_id, product_id],
        (err) => {

            if (err) {

                console.error("Wishlist DB error:", err);

                return res.status(500).json({
                    error: err.message
                });
            }

            res.json({
                message: "Product added to wishlist!"
            });

        }
    );
});

// ===============================
// REGISTER
// ===============================

app.post("/api/register", (req, res) => {

    const { full_name, email, password, phone, role } = req.body;

    if (!full_name || !email || !password) {
        return res.status(400).json({
            error: "Name, email and password are required"
        });
    }

    const userRole =
        ["customer", "seller"].includes(role)
            ? role
            : "customer";

    const sql = `
        INSERT INTO users
        (full_name, email, password, phone, role)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [full_name, email, password, phone || "", userRole],
        (err, result) => {

            if (err) {
                return res.status(500).json({
                    error: err.code === "ER_DUP_ENTRY"
                        ? "Email already registered"
                        : err.message
                });
            }

            // Automatically create seller record
            if (userRole === "seller") {

                const sellerSQL = `
                    INSERT INTO sellers
                    (user_id, store_name,store_description)
                    VALUES (?, ?, ?)
                `;

                db.query(
                    sellerSQL,
                    [
                        result.insertId,
                        full_name,
                        "New ShopSphere Store"
                    ],
                    (sellerErr) => {

                        if (sellerErr) {
                            console.error(sellerErr);
                        }

                        return res.json({
                            message: "Registration successful!",
                            user_id: result.insertId,
                            role: userRole
                        });
                    }
                );

            } else {

                res.json({
                    message: "Registration successful!",
                    user_id: result.insertId,
                    role: userRole
                });

            }
        }
    );
});


// ===============================
// LOGIN
// ===============================

app.post("/api/login", (req, res) => {

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            error: "Email and password are required"
        });
    }

    const sql = `
    SELECT
        u.user_id,
        u.full_name,
        u.email,
        u.phone,
        u.role,
        s.seller_id
    FROM users u
    LEFT JOIN sellers s
        ON u.user_id = s.user_id
    WHERE u.email = ?
    AND u.password = ?
`;

    db.query(
        sql,
        [email, password],
        (err, results) => {

            if (err) {
                return res.status(500).json({
                    error: err.message
                });
            }

            if (results.length === 0) {
                return res.status(401).json({
                    error: "Invalid email or password"
                });
            }

            res.json({
                message: "Login successful!",
                user: results[0]
            });

        }
    );
});

// ===============================
// ADMIN DASHBOARD
// ===============================

app.get("/api/admin/dashboard", (req, res) => {

    const statsSQL = `
        SELECT
            (SELECT COUNT(*) FROM users) AS total_users,
            (SELECT COUNT(*) FROM sellers) AS total_sellers,
            (SELECT COUNT(*) FROM products) AS total_products,
            (SELECT COUNT(*) FROM orders) AS total_orders,
            (SELECT COALESCE(SUM(total_amount), 0)
             FROM orders
             WHERE order_status != 'cancelled') AS total_revenue
    `;

    db.query(statsSQL, (err, stats) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        const ordersSQL = `
            SELECT
                o.order_id,
                o.order_date,
                o.total_amount,
                o.order_status,
                u.full_name AS customer_name
            FROM orders o
            JOIN users u
                ON o.user_id = u.user_id
            ORDER BY o.order_date DESC
            LIMIT 10
        `;

        db.query(ordersSQL, (err, orders) => {

            if (err) {
                return res.status(500).json({
                    error: err.message
                });
            }

            const sellersSQL = `
                SELECT
                    s.seller_id,
                    s.store_name,
                    s.seller_status,
                    COUNT(p.product_id) AS product_count
                FROM sellers s
                LEFT JOIN products p
                    ON s.seller_id = p.seller_id
                GROUP BY
                    s.seller_id,
                    s.store_name,
                    s.seller_status
                ORDER BY product_count DESC
            `;

            db.query(sellersSQL, (err, sellers) => {

                if (err) {
                    return res.status(500).json({
                        error: err.message
                    });
                }

                res.json({
                    statistics: stats[0],
                    recent_orders: orders,
                    sellers: sellers
                });

            });
        });
    });
});

app.get("/api/products", (req, res) => {
    const sql = `
        SELECT
            p.product_id,
            p.product_name,
            p.description,
            p.price,
            p.brand,
            p.image,
            c.category_name,
            s.store_name,
            i.quantity
        FROM products p
        JOIN categories c
            ON p.category_id = c.category_id
        JOIN sellers s
            ON p.seller_id = s.seller_id
        JOIN inventory i
            ON p.product_id = i.product_id
        WHERE p.product_status = 'active'
        ORDER BY p.product_id;
    `;

    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json(results);
    });
});

app.listen(PORT, () => {
    console.log(`ShopSphere server running at http://localhost:${PORT}`);
});
