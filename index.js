const mongoose =  require("mongoose");
const bodyParser = require("body-parser");
require("dotenv").config();
mongoose.connect("mongodb://127.0.0.1:27017/auralux_database");

const express = require("express");
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

//view engine
app.set('view engine', 'ejs');

//for user routes
const userRoute = require("./routes/userRoute")
app.use('/', userRoute)

//for admin routes
const adminRoute = require("./routes/adminRoute")
app.use('/admin', adminRoute)

//for user account routes
const accountRoute = require("./routes/accountRoutes")
app.use('/account', accountRoute)

//for cart routes
const cartRoute = require("./routes/cartRoutes")
app.use('/cart', cartRoute)

port =  process.env.PORT
app.listen(3000, () => {
    console.log("Server is running at http://localhost:3000")
})