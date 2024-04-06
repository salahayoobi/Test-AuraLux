const User = require("../models/userModel");
const Address = require("../models/addressModel");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const otpGenerator = require('otp-generator');
const Product = require("../models/productModel")
const Cart = require("../models/cartModel");
const Order = require("../models/orderModel");
const Wishlist = require("../models/wishlistModel");
const Wallet = require("../models/walletModel");
const TransactionModel = require("../models/transactionModel");
const Coupons = require("../models/couponModel");
const jwt = require("jsonwebtoken");
const secretKey = 'your-secret-key';
const Razorpay = require('razorpay');
const path = require('path');
const pdf = require('html-pdf');
const fs = require('fs');
const ejs = require('ejs');

const securePassword = async (password) => {
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        return hashedPassword;

    } catch (error) {
        console.log(error.message);
    }
}

const sendVerifyMail = async (name, email, user_id) => {
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: 'test@gmail.com',
                pass: 'password'
            }
        });
        const mailOptions = {
            from: 'salahudheena4@gmail.com',
            to: email,
            subject: 'For Verification mail',
            html: '<p>Hi ' + name + ', please click here to <a href="http://localhost:3000/verify?id=' + user_id + '"> verify </a> your mail. </p>'
        }
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log("Email has been sent:-", info.response);
            }
        })
    } catch (error) {
        console.log(error.message);
    }

}

const loadRegister = async (req, res) => {
    try {
        res.render('registration')
    } catch (error) {
        console.log(error.message)
    }

}

// **********************AuraLux***************************

const generateOtp = async (req, res) => {
    try {
        const name = req.body.name.trim();
        const email = req.body.email.trim();
        const mobile = req.body.mobile.trim();
        const password = req.body.password;
        const userName = req.body.userName.trim();

        // Validation
        const nameRegex = /^[a-zA-Z]+(?:\s[a-zA-Z]+)*$/;

        if (!name || !name.match(nameRegex) || /^\s+$/.test(name)) {
            return res.render('registration', { message: 'Invalid name' });
        }

        if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
            return res.render('registration', { message: 'Invalid email' });
        }

        // Check if the email is already in use (you need to implement this based on your database)
        const emailExists = await User.exists({ email });
        if (emailExists) {
            return res.render('registration', { message: 'Email already in use' });
        }

        if (!mobile || !/^\d{10}$/.test(mobile) || mobile === '0000000000') {
            return res.render('registration', { message: 'Invalid mobile number' });
        }

        const mobileExists = await User.exists({ mobile });
        if (mobileExists) {
            return res.render('registration', { message: 'Mobile already in use' });
        }

        const userNameExists = await User.exists({ userName });
        if (userNameExists) {
            return res.render('registration', { message: 'User Name already in use' });
        }

        if (!password || password.length < 8) {
            return res.render('registration', { message: 'Password must be at least 8 characters' });
        }

        const { otp, name: uname, email: userEmail } = await sendVerifyOtp(name, email);

        // Set expiration time for OTP
        const expirationTime = new Date();
        expirationTime.setMinutes(expirationTime.getMinutes() + 2); // OTP expires after 2 minutes
        req.session.registerSession = { name, email, password, mobile, userName, password, otp, expirationTime };

        res.render('verify-otp');
    } catch (error) {
        console.log(error.message);
        res.render('verify-otp', { message: 'Error generating OTP' });
    }
}

const verifyOtp = async (req, res) => {
    try {
        const enteredOtp = req.body.otp;
        const sessionOtp = req.session.registerSession.otp;
        const expirationTime = new Date(req.session.registerSession.expirationTime);

        if (expirationTime < new Date()) {
            return res.render('verify-otp', { message: 'OTP has expired', ...req.body });
        }

        if (enteredOtp === sessionOtp) {
            const spassword = await securePassword(req.session.registerSession.password);
            const user = new User({
                name: req.session.registerSession.name,
                email: req.session.registerSession.email,
                mobile: req.session.registerSession.mobile,
                userName: req.session.registerSession.userName,
                password: spassword,
                is_blocked: 0,
                is_admin: 0,
                is_verified: 1,
            });

            const userData = await user.save();

            if (userData) {
                res.render('login', { successMessage: 'Successfully Registered, Please Sign In' });
            } else {
                res.render('login', { message: 'Registration Failed' });
            }
        } else {
            res.render('verify-otp', { message: 'Incorrect OTP entered', ...req.body });
        }
    } catch (error) {
        console.log(error.message);
        res.render('verify-otp', { message: 'Error verifying OTP', ...req.body });
    }
}


