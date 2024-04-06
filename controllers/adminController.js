const User = require("../models/userModel");
const Product = require("../models/productModel")
const Order = require("../models/orderModel");
const Category = require("../models/categoryModel");
const Coupon = require("../models/couponModel")
const randomstring = require('randomstring');
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const mongoose = require('mongoose');
const pdfkit = require('pdfkit');
const ejs = require('ejs');
const fs = require('fs');
const moment = require('moment');
const Chart = require('chart.js');
const path = require('path');
const pdf = require('html-pdf');
const ExcelJS = require('exceljs');


const addUsermail = async (name, email, password, user_id) => {
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: 'salahudheena4@gmail.com',
                pass: 'wubqgexowqrgfdol'
            }
        });
        const mailOptions = {
            from: 'salahudheena4@gmail.com',
            to: email,
            subject: 'Admin added you and verify your Email',
            html: '<p>Hi ' + name + ', please click here to <a href="http://localhost:3000/verify?id=' + user_id + '"> verify </a> your mail. </p> <br><br> <b>Email: </b>' + email + '<br><b>Password: </b>' + password + ''
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

const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;
    } catch (error) {
        console.log(error.message);
    }
}

const loadLogin = async (req, res) => {
    try {
        res.render('login');
    } catch (error) {
        console.log(error.message);
    }
}

const verifyLogin = async (req, res) => {
    try {
        const email = req.body.email;
        const password = req.body.password;
        const userData = await User.findOne({ email: email });
        if (userData) {
            const passwordMatch = await bcrypt.compare(password, userData.password);
            if (passwordMatch) {
                if (userData.is_admin === 0) {
                    res.render('login', { message: "Email and password in incorrect" });
                } else {
                    req.session.user_id = userData._id;
                    res.redirect("/admin/home");
                }
            } else {
                res.render('login', { message: "Email and password in incorrect" });
            }
        } else {
            res.render('login', { message: "Email and password in incorrect" });
        }
    } catch (error) {
        console.log(error.message);
    }
}

