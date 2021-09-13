const express = require('express');
const morgan = require('morgan');


const globalErrorHandler = require("./controllers/errorController")
const questionRouter = require('./routes/questionRoutes')
const userRouter = require('./routes/userRoutes')


const app = express();

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

app.use(express.json());
app.use(express.static(`${__dirname}/public`));


app.use('/api/v1/questions', questionRouter);
app.use('/api/v1/users', userRouter);

app.all('*', (req, res, next) => {
    console.log("can't find route on this server")
})

app.use(globalErrorHandler)


module.exports = app;