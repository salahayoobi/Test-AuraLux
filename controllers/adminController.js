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

const loadDashboard = async (req, res) => {
    try {
        const userData = await User.findById({ _id: req.session.user_id });
        res.render('adminDashboard', { admin: userData });
    } catch (error) {
        console.log(error.message);
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
        const page = parseInt(req.query.page) || 1; // Current page number, default is 1
        const perPage = 10; // Number of items per page
        let query = {};

        // Check if a category filter is applied
        if (req.query.category && req.query.category !== 'All category') {
            // Find the category by its name
            const category = await Category.findOne({ name: req.query.category });
            // If the category is found, assign its _id to the query object
            if (category) {
                query.category = category._id;
            }
        }

        const productsCount = await Product.countDocuments(query);
        const totalPages = Math.ceil(productsCount / perPage);
        const categoriesData = await Category.find();
        const productsData = await Product.find(query)
            .populate('category')
            .skip((page - 1) * perPage) // Skip records
            .limit(perPage); // Limit records per page
        
        console.log(req.query.category)
        res.render('page-products-list', {
            products: productsData,
            totalPages: totalPages,
            currentPage: page,
            categories: categoriesData,
            category: req.query.category || 'All category' // Set category to 'All category' if not specified
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
        // const filenames = req.files.map(file => file.filename);
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
        console.log("Before", filenames);
        // console.log(req.files.image1[0].filename);
        for (let i = 1; i <= 3; i++) {
            const fieldName = `image${i}`;
            const file = req.files[fieldName];
            if (file && file.length > 0) {

                filenames[i - 1] = file[0].filename;
            }
        }

        console.log("After", filenames);

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
        console.log("hello")
        const categoryName = req.body.categoryName;
        const description = req.body.categoryDescription;
        const isListed = req.body.isListed;

        const categories = await Category.find();

        const categoryNameExists = await Category.exists({ name: categoryName });
        if (categoryNameExists) {
            return res.render('categories', { message: 'Category name already in use', category: categories });
        }

        console.log(req.body);
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
        const ordersData = await Order.find().populate({
            path: 'userId',
            select: 'name email'
        }).populate('items.productId').sort({ createdAt: -1 });
        res.render('orders', { orders: ordersData });
    } catch (error) {
        console.log(error.message);
    }
}

const loadOrderDetails = async (req, res) => {
    try {
        const orderId = req.query.id;
        // Find the order by orderId
        const order = await Order.findOne({ 'items.orderId': orderId })
            .populate('items.productId')
            .populate('addressId')
            .populate('billingAddressId');

        if (!order) {
            // If order is not found, handle accordingly (e.g., render an error page)
            return res.render('order-not-found');
        }

        // Find the item with the given orderId
        const item = order.items.find(item => item.orderId === orderId);

        if (!item) {
            // If item is not found, handle accordingly (e.g., render an error page)
            return res.render('item-not-found');
        }
        const statuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned'];

        // Render the order details page with the item detail
        res.render('order-details', { order, item, statuses });
    } catch (error) {
        console.log(error.message);
        // Handle any errors
        res.render('error-page', { error: 'An error occurred while loading order details.' });
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const { status, orderId } = req.body;

        // Update the order status
        const updatedOrder = await Order.findByIdAndUpdate(orderId, { status: status }, { new: true });

        // Check if the order was found and updated successfully
        if (!updatedOrder) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Send a success response
        res.status(200).json({ message: "Order status updated successfully", order: updatedOrder });

    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}


//**********************************Coupon Management*****************************************/

const loadCoupons = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Get page number from query parameter, default to 1
        const pageSize = 5; // Number of coupons per page
        const skip = (page - 1) * pageSize; // Calculate number of documents to skip
        
        // Fetch coupons data for the current page
        const couponsData = await Coupon.find().skip(skip).limit(pageSize);
        
        // Count total number of coupons for pagination
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
        console.log(newCoupon);
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
        console.log(couponDetails);

        // Toggle the isActive status
        couponDetails.isActive = !couponDetails.isActive;

        // Save the updated coupon details
        await couponDetails.save();
        console.log(couponDetails);

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
        console.log(productId, offerPrice, expiryDate);
        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            { offerPrice: offerPrice, offerExpiryDate: expiryDate },
            { new: true }
        );

        if (updatedProduct) {
            console.log('Product offer updated successfully:', updatedProduct);
            res.status(200).json({ message: 'Product offer updated successfully', product: updatedProduct });
        } else {
            console.log('Product not found');
            res.status(404).json({ error: 'Product not found' });
        }
    } catch (error) {
        console.log(error.message);
    }
}

const removeProductOffer = async(req, res)=>{
    try {
        const productId = req.body.productId;
        const productData = await Product.findById(productId);
        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            {offerPrice:productData.price }, { new: true }
        );
        console.log(updatedProduct);
        if (updatedProduct) {
            console.log('Product offer removed successfully:', updatedProduct);
            res.status(200).json({ message: 'Product offer removed successfully', product: updatedProduct });
        } else {
            console.log('Product not found');
            res.status(404).json({ error: 'Product not found' });
        }
    } catch (error) {
        console.log(error.message);
    }
}

const updateCategoryOffer = async (req, res) => {
    try {
        const { categoryId, offerExpiryDate, offerPercentage } = req.body;

        // Retrieve all products belonging to the specified category
        const products = await Product.find({ category: categoryId });

        // Calculate offer price multiplier
        const offerPriceMultiplier = 1 - (offerPercentage / 100);

        // Update offer details for each product
        await Promise.all(products.map(async (product) => {
            // Calculate new offer price
            const newOfferPrice = product.price * offerPriceMultiplier;

            // Update product offer details
            product.offerExpiryDate = offerExpiryDate;
            product.offerPrice = newOfferPrice;

            // Save the updated product
            await product.save();
        }));

        // Update offer details for the category
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

const removeCategoryOffer = async(req, res)=>{
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

const loadSales = async(req, res)=>{
    try {
        const ordersData = await Order.find().populate({
            path: 'userId',
            select: 'name email'
        }).populate('items.productId').sort({ createdAt: -1 });
        res.render('sales', { orders: ordersData });
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
                console.log('PDF generation completed');
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

        // Your code to fetch data from the database
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
        header.font = { size: 20, bold: true, color: { argb: 'FF000000' } }; // White font color
        header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6495ED' } }; // Black background color
        worksheet.mergeCells('A1:F2');
        worksheet.addRow([]);
        worksheet.addRow([]);
        worksheet.mergeCells('B3:C3'); // Merge cells to show the full date range
        worksheet.getCell('A3').value ='Report Duration '
        worksheet.getCell('A3').font = { bold: true };
        worksheet.getCell('B3').value = `${startDate.format('YYYY-MM-DD')} to ${endDate.format('YYYY-MM-DD')}`;
        // Add summary data before the table
        const summaryRow = worksheet.addRow(['Summary']);
        summaryRow.font = { bold: true, size: 16 };
        summaryRow.height = 30; // Set the height to your desired value, e.g., 30
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