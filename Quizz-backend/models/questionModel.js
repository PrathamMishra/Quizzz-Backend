const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: [true, 'Question must have a question, Please provide Question'],
        unique: true,
        trim: true,
    },
    option: {
        type: [String],
        trim: true,
        required: true,
        validate: {
            validator: function (val) {
                return val.length <= 5 && val.length >= 2;
            },
            message: `More than 5 and less than 2 option are not Allow, Please provide option in a range of 2-5!`
        }
    },
    answer: {
        type: String,
        trim: true,
        required: [true, 'question must have an correct answer'],
        validate: {
            validator: function (val) {
                return this.option.includes(val);
            },
            message: `Option Must contain the answer!`
        }
    },
    course: String,
    subject: String,
    topic: String,
    type: {
        type: String,
        values: ['numerical', 'theoretical'],
        message: 'type is either : numerical theoretical',
        trim: true
    },
    exam: {
        type: [String],
    },
    // field like enginnering medical NDA Polti....
    field: {
        type: [String]
    },
    difficulty: {
        type: String,
        values: ['easy', 'medium', 'hard'],
        message: 'type is either : easy,medium,hard',
        trim: true
    },
    questionPreviousRecord: {
        type: [String],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Must have a description'],
        trim: true
    },
    questionSource: {
        type: String
    },
    createAt: {
        type: Date,
        default: Date.now(),
    },
    createBy: {
        type: String,
    },
    verfied: {
        type: Boolean,
        default: false,
        // select: false
    },
    verfiedOn: {
        type: Date,
        // default: Date.now(),
        // select: false
    },
    verfiedBy: {
        type: [String],
        default: "",
        // select: false
    },
    ratingsAverage: {
        type: Number,
        default: 0,
        min: [0, 'Rating must be above 1.0'],
        max: [5, 'Rating must be below 5.0'],
        // select: false
    },
    ratingsQuantity: {
        type: Number,
        default: 0,
        // select: false
    },

})

// questionSchema.pre('save', function (next) {

// })

const Question = mongoose.model('Question', questionSchema);

module.exports = Question