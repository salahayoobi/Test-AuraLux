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
cart_route.post('/place-order',cartController.placeOrder);
cart_route.get('/order-success', cartController.orderSuccessLoad);

module.exports = cart_route;