const sendVerifyOtp = async (name, email) => {
    try {
        const otp = otpGenerator.generate(6, { upperCase: false, specialChars: false, alphabets: false });

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: 'salahudheena4@gmail.com',
                pass: 'wubqgexowqrgfdol'
            },
        });

        const mailOptions = {
            from: 'salahudheena4@gmail.com',
            to: email,
            subject: 'OTP for Verification',
            html: `<p>Hi ${name}, your OTP is ${otp}. Use this OTP to verify your email.</p>`,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Email has been sent:", info.response);

        return { otp, name, email };
    } catch (error) {
        console.error(error.message);
        throw new Error("Error sending OTP via email");
    }
};

const resendOtp = async (req, res) => {
    try {
        const { name, email } = req.session.registerSession;
        const { otp } = await sendVerifyOtp(name, email);

        const expirationTime = new Date();
        expirationTime.setMinutes(expirationTime.getMinutes() + 2);
        req.session.registerSession.expirationTime = expirationTime
        req.session.registerSession.otp = otp;

        res.status(200).json({ message: 'OTP resent successfully' });
    } catch (error) {
        console.error('Error resending OTP:', error.message);
        res.status(500).json({ message: 'Error resending OTP' });
    }
};


const forgotPassword = async (req, res) => {
    try {
        res.render('forgot-password',);
    } catch (error) {
        console.log(error.message);
    }
}

const sendEmailOtp = async (email) => {
    try {
        const otp = otpGenerator.generate(6, { upperCase: false, specialChars: false, alphabets: false });

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: 'salahudheena4@gmail.com',
                pass: 'wubqgexowqrgfdol'
            },
        });

        const mailOptions = {
            from: 'salahudheena4@gmail.com',
            to: email,
            subject: 'OTP for Verification',
            html: `<p>Hi, your OTP is ${otp}. Use this OTP to verify your email.</p>`,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Email has been sent:", info.response);

        return { otp, email }; // Return the OTP so that it can be used for verification on the server side
    } catch (error) {
        console.error(error.message);
        throw new Error("Error sending OTP via email");
    }
};


const verifyEmailOtp = async (req, res) => {
    try {
        const userEmail = req.body.email.trim();;
        const userExists = await User.findOne({ email: userEmail });
        if (userExists) {
            const { otp, email } = await sendEmailOtp(userEmail);
            res.render('reset-password', {
                email,
                generatedOtp: otp,
            });
        } else {
            return res.render('forgot-password', { message: 'User not found', ...req.body });
        }
    } catch (error) {
        console.log(error.message);
    }
}

const resetPassword = async (req, res) => {
    try {
        const enteredOtp = req.body.otp;
        const generatedOtp = req.body.generatedOtp;
        const newPassword = req.body.password;
        const confirmNewPassword = req.body.confirmPassword

        if (enteredOtp === generatedOtp && newPassword === confirmNewPassword) {
            const spassword = await securePassword(req.body.password);
            const userData = await User.findOneAndUpdate({ email: req.body.email }, { $set: { password: spassword } });
        }
        res.render('login', { message: 'Password Reset Succesfull', ...req.body });
    } catch (error) {
        console.log(error.message)
        res.render('forgot-password', { message: 'Error verifying OTP', ...req.body });
    }
}

//Login User

