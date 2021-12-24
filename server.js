const mongoose = require("mongoose");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");

const app = require("./app");
const { studentDataService } = require("./utils/quizCompleteService.js");
const Room = require("./models/RoomModel.js");
const Question = require("./models/QuestionModel.js");
const tempQuestion = require("./models/tempQuestionModel.js");
const User = require("./models/userModel.js");
const catchAsync = require("./utils/catchAsync");

// Lode enverment variables
dotenv.config({ path: "./config.env" });

// creating server

const server = http.createServer(app);
const port = process.env.PORT || 3000;

// creating web socket
const io = new Server(server, {
    cors: {
        origin: "*",
        credentials: true,
    },
});

// websocketing
io.on("connection", (socket) => {
    var count = 0;
    socket.on("join", async ({ userId, roomCode, img }, callback) => {
        try {
            let RoomData = await Room.findOne({ roomCode });
            if (!RoomData) {
                console.log("Room not found");
                //callback({ type: "known", message: "Room not found" }, null);
                return;
            }
            if (RoomData.started) {
                console.log("Match Started");
                //callback({ type: "known", message: "Match Started" }, null);
                return;
            }
            if (
                RoomData.creatorSocket === "" &&
                RoomData.creator.toString() === userId
            ) {
                RoomData.creatorSocket = socket.id;
                await RoomData.save();
                socket.join(roomCode);
                console.log("Creator Joined");
                // callback({ type: "known", message: "Already in room" }, null);
                return;
            }
            if (RoomData.creatorSocket === "") {
                console.log("Creator Not Joined");
                // callback({ type: "known", message: "Already in room" }, null);
                return;
            }
            if (RoomData.users.findIndex((user) => user.id === userId) !== -1) {
                console.log("Already in room");
                // callback({ type: "known", message: "Already in room" }, null);
                return;
            }
            if (
                RoomData.users.filter((user) => user.status !== "kicked")
                    .length === RoomData.sizeLimit
            ) {
                console.log("Room full");
                // callback({ type: "known", message: "Room Full" });
                return;
            }
            await User.findByIdAndUpdate(userId, { img });
            socket.join(roomCode);
            RoomData.users.push({ userData: userId, socketId: socket.id });
            console.log(RoomData);
            await RoomData.save();
            RoomData = await Room.findOne({ roomCode }).populate(
                "users.userData",
                "name photo rating"
            );
            console.log("REPOP", RoomData);
            io.to(roomCode).emit("list", RoomData.users);
            // callback(null, RoomData);
        } catch (e) {
            console.log(e);
            // callback(e, null);
        }
    });
    socket.on("start", async (roomCode) => {
        try {
            let RoomData = await Room.findOne(
                { roomCode },
                "started questionType randomQuestions addedQuestions"
            );
            RoomData.started = true;
            await RoomData.save();
            if (RoomData.questionType === "random") {
                let currentQuestion = await Question.findById(
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
                socket.broadcast
                    .to(roomCode)
                    .emit("matchStarted", nextQuestion);
            } else {
                let currentQuestion = await tempQuestion.findById(
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
                // socket.emit('quizComplete',{});
                console.log("quiz complete");
                // callback(null, { message: "Quiz Complete" });
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
                    console.log(nextQuestion);
                    // callback(null, {
                    //     message: "Question",
                    //     Question: Question,
                    // });
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
                    console.log(nextQuestion);
                    // callback(null, {
                    //     message: "Question",
                    //     Question: Question,
                    // });
                }
            }
            RoomData.populate("users.userData", "name photo rating");
            io.to(roomCode).emit("list", RoomData.users);
        } catch (e) {
            // callback(e, null);
            console.log(e);
        }
    });
    socket.on("cheated", async (roomCode) => {
        try {
            let RoomData = await Room.findOne({ roomCode }, "users").populate(
                "users.userData",
                "name photo rating"
            );
            const index = RoomData.users.findIndex((user) => {
                return user.socketId === socket.id;
            });
            RoomData.users[index].status = "banned";
            // socket.broadcast.to(RoomData.users[index].socketId).emit("bannedFromRoom");
            await RoomData.save();
            io.to(roomCode).emit("list", RoomData.users);
        } catch (e) {
            console.log(e);
        }
    });
    socket.on("warning", async (callback) => {
        try {
            let RoomData = await Room.findOne({ roomCode }, "users");
            const index = RoomData.users.findIndex((user) => {
                return user.socketId === socket.id;
            });
            RoomData.users[index].warning++;
            await RoomData.save();
            if (RoomData.users[index].warning >= 3) {
                RoomData.users[index].status = "banned";
                await RoomData.save();
                console.log("banned from room");
                // callback("bannedFromRoom");
                RoomData.populate("users.userData", "name photo rating");
                io.to(roomCode).emit("list", RoomData.users);
            }
            // callback(null);
        } catch (e) {
            console.log(e);
        }
    });
    socket.on("removePerson", async (socketId, roomCode) => {
        try {
            let RoomData = await Room.findOne({ roomCode }, "users");
            const index = RoomData.users.findIndex((user) => {
                return user.socketId === socketId;
            });
            RoomData.users[index].status = "kicked";
            socket.broadcast
                .to(RoomData.users[index].socketId)
                .emit("kickedFromRoom");
            await RoomData.save();
            RoomData.populate("users.userData", "name photo rating");
            io.to(roomCode).emit("list", RoomData.users);
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
            // send mail of Question pdf to all students as well as teacher
            // send mail of scoresheet excell
            // send mail of photos of students with right, wrong and skipped Question of students to teacher
            await studentDataService(roomCode);
            // update student, teacher and institute rating
            const data = await Room.deleteOne({ roomCode: roomCode });
        } catch (e) {
            console.log(e);
        }
    });
    socket.on("message", async ({ userId, text }, roomCode) => {
        const room = await Room.findOne({ roomCode });
        if (room) io.to(roomCode).emit("messageRecieved", { userId, text });
    });
    socket.on("disconnect", async (roomCode) => {
        try {
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
                    RoomData.users[index].status = "Left";
                }
                await RoomData.save();
                RoomData.populate("users.userData", "name photo rating");
                socket.broadcast.to(roomCode).emit("list", RoomData.users);
            }
        } catch (e) {
            console.log(e);
        }
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
