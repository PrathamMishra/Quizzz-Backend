const jwt = require('jsonwebtoken');
const crypto = require('crypto')

const catchAsync = require('../utils/catchAsync');
const sendEmail = require('../utils/email');
const AppError = require('../utils/appError');
const User = require('./../models/userModel');


const signToken = id => {
    return jwt.sign({id},process.env.JWT_SECRET,{
        expiresIn:process.env.JWT_EXPIRES_IN
    })
}

const createSendToken=(user,statusCode,res)=>{
    const token = signToken(user._id)
    
    // COOKIE OPTION
    // const cookieOption ={}

    // remove password from the output
    user.password=undefined
    res.status(statusCode).json({
        status:'sucess',
        token,
        data:{user}
    })
}

exports.emailVerfication=catchAsync(async (req, res, next) =>{
    const hasedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex')

    const user = await User.findOne({
        emailVerificationToken: hasedToken,
        emailVerificationExpires:{ $gt: Date.now()}
    })

    if(!user) return next(new AppError('token is invalid or has expired',400));

    user.verifed = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    
    await user.save({validateBeforeSave:false});

    createSendToken(user,200,res);
})


exports.signup=catchAsync(async (req, res ,next) =>{
    const newUser = await User.create({
        name:req.body.name,
        email:req.body.email,
        password:req.body.password,
        passwordConfirm:req.body.passwordConfirm,
        role:req.body.role,
    })

    const verificationToken = newUser.emailVerification();
    await newUser.save({validateBeforeSave:false})

    const verficationURL = `${req.protocol}://${req.get('host')}/api/v1/users/verification/${verificationToken}`
    const message = `Verify your password? Submit a PATCH request with your
        new Password and passwordConfirm to: ${verficationURL}.\nIf you didn't forget your password, please ignore this email!`
    try{
        await sendEmail({
            email:newUser.email,
            subject:'your verfication token (valid for 10 min)',
            message
        })
        res.status(200).json({
            status:'success',
            message:"token sent to email! check your email",
            // data:{newUser}   
        })
    }catch(err){
        newUser.emailVerificationToken = undefined;
        newUser.emailVerificationExpires = undefined;
        await newUser.save({validateBeforeSave:false})

        return next(new AppError('ther was an error sending the email. Try again later!',500))
    }
})

exports.login = catchAsync( async (req, res, next)=>{
    console.log(req.body.email)
    const {email,password} = req.body;
    if(!email || !password){
        return next(new AppError('please provide email and password!',400))
    }
    const user = await User.findOne({email}).select('+password');
    if(!user.verifed){
        await User.findOneAndDelete({email});
        return next(new AppError('email is not verifed create you new account',400))
    }

    if(!user || !(await user.correctpassword(password,user.password))){
        return next(new AppError('Incorrect email or password!',401))
    }

    createSendToken(user,200,res)
})

exports.protect =catchAsync( async ( req,res,next) =>{
    let token 
    if(req.headers.authorization && req.headers.authorization.statsWith("Bearer")){
        token = req.headers.authorization.split(" ")[1];
    }
    if(!token){
        return next(new AppError('your are not logged in! please log in to get access.',401))
    }
    const decoded = await promisify(jwt.verify)(token,process.env.JWT_SECRET)
    const currentUser = await User.findById(decoded.id)
    if(!currentUser){
        return next(new AppError('The user belonging to this token does no longer exist!',401))
    }
    if(currentUser.changedPasswordAfter(decoded.iat)){
        return next(new AppError('User recently Changed password! Please log in again.',401))
    }
    req.user = currentUser;
    next();
})

exports.restrictTo = (...roles) =>{
    return (req,res,next)=>{
        //roles [admin,user]
        if(!roles.includes(req.user.role)){
            return next(new AppError('You do not have permission to perform this action',403))
        }
        next();
    }
}

exports.forgotPassword = catchAsync( async (req,res,next)=>{
    const user = await User.findOne({email:req.body.email})

    if(!user){
        return next(new AppError('there is no user with email address.',404))
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({validateBeforeSave:false})

    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`
    const message = `Forgot your password? Submit a PATCH request with your
        new Password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`
    try{
        await sendEmail({
            email:user.email,
            subject:'your password reset token (valid for 10 min)',
            message
        })
        res.status(200).json({
            status:'success',
            message:"token sent to email!"   
        })
    }catch(err){
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({validateBeforeSave:false})

        return next(new AppError('ther was an error sending the email. Try again later!',500))
    }
})

exports.resetPassword = catchAsync( async (req, res, next ) =>{
    const hasedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex')

    const user = await User.findOne({
        passwordResetToken: hasedToken,
        passwordResetExpires:{ $gt: Date.now()}
    })

    if(!user) return next(new AppError('token is invalid or has expired',400));

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    
    await user.save();

    createSendToken(user,200,res)
})

exports.updatePassword=catchAsync( async(req,res,next)=>{
    const user = await User.findById(req.user.id).select('+password')
    if(!(await user.correctpassword(req.body.passwordCurrent,user.password) ) ){
        return next(new AppError('Your current password is wrong.',401))
    }
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();

    createSendToken(user,200,res)
})

// exports.isLoggedIn = async (req,res,next)=>{
//     if(req.cookies.jwt){
//         try{
//             // 1) Verification token
//             const decoded = await promisify(jwt.verify)(req.cookies.jwt,process.env.JWT_SECRET)
            
//             // 2) check if user still exists
//             const currentUser = await User.findById(decoded.id)
//             if(!currentUser){
//                 return next()
//             }
            
//             // 3) check if user changed password after the token was issued 
//             if(currentUser.changedPasswordAfter(decoded.iat)){
//                 return next()
//             }
            
//             // There is a logged in user
//             res.locals.user = currentUser;
//             req.user=currentUser
//             return next();
//         }catch(err){
//             return next();
//         }
//     }
//     next();
// }
