const mongoose = require("mongoose");

const tempQuestionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: [
            true,
            "Question must have a question, Please provide Question",
        ],
        trim: true,
    },
    question_img: {
        type: [String],
    },
    options: {
        type: [String],
        trim: true,
        required: true,
        validate: {
            validator: function (val) {
                return val.length < 5 && val.length >= 2;
            },
            message: `More than 5 and less than 2 option are not Allow, Please provide option in a range of 2-5!`,
        },
    },
    option_img: {
        type: [String],
    },
    answer: {
        type: Number,
        trim: true,
        required: [true, "question must have an correct answer"],
        validate: {
            validator: function (val) {
                return this.options.includes(this.options[val]);
            },
            message: `Option Must contain the answer!`,
        },
    },
    explanation: {
        type: String,
        required: [true, "Question must have an explanation"],
        trim: true,
    },
    explanation_img: {
        type: String,
    },
    description: {
        type: String,
        trim: true,
    },
    subject: String,
    topic: String,
    chapterOf: {
        type: Number,
        default: 0,
    },
    // [jees 2001 ,neet 2015]
    questionPreviousRecord: {
        type: String,
        trim: true,
    },
    marks: {
        type: Number,
        required: true,
        default: 1,
    },
    negativeMarks: {
        type: Number,
        default: 0,
    },
    timeLimit: {
        type: Number,
        required: true,
    },
});

// questionSchema.pre('save', function (next) {

// })

const tempQuestion = mongoose.model("tempQuestion", tempQuestionSchema);

module.exports = tempQuestion;
