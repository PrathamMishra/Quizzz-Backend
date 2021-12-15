const mongoose = require('mongoose');
const dotenv = require('dotenv');
const http = require('http');
const {Server} = require("socket.io");
const Room = require("./models/RoomModel.js");
const Question = require('./models/QuestionModel.js');

// Lode enverment variables
dotenv.config({ path: './config.env' });

// creating server 

const app = require("./app");
const { studentDataService } = require('./utils/dataMailService.js');
const server = http.createServer(app);
const port = process.env.PORT || 3000;

// creating web socket
const io = new Server(server,{cors: {
    origin:'*',
    credentials:true
 }});

// websocketing
io.on('connection', (socket) => {
    let RoomData,count=0;
    socket.on("join",async ({name,roomCode, img},callback)=>{
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
            if(RoomData.users.findIndex((user)=>user.name === name)!==-1){
                callback({type: 'known', message: 'Already in room'},null);
                return; 
            }
            if(RoomData.users.filter((user)=>user.status!=='kicked').length === RoomData.sizeLimit){
                callback({type: 'known', message: 'Room Full'});
                return;
            }
            RoomData.users.push({name,socketId: socket.id, image:img});
            await RoomData.save();
            const confidentialRoomData = {...RoomData, randomQuestions: null, addedQuestions: null};
            io.to(roomCode).emit('list',confidentialRoomData);
            callback(null,confidentialRoomData);
        }
        catch(e){
            callback(e,null);
        }
    });
    socket.on('start',async(roomCode)=>{
        try{
            RoomData.started = true;
            await RoomData.save();
            // socket.broadcast.to(roomCode).emit('matchStarted',{});
            if(RoomData.questionType === 'random'){
                const Question = await Question.find(RoomData.randomQuestions[count]);
                delete Question.answer;
                // socket.broadcast.to(roomCode).emit('Question',{Question: Question});
                socket.broadcast.to(roomCode).emit('matchStarted',{Question: Question});
            }
            else{
                const Question = await Question.find(RoomData.addedQuestions[count]);
                delete Question.answer;
                // socket.broadcast.to(roomCode).emit('Question',{Question: Question});
                socket.broadcast.to(roomCode).emit('matchStarted',{Question: Question});
            }
        }
        catch(e){
            console.log(e);
        }
    });
    socket.on('userAnswered',async(ans,skipped,roomCode,time,callback)=>{
        try{
            const index = RoomData.users.findIndex((socketId)=>{
                return user.socketId === socket.id;
            });
            const Question = await Question.find(RoomData.randomQuestions[count]);
            if(skipped){
                RoomData.users[index].skipped.push(count);
            }
            else if(Question.answer === ans){
                RoomData.users[index].score += Question.marks;
                RoomData.users[index].correct.push(count);
            }
            else{
                RoomData.users[index].score += Question.negativeMarks;
                RoomData.users[index].wrong.push(count);
            }
            RoomData.users[index].time += time;
            count++;
            await RoomData.save();
            if(RoomData.numOfQuestion===count){
                // socket.emit('quizComplete',{});
                callback(null,{message:'Quiz Complete'});
            }
            else{
                if(RoomData.questionType === 'random'){
                    const Question = await Question.find(RoomData.randomQuestions[count]);
                    delete Question.answer;
                    // socket.emit('Question',{Question: Question});
                    callback(null,{message:'Question', Question: Question});
                }
                else{
                    const Question = await Question.find(RoomData.addedQuestions[count]);
                    delete Question.answer;
                    // socket.emit('Question',{Question: Question});
                    callback(null,{message:'Question', Question: Question});
                }
            }
            io.to(roomCode).emit('list',{...RoomData, randomQuestions: null, addedQuestions: null});
        }
        catch(e){
            callback(e,null);
            console.log(e);
        }
    });
    socket.on('cheated',async(roomCode)=>{
        try{
            const index = RoomData.users.findIndex((user)=>{
                return user.socketId === socket.id;
            });
            RoomData.users[index].status='banned';
            // socket.broadcast.to(RoomData.users[index].socketId).emit("bannedFromRoom");
            await RoomData.save();
            io.to(roomCode).emit('list',{...RoomData, randomQuestions: null, addedQuestions: null});
        }
        catch(e){
            console.log(e);
        }
    });
    socket.on('warning',async(callback)=>{
        try{
            const index = RoomData.users.findIndex((user)=>{
                return user.socketId === socket.id;
            });
            RoomData.users[index].warning++;
            await RoomData.save();
            if(RoomData.users[index].warning >= 3){
                RoomData.users[index].status='banned';
                await RoomData.save();
                callback("bannedFromRoom");
                io.to(roomCode).emit('list',{...RoomData, randomQuestions: null, addedQuestions: null});
            }
            callback(null)
        }
        catch(e){
            console.log(e)
        }
    });
    socket.on('removePerson',async(socketId,roomCode)=>{
        try{
            const index = RoomData.users.findIndex((user)=>{
                return user.socketId === socketId;
            });
            RoomData.users[index].status='kicked';
            socket.broadcast.to(RoomData.users[index].socketId).emit("kickedFromRoom");
            await RoomData.save();
            io.to(roomCode).emit('list',{...RoomData, randomQuestions: null, addedQuestions: null});
        }
        catch(e){
            console.log(e);
        }
    });
    socket.on('disband',async (roomCode)=>{
        try{
            socket.broadcast.to(roomCode).emit('roomDisbanded');
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
            await studentDataService(RoomData);
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

