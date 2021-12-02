const mongoose = require('mongoose');
const dotenv = require('dotenv');
const http = require('http');
const {Server} = require("socket.io");
const Room = require("./models/RoomModel.js");
// Lode enverment variables
dotenv.config({ path: './config.env' });

// creating server 

const app = require("./app");
const Question = require('./models/QuestionModel.js');
const server = http.createServer(app);
const port = process.env.PORT || 3000;

// creating web socket
const io = new Server(server,{cors: {
    origin:'http://localhost:3000',
    credentials:true
 }});

// websocketing
io.on('connection', (socket) => {
    let RoomData,count=0;
    socket.on("join",async ({name,roomCode},callback)=>{
        console.log(name,roomCode);
        try{
            RoomData = await Room.findOne({roomCode});
            if(!RoomData){
                callback({type: 'known', message: 'Room not found'},null);
                return;
            }
            if(RoomData.started){
                callback({type: 'known', message: 'Match Started'},null);
                return;
            }
            if(RoomData.users.find((user)=>user.name === name)!==-1){
                callback({type: 'known', message: 'Already in room'},null);
                return; 
            }
            RoomData.users.push({name,socketId: socket.id});
            await RoomData.save();
            const confidentialRoomData = {...RoomData, randomQuestions: null, addedQuestions: null};
            socket.broadcast.to(roomCode).emit('list',confidentialRoomData);
            callback(null,confidentialRoomData);
        }
        catch(e){
            callback(e,null);
        }
    });
    socket.on('start',async(roomCode,callback)=>{
        try{
            RoomData.started = true;
            await RoomData.save();
            socket.broadcast.to(roomCode).emit('matchStarted',{});
            if(RoomData.questionType === 'random'){
                const Question = await Question.find(RoomData.randomQuestions[count]);
                socket.broadcast.to(roomCode).emit('Question',{Question: Question});
            }
            else{
                const Question = await Question.find(RoomData.addedQuestions[count]);
                socket.broadcast.to(roomCode).emit('Question',{Question: Question});
            }
            callback(null);
        }
        catch(e){
            callback(e);
        }
    });
    socket.on('userAnswered',async(name,score,skipped,roomCode,time)=>{
        try{
            const index = RoomData.users.findIndex((user)=>{
                return user.name === name;
            });
            if(skipped){
                RoomData.users[index].skipped.push(count);
            }
            else if(score>0){
                RoomData.users[index].correct.push(count);
            }
            else{
                RoomData.users[index].wrong.push(count);
            }
            RoomData.users[index].score += score;
            RoomData.users[index].time += time;
            count++;
            await RoomData.save();
            if(RoomData.numOfQuestion===count){
                socket.emit('quizComplete',{});
            }
            else{
                if(RoomData.questionType === 'random'){
                    const Question = await Question.find(RoomData.randomQuestions[count]);
                    socket.emit('Question',{Question: Question});
                }
                else{
                    const Question = await Question.find(RoomData.addedQuestions[count]);
                    socket.emit('Question',{Question: Question});
                }
            }
            io.to(roomCode).emit('list',{...RoomData, randomQuestions: null, addedQuestions: null});
        }
        catch(e){
            console.log(e);
        }
    });
    socket.on('cheated',async(roomCode)=>{
        try{
            const index = RoomData.users.findIndex((user)=>{
                return user.socketId === socket.id;
            });
            RoomData.users[index].status='banned';
            socket.broadcast.to(RoomData.users[index].socketId).emit("bannedFromRoom");
            await RoomData.save();
            socket.broadcast.to(roomCode).emit('list',{...RoomData, randomQuestions: null, addedQuestions: null});
        }
        catch(e){
            console.log(e);
        }
    });
    socket.on('warning',async()=>{
        try{
            const index = RoomData.users.findIndex((user)=>{
                return user.socketId === socket.id;
            });
            RoomData.users[index].warning++;
            await RoomData.save();
            if(RoomData.users[index].warning >= 3){
                RoomData.users[index].status='banned';
                socket.broadcast.to(RoomData.users[index].socketId).emit("bannedFromRoom");
                await RoomData.save();
                socket.broadcast.to(roomCode).emit('list',{...RoomData, randomQuestions: null, addedQuestions: null});
            }
        }
        catch(e){
            console.log(e)
        }
    });
    socket.on('removePerson',async(name,roomCode)=>{
        try{
            const index = RoomData.users.findIndex((user)=>{
                return user.name === name;
            });
            RoomData.users[index].status='kicked';
            socket.broadcast.to(RoomData.users[index].socketId).emit("kickedFromRoom");
            await RoomData.save();
            socket.broadcast.to(roomCode).emit('list',{...RoomData, randomQuestions: null, addedQuestions: null});
        }
        catch(e){
            console.log(e);
        }
    });
    socket.on('disband',async (roomCode)=>{
        try{
            socket.broadcast.to(roomCode).emit('roomDisbanded',{});
            const data = await Room.deleteOne({roomCode: roomCode});
        }
        catch(e){
            console.log(e);
        }
    });
    socket.on('close',async (roomCode)=>{
        try{
            socket.broadcast.to(roomCode).emit('roomClosed');
            // send mail of Question pdf to all students as well as teacher
            // send mail of scoresheet excell
            // send mail of photos of students with right, wrong and skipped Question of students to teacher
            // update student rank and rating
            const data = await Room.deleteOne({roomCode: roomCode});
        }
        catch(e){
            console.log(e);
        }
    });
    socket.on('disconnect', async (roomCode) => {
        try{
            const index = RoomData.users.findIndex((user)=>{
                return user.socketId === socket.id;
            });
            if(RoomData.creator===RoomData.users[index].name){
                socket.broadcast.to(roomCode).emit('roomDisbanded',{});
                const data = await Room.deleteOne({roomCode: roomCode});
            }
            else{
                if(RoomData.users[index].status==='joined'){
                    RoomData.users[index].status = 'Left';
                }
                await RoomData.save();
                socket.broadcast.to(roomCode).emit('list',{...RoomData, randomQuestions: null, addedQuestions: null});
            }
        }
        catch(e){
            console.log(e);
        }
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