const loginLoad = async (req, res) => {
    try {
        res.render('login')
    } catch (error) {
        console.log(error.message)
    }
}
const loadGuest = async (req, res) => {
    try {
        const productsData = await Product.find();
        res.render('guest', { products: productsData });
    } catch (error) {
        console.log(error.message)
    }
}

const verifyLogin = async (req, res) => {
    try {
        const userName = req.body.userName;
        const password = req.body.password;
        const userData = await User.findOne({
            $or: [
                { email: userName },
                { userName: userName }
            ]
        });
        if (userData) {

            const passwordMatch = await bcrypt.compare(password, userData.password);
            if (passwordMatch) {
                if (userData.is_verified === 0) {
                    res.render('login', { message: "Please verify your email." });
                } else if (userData.is_blocked === 1) {
                    res.render('login', { message: "Sorry, your account is blocked. Please contact support." });
                } else {
                    req.session.user_id = userData._id;
                    res.redirect('/home');
                }
            } else {
                res.render('login', { message: "Email and password incorrect" });
            }
        } else {
            res.render('login', { message: "Email and password incorrect" });
        }

    } catch (error) {
        console.log(error.message);
    }
}



const loadHome = async (req, res) => {
    try {
        req.session.sortingOption = 'featured';
        const productsData = await Product.find();
        const userData = await User.findById({ _id: req.session.user_id });
        const userId = req.session.user_id;
        let wishlistData = await Wishlist.findOne({ userId }).populate('items.productId');
        const cartData = await Cart.findOne({ userId })
            .populate({
                path: 'items.productId',
                populate: {
                    path: 'category',
                    model: 'Category'
                }
            });
        res.render('userLogin', { user: userData, products: productsData, cart: cartData, wishlist: wishlistData });
    } catch (error) {
        console.log(error.message);
    }
}


const userLogout = async (req, res) => {
    try {
        req.session.destroy();
        res.redirect('/');

    } catch (error) {
        console.log(error.message);
    }
}

const editLoad = async (req, res) => {
    try {
        const id = req.query.id;
        const userData = await User.findById({ _id: id });
        if (userData) {
            res.render('edit', { user: userData });
        } else {
            res.redirect('/home');
        }
    } catch (error) {
        console.log(error.message);
    }
}

const updateProfile = async (req, res) => {
    try {
        if (req.file) {
            const userData = await User.findByIdAndUpdate({ _id: req.body.user_id }, { $set: { name: req.body.name, email: req.body.email, mobile: req.body.mobile, image: req.file.filename } });
        } else {
            const userData = await User.findByIdAndUpdate({ _id: req.body.user_id }, { $set: { name: req.body.name, email: req.body.email, mobile: req.body.mobile } });
        }

        res.redirect('/home');
    } catch (error) {
        console.log(error.message);
    }
}

const loadProductDetails = async (req, res) => {
    try {
        const id = req.query.id;
        const isUserLogin = req.session.user_id;
        const productDetail = await Product.findById(id).populate('category');
        if (!productDetail) {
            return res.render('page404', { isUserLogin });
        }
        const userId = req.session.user_id;

        let wishlist = await Wishlist.findOne({ userId }).populate('items.productId');
        const isWishlisted = wishlist && wishlist.items.some(item => item.productId.equals(id));

        const cartData = await Cart.findOne({ userId })
            .populate({
                path: 'items.productId',
                populate: {
                    path: 'category',
                    model: 'Category'
                }
            });
        
        

        if (!productDetail.category) {
            return res.status(500).send('Product category is missing');
        }

        res.render('home-product-details', { product: productDetail, isUserLogin, cart: cartData, wishlist, isWishlisted });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
}

const loadPage404 = async (req, res) => {
    try {
        res.render('page404');
    } catch (error) {
        console.log(error.message);
    }
}

//********************************************** User Account ********************************/

const loadUserAccount = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const wishlist = await Wishlist.findOne({ userId }).populate('items.productId');
        const userDetails = await User.findById(userId).populate('addresses');
        const orders = await Order.find({ userId }).sort({ createdAt: -1 }).populate('items.productId');
        const coupons = await Coupons.find({ isActive: true });
        const cartData = await Cart.findOne({ userId })
            .populate({
                path: 'items.productId',
                populate: {
                    path: 'category',
                    model: 'Category'
                }
            });
        res.render('user-account', {wishlist, user: userDetails, orders: orders, cart: cartData, redirectToAddress: req.query.redirectToAddress, coupons });
    } catch (error) {
        console.log(error.message);
    }
}


