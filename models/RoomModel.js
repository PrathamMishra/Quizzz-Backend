const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
    roomCode: !String,
    public: !Boolean,
    // creator: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: "User"
    // },
    creator: !String,
    subject: String,
    topic: String,
    difficulty: String,
    sizeLimit: !Number,
    estimatedTime: !Number,
    numOfQuestions: !Number,
    questionsType: !String,
    randomQuestions: [{type: mongoose.Schema.Types.ObjectId, ref: "Question"}],
    addedQuestions: [{type: mongoose.Schema.Types.ObjectId, ref: "QuestionTemp"}],
    started: {
        type: Boolean,
        default: false
    },
    users: [{
        // id: {
        //     type: mongoose.Schema.Types.ObjectId,
        //     ref: "User"
        // },
        name: String,
        socketId: !String,
        score: {
            type: Number,
            default: 0
        },
        time: {
            type: Number,
            default: 0
        },
        skipped: [{
            type: Number
        }], 
        correct: [{
            type: Number
        }],
        wrong: [{
            type: Number
        }],
        warnings: {
            type: Number,
            default: 0
        },
        status: {
            type: String,
            enum:['joined','left','kicked','banned'],
            default: "joined"
        },
        image: !String
    }]
});

module.exports = mongoose.model("Room", roomSchema);