const generateSalesData = async (interval) => {
    let salesData;
    let startDate, endDate;
    let labels;

    switch (interval) {
        case 'daily':
            startDate = moment().subtract(6, 'days').startOf('day');
            endDate = moment().endOf('day');
            labels = [];
            for (let i = 0; i < 5; i++) {
                labels.push(moment().subtract(6 - i, 'days').format('dddd'));
            }
            labels.push('Yesterday');
            labels.push('Today');
            break;
        case 'weekly':
            startDate = moment().subtract(4, 'weeks').startOf('week');
            endDate = moment().endOf('day');
            labels = ['3 weeks ago', '2 weeks ago', 'Previous week', 'This week'];
            break;

        case 'monthly':
            const currentMonth = moment().month();
            startDate = moment().subtract(5, 'months').startOf('month');
            endDate = moment().endOf('month');
            labels = [];
            for (let i = 0; i < 6; i++) {
                const monthLabel = startDate.clone().add(i, 'months').format('MMMM');
                labels.push(monthLabel);
            }
            break;
        case 'yearly':
            const currentYear = moment().year();
            startDate = moment().subtract(4, 'years').startOf('year');
            endDate = moment().endOf('year');
            labels = [];
            for (let i = 0; i < 5; i++) {
                const yearLabel = startDate.clone().add(i, 'years').format('YYYY');
                labels.push(yearLabel);
            }
            break;
        default:
            startDate = moment().startOf('day');
            endDate = moment().endOf('day');
            labels = [];
    }

    try {
        if (interval === 'daily') {
            const dailySalesData = [];

            for (let i = 0; i < 7; i++) {
                salesData = await Order.aggregate([
                    {
                        $match: {
                            createdAt: { $gte: startDate.clone().add(i, 'days').toDate(), $lte: startDate.clone().add(i + 1, 'days').toDate() },
                            status: 'Delivered'
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalSales: { $sum: '$totalPrice' }
                        }
                    }
                ]);
                dailySalesData.push(salesData.length > 0 ? salesData[0].totalSales : 0);
            }

            return { salesData: dailySalesData, labels };
        } else if (interval === 'weekly') {
            const weeklySalesData = [];
            for (let i = 0; i < 4; i++) {
                const startOfWeek = startDate.clone().add(i + 1, 'weeks');
                const endOfWeek = startOfWeek.clone().endOf('week');

                salesData = await Order.aggregate([
                    {
                        $match: {
                            createdAt: { $gte: startOfWeek.toDate(), $lte: endOfWeek.toDate() },
                            status: 'Delivered'
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalSales: { $sum: '$totalPrice' }
                        }
                    }
                ]);

                weeklySalesData.push(salesData.length > 0 ? salesData[0].totalSales : 0);
            }

            return { salesData: weeklySalesData, labels };
        } else if (interval === 'monthly') {
            const monthlySalesData = [];
            for (let i = 0; i < 6; i++) {
                const startOfMonth = moment().subtract(5 - i, 'months').startOf('month');
                const endOfMonth = moment().subtract(5 - i, 'months').endOf('month');

                salesData = await Order.aggregate([
                    {
                        $match: {
                            createdAt: { $gte: startOfMonth.toDate(), $lte: endOfMonth.toDate() },
                            status: 'Delivered'
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalSales: { $sum: '$totalPrice' }
                        }
                    }
                ]);

                monthlySalesData.push(salesData.length > 0 ? salesData[0].totalSales : 0);
            }

            return { salesData: monthlySalesData, labels };
        } else if (interval === 'yearly') {
            const yearlySalesData = [];
            for (let i = 0; i < 5; i++) {
                const startOfYear = moment().subtract(4 - i, 'years').startOf('year');
                const endOfYear = moment().subtract(4 - i, 'years').endOf('year');

                salesData = await Order.aggregate([
                    {
                        $match: {
                            createdAt: { $gte: startOfYear.toDate(), $lte: endOfYear.toDate() },
                            status: 'Delivered'
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalSales: { $sum: '$totalPrice' }
                        }
                    }
                ]);

                yearlySalesData.push(salesData.length > 0 ? salesData[0].totalSales : 0);
            }

            return { salesData: yearlySalesData, labels };
        }
    } catch (error) {
        throw new Error('Error fetching sales data');
    }
};



