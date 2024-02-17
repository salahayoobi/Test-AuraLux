const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const otpGenerator = require('otp-generator');
const Product = require("../models/productModel")
const jwt = require("jsonwebtoken");
const secretKey = 'your-secret-key';

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


// const insertUser = async (req, res) => {
//     try {
//         const spassword = await securePassword(req.body.password);
//         const user = new User({
//             name: req.body.name,
//             email: req.body.email,
//             mobile: req.body.mobile,
//             password: spassword,
//             is_blocked: 0,
//             is_admin: 0

//         });
//         const userData = await user.save();

//         if (userData) {
//             sendVerifyMail(req.body.name, req.body.email, userData._id)
//             res.render('registration', { message: "Succesfully Registered, Please verify your Email" });
//         } else {
//             res.render('registration', { message: "Registration Failed" });
//         }
//     } catch (error) {
//         console.log(error.message);
//     }
// }

// const verifyMail = async (req, res) => {
//     try {
//         const updateInfo = await User.updateOne({ _id: req.query.id }, { $set: { is_verified: 1 } });
//         console.log(updateInfo);
//         res.render("email-verified");
//     } catch (error) {
//         console.log(error.message);

//     }
// }

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

        // Render the OTP verification page with user details and OTP
        console.log('Variables:', req.body.name, req.body.email, req.body.mobile, req.body.password, otp);
        console.log('Entered OTP:', otp);
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

        console.log('Entered OTP:', enteredOtp);
        console.log('Session OTP:', sessionOtp);

        // Check if the OTP has expired
        if (expirationTime < new Date()) {
            return res.render('verify-otp', { message: 'OTP has expired', ...req.body });
        }

        if (enteredOtp === sessionOtp) {
            // Save user details to the database
            const spassword = await securePassword(req.session.registerSession.password);
            const user = new User({
                name: req.session.registerSession.name,
                email: req.session.registerSession.email,
                mobile: req.session.registerSession.mobile,
                userName: req.session.registerSession.userName,
                password: spassword,
                is_blocked: 0,
                is_admin: 0,
                is_verified: 1, // Mark the user as verified
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

        return { otp, name, email }; // Return the OTP so that it can be used for verification on the server side
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
        // Update the session with the new OTP
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
        const userEmail = req.body.email.trim();
        console.log(userEmail);
        const userExists = await User.findOne({ email: userEmail });
        console.log(userExists);
        if (userExists) {
            console.log("Hellooo");
            const { otp, email } = await sendEmailOtp(userEmail);
            res.render('reset-password', {
                email,
                generatedOtp: otp, // Pass the generated OTP to the view
            });
        } else {
            // Render 'forgot-password' view when the user doesn't exist
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
        console.log(enteredOtp);
        console.log(generatedOtp);
        console.log(req.body.email);
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
        // const userData = await User.findOne({ email: email });
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
        const productsData = await Product.find();
        const userData = await User.findById({ _id: req.session.user_id });
        res.render('userLogin', { user: userData, products: productsData });
    } catch (error) {
        console.log(error.message);
    }
}

// *************************************JWT**********************************************

// const verifyLogin = async (req, res) => {
//     try {
//         const userName = req.body.userName;
//         const password = req.body.password;

//         const userData = await User.findOne({
//             $or: [
//                 { email: userName },
//                 { userName: userName }
//             ]
//         });

//         if (userData) {
//             const passwordMatch = await bcrypt.compare(password, userData.password);

//             if (passwordMatch) {
//                 if (userData.is_verified === 0) {
//                     res.render('login', { message: "Please verify your email." });
//                 } else {
//                     const token = jwt.sign({ userId: userData._id, username: userData.userName }, secretKey, { expiresIn: '1h' });
//                     res.json({ token });
//                 }
//             } else {
//                 res.render('login', { message: "Email and password incorrect" });
//             }
//         } else {
//             res.render('login', { message: "Email and password incorrect" });
//         }

//     } catch (error) {
//         console.log(error.message);
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// }

// const loadHome = async (req, res) => {
//     try {
//         const token = req.headers.authorization && req.headers.authorization.split(' ')[1];

//         if (!token) {
//             return res.status(401).json({ error: 'Unauthorized' });
//         }

//         jwt.verify(token, secretKey, (err, decoded) => {
//             if (err) {
//                 return res.status(401).json({ error: 'Unauthorized' });
//             } else {
//                 const userId = decoded.userId;
//                 User.findById(userId, (err, userData) => {
//                     if (err || !userData) {
//                         return res.status(401).json({ error: 'Unauthorized' });
//                     } else {
//                         res.render('home', { user: userData });
//                     }
//                 });
//             }
//         });
//     } catch (error) {
//         console.log(error.message);
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// }

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
        const productDetail = await Product.findById(id).populate('category');

        if (!productDetail) {
            return res.status(404).send('Product not found');
        }

        console.log("Product details:", productDetail);
        // Check if category is populated before rendering the view
        if (!productDetail.category) {
            return res.status(500).send('Product category is missing');
        }

        res.render('home-product-details', { product: productDetail });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
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
    // insertUser,
    // verifyMail,
    loginLoad,
    verifyLogin,
    forgotPassword,
    loadHome,
    userLogout,
    editLoad,
    updateProfile,
    loadProductDetails
};