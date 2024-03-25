const express = require("express");
const session = require("express-session");
const config = require("../config/config");
const adminController =  require("../controllers/adminController")
const auth = require("../middleware/adminAuth");
const storage = require("../config/multerStorage");

const admin_route = express();

const multer = require("multer");

admin_route.use(express.static('public'));

const upload = multer({storage: storage.productStorage})

admin_route.use(session({session:config.sessionSecret}));
admin_route.set('views', './views/admin');

admin_route.get('/', auth.isLogout, auth.preventCaching, adminController.loadLogin);
admin_route.post('/', auth.preventCaching, adminController.verifyLogin);
// admin_route.get('/home', auth.isLogin, adminController.loadDashboard);
admin_route.get('/home', auth.preventCaching, adminController.loadDashboard);
admin_route.get('/admin-profile', adminController.loadAdminProfile);
admin_route.get('/logout', auth.isLogin, adminController.logout);
admin_route.get('/dashboard', auth.preventCaching, auth.isLogin, adminController.adminDashboard);
admin_route.get('/new-user', auth.isLogin, adminController.newUserLoad);
admin_route.post('/new-user', upload.single('image'), adminController.addUser);
admin_route.get('/edit-user', auth.isLogin, adminController.editUserLoad);
admin_route.post('/edit-user', adminController.updateUser);
admin_route.get('/delete-user', adminController.deleteUser);
admin_route.post('/block-user', adminController.blockUser);
admin_route.post('/unblock-user', adminController.unblockUser);

admin_route.get('/page-products-list', adminController.loadProductsListPage);
admin_route.get('/add-new-product', adminController.addProductLoad);
admin_route.post('/add-new-product', upload.array('image', 3), adminController.addNewProduct);
admin_route.get('/page-products-list/edit-product', adminController.editProductLoad);
admin_route.post('/page-products-list/edit-product', upload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 }
]), adminController.updateProduct);
admin_route.get('/page-products-list/delete-product', adminController.deleteProduct);

admin_route.get('/categories', adminController.categories);
admin_route.post('/categories', adminController.addCategory);
admin_route.get('/categories/edit-category', adminController.editCategoryLoad);
admin_route.post('/categories/edit-category', adminController.updateCategory);
admin_route.get('/categories/delete-category', adminController.deleteCategory);

admin_route.get('/orders', adminController.loadOrders);
admin_route.get('/orders/order-details', adminController.loadOrderDetails);
admin_route.post('/orders/update-order-status', adminController.updateOrderStatus);

//***************************Coupon****************************/

admin_route.get('/coupons', adminController.loadCoupons);
admin_route.get('/add-new-coupon', adminController.loadAddNewCouponPage);
admin_route.post('/add-new-coupon', adminController.addNewCoupon);
admin_route.post('/update-coupon-status', adminController.updateCouponStatus);

admin_route.get('/offers', adminController.loadOffers);
admin_route.post('/offers/update-product-offer', adminController.updateProductOffer);
admin_route.post('/offers/remove-product-offer', adminController.removeProductOffer);
admin_route.post('/offers/update-category-offer', adminController.updateCategoryOffer);
admin_route.post('/offers/remove-category-offer',adminController.removeCategoryOffer)

admin_route.get('/sales', adminController.loadSales);
admin_route.get('/sales/generate-sales-report', adminController.generateSalesReport);
admin_route.get('/sales/generate-sales-report-excel', adminController.generateSalesReportExcel);

admin_route.get('*', (req, res) => {
    res.redirect('/admin');
});

module.exports = admin_route;