const addAddress = async (req, res) => {
    try {
        const address = new Address({
            street: req.body.street,
            city: req.body.city,
            state: req.body.state,
            postalCode: req.body.postalCode,
            country: req.body.country
        });
        const userAddress = await address.save();
        if (userAddress) {
            await User.findByIdAndUpdate(req.session.user_id, { $push: { addresses: userAddress._id } });
            const userData = await User.findById(req.session.user_id).populate('addresses');
            res.redirect('/account?redirectToAddress=true');
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};

const editAddress = async (req, res) => {
    try {
        const addressdata = await Address.findById(req.query.id);
        res.render('edit-address', { address: addressdata });
    } catch (error) {
        console.log(error.message);
    }
}

const updateAddress = async (req, res) => {
    try {
        const street = req.body.street;
        const city = req.body.city;
        const state = req.body.state;
        const postalCode = req.body.postalCode;
        const country = req.body.country;
        const updatedAddress = await Address.findByIdAndUpdate({ _id: req.query.id },
            { $set: { street: street, city: city, state: state, postalCode: postalCode, country: country } });
        if (updateAddress) {
            res.redirect('/account?redirectToAddress=true');
        }
    } catch (error) {
        console.log(error.message);
    }
}

const deleteAddress = async (req, res) => {
    try {
        const deletedAddress = await Address.findByIdAndDelete(req.query.id);
        if (!deletedAddress) {
            return res.status(404).json({ error: "Address not found" });
        }
        res.redirect('/account?redirectToAddress=true&deleted=true');
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ error: "Internal server error" });
    }
}

const editAccountDetails = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const { email, mobile } = req.body;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { email: email, mobile: mobile },
            { new: true }
        );
        if (updatedUser) {
            res.redirect('/account');
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
}


const changePassword = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const currentPassword = req.body.currentPassword.trim();
        const newPassword = req.body.newPassword.trim();
        const confirmNewPassword = req.body.confirmNewPassword.trim();
        const userData = await User.findById(userId);

        const passwordMatch = await bcrypt.compare(currentPassword, userData.password);
        if (passwordMatch) {
            if (newPassword === confirmNewPassword) {
                const hashedPassword = await securePassword(newPassword);
                userData.password = hashedPassword;
                await userData.save();
                res.send({ success: true, message: "Password changed successfully" });
            } else {
                res.send({ success: false, message: "New password and Confirm New Passwword do not match" });
            }
        } else {
            res.send({ success: false, message: "Current Password does not match" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, message: "An error occurred while changing password" });
    }
};


const orderDetails = async (req, res) => {
    try {
        const orderNumber = req.query.id;
        const orderData = await Order.findById(orderNumber)
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

        const addressData = await Address.findById(orderData.addressId);
        const billingAddressData = await Address.findById(orderData.billingAddressId);


        res.render('order-details', { order: orderData, address: addressData, billingAddress: billingAddressData });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Error fetching order details');
    }
}

const generateInvoice = async (req, res) => {
    try {
        const orderId = req.query.orderId;
        const orderData = await Order.findById(orderId)
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

        const templatePath = path.join(__dirname, '..', 'views', 'users', 'invoice.ejs');
        const template = fs.readFileSync(templatePath, 'utf-8');

        const html = ejs.render(template, { order: orderData });

        pdf.create(html).toFile('invoice.pdf', (err, result) => {
            if (err) {
                console.error('Error generating PDF:', err);
                res.status(500).send('Error generating PDF');
            } else {
                res.download('invoice.pdf');
            }
        });

    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send('Error generating PDF');
    }
}

