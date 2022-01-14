const mongoose = require("mongoose");
const dotenv = require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");

const app = require("./app");
const {
    studentDataService,
    updateRating,
    mailQuestions,
} = require("./utils/quizCompleteService.js");
const Room = require("./models/RoomModel.js");
const Question = require("./models/questionModel");
const tempQuestion = require("./models/tempQuestionModel");
const User = require("./models/userModel.js");
const catchAsync = require("./utils/catchAsync");

// creating server

const server = http.createServer(app);
const port = process.env.PORT || 3000;

// creating web socket
const io = new Server(server, {
    cors: {
        origin: process.env.ALLOW_ORIGIN,
        credentials: true,
    },
});

// websocketing
io.on("connection", (socket) => {
    var count = 0;
    socket.on("join", async ({ userId, roomCode }, callback) => {
        console.log("hit");
        try {
            let RoomData = await Room.findOne({ roomCode });
            if (!RoomData) {
                callback({ type: "known", message: "Room not found" }, null);
                return;
            }
            if (RoomData.started) {
                callback({ type: "known", message: "Match Started" }, null);
                return;
            }
            if (
                RoomData.creatorSocket === "" &&
                RoomData.creator.toString() === userId
            ) {
                RoomData.creatorSocket = socket.id;
                await RoomData.save();
                socket.join(roomCode);
                callback(null, RoomData);
                return;
            }
            if (
                RoomData.creatorSocket !== "" &&
                RoomData.creator.toString() === userId
            ) {
                callback(
                    { type: "known", message: "CREATOR ALREADY JOINED ONCE" },
                    null
                );
                return;
            }
            if (RoomData.creatorSocket === "") {
                callback(
                    { type: "known", message: "CREATOR NOT JOINED YET" },
                    null
                );
                return;
            }
            if (RoomData.users.findIndex((user) => user.id === userId) !== -1) {
                callback({ type: "known", message: "Already in room" }, null);
                return;
            }
            if (
                RoomData.users.filter((user) => user.status !== "kicked")
                    .length === RoomData.sizeLimit
            ) {
                callback({ type: "known", message: "Room Full" });
                return;
            }
            socket.join(roomCode);
            RoomData.users.push({ userData: userId, socketId: socket.id });
            await RoomData.save();
            RoomData = await Room.findOne({ roomCode }).populate(
                "users.userData",
                "name photo rating"
            );
            callback(null, RoomData);
            io.to(roomCode).emit("list", RoomData);
        } catch (e) {
            callback(e, null);
        }
    });
    socket.on("start", async (roomCode) => {
        try {
            let RoomData = await Room.findOne({ roomCode });
            RoomData.started = true;
            await RoomData.save();
            if (RoomData.questionType === "random") {
                let currentQuestion = await Question.findById(
                    RoomData.randomQuestions[0]
                );
                const nextQuestion = {
                    question_img: currentQuestion.question_img,
                    options: currentQuestion.options,
                    option_img: currentQuestion.option_img,
                    subject: currentQuestion.subject,
                    topic: currentQuestion.topic,
                    questionPreviousRecord:
                        currentQuestion.questionPreviousRecord,
                    marks: currentQuestion.marks,
                    negativeMarks: currentQuestion.negativeMarks,
                    question: currentQuestion.question,
                };
                socket.broadcast
                    .to(roomCode)
                    .emit("matchStarted", nextQuestion);
            } else {
                let currentQuestion = await tempQuestion.findById(
                    RoomData.addedQuestions[0]
                );
                const nextQuestion = {
                    question_img: currentQuestion.question_img,
                    options: currentQuestion.options,
                    option_img: currentQuestion.option_img,
                    subject: currentQuestion.subject,
                    topic: currentQuestion.topic,
                    questionPreviousRecord:
                        currentQuestion.questionPreviousRecord,
                    marks: currentQuestion.marks,
                    negativeMarks: currentQuestion.negativeMarks,
                    question: currentQuestion.question,
                };
                socket.broadcast
                    .to(roomCode)
                    .emit("matchStarted", nextQuestion);
            }
        } catch (e) {
            console.log(e);
        }
    });
    socket.on("userAnswered", async (ans, roomCode, time, callback) => {
        try {
            let RoomData = await Room.findOne({ roomCode });
            const index = RoomData.users.findIndex((user) => {
                return user.socketId === socket.id;
            });
            console.log(RoomData);
            console.log(index);
            console.log(count);
            let currentQuestion;
            if (RoomData.questionType === "random") {
                currentQuestion = await Question.findById(
                    RoomData.randomQuestions[count]
                );
            } else {
                currentQuestion = await tempQuestion.findById(
                    RoomData.addedQuestions[count]
                );
            }
            console.log(currentQuestion);
            if (ans === -1) {
                RoomData.users[index].skipped.push(count);
            } else if (currentQuestion.answer === ans) {
                RoomData.users[index].score += currentQuestion.marks;
                RoomData.users[index].correct.push(count);
            } else {
                RoomData.users[index].score += currentQuestion.negativeMarks;
                RoomData.users[index].wrong.push(count);
            }
            RoomData.users[index].time += time;
            count++;
            console.log(RoomData);
            console.log(count);
            await RoomData.save();
            if (RoomData.numOfQuestion === count) {
                callback(null, { message: "Quiz Complete" });
            } else {
                if (RoomData.questionType === "random") {
                    currentQuestion = await Question.findById(
                        RoomData.randomQuestions[count]
                    );
                    const nextQuestion = {
                        question_img: currentQuestion.question_img,
                        options: currentQuestion.options,
                        option_img: currentQuestion.option_img,
                        subject: currentQuestion.subject,
                        topic: currentQuestion.topic,
                        questionPreviousRecord:
                            currentQuestion.questionPreviousRecord,
                        marks: currentQuestion.marks,
                        negativeMarks: currentQuestion.negativeMarks,
                        question: currentQuestion.question,
                    };
                    callback(null, {
                        message: "Question",
                        Question: Question,
                    });
                } else {
                    currentQuestion = await tempQuestion.findById(
                        RoomData.addedQuestions[count]
                    );
                    const nextQuestion = {
                        question_img: currentQuestion.question_img,
                        options: currentQuestion.options,
                        option_img: currentQuestion.option_img,
                        subject: currentQuestion.subject,
                        topic: currentQuestion.topic,
                        questionPreviousRecord:
                            currentQuestion.questionPreviousRecord,
                        marks: currentQuestion.marks,
                        negativeMarks: currentQuestion.negativeMarks,
                        question: currentQuestion.question,
                    };
                    callback(null, {
                        message: "Question",
                        Question: Question,
                    });
                }
            }
            RoomData.populate("users.userData", "name photo rating");
            io.to(roomCode).emit("list", RoomData);
        } catch (e) {
            callback(e, null);
        }
    });
    socket.on("cheated", async (roomCode) => {
        try {
            console.log(roomCode);
            let RoomData = await Room.findOne({ roomCode }).populate(
                "users.userData",
                "name photo rating"
            );
            const index = RoomData.users.findIndex((user) => {
                return user.socketId === socket.id;
            });
            RoomData.users[index].status = "banned";
            socket.broadcast
                .to(RoomData.users[index].socketId)
                .emit("bannedFromRoom");
            await RoomData.save();
            io.to(roomCode).emit("list", RoomData);
        } catch (e) {
            console.log(e);
        }
    });
    socket.on("warning", async (callback) => {
        try {
            let RoomData = await Room.findOne({ roomCode });
            const index = RoomData.users.findIndex((user) => {
                return user.socketId === socket.id;
            });
            RoomData.users[index].warning++;
            await RoomData.save();
            if (RoomData.users[index].warning >= 3) {
                RoomData.users[index].status = "banned";
                await RoomData.save();
                callback("bannedFromRoom");
                RoomData.populate("users.userData", "name photo rating");
                io.to(roomCode).emit("list", RoomData);
            }
            callback(null);
        } catch (e) {
            console.log(e);
        }
    });
    socket.on("removePerson", async (socketId, roomCode) => {
        try {
            let RoomData = await Room.findOne({ roomCode });
            const index = RoomData.users.findIndex((user) => {
                return user.socketId === socketId;
            });
            RoomData.users[index].status = "kicked";
            socket.broadcast
                .to(RoomData.users[index].socketId)
                .emit("kickedFromRoom");
            await RoomData.save();
            RoomData.populate("users.userData", "name photo rating");
            io.to(roomCode).emit("list", RoomData);
        } catch (e) {
            console.log(e);
        }
    });
    socket.on("disband", async (roomCode) => {
        try {
            socket.broadcast.to(roomCode).emit("roomDisbanded");
            const data = await Room.deleteOne({ roomCode: roomCode });
        } catch (e) {
            console.log(e);
        }
    });
    socket.on("close", async (roomCode) => {
        try {
            socket.broadcast.to(roomCode).emit("roomClosed");
            mailQuestions(roomCode);
            studentDataService(roomCode);
            updateRating(roomCode);
            const data = await Room.deleteOne({ roomCode: roomCode });
        } catch (e) {
            console.log(e);
        }
    });
    socket.on("message", async ({ userId, text }, roomCode) => {
        const room = await Room.findOne({ roomCode });
        if (room) io.to(roomCode).emit("messageRecieved", { userId, text });
    });
    socket.on("leaveRoom", async (roomCode) => {
        try {
            console.log(roomCode);
            let RoomData = await Room.findOne(
                { roomCode },
                "users creatorSocket"
            );
            const index = RoomData.users.findIndex((user) => {
                return user.socketId === socket.id;
            });
            if (RoomData.creatorSocket === socket.id) {
                socket.broadcast.to(roomCode).emit("roomDisbanded", {});
                const data = await Room.deleteOne({ roomCode: roomCode });
            } else {
                if (RoomData.users[index].status === "joined") {
                    RoomData.users[index].status = "left";
                }
                await RoomData.save();
                RoomData.populate("users.userData", "name photo rating");
                socket.broadcast.to(roomCode).emit("list", RoomData);
            }
        } catch (e) {
            console.log(e);
        }
    });
    socket.on("disconnect", () => {
        socket.leave();
    });
});

// current working enverment
console.log(process.env.NODE_ENV);

// connect to DB
mongoose
    .connect(process.env.DATABASE, {
        useNewUrlParser: true,
        useCreateIndex: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
    })
    .then(() => {
        console.log("DB connection successful!");
        Room.deleteMany({})
            .then(() => console.log("create new Room"))
            .catch((e) => console.log(e));
        tempQuestion
            .deleteMany({})
            .then(() => console.log("room questions refreshed"))
            .catch((e) => console.log(e));
        server.listen(port, () => {
            console.log(`app running on port ${port}..`);
        });
    })
    .catch((e) => console.log(e));
