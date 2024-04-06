const express = require("express");
const userController = require("../controllers/userController")
const user_route = express();
const session = require("express-session");
const config = require("../config/config")
const auth = require("../middleware/auth");
const storage = require("../config/multerStorage");

user_route.use(session({ secret: config.sessionSecret }));

user_route.set('views', './views/users');
const multer = require("multer");

user_route.use(express.static('public'));


const upload = multer({ storage: storage.userStorage })


user_route.get('/register', auth.isLogout, userController.loadRegister);
user_route.post('/generate-otp', userController.generateOtp);
user_route.post('/verify-otp', userController.verifyOtp);
user_route.post('/resend-otp', userController.resendOtp);

user_route.get('/', auth.isLogout, auth.preventCaching, userController.loadGuest);

user_route.get('/home',auth.isBlocked, auth.isLogin, auth.preventCaching, userController.loadHome);

user_route.get('/login', auth.isLogout, auth.preventCaching, userController.loginLoad);
user_route.post('/login', auth.preventCaching, userController.verifyLogin);
user_route.get('/forgot-password', userController.forgotPassword);
user_route.post('/forgot-password', userController.verifyEmailOtp);
user_route.post('/reset-password', userController.resetPassword);
user_route.get('/logout', auth.isLogin, userController.userLogout);

user_route.get('/edit', auth.isLogin, userController.editLoad);
user_route.post('/edit', auth.preventCaching, upload.single('image'), userController.updateProfile);


user_route.get('/home-product-details', userController.loadProductDetails);
user_route.get('/home/shop', userController.loadShop);
user_route.get('/shop/search', userController.shopFilter);

user_route.get('/search',userController.productSearch);

user_route.get('/home/wishlist', userController.loadWishlist)

user_route.post('/home/add-to-wishlist', userController.addToWishlist);
user_route.post('/home/remove-from-wishlist', userController.removeFromWishlist);

module.exports = user_route;
