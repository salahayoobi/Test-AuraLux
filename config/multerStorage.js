const multer = require("multer");
const path = require("path");
const productStorage = multer.diskStorage({
    destination:function(req, file, cb) {
        cb(null,path.join(__dirname, '../public/productImages'));

    },
    filename:function(req, file, cb) {
        const name = Date.now()+'-'+file.originalname;
        cb(null,name);
    }
});

const userStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../public/userImages'));
    },
    filename: function (req, file, cb) {
        const name = Date.now() + '-' + file.originalname;
        cb(null, name);
    }
});
module.exports = { 
    productStorage,
    userStorage
}