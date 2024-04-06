require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const User = require("../models/userModel");
const Product = require("../models/productModel");
const Address = require("../models/addressModel");
const Cart = require("../models/cartModel");
const Order = require("../models/orderModel");
const Wishlist = require("../models/wishlistModel")
const TransactionMOdel = require("../models/transactionModel");
const Coupon = require("../models/couponModel");
const Wallet = require("../models/walletModel");
const Razorpay = require('razorpay');
const { Transaction } = require('mongodb');
const loadCart = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const coupons = await Coupon.find();
        const wishlistData = await Wishlist.findOne({ userId })
            .populate({
                path: 'items.productId',
                populate: {
                    path: 'category',
                    model: 'Category'
                }
            });
        const cartData = await Cart.findOne({ userId })
            .populate({
                path: 'items.productId',
                populate: {
                    path: 'category',
                    model: 'Category'
                }
            });
        res.render('cart', { cart: cartData, wishlist: wishlistData, coupons });
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
        let price;
        let unitPrice;

        if (product.price === product.offerPrice) {
            unitPrice = product.price;
            price = unitPrice * quantity;
        } else {
            unitPrice = product.offerPrice;
            price = unitPrice * quantity;
        }

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
                existingItem.quantity += quantity;
                existingItem.price += price;
                cart.totalPrice += price;
            } else {
                cart.items.push({
                    productId,
                    quantity: quantity,
                    unitPrice,
                    price
                });
                cart.totalPrice += price;

            }
        }

        await cart.save();

        res.status(200).json({ message: 'Product added to cart successfully', cart });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const removeItem = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.session.user_id;
        let cart = await Cart.findOne({ userId }).populate('items.productId');

        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        const indexToRemove = cart.items.findIndex(item => item.productId._id.toString() === productId.toString())

        if (indexToRemove === -1) {
            return res.status(404).json({ error: 'Item not found in cart' });
        }

        const removedItem = cart.items.splice(indexToRemove, 1)[0];
        cart.totalPrice -= removedItem.price;

        await cart.save();
        if (cart.items.length === 0) {
            await Cart.findOneAndUpdate({ userId }, { $set: { items: [], totalPrice: 0 } });
        }
        res.status(200).json({ message: 'Item removed from cart successfully' });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const removeAllItemsFromCart = async (req, res) => {
    try {
        const userId = req.session.user_id;
        await Cart.findOneAndUpdate({ userId }, { $set: { items: [], totalPrice: 0 } });
        res.status(200).json({ message: 'All items removed from the cart successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const applyCoupon = async (req, res) => {
    try {
        const couponCode = req.body.couponCode;
        const userId = req.session.user_id;
        const cart = await Cart.findOne({ userId });
        const currentDate = new Date();
        const utcCurrentDate = new Date(currentDate.toUTCString());

        const coupon = await Coupon.findOne({ couponCode });
        console.log(coupon);
        if (req.session.couponTry !== 5) {
            if (coupon) {
                if (coupon.isActive) {
                    console.log("Coupon is Active");
                    const utcStartDate = new Date(coupon.startDate.toUTCString());
                    const utcExpiryDate = new Date(coupon.expiryDate.toUTCString());

                    if (utcCurrentDate >= utcStartDate && utcCurrentDate <= utcExpiryDate) {

                        if (cart.totalPrice >= coupon.minimumCartValue) {
                            if (coupon.discountType === 'Percentage') {
                                const discountValue = cart.totalPrice * coupon.discount / 100;
                                const discountPrice = discountValue > coupon.maximumDiscountAmount ? coupon.maximumDiscountAmount : discountValue
                                const updatedTotal = cart.totalPrice - discountPrice;
                                newCart = await Cart.findOneAndUpdate({ userId }, { $set: { totalPrice: updatedTotal } }, { new: true });
                                req.session.discountPrice = discountPrice;
                                req.session.couponTry = 1;
                                console.log("Coupon Applied", discountPrice, updatedTotal)
                                res.status(200).json({ message: 'Coupon Applied', discountPrice, updatedTotal, newCart });

                            } else if (coupon.discountType === 'Fixed') {
                                const discountPrice = coupon.discount;
                                const updatedTotal = cart.totalPrice - discountPrice;
                                newCart = await Cart.findOneAndUpdate({ userId }, { $set: { totalPrice: updatedTotal } }, { new: true });
                                req.session.discountPrice = discountPrice;
                                req.session.couponTry = 1;
                                res.status(200).json({ message: 'Coupon Applied', discountPrice, newCart });
                            }
                        }

                    } else {
                        res.status(400).json({ error: 'Coupon has expired' });
                    }
                } else {
                    res.status(400).json({ error: 'Coupon is inactive' });
                }
            } else {
                res.status(404).json({ error: 'Coupon not found' });
            }
        } else {
            res.status(404).json({ error: 'Coupon cannot be applied twice' });
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

const removeCoupon = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const cart = await Cart.findOne({ userId });

        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        let totalPrice = 0;
        for (const item of cart.items) {
            totalPrice += item.price;
        }

        cart.totalPrice = totalPrice;

        await cart.save();
        req.session.discountPrice = 0;

        res.status(200).json({ message: 'Coupon removed successfully', cart });
    } catch (error) {
        console.log(error.message);
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

        if (quantity < 0) {
            return res.status(400).json({ error: 'Quantity cannot be less than 0' });
        }

        if (quantity > product.stock) {
            return res.status(400).json({ error: 'Quantity exceeds available stock' });
        }

        const priceDifference = (quantity - item.quantity) * unitPrice;
        item.quantity = quantity;
        item.price += priceDifference;
        cart.totalPrice += priceDifference;

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
};


const checkoutLoad = async (req, res) => {
    try {
        const userId = req.session.user_id;
        let discountPrice = req.session.discountPrice;
        const userDetails = await User.findById(userId).populate('addresses');
        const userWallet = await Wallet.findOne({ userId });
        const wishlist = await Wishlist.findOne({ userId }).populate('items.productId');
        const cartData = await Cart.findOne({ userId })
            .populate({
                path: 'items.productId',
                populate: {
                    path: 'category',
                    model: 'Category'
                }
            });
        let totalPriceFromItems = 0;
        for (const item of cartData.items) {
            totalPriceFromItems += item.price;
        }

        if (totalPriceFromItems === cartData.totalPrice) {
            discountPrice = 0;
        }
        if (cartData) {
            res.render('checkout', { totalPriceFromItems, cart: cartData, user: userDetails, discountPrice, wallet: userWallet, wishlist });
        }
    } catch (error) {
        console.log(error.message);
    }
}
const calculateShippingCharge = async(req, res)=>{
    try {
        const southIndianStates = ['andhra pradesh', 'telangana', 'tamil nadu', 'karnataka', 'kerala'];
        const addressId = req.query.addressId;
        const deliveryAddress = await Address.findById(addressId);
        const deliveryStateLowerCase = deliveryAddress.state.toLowerCase();
        if (southIndianStates.includes(deliveryStateLowerCase)) {
            res.json({shippingCharge: 0});
        } else {
            res.json({shippingCharge: 100});
        }
    } catch (error) {
        console.log(message);
    }
}

// ****************************************************RazorPay Start***********************************

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_ID_KEY || 'rzp_test_vGryABnhipIEr8',
    key_secret: process.env.RAZORPAY_SECRET_KEY || 'MiZtgygveiXuyxMohGrLj6QS'
});

const createFailedRazorpayOrder = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const orderID = req.body.orderId
        const orderData = await Order.findById(orderID)
        const totalAmount = orderData.totalPrice;
        const orderId = uuidv4();
        const amount = totalAmount * 100;
        const options = {
            amount: amount,
            currency: 'INR',
            receipt: orderId,
            payment_capture: 1
        };
        const response = await razorpayInstance.orders.create(options);
        res.json({
            orderId: response.id,
            amount: response.amount
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to create Razorpay order' });
    }
}

const verifyAndUpdateFailedOrder = async(req, res)=>{
    try {
        const { paymentId, orderId,failedOrderId } = req.body;
        const payment = await razorpayInstance.payments.fetch(paymentId);
        if (payment.status === 'captured' && payment.order_id === orderId) {
            const userId = req.session.user_id;

            const failedOrderData = await Order.findById(failedOrderId);

            const orderItems = failedOrderData.items;
            for (const item of orderItems) {
                const product = await Product.findById(item.productId);
                if (!product) {
                    throw new Error(`Product with ID ${item.productId} not found.`);
                }
                product.stock -= item.quantity;
                product.unitSold += item.quantity;
                await product.save();
            }

            failedOrderData.paymentStatus = 'Completed';
            await failedOrderData.save();
            await Cart.findOneAndUpdate({ userId }, { $set: { items: [], totalPrice: 0 } });


            const transaction = new TransactionMOdel({
                userId: req.session.user_id,
                orderId: failedOrderData._id,
                description: 'Payment for order',
                amount: failedOrderData.totalPrice
            });
            await transaction.save();



            res.status(200).json({ message: 'Order placed successfully' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to complete payment' });
    }
}

const createRazorpayOrder = async (req, res) => {
    try {
        const { addressId, billingAddressId, shippingRate } = req.body;
        const userId = req.session.user_id;
        const cartData = await Cart.findOne({ userId });
        const totalAmount = cartData.totalPrice + shippingRate;
        const orderId = uuidv4();
        const amount = totalAmount * 100;
        const options = {
            amount: amount,
            currency: 'INR',
            receipt: orderId,
            payment_capture: 1
        };
        const response = await razorpayInstance.orders.create(options);
        res.json({
            orderId: response.id,
            amount: response.amount
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to create Razorpay order' });
    }
}

const verifyAndSaveOrder = async (req, res) => {
    try {
        const { paymentStats, paymentId, orderId, addressId, billingAddressId, cartId, shippingRate } = req.body;
        const payment = await razorpayInstance.payments.fetch(paymentId);
        if (paymentStats && payment.status === 'captured' && payment.order_id === orderId) {
            const userId = req.session.user_id;
            const generateOrderId = () => {
                const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                let orderId = '';
                for (let i = 0; i < 8; i++) {
                    orderId += characters.charAt(Math.floor(Math.random() * characters.length));
                }
                return orderId;
            };
            const cartItems = await Cart.findById(cartId)
                .populate({
                    path: 'items.productId',
                    populate: {
                        path: 'category',
                        model: 'Category'
                    }
                });
            const totalPrice = cartItems.totalPrice+shippingRate;
            const orderItems = cartItems.items.map(item => ({
                orderId: generateOrderId(),
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                price: item.price
            }));

            for (const item of orderItems) {
                const product = await Product.findById(item.productId);
                if (!product) {
                    throw new Error(`Product with ID ${item.productId} not found.`);
                }
                product.stock -= item.quantity;
                product.unitSold += item.quantity;
                await product.save();
            }

            const order = new Order({
                userId: cartItems.userId,
                items: orderItems,
                totalPrice,
                addressId,
                billingAddressId,
                paymentMethod: 'RAZORPAY',
                paymentStatus: 'Completed',
                status: 'Pending',
                shippingRate: shippingRate
            });

            await order.save();
            await Cart.findOneAndUpdate({ userId }, { $set: { items: [], totalPrice: 0 } });

            const orderData = await Order.findOne({ userId }).sort({ createdAt: -1 });;

            const transaction = new TransactionMOdel({
                userId: userId,
                orderId: orderData._id,
                description: 'Payment for order',
                amount: totalPrice
            });
            await transaction.save();



            res.status(200).json({ message: 'Order placed successfully' });
        } else {
            const userId = req.session.user_id;
            const cartItems = await Cart.findById(cartId)
                .populate({
                    path: 'items.productId',
                    populate: {
                        path: 'category',
                        model: 'Category'
                    }
                });
            const generateOrderId = () => {
                const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                let orderId = '';
                for (let i = 0; i < 8; i++) {
                    orderId += characters.charAt(Math.floor(Math.random() * characters.length));
                }
                return orderId;
            };
            
            const totalPrice = cartItems.totalPrice;
            const orderItems = cartItems.items.map(item => ({
                orderId: generateOrderId(),
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                price: item.price
            }));


            const order = new Order({
                userId: cartItems.userId,
                items: orderItems,
                totalPrice,
                addressId,
                billingAddressId,
                paymentMethod: 'RAZORPAY',
                paymentStatus: 'Failed',
                status: 'Pending',
                shippingRate: shippingRate
            });
            await order.save();
            await Cart.findOneAndUpdate({ userId }, { $set: { items: [], totalPrice: 0 } });
            res.status(200).json({ message: 'Order placed with payment failure' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to verify and save order' });
    }
}

const placeOrder = async (req, res) => {
    try {
        const { paymentMethod, addressId, billingAddressId, shippingRate } = req.body;
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

        for (const item of cartItems.items) {
            if (item.quantity > item.productId.stock) {
                return res.status(400).json({ message: `The quantity of "${item.productId.productName}" in your cart exceeds the available stock.` });
            }
        }

        totalPrice = cartItems.totalPrice+shippingRate;

        const orderItems = cartItems.items.map(item => ({
            orderId: generateOrderId(),
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            price: item.price
        }));

        for (const item of orderItems) {
            const product = await Product.findById(item.productId);
            if (!product) {
                throw new Error(`Product with ID ${item.productId} not found.`);
            }
            product.stock -= item.quantity;
            product.unitSold+= item.quantity;
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
            shippingRate:shippingRate,
            createdAt: new Date()
        });

        await order.save();
        await Cart.findOneAndUpdate({ userId }, { $set: { items: [], totalPrice: 0 } });
        res.status(201).json({ message: 'Order placed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to place order' });
    }
}

const placeWalletOrder = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const userWallet = await Wallet.findOne({ userId });
        const { paymentMethod, addressId, billingAddressId,shippingRate } = req.body;

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

        for (const item of cartItems.items) {
            if (item.quantity > item.productId.stock) {
                return res.status(400).json({ message: `The quantity of "${item.productId.productName}" in your cart exceeds the available stock.` });
            }
        }

        totalPrice = cartItems.totalPrice+shippingRate;

        const orderItems = cartItems.items.map(item => ({
            orderId: generateOrderId(),
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            price: item.price
        }));

        for (const item of orderItems) {
            const product = await Product.findById(item.productId);
            if (!product) {
                throw new Error(`Product with ID ${item.productId} not found.`);
            }
            product.stock -= item.quantity;
            product.unitSold += item.quantity;
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
            shippingRate:shippingRate,
            createdAt: new Date()
        });

        userWallet.balance -= totalPrice;
        userWallet.debit += totalPrice;
        await userWallet.save();

        await order.save();
        await Cart.findOneAndUpdate({ userId }, { $set: { items: [], totalPrice: 0 } });

        const transaction = new TransactionMOdel({
            userId: userId,
            orderId: order._id,
            description: 'Ordered using wallet',
            amount: totalPrice
        });
        await transaction.save();

        res.status(201).json({ message: 'Order placed successfully' });

    } catch (error) {
        console.log(error.message);
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



module.exports = {
    loadCart,
    addToCart,
    removeItem,
    removeAllItemsFromCart,
    updateCartItemQuantity,
    checkoutLoad,
    calculateShippingCharge,
    createRazorpayOrder,
    createFailedRazorpayOrder,
    verifyAndSaveOrder,
    verifyAndUpdateFailedOrder,
    placeOrder,
    placeWalletOrder,
    orderSuccessLoad,
    applyCoupon,
    removeCoupon
}