const isLogin = async(req, res, next) => {
    try {
        if(req.session.user_id){

        }else{
            res.redirect('/admin');
        }
        next();
    } catch (error) {
        console.log(error.message);
    }
}

const isLogout = async(req, res, next) => {
    try {
        if(req.session.user_id){
            res.redirect('/admin/home');
        }
        next();
    } catch (error) {
        console.log(error.message);
    }
}

const preventCaching = (req, res, next) => {
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    next();
}

module.exports = {
    isLogin,
    isLogout,
    preventCaching
}