const cancelOrder = async (req, res) => {
    try {
        const { orderId, codCancelReason } = req.body;

        const order = await Order.findByIdAndUpdate(orderId, { status: 'Cancelled', codCancelReason }, { new: true });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        const totalRefundAmount = order.totalPrice;
        const userId = req.session.user_id;

        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = new Wallet({ userId: userId, balance: totalRefundAmount });
        } else {
            if (order.paymentMethod !== "COD") {
                wallet.balance += totalRefundAmount;
                wallet.credit += totalRefundAmount;
            }
        }
        for (const item of order.items) {
            const product = await Product.findById(item.productId);
            if (!product) {
                throw new Error(`Product with ID ${item.productId} not found.`);
            }
            product.stock += item.quantity;
            await product.save();
        }
        await wallet.save();
        if (order.paymentMethod !== "COD") {
            const transaction = new TransactionModel({
                userId: userId,
                orderId: orderId,
                description: 'Order Cancel',
                amount: totalRefundAmount
            });
            await transaction.save();
        }

        res.status(200).json({ message: 'Order cancelled successfully', order });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to cancel order' });
    }
};

const loadShop = async (req, res) => {
    try {
        const userId = req.session.user_id;
        let sortOption = req.session.sortingOption || 'featured';
        let sortOrder = 1;
        const wishlist = await Wishlist.findOne({ userId }).populate('items.productId');
        const productsCount = await Product.countDocuments();

        if (sortOption === 'priceLowToHigh') {
            sortOption = 'price';
            sortOrder = 1;
        } else if (sortOption === 'priceHighToLow') {
            sortOption = 'price';
            sortOrder = -1;
        }

        const page = parseInt(req.query.page) || 1;
        const limit = 6;
        const skip = (page - 1) * limit;

        let productsData;
        if (sortOption === 'featured') {
            productsData = await Product.find().skip(skip).limit(limit);
        } else {
            productsData = await Product.find().sort({ [sortOption]: sortOrder }).skip(skip).limit(limit);
        }

        const totalProducts = await Product.countDocuments();

        const totalPages = Math.ceil(totalProducts / limit);

        const userData = await User.findById(req.session.user_id);
        const cartData = await Cart.findOne({ userId }).populate({
            path: 'items.productId',
            populate: {
                path: 'category',
                model: 'Category'
            }
        });
        res.render('shop', { user: userData, products: productsData, cart: cartData, totalPages, currentPage: page, sortOption, wishlist, productsCount });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Failed to load products');
    }
};


const shopFilter = async (req, res) => {
    try {
        let sortOption = req.query.sort || 'featured';
        let sortOrder = 1;
        console.log("shopFilter sortOption", sortOption);
        req.session.sortingOption = sortOption;
        console.log("shopFilter session", req.session.sortingOption)

        if (sortOption === 'priceLowToHigh') {
            sortOption = 'price';
            sortOrder = 1;
        } else if (sortOption === 'priceHighToLow') {
            sortOption = 'price';
            sortOrder = -1;
        }

        const page = parseInt(req.query.page) || 1;
        const limit = 6;
        const skip = (page - 1) * limit;

        let productsData;
        if (sortOption === 'featured') {
            productsData = await Product.find().skip(skip).limit(limit);
        } else {
            productsData = await Product.find().sort({ [sortOption]: sortOrder }).skip(skip).limit(limit);
        }

        res.json(productsData);
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ error: 'Failed to load products' });
    }
};


const productSearch = async (req, res) => {
    try {
        const query = req.query.query;

        const products = await Product.find({
            $or: [
                { productName: { $regex: query, $options: 'i' } },
                { productBrand: { $regex: query, $options: 'i' } }
            ]
        }).limit(10);
        res.json(products);
    } catch (error) {
        console.error('Error searching for products:', error);
        res.status(500).json({ error: 'Failed to search for products' });
    }
}

