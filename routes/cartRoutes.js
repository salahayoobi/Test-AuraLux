const express = require("express");
const cartController = require("../controllers/cartController");
const cart_route = express();
const session = require("express-session");
const config = require("../config/config")

cart_route.use(session({ secret: config.sessionSecret }));

cart_route.set('views', './views/users');
cart_route.use(express.static('public'));

cart_route.get('/', cartController.loadCart);
cart_route.post('/add-to-cart', cartController.addToCart);
cart_route.get('/data', cartController.loadCart);
cart_route.post('/remove-item', cartController.removeItem);
cart_route.get('/checkout', cartController.checkoutLoad);
cart_route.post('/update-cart-item-quantity', cartController.updateCartItemQuantity);
cart_route.post('/clear-cart', cartController.removeAllItemsFromCart);
cart_route.post('/create-razorpay-order', cartController.createRazorpayOrder);
cart_route.post('/verify-and-save-order', cartController.verifyAndSaveOrder);
cart_route.post('/place-order',cartController.placeOrder);
cart_route.post('/place-wallet-order', cartController.placeWalletOrder);
cart_route.get('/order-success', cartController.orderSuccessLoad);
cart_route.post('/apply-coupon',cartController.applyCoupon);
cart_route.post('/remove-coupon', cartController.removeCoupon);

module.exports = cart_route;