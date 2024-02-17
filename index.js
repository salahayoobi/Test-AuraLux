const mongoose =  require("mongoose");
require("dotenv").config();
mongoose.connect("mongodb://127.0.0.1:27017/auralux_database");

const express = require("express");
const app = express();

//for user routes
const userRoute = require("./routes/userRoute")
app.use('/', userRoute)

//for admin routes
const adminRoute = require("./routes/adminRoute")
app.use('/admin', adminRoute)

port =  process.env.PORT
app.listen(3000, () => {
    console.log("Server is running at http://localhost:3000")
})