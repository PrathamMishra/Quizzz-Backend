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
    numOfQuestion: !Number,
    questions: [{type: mongoose.Schema.Types.ObjectId, ref: "Question"}],
    questionsType: !String,
    topper: {
        // id: {
        //     type: mongoose.Schema.Types.ObjectId,
        //     ref: "User"
        // },
        name: String,
        score: {
            type: Number,
            default: 0
        }
    },
    users: [{
        // id: {
        //     type: mongoose.Schema.Types.ObjectId,
        //     ref: "User"
        // },
        name: String,
        score: {
            type: Number,
            default: 0
        },
        time: {
            type: Number,
            default: 0
        },
        skipped: [Number], 
        correct: [Number],
        wrong: [Number],
        warnings: {
            type: Number,
            default: 0
        }
    }]
});

module.exports = mongoose.model("Room", roomSchema);