const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        require: [true, "Please tell us your name!"],
        trim: true,
    },
    email: {
        type: String,
        required: [true, "Please provide your email!"],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, "Please Provide a valid email"],
    },
    photo: String,
    role: {
        type: String,
        enum: ["user", "admin", "valitater", "student", "teacher", "institute"],
        default: "user",
    },
    password: {
        type: String,
        required: [true, "Please provide password"],
        minlength: 8,
        select: false,
    },
    passwordConfirm: {
        type: String,
        required: [true, "Please confirm your password"],
        validate: {
            validator: function (val) {
                return val === this.password;
            },
            message: "passwords are not same!",
        },
    },
    img: {
        type: String,
    },
    rating: {
        type: Number,
        default: 1000,
    },
    institute: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: String,
    emailVerificationToken: String,
    emailVerificationExpires: String,
    verifed: {
        type: Boolean,
        default: false,
    },
    active: {
        type: Boolean,
        default: true,
        select: false,
    },
});

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 12);

    this.passwordConfirm = undefined;
    next();
});

userSchema.pre("save", function (next) {
    if (!this.isModified("password") || this.isNew) return next();

    this.passwordChangedAt = Date.now() - 1000;
    next();
});

userSchema.methods.correctpassword = async function (
    candidatePassword,
    userPassword
) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimeStamp) {
    if (this.passwordChangedAt) {
        const changedTimeStamp = parseInt(
            this.passwordChangedAt.getTime() / 1000,
            10
        );
        return JWTTimeStamp < changedTimeStamp;
    }

    // False means NOT changed
    return false;
};

userSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString("hex");

    this.passwordResetToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
    return resetToken;
};
userSchema.methods.emailVerification = function () {
    const verificationToken = crypto.randomBytes(32).toString("hex");

    this.emailVerificationToken = crypto
        .createHash("sha256")
        .update(verificationToken)
        .digest("hex");

    this.emailVerificationExpires = Date.now() + 10 * 60 * 1000;
    return verificationToken;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
