const Room = require("./../models/RoomModel");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apiFeatures");
const catchAsync = require("../utils/catchAsync");

exports.getAllRooms = catchAsync( async (req, res, next) => {
    const features = new APIFeatures(Room.find(),req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate()

    const rooms = await features.query;

    res.status(200).json({
        status: "success",
        numberOfRooms: rooms.length,
        data: {
            rooms,
        }
    });
})

exports.getRoomDetails =catchAsync(async (req, res, next) => {
    let room =await Room.findById(req.params.id);

    if(!room) return next(new AppError('No Room found with that Id',404));

    res.status(200).json({
        status:'success',
        data:{
            room
        }
    })
})

exports.createRoom = catchAsync(async (req, res, next)=>{
    let randomQuestions=[],addedQuestions=[];
    if(req.body.questionType === 'random'){
        // setRandomQuestions
    }
    else{
        addedQuestions = req.body.addedQuestions;
    }
    const newRoom = new Room({
        roomCode: req.body.roomCode,
        public: req.body.public,
        subject: req.body.subject,
        topic: req.body.topic,
        difficulty: req.body.difficulty,
        estimatedTime: req.body.estimatedTime,
        creator: req.body.name,
        sizeLimit: req.body.sizeLimit,
        numOfQuestion: req.body.numOfQuestion,
        randomQuestions: randomQuestions,
        addedQuestions: addedQuestions,
        questionType: req.body.questionType,
        users: [],
        started: false
    })
    newRoom.save().then(()=>{
        res.send({message: "room created"});
    })
})