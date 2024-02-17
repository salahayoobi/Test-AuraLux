const User = require("../models/userModel");
const isLogin = async(req, res, next)=> {
    try {
        if(req.session.user_id){
            
        }else{
            res.redirect('/');
        }
        next();
    } catch (error) {
        console.log(error.message)
    }
}


const isLogout = async(req, res, next)=> {
    try {
        if(req.session.user_id){
            res.redirect('/home')
        }
        next();
    } catch (error) {
        console.log(error.message)
    }
}

const preventCaching = (req, res, next) => {
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    next();
}

const isBlocked = async(req, res, next)=>{
    try {
        const userId = req.session.user_id;
        const userData = await User.findById(userId);
        if(userData && userData.is_blocked){
            req.session.destroy();
            return res.redirect('/login');
        }
        return next();
    } catch (error) {
        console.log(error.message);
    }
}

module.exports = {
    isLogin,
    isLogout,
    preventCaching,
    isBlocked
}