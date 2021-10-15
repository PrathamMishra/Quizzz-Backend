const mongoose = require('mongoose');
const dotenv = require('dotenv');
const http = require('http');
const {Server} = require("socket.io");
// Lode enverment variables
dotenv.config({ path: './config.env' });

// creating server 

const app = require("./app");
const server = http.createServer(app);
const port = process.env.PORT || 3000;

// creating web socket
const io = new Server(server,{cors: {
    origin:'*',
    credentials:true
 }});

// websocketing
io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on("join",({name,roomCode},callback)=>{
        console.log(name,roomCode);
        callback();
    })

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});


// current working enverment
console.log(process.env.NODE_ENV)

// connect to DB
mongoose.connect(process.env.DATABASE, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false
}).then(() =>{ 
        console.log('DB connection successful!')
        server.listen(port, () => {
            console.log(`app running on port ${port}..`)
        })
    }).catch(e=>console.log(e));

