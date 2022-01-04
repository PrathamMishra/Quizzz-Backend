const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
    name: !String,
    roomCode: !String,
    public: !Boolean,
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    creatorSocket: {
        type: String,
        default: "",
    },
    subject: String,
    topic: String,
    difficulty: {
        type: String,
        required: true,
        enum: ["easy", "medium", "hard", "mixed"],
        default: "mixed",
    },
    sizeLimit: !Number,
    estimatedTime: !Number,
    numOfQuestions: !Number,
    questionType: {
        type: String,
        required: true,
        enum: ["random", "added"],
        default: "random",
    },
    roomType: {
        type: String,
        required: true,
        enum: ["oneVsOne", "challenge", "contest"],
        default: "challenge",
    },
    randomQuestions: [
        { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
    ],
    addedQuestions: [
        { type: mongoose.Schema.Types.ObjectId, ref: "QuestionTemp" },
    ],
    started: {
        type: Boolean,
        default: false,
    },
    users: [
        {
            userData: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
            socketId: !String,
            score: {
                type: Number,
                default: 0,
            },
            time: {
                type: Number,
                default: 0,
            },
            skipped: [
                {
                    type: Number,
                },
            ],
            correct: [
                {
                    type: Number,
                },
            ],
            wrong: [
                {
                    type: Number,
                },
            ],
            warnings: {
                type: Number,
                default: 0,
            },
            status: {
                type: String,
                enum: ["joined", "left", "kicked", "banned"],
                default: "joined",
            },
        },
    ],
    createdAt: { type: Date, expires: 86400, default: Date.now },
});

module.exports = mongoose.model("Room", roomSchema);
