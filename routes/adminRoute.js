const express = require("express");
const session = require("express-session");
const config = require("../config/config");
const bodyParser = require("body-parser");
const adminController =  require("../controllers/adminController")
const auth = require("../middleware/adminAuth");

const admin_route = express();
admin_route.use(bodyParser.json());
admin_route.use(bodyParser.urlencoded({extended: true}));

const multer = require("multer");
const path = require("path");
const { route } = require("./userRoute");

admin_route.use(express.static('public'));

const storage = multer.diskStorage({
    destination:function(req, file, cb) {
        cb(null,path.join(__dirname, '../public/productImages'));

    },
    filename:function(req, file, cb) {
        const name = Date.now()+'-'+file.originalname;
        cb(null,name);
    }
});

const upload = multer({storage: storage})

admin_route.use(session({session:config.sessionSecret}));
admin_route.set('view engine', 'ejs');
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
admin_route.post('/page-products-list/edit-product',upload.array('image', 3), adminController.updateProduct);
admin_route.get('/page-products-list/delete-product', adminController.deleteProduct);

admin_route.get('/categories', adminController.categories);
admin_route.post('/categories', adminController.addCategory);
admin_route.get('/categories/edit-category', adminController.editCategoryLoad);
admin_route.post('/categories/edit-category', adminController.updateCategory);
admin_route.get('/categories/delete-category', adminController.deleteCategory);

admin_route.get('*', (req, res) => {
    res.redirect('/admin');
});

module.exports = admin_route;