const addToWishlist = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const productId = req.body.productId;

        let wishlist = await Wishlist.findOne({ userId }).populate('items.productId');
        if (!wishlist) {
            wishlist = new Wishlist({
                userId,
                items: [{
                    productId
                }]
            });
        } else {
            const existingItem = wishlist.items.find(item => item.productId.equals(productId));
            if (!existingItem) {
                wishlist.items.push({
                    productId
                });
            }
        }
        await wishlist.save();
        res.status(200).json({ message: 'Product added to wishlist successfully', wishlist: wishlist });
    } catch (error) {
        console.log(error.message);
    }
}

const removeFromWishlist = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const productId = req.body.productId;

        let wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            return res.status(404).json({ message: 'Wishlist not found' });
        }

        wishlist.items = wishlist.items.filter(item => !item.productId.equals(productId));

        await wishlist.save();

        res.status(200).json({ message: 'Product removed from wishlist successfully', wishlist: wishlist });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const loadWishlist = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const cartData = await Cart.findOne({ userId })
            .populate({
                path: 'items.productId',
                populate: {
                    path: 'category',
                    model: 'Category'
                }
            });
        const wishlistData = await Wishlist.findOne({ userId })
            .populate({
                path: 'items.productId',
                populate: {
                    path: 'category',
                    model: 'Category'
                }
            });


        res.render('wishlist', { wishlist: wishlistData, cart: cartData });
    } catch (error) {
        console.log(error.message)
    }
}

const loadWallet = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const wishlist = await Wishlist.findOne({ userId }).populate('items.productId');
        const cart = await Cart.findOne({ userId })
            .populate({
                path: 'items.productId',
                populate: {
                    path: 'category',
                    model: 'Category'
                }
            });

        const currentPage = parseInt(req.query.page) || 1;

        const walletData = await Wallet.findOne({ userId });

        const transactionCount = await TransactionModel.countDocuments({
            userId,
            description: { $in: ['Order Cancel', 'Ordered using wallet'] }
        });

        const transactionsData = await TransactionModel.find({
            userId,
            description: { $in: ['Order Cancel', 'Ordered using wallet'] }
        })
            .populate({
                path: 'orderId',
                model: 'Order',
                populate: {
                    path: 'items.productId',
                    model: 'Product'
                }
            })
            .sort({ date: -1 })
            .skip((currentPage - 1) * 5)
            .limit(5);

        res.render('wallet', { wallet: walletData, transaction: transactionsData, transactionCount, currentPage, cart, wishlist });
    } catch (error) {
        console.log(error.message);
    }
}

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_ID_KEY || 'rzp_test_vGryABnhipIEr8',
    key_secret: process.env.RAZORPAY_SECRET_KEY || 'MiZtgygveiXuyxMohGrLj6QS'
});

const walletTopUp = async (req, res) => {
    try {
        const amount = req.body.amount;
        const currency = 'INR';

        const options = {
            amount: amount * 100,
            currency: currency,
            payment_capture: '1',
        };

        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create order' });
    }
}

const updateWallet = async (req, res) => {
    try {
        const amount = Number(req.body.amount);
        const userId = req.session.user_id;

        let wallet = await Wallet.findOne({ userId });

        if (!wallet) {
            wallet = new Wallet({ userId });
        }

        wallet.balance += amount;
        wallet.credit += amount;

        const updatedWallet = await wallet.save();

        res.json(updatedWallet);
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ error: 'Server Error' });
    }
}

module.exports = {
    loadGuest,
    loadRegister,
    generateOtp,
    resendOtp,
    verifyOtp,
    verifyEmailOtp,
    resetPassword,
    loginLoad,
    verifyLogin,
    forgotPassword,
    loadHome,
    userLogout,
    editLoad,
    updateProfile,
    loadProductDetails,
    loadUserAccount,
    addAddress,
    editAddress,
    updateAddress,
    deleteAddress,
    orderDetails,
    generateInvoice,
    cancelOrder,
    loadShop,
    shopFilter,
    productSearch,
    editAccountDetails,
    changePassword,
    addToWishlist,
    removeFromWishlist,
    loadWishlist,
    loadWallet,
    walletTopUp,
    updateWallet

};