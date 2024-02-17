const express = require("express");
const bodyParser = require("body-parser");
const userController = require("../controllers/userController")
const user_route = express();
const session = require("express-session");
const config = require("../config/config")
const auth = require("../middleware/auth");

user_route.use(session({ secret: config.sessionSecret }));

user_route.set('view engine', 'ejs');
user_route.set('views', './views/users');
user_route.use(bodyParser.json());
user_route.use(bodyParser.urlencoded({ extended: true }));

const multer = require("multer");
const path = require("path");

user_route.use(express.static('public'));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../public/userImages'));
    },
    filename: function (req, file, cb) {
        const name = Date.now() + '-' + file.originalname;
        cb(null, name);
    }
});

const upload = multer({ storage: storage })


user_route.get('/register', auth.isLogout, userController.loadRegister);
// user_route.post('/register', upload.single('image'), userController.insertUser);
user_route.post('/generate-otp', userController.generateOtp);
user_route.post('/verify-otp', userController.verifyOtp);
user_route.post('/resend-otp', userController.resendOtp);



// user_route.get('/verify', userController.verifyMail);

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

module.exports = user_route;
