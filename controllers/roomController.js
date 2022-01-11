const Room = require("./../models/RoomModel");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apiFeatures");
const catchAsync = require("../utils/catchAsync");
const tempQuestion = require("../models/tempQuestionModel");
const Question = require("../models/questionModel");
const async = require("async");

exports.getAllRooms = catchAsync(async (req, res, next) => {
    const features = new APIFeatures(Room.find(), req.query)
        .filter()
        .sort()
        .limitFields()
        .paginate();

    const rooms = await features.query;

    res.status(200).json({
        numberOfRooms: rooms.length,
        data: {
            rooms,
        },
    });
});

exports.getRoomDetails = catchAsync(async (req, res, next) => {
    let room = await Room.findOne({ roomCode: req.body.roomCode }).populate(
        "creator",
        "name rating photo"
    );

    if (!room) return next(new AppError("No Room found with that Id", 404));

    res.status(200).json(room);
});

exports.createRoom = catchAsync(async (req, res, next) => {
    let randomQuestions, addedQuestions, estimatedTime;
    if (req.body.questionType === "random") {
        const matchQuery = {
            field: req.body.field,
            exam: req.body.exam,
        };
        if (req.body.difficulty !== "mixed") {
            matchQuery.difficulty = req.body.difficulty;
        }
        if (req.body.subject !== "Mixed") {
            matchQuery.subject = req.body.subject;
        }
        if (req.body.topic !== "Miscellaneous") {
            matchQuery.topic = req.body.topic;
        }
        const data = await Question.aggregate([
            {
                $match: matchQuery,
            },
            { $sample: { size: parseInt(req.body.numOfQuestion) } },
        ]);
        randomQuestions = data.map((q) => q._id);
        estimatedTime = data.reduce((total, item) => {
            return total + item.timeLimit;
        }, 0);
    } else {
        const data = await tempQuestion.insertMany(req.body.addedQuestions);
        addedQuestions = data.map((q) => q._id);
        estimatedTime = data.reduce((total, item) => {
            return total + item.timeLimit;
        }, 0);
    }
    const newRoom = new Room({
        roomCode: req.body.roomCode,
        roomType: req.body.roomType,
        public: req.body.public,
        subject: req.body.subject,
        topic: req.body.topic,
        difficulty: req.body.difficulty,
        estimatedTime: estimatedTime,
        creator: req.body.creator,
        sizeLimit: parseInt(req.body.sizeLimit),
        numOfQuestion: parseInt(req.body.numOfQuestion),
        randomQuestions: randomQuestions,
        addedQuestions: addedQuestions,
        questionType: req.body.questionType,
        users: [],
        started: false,
        name: req.body.name,
    });
    newRoom
        .save()
        .then(() => {
            console.log("roomCreated");
            res.send({ message: "room created" });
        })
        .catch((e) => {
            console.log(e);
            next(e, 500);
        });
});
