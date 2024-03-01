const express = require("express");
const userController = require("../controllers/userController")
const account_route = express();
const session = require("express-session");
const config = require("../config/config")
const auth = require("../middleware/auth");

account_route.use(session({ secret: config.sessionSecret }));

account_route.set('views', './views/users');
account_route.use(express.static('public'));

account_route.get('/',userController.loadUserAccount);
account_route.post('/add-address', userController.addAddress);
account_route.get('/edit-address', userController.editAddress);
account_route.post('/edit-address', userController.updateAddress);
account_route.get('/delete-address', userController.deleteAddress);
account_route.get('/order-details',userController.orderDetails);
account_route.post('/orders/cancel-order', userController.cancelOrder);
module.exports = account_route;