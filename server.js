const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Lode enverment variables
dotenv.config({ path: './config.env' });

const app = require("./app");

// connect to DB

mongoose.connect(process.env.DATABASE_LOCAL, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
}).then(() => console.log('DB connection successful!'))

// To Tell current working enverment
console.log(process.env.NODE_ENV)

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
    console.log(`app running on port ${port}..`)
})
