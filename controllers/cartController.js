const User = require("../models/userModel");
const Product = require("../models/productModel");
const Address = require("../models/addressModel");
const Cart = require("../models/cartModel");
const Order = require("../models/orderModel");
const loadCart = async (req, res) => {
    try {
        const userId = req.session.user_id;
        console.log(userId)
        const cartData = await Cart.findOne({ userId })
            .populate({
                path: 'items.productId',
                populate: {
                    path: 'category',
                    model: 'Category'
                }
            });
        if (cartData) {
            res.render('cart', { cart: cartData });
        } else {
            res.render('cart', { cart: null });
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
const addToCart = async (req, res) => {
    try {
        const { productId, quantity } = req.body; // Get the quantity from the request body
        const userId = req.session.user_id;

        const product = await Product.findById(productId);

        const unitPrice = product.price;
        const price = unitPrice * quantity; // Calculate the total price based on the quantity

        let cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart) {
            cart = new Cart({
                userId,
                items: [{
                    productId,
                    quantity: quantity,
                    unitPrice,
                    price
                }],
                totalPrice: price
            });
        } else {
            const existingItem = cart.items.find(item => item.productId.equals(productId));
            if (existingItem) {
                existingItem.quantity += quantity; // Increment the quantity
                existingItem.price += price; // Update the total price
                cart.totalPrice += price; // Update the cart total price
            } else {
                cart.items.push({
                    productId,
                    quantity: quantity,
                    unitPrice,
                    price
                });
                cart.totalPrice += price; // Update the cart total price
            }
        }

        await cart.save();

        res.status(200).json({ message: 'Product added to cart successfully' });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const removeItem = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.session.user_id;
        console.log("Product ID: ", productId, "User ID: ", userId);

        // Find the cart for the user
        let cart = await Cart.findOne({ userId }).populate('items.productId');

        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        // Find the index of the item to be removed
        const indexToRemove = cart.items.findIndex(item => item.productId._id.toString() === productId.toString())

        if (indexToRemove === -1) {
            return res.status(404).json({ error: 'Item not found in cart' });
        }

        // Get the removed item and update total price
        const removedItem = cart.items.splice(indexToRemove, 1)[0];
        cart.totalPrice -= removedItem.price;

        // Save the updated cart
        await cart.save();

        // Send success response
        res.status(200).json({ message: 'Item removed from cart successfully' });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const removeAllItemsFromCart = async (req, res) => {
    try {
        const userId = req.session.user_id;
        // Find the cart by user ID and remove all items
        await Cart.findOneAndUpdate({ userId }, { $set: { items: [], totalPrice: 0 } });
        res.status(200).json({ message: 'All items removed from the cart successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const updateCartItemQuantity = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const userId = req.session.user_id;

        let cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        const item = cart.items.find(item => item.productId.equals(productId));
        if (!item) {
            return res.status(404).json({ error: 'Item not found in cart' });
        }

        const product = await Product.findById(productId);
        const unitPrice = product.price;

        // Ensure quantity is not less than 0
        if (quantity < 0) {
            return res.status(400).json({ error: 'Quantity cannot be less than 0' });
        }

        // Update item quantity and price
        const priceDifference = (quantity - item.quantity) * unitPrice;
        item.quantity = quantity;
        item.price += priceDifference;
        cart.totalPrice += priceDifference;

        // Save the cart
        await cart.save();

        res.status(200).json({
            quantity: item.quantity,
            price: item.price,
            totalPrice: cart.totalPrice
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

const checkoutLoad = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const userDetails = await User.findById(userId).populate('addresses');
        const cartData = await Cart.findOne({ userId })
            .populate({
                path: 'items.productId',
                populate: {
                    path: 'category',
                    model: 'Category'
                }
            });
        if (cartData) {
            res.render('checkout', { cart: cartData, user: userDetails });
        }
    } catch (error) {
        console.log(error.message);
    }
}

const placeOrder = async (req, res) => {
    try {
        const { paymentMethod, addressId, billingAddressId } = req.body;
        console.log(paymentMethod, addressId, billingAddressId);
        const userId = req.session.user_id;
        const generateOrderId = () => {
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let orderId = '';
            for (let i = 0; i < 8; i++) {
                orderId += characters.charAt(Math.floor(Math.random() * characters.length));
            }
            return orderId;
        };

        const cartItems = await Cart.findOne({ userId })
            .populate({
                path: 'items.productId',
                populate: {
                    path: 'category',
                    model: 'Category'
                }
            });

        // Check if any item's quantity exceeds its stock
        for (const item of cartItems.items) {
            if (item.quantity > item.productId.stock) {
                return res.status(400).json({ message: `The quantity of "${item.productId.productName}" in your cart exceeds the available stock.` });
            }
        }

        totalPrice = cartItems.totalPrice;

        const orderItems = cartItems.items.map(item => ({
            orderId: generateOrderId(),
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            price: item.price
        }));

        // Decrease stock for each product in the order
        for (const item of orderItems) {
            const product = await Product.findById(item.productId);
            if (!product) {
                throw new Error(`Product with ID ${item.productId} not found.`);
            }
            product.stock -= item.quantity;
            await product.save();
        }

        const order = new Order({
            userId,
            items: orderItems,
            totalPrice,
            addressId,
            billingAddressId,
            paymentMethod,
            paymentStatus: 'Pending',
            status: 'Pending',
            createdAt: new Date()
        });

        // Save order to database
        await order.save();
        await Cart.findOneAndUpdate({ userId }, { $set: { items: [], totalPrice: 0 } });
        res.status(201).json({ message: 'Order placed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to place order' });
    }
}

const orderSuccessLoad = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const lastOrder = await Order.findOne({ userId }).sort({ createdAt: -1 })
            .populate('userId')
            .populate('addressId')
            .populate('billingAddressId')
            .populate({
                path: 'items.productId',
                model: 'Product',
                populate: {
                    path: 'category',
                    model: 'Category'
                }
            });

        const createdAtDate = new Date(lastOrder.createdAt);

        const guaranteedDeliveryDate = new Date(createdAtDate.setDate(createdAtDate.getDate() + 7));

        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        const formattedGuaranteedDeliveryDate = guaranteedDeliveryDate.toLocaleDateString('en-US', options);
        res.render('order-placed', { order: lastOrder, formattedGuaranteedDeliveryDate });
    } catch (error) {
        console.log(error.message);
    }
}

module.exports = { placeOrder };

module.exports = {
    loadCart,
    addToCart,
    removeItem,
    removeAllItemsFromCart,
    updateCartItemQuantity,
    checkoutLoad,
    placeOrder,
    orderSuccessLoad
}