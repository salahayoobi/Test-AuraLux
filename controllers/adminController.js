const User = require("../models/userModel");
const Product = require("../models/productModel")
const Order = require("../models/orderModel");
const Category = require("../models/categoryModel");
const randomstring = require('randomstring');
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");


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
        const productsData = await Product.find().populate('category');
        res.render('page-products-list', { products: productsData });
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
            category: category,
            subCategory: subCategory,
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
        const productData = await Product.findById(productId);
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
        const filenames = req.files.map(file => file.filename);
        const price = req.body.price;
        const category = req.body.category;
        const subCategory = req.body.subCategory;
        const productData = await Product.findByIdAndUpdate({ _id: productId }, { $set: { productName: productName, productBrand: productBrand, description: description, image: filenames, price: price, category: category, subCategory: subCategory } });
        console.log(productData);
        res.redirect('/admin/page-products-list');
    } catch (error) {
        console.log(error.message)
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
        }).populate('items.productId').sort({createdAt: -1});
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

        // Render the order details page with the item detail
        res.render('order-details', { order, item });
    } catch (error) {
        console.log(error.message);
        // Handle any errors
        res.render('error-page', { error: 'An error occurred while loading order details.' });
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
    loadOrderDetails
}