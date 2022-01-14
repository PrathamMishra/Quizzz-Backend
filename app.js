const express = require("express");
const dotenv = require("dotenv").config();
const morgan = require("morgan");
const osSeedData = require("./main__os.json");
const cnSeedData = require("./main__cn.json");
const dbmsSeedData = require("./mcq.json");
const Question = require("./models/questionModel");
const cors = require("cors");

const globalErrorHandler = require("./controllers/errorController");
const questionRouter = require("./routes/questionRoutes");
const userRouter = require("./routes/userRoutes");
const roomRouter = require("./routes/roomRoutes");

const app = express();

const corsOptions = {
    origin: process.env.ALLOW_ORIGIN,
    optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
}
app.get("/seedQuestions", (req, res) => {
    Question.insertMany(osSeedData).then(() => {
        console.log("OS DONE");
    });
    Question.insertMany(cnSeedData).then(() => {
        console.log("CN DONE");
    });
    Question.insertMany(dbmsSeedData).then(() => {
        console.log("DBMS DONE");
    });
    res.send("DB seeded");
});

app.use(express.json());
app.use(express.static(`${__dirname}/public`));

app.use("/api/v1/questions", questionRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/rooms", roomRouter);

app.all("*", (req, res, next) => {
    console.log("can't find route on this server");
});

app.use(globalErrorHandler);

module.exports = app;