const salesData = async (req, res) => {
    try {
        const dailySales = await generateSalesData('daily');
        const weeklySales = await generateSalesData('weekly');
        const monthlySales = await generateSalesData('monthly');
        const yearlySales = await generateSalesData('yearly');


        res.json({
            dailySales,
            weeklySales,
            monthlySales,
            yearlySales
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};

const loadDashboard = async (req, res) => {
    try {
        const dailySales = await generateSalesData('daily');
        const weeklySales = await generateSalesData('weekly');
        const monthlySales = await generateSalesData('monthly');
        const yearlySales = await generateSalesData('yearly');

        const productCount = await Product.countDocuments({});
        const categoryCount = await Category.countDocuments({});
        const totalOrders = await Order.countDocuments({});
        const delivered = await Order.countDocuments({ status: 'Delivered' });
        const processing = await Order.countDocuments({ status: 'Processing' });
        const cancelled = await Order.countDocuments({ status: 'Cancelled' });
        const returned = await Order.countDocuments({ status: 'Returned' });

        const revenue = await Order.aggregate([
            { $match: { status: 'Delivered' } },
            { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' } } }
        ]);
        const totalRevenue = revenue.length > 0 ? revenue[0].totalRevenue : 0;

        const currentDate = new Date();
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const monthlyEarn = await Order.aggregate([
            {
                $match: {
                    status: 'Delivered',
                    createdAt: { $gte: startOfMonth }
                }
            },
            { $group: { _id: null, monthlyEarning: { $sum: '$totalPrice' } } }
        ]);
        const monthlyEarnings = monthlyEarn.length > 0 ? monthlyEarn[0].monthlyEarning : 0;

        const topSellingProducts = await Product.find().populate('category').sort({ unitSold: -1 }).limit(5);
        const recentlyPlacedOrders = await Order.find()
            .sort({ createdAt: -1 })
            .limit(6)
            .populate({
                path: 'userId',
                select: 'name email mobile userName'
            })
            .populate({
                path: 'items.productId',
                select: 'productName productBrand description price'
            });

        
        const topBrands = await Product.aggregate([
            { $group: { _id: "$productBrand", totalUnitsSold: { $sum: "$unitSold" } } },
            { $sort: { totalUnitsSold: -1 } },
            { $limit: 5 }
        ]);
        const [totalUnitsSold] = await Product.aggregate([
            {
                $group: {
                    _id: null,
                    totalUnitsSold: { $sum: "$unitSold" }
                }
            }
        ]);
    
        const result = await Category.aggregate([
            {
                $lookup: {
                    from: "products", // Name of the Product collection
                    localField: "_id",
                    foreignField: "category",
                    as: "products"
                }
            },
            {
                $unwind: "$products"
            },
            {
                $group: {
                    _id: "$_id",
                    name: { $first: "$name" },
                    totalUnitsSold: { $sum: "$products.unitSold" }
                }
            },
            {
                $project: {
                    _id: 0, // Exclude _id from the output
                    name: 1,
                    percentage: {
                        $multiply: [
                            { $divide: ["$totalUnitsSold", totalUnitsSold.totalUnitsSold] },
                            100
                        ]
                    }
                }
            },
            {
                $sort: { totalUnitsSold: -1 } // Sort by totalUnitsSold in descending order
            }
        ]);
        const sortedResult = result.sort((a, b) => b.percentage - a.percentage);
        
        res.render('adminDashboard', {
            admin: req.session.user_id,
            dailySales,
            weeklySales,
            monthlySales,
            yearlySales,
            totalOrders,
            delivered,
            processing,
            cancelled,
            returned,
            categoryCount,
            productCount,
            totalRevenue,
            monthlyEarnings,
            topSellingProducts,
            recentlyPlacedOrders,
            topCategories: sortedResult,
            topBrands
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
}

const loadAdminProfile = async (req, res) => {
    try {
        const userData = await User.findById({ _id: req.session.user_id });
        res.render('home', { admin: userData });
    } catch (error) {
        console.log(error.message)
    }
}


const loadProductsListPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const perPage = 10;
        let query = {};

        if (req.query.category && req.query.category !== 'All category') {
            const category = await Category.findOne({ name: req.query.category });
            if (category) {
                query.category = category._id;
            }
        }

        const productsCount = await Product.countDocuments(query);
        const totalPages = Math.ceil(productsCount / perPage);
        const categoriesData = await Category.find();
        const productsData = await Product.find(query)
            .populate('category')
            .skip((page - 1) * perPage)
            .limit(perPage);

        res.render('page-products-list', {
            products: productsData,
            totalPages: totalPages,
            currentPage: page,
            categories: categoriesData,
            category: req.query.category || 'All category'
        });
    } catch (error) {
        console.log(error.message);
    }
}





const addProductLoad = async (req, res) => {
    try {
        const categories = await Category.find();
        res.render('add-new-product', { categories });
    } catch (error) {
        console.log(error.message)
    }
}

const addNewProduct = async (req, res) => {
    try {
        const categories = await Category.find();

        const productName = req.body.productName;
        const productBrand = req.body.productBrand;
        const description = req.body.productDescription;
        const stock = req.body.stock;
        const allowedMIMETypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
        const filenames = req.files.map(file => {
            if (!allowedMIMETypes.includes(file.mimetype)) {
                return res.render('add-new-product', { message: 'Invalid file type. Only JPEG, PNG, WEBP and SVG images are allowed.', categories });
            }
            return file.filename;
        });
        const price = req.body.price;
        const category = req.body.category;
        const subCategory = req.body.subCategory;

        const productNameExists = await Product.exists({ productName });
        if (productNameExists) {
            return res.render('add-new-product', { message: 'Product name already in use', categories });
        }


        const product = new Product({
            productName: productName,
            productBrand: productBrand,
            description: description,
            image: filenames,
            price: price,
            offerPrice: price,
            category: category,
            subCategory: subCategory,
            stock: stock
        });

        const productsData = await product.save();
        if (productsData) {
            res.redirect('/admin/page-products-list');
        } else {
            res.render('new-user', { message: 'Something went wrong' });
        }

    } catch (error) {
        console.log(error.message);
    }
}

const editProductLoad = async (req, res) => {
    try {
        const productId = req.query.id;
        const productData = await Product.findById(productId).populate('category');
        const categories = await Category.find();
        res.render('edit-product', { product: productData, categories });
    } catch (error) {
        console.log(error.message);
    }
}

const updateProduct = async (req, res) => {
    try {
        const productId = req.body.productId;
        const productName = req.body.productName;
        const productBrand = req.body.productBrand;
        const description = req.body.productDescription;
        const price = req.body.price;
        const category = req.body.category;
        const subCategory = req.body.subCategory;
        const stock = req.body.stock;

        const product = await Product.findById(productId);


        let filenames = product.image || [];
        for (let i = 1; i <= 3; i++) {
            const fieldName = `image${i}`;
            const file = req.files[fieldName];
            if (file && file.length > 0) {

                filenames[i - 1] = file[0].filename;
            }
        }

        const productData = await Product.findByIdAndUpdate(productId, {
            $set: {
                productName: productName,
                productBrand: productBrand,
                description: description,
                image: filenames,
                price: price,
                offerPrice: price,
                category: category,
                subCategory: subCategory,
                stock: stock
            }
        }, { new: true });

        res.redirect('/admin/page-products-list');
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
}



const deleteProduct = async (req, res) => {
    try {
        const productId = req.query.id;
        await Product.deleteOne({ _id: productId });
        res.redirect('/admin/page-products-list');
    } catch (error) {
        console.log(error.message);
    }
}

const logout = async (req, res) => {
    try {
        req.session.destroy();
        res.redirect('/admin');
    } catch (error) {
        console.log(error.message);
    }
}

const adminDashboard = async (req, res) => {
    try {
        var search = '';
        if (req.query.search) {
            search = req.query.search;
        }
        const usersData = await User.find({
            is_admin: 0,
            $or: [
                { name: { $regex: '.*' + search + '.*', $options: 'i' } },
                { email: { $regex: '.*' + search + '.*', $options: 'i' } },
                { mobile: { $regex: '.*' + search + '.*', $options: 'i' } }
            ]

        });
        res.render('dashboard', { users: usersData });
    } catch (error) {
        console.log(error.message);
    }
}

const newUserLoad = async (req, res) => {
    try {
        res.render('new-user');
    } catch (error) {
        console.log(error.message);
    }
}

const addUser = async (req, res) => {
    try {
        const name = req.body.name;
        const email = req.body.email;
        const mobile = req.body.mobile;
        const userName = req.body.userName;
        const password = randomstring.generate(8);
        const spassword = await securePassword(password);
        const user = new User({
            name: req.body.name,
            email: req.body.email,
            mobile: req.body.mobile,
            userName: req.body.userName,
            password: spassword,
            is_blocked: 0,
            is_admin: 0,
            is_verified: 1, // Mark the user as verified
        });

        const userData = await user.save();
        if (userData) {
            addUsermail(name, email, password, userData._id);
            res.redirect('/admin/dashboard');
        } else {
            res.render('new-user', { message: 'Something went wrong' });
        }

    } catch (error) {
        console.log(error.message);
    }
}

const editUserLoad = async (req, res) => {
    try {
        const id = req.query.id;
        const userData = await User.findById({ _id: id });
        if (userData) {
            res.render('edit-user', { user: userData });
        } else {
            res.redirect('/admin/dashboard');
        }
    } catch (error) {
        console.log(error.message);
    }
}

const updateUser = async (req, res) => {
    try {
        const userData = await User.findByIdAndUpdate({ _id: req.body.id }, { $set: { name: req.body.name, email: req.body.email, mobile: req.body.mobile, is_verified: req.body.verify } });
        res.redirect('/admin/dashboard');
    } catch (error) {
        console.log(error.message);
    }
}

const deleteUser = async (req, res) => {
    try {
        const id = req.query.id;
        await User.deleteOne({ _id: id });
        res.redirect('/admin/dashboard');
    } catch (error) {
        console.log(error.message);
    }
}

const blockUser = async (req, res) => {
    try {
        await User.findByIdAndUpdate({ _id: req.body.userId }, { $set: { is_blocked: 1 } });
        res.status(200).json({ success: true, message: 'User blocked successfully.' });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

const unblockUser = async (req, res) => {
    try {
        await User.findByIdAndUpdate({ _id: req.body.userId }, { $set: { is_blocked: 0 } });
        res.status(200).json({ success: true, message: 'User unblocked successfully.' });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};



const categories = async (req, res) => {
    try {
        const categoryList = await Category.find();
        res.render('categories', { category: categoryList })
    } catch (error) {
        console.log(error.message)
    }
}

const addCategory = async (req, res) => {
    try {
        const categoryName = req.body.categoryName;
        const description = req.body.categoryDescription;
        const isListed = req.body.isListed;

        const categories = await Category.find();

        const categoryNameExists = await Category.exists({ name: categoryName });
        if (categoryNameExists) {
            return res.render('categories', { message: 'Category name already in use', category: categories });
        }

        const category = new Category({
            name: categoryName,
            description: description,
            isListed: isListed
        });
        const categoryData = await category.save();
        if (categoryData) {
            const categoryList = await Category.find();
            res.redirect('/admin/categories')
        }

    } catch (error) {
        console.log(error.message);
    }
}

const editCategoryLoad = async (req, res) => {
    try {
        const categoryId = req.query.id;
        const categoryData = await Category.findById(categoryId);
        res.render('edit-category', { category: categoryData })
    } catch (error) {
        console.log(error.message)
    }
}

const updateCategory = async (req, res) => {
    try {
        const updatedCategory = await Category.findByIdAndUpdate({ _id: req.query.id }, { $set: { name: req.body.categoryName, description: req.body.categoryDescription, isListed: req.body.isListed } });
        res.redirect('/admin/categories');
    } catch (error) {
        console.log(error.message);
    }
}

const deleteCategory = async (req, res) => {
    try {
        const id = req.query.id;
        const deletedProduct = await Category.deleteOne({ _id: id });
        res.redirect('/admin/categories')
    } catch (error) {
        console.log(error.message);
    }
}

const loadOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;

        const skip = (page - 1) * limit;

        const totalOrdersCount = await Order.countDocuments();
        const totalPages = Math.ceil(totalOrdersCount / limit);

        const ordersData = await Order.find().populate({
            path: 'userId',
            select: 'name email'
        }).populate('items.productId').sort({ createdAt: -1 }).skip(skip).limit(limit);

        res.render('orders', { orders: ordersData, currentPage: page, totalPages: totalPages });
    } catch (error) {
        console.log(error.message);
    }
}


const loadOrderDetails = async (req, res) => {
    try {
        const orderId = req.query.id;
        const order = await Order.findOne({ 'items.orderId': orderId })
            .populate('items.productId')
            .populate('addressId')
            .populate('billingAddressId');

        if (!order) {
            return res.render('order-not-found');
        }

        const item = order.items.find(item => item.orderId === orderId);

        if (!item) {
            return res.render('item-not-found');
        }
        const statuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned'];

        res.render('order-details', { order, item, statuses });
    } catch (error) {
        console.log(error.message);
        res.render('error-page', { error: 'An error occurred while loading order details.' });
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const { status, orderId } = req.body;

        const updatedOrder = await Order.findByIdAndUpdate(orderId, { status: status }, { new: true });

        if (!updatedOrder) {
            return res.status(404).json({ message: "Order not found" });
        }

        res.status(200).json({ message: "Order status updated successfully", order: updatedOrder });

    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}


//**********************************Coupon Management*****************************************/

const loadCoupons = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = 5;
        const skip = (page - 1) * pageSize;

        const couponsData = await Coupon.find().skip(skip).limit(pageSize);

        const totalCoupons = await Coupon.countDocuments();

        res.render('coupons', { coupons: couponsData, currentPage: page, totalPages: Math.ceil(totalCoupons / pageSize) });
    } catch (error) {
        console.log(error.message);
    }
}


const loadAddNewCouponPage = async (req, res) => {
    try {
        res.render('add-new-coupon');
    } catch (error) {
        console.log(error.message);
    }
}

const addNewCoupon = async (req, res) => {
    try {
        const { couponName, couponCode, discountType,
            discount, maximumDiscountAmount, minimumCartValue,
            startDate, expiryDate, isActive } = req.body;
        const newCoupon = await new Coupon({
            couponName: couponName,
            couponCode: couponCode,
            discountType: discountType,
            discount: discount,
            maximumDiscountAmount: maximumDiscountAmount,
            minimumCartValue: minimumCartValue,
            startDate: startDate,
            expiryDate: expiryDate,
            isActive: isActive
        })
        await newCoupon.save();
        res.redirect('/admin/coupons');
    } catch (error) {
        console.log(error.message);
    }
}

const updateCouponStatus = async (req, res) => {
    try {
        const couponId = req.query.id;
        const couponDetails = await Coupon.findById(couponId);
        if (!couponDetails) {
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }

        couponDetails.isActive = !couponDetails.isActive;

        await couponDetails.save();

        res.status(200).json({ success: true, isActive: couponDetails.isActive });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

const loadOffers = async (req, res) => {
    try {
        const productsData = await Product.find();
        const categoriesData = await Category.find();
        res.render('offers', { products: productsData, categories: categoriesData });
    } catch (error) {
        console.log(error.message);
    }
}

const updateProductOffer = async (req, res) => {
    try {
        const { productId, offerPrice, expiryDate } = req.body;
        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            { offerPrice: offerPrice, offerExpiryDate: expiryDate },
            { new: true }
        );

        if (updatedProduct) {
            res.status(200).json({ message: 'Product offer updated successfully', product: updatedProduct });
        } else {
            res.status(404).json({ error: 'Product not found' });
        }
    } catch (error) {
        console.log(error.message);
    }
}

const removeProductOffer = async (req, res) => {
    try {
        const productId = req.body.productId;
        const productData = await Product.findById(productId);
        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            { offerPrice: productData.price }, { new: true }
        );
        if (updatedProduct) {
            res.status(200).json({ message: 'Product offer removed successfully', product: updatedProduct });
        } else {
            res.status(404).json({ error: 'Product not found' });
        }
    } catch (error) {
        console.log(error.message);
    }
}

const updateCategoryOffer = async (req, res) => {
    try {
        const { categoryId, offerExpiryDate, offerPercentage } = req.body;

        const products = await Product.find({ category: categoryId });

        const offerPriceMultiplier = 1 - (offerPercentage / 100);

        await Promise.all(products.map(async (product) => {
            const newOfferPrice = product.price * offerPriceMultiplier;

            product.offerExpiryDate = offerExpiryDate;
            product.offerPrice = newOfferPrice;

            await product.save();
        }));

        const category = await Category.findByIdAndUpdate(categoryId, {
            offerExpiryDate: offerExpiryDate,
            offerPercentage: offerPercentage
        }, { new: true });

        res.status(200).json({ message: 'Category offer updated successfully' });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

const removeCategoryOffer = async (req, res) => {
    try {
        const categoryId = req.body.categoryId;
        const updatedCategory = await Category.findByIdAndUpdate(categoryId, { offerPercentage: 0 });
        const products = await Product.find({ category: categoryId });
        for (const product of products) {
            product.offerPrice = product.price;
            await product.save();
        }
        const updatedProducts = await Product.find({ category: categoryId });
        res.status(200).json({ message: 'Category offer removed successfully', category: updatedCategory, product: updatedProducts });

    } catch (error) {
        console.log(error.message);
    }
}

const loadSales = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;

        const skip = (page - 1) * limit;

        const salesData = await Order.find().populate({
            path: 'userId',
            select: 'name email'
        }).populate('items.productId').sort({ createdAt: -1 }).skip(skip).limit(limit);

        const totalSalesCount = await Order.countDocuments();
        const totalPages = Math.ceil(totalSalesCount / limit);

        res.render('sales', { orders: salesData, currentPage: page, totalPages: totalPages });
    } catch (error) {
        console.log(error.message);
    }
}

const generateSalesReport = async (req, res) => {
    try {
        const { interval, startDate: customStartDate, endDate: customEndDate } = req.query;
        let startDate, endDate;

        if (interval === 'custom') {
            startDate = moment(customStartDate).startOf('day');
            endDate = moment(customEndDate).endOf('day');
        } else {
            switch (interval) {
                case 'daily':
                    startDate = moment().startOf('day');
                    endDate = moment().endOf('day');
                    break;
                case 'weekly':
                    startDate = moment().startOf('week');
                    endDate = moment().endOf('week');
                    break;
                case 'monthly':
                    startDate = moment().startOf('month');
                    endDate = moment().endOf('month');
                    break;
                case 'yearly':
                    startDate = moment().startOf('year');
                    endDate = moment().endOf('year');
                    break;
                default:
                    startDate = moment(0);
                    endDate = moment();
            }
        }

        const orders = await Order.find({
            createdAt: { $gte: startDate, $lte: endDate }
        }).populate({
            path: 'userId',
            select: 'name email'
        }).populate('items.productId').sort({ createdAt: -1 });

        let totalSales = 0;
        orders.forEach(order => {
            totalSales += order.totalPrice;
        });
        const totalOrders = orders.length;
        const deliveredOrders = orders.filter(order => order.status === 'Delivered').length;
        const cancelledOrders = orders.filter(order => order.status === 'Cancelled').length;
        const returnedOrders = orders.filter(order => order.status === 'Returned').length;
        const totalOrderValue = orders.reduce((acc, order) => acc + order.totalPrice, 0);
        const averageOrderValue = totalOrderValue / totalOrders;

        const templatePath = path.join(__dirname, '..', 'views', 'admin', 'salesReport.ejs');
        const template = fs.readFileSync(templatePath, 'utf-8');

        const html = ejs.render(template, {
            orders,
            startDate: startDate.format('YYYY-MM-DD'),
            endDate: endDate.format('YYYY-MM-DD'),
            totalOrders,
            totalSales,
            deliveredOrders,
            cancelledOrders,
            returnedOrders,
            averageOrderValue: averageOrderValue.toFixed(2)
        });

        pdf.create(html).toFile('sales-report.pdf', (err, result) => {
            if (err) {
                console.error('Error generating PDF:', err);
                res.status(500).send('Error generating PDF');
            } else {
                res.download('sales-report.pdf');
            }
        });
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send('Error generating PDF');
    }
}

const generateSalesReportExcel = async (req, res) => {
    try {
        const { interval, startDate: customStartDate, endDate: customEndDate } = req.query;
        let startDate, endDate;

        if (interval === 'custom') {
            startDate = moment(customStartDate).startOf('day');
            endDate = moment(customEndDate).endOf('day');
        } else {
            switch (interval) {
                case 'daily':
                    startDate = moment().startOf('day');
                    endDate = moment().endOf('day');
                    break;
                case 'weekly':
                    startDate = moment().startOf('week');
                    endDate = moment().endOf('week');
                    break;
                case 'monthly':
                    startDate = moment().startOf('month');
                    endDate = moment().endOf('month');
                    break;
                case 'yearly':
                    startDate = moment().startOf('year');
                    endDate = moment().endOf('year');
                    break;
                default:
                    startDate = moment(0);
                    endDate = moment();
            }
        }

        const orders = await Order.find({
            createdAt: { $gte: startDate, $lte: endDate }
        }).populate({
            path: 'userId',
            select: 'name email'
        }).populate('items.productId').sort({ createdAt: -1 });

        let totalSales = 0;
        orders.forEach(order => {
            totalSales += order.totalPrice;
        });
        const totalOrders = orders.length;
        const deliveredOrders = orders.filter(order => order.status === 'Delivered').length;
        const cancelledOrders = orders.filter(order => order.status === 'Cancelled').length;
        const returnedOrders = orders.filter(order => order.status === 'Returned').length;
        const totalOrderValue = orders.reduce((acc, order) => acc + order.totalPrice, 0);
        const averageOrderValue = totalOrderValue / totalOrders;

        // Create a new workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        // Set up the header
        const header = worksheet.getCell('A1');
        header.value = 'Sales Report';
        worksheet.addRow([]);
        header.font = { size: 20, bold: true, color: { argb: 'FF000000' } };
        header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6495ED' } };
        worksheet.mergeCells('A1:F2');
        worksheet.addRow([]);
        worksheet.addRow([]);
        worksheet.mergeCells('B3:C3');
        worksheet.getCell('A3').value = 'Report Duration '
        worksheet.getCell('A3').font = { bold: true };
        worksheet.getCell('B3').value = `${startDate.format('YYYY-MM-DD')} to ${endDate.format('YYYY-MM-DD')}`;
        const summaryRow = worksheet.addRow(['Summary']);
        summaryRow.font = { bold: true, size: 16 };
        summaryRow.height = 30;
        worksheet.addRow(['Total Sales:', `₹${totalSales}`]);
        worksheet.addRow(['Total Orders:', totalOrders]);
        worksheet.addRow(['Delivered Orders:', deliveredOrders]);
        worksheet.addRow(['Cancelled Orders:', cancelledOrders]);
        worksheet.addRow(['Returned Orders:', returnedOrders]);
        worksheet.addRow(['Average Order Value:', `₹${averageOrderValue}`]);
        worksheet.addRow([]);

        // Add headers with styling
        const headerRow = worksheet.addRow(['Order ID', 'User Name', 'Email', 'Order Date', 'Total Price', 'Status']);
        headerRow.eachCell((cell, number) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '007bff' },
                bgColor: { argb: '007bff' }
            };
            cell.font = { color: { argb: 'ffffff' }, bold: true };
        });

        // Add data rows with styling
        orders.forEach(order => {
            const row = worksheet.addRow([
                order._id,
                order.userId.name,
                order.userId.email,
                order.createdAt,
                order.totalPrice,
                order.status
            ]);
            row.eachCell((cell, number) => {
                if (number % 2 === 0) {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'f0f0f0' },
                        bgColor: { argb: 'f0f0f0' }
                    };
                }
            });
        });

        // Set column widths and alignment
        worksheet.columns.forEach(column => {
            column.width = 20;
            column.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        // Apply border to all cells
        worksheet.eachRow(row => {
            row.eachCell(cell => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=sales-report.xlsx');

        // Write workbook to response
        await workbook.xlsx.write(res);

        // End response
        res.end();
    } catch (error) {
        console.error('Error generating Excel:', error);
        res.status(500).send('Error generating Excel');
    }
};


module.exports = {
    loadLogin,
    verifyLogin,
    loadDashboard,
    salesData,
    loadAdminProfile,
    loadProductsListPage,
    addProductLoad,
    addNewProduct,
    editProductLoad,
    updateProduct,
    deleteProduct,
    categories,
    addCategory,
    editCategoryLoad,
    updateCategory,
    deleteCategory,
    logout,
    adminDashboard,
    newUserLoad,
    addUser,
    editUserLoad,
    updateUser,
    deleteUser,
    blockUser,
    unblockUser,
    loadOrders,
    loadOrderDetails,
    updateOrderStatus,
    loadCoupons,
    loadAddNewCouponPage,
    addNewCoupon,
    updateCouponStatus,
    loadOffers,
    updateProductOffer,
    removeProductOffer,
    updateCategoryOffer,
    removeCategoryOffer,
    loadSales,
    generateSalesReport,
    generateSalesReportExcel
}