const async = require("async");
const htmlPdf = require("html-pdf");
const ejs = require("ejs");
const catchAsync = require("./catchAsync");
const excel = require("node-excel-export");
const Room = require("../models/RoomModel");
const User = require("../models/userModel");

function compare(a, b) {
    if (a.score < b.score) {
        return 1;
    }
    if (a.score > b.score) {
        return -1;
    }
    if (a.time < b.time) {
        return -1;
    }
    if (a.time > b.time) {
        return 1;
    }
    return 0;
}

function getRating(type, rank, rating){
    let mult = 1, finalPoint = 0;
    if(type==='medium')mult=2;
    else if(type==='hard')mult=3;
    if(rank<=50){
        switch(rank){
            case rank<=1:
                finalPoint = 130*mult;break;
            case rank==2:
                finalPoint = 80*mult;break;
            case rank==3:
                finalPoint = 60*mult;break;
            case rank == 4 || rank == 5:
                finalPoint = 40*mult;break;
            case rank>=6 && rank <=10:
                finalPoint = 30*mult;break;
            case rank>=11 && rank <=20:
                finalPoint = 20*mult;break;
            case rank>=21 && rank <=50:
                finalPoint = 10*mult;break;
            default:
                finalPoint = 0;break;
        }
        switch(rating){
            case rating>=1250 && rating <1500:
                finalPoint = Math.floor(finalPoint*0.85);break;
            case rating>=1500 && rating <2000:
                finalPoint = Math.floor(finalPoint*0.7);break;
            case rating>=2000 && rating <2500:
                finalPoint = Math.floor(finalPoint*0.55);break;
            case rating>=2500 && rating <3500:
                finalPoint = Math.floor(finalPoint*0.40);break;
            case rating>=3500 && rating <5000:
                finalPoint = Math.floor(finalPoint*0.25);break;
            case rating >= 5000:
                finalPoint = Math.floor(finalPoint*0.10);break;
            default:
                finalPoint = Math.floor(finalPoint*1);break;
        }
    }
    else{
        switch(rank){
            case rank==100:
                finalPoint = -130*mult;break;
            case rank==99:
                finalPoint = -80*mult;break;
            case rank==98:
                finalPoint = -60*mult;break;
            case rank == 97 || rank == 96:
                finalPoint = -40*mult;break;
            case rank>=91 && rank <=95:
                finalPoint = -30*mult;break;
            case rank>=81 && rank <=90:
                finalPoint = -20*mult;break;
            case rank>=51 && rank <=80:
                finalPoint = -10*mult;break;
            default:
                finalPoint = 0;break;
        }
        switch(rating){
            case rating < 1250:
                finalPoint = Math.floor(finalPoint*0.1);break;
            case rating>=1250 && rating <1500:
                finalPoint = Math.floor(finalPoint*0.25);break;
            case rating>=1500 && rating <2000:
                finalPoint = Math.floor(finalPoint*0.40);break;
            case rating>=2000 && rating <2500:
                finalPoint = Math.floor(finalPoint*0.55);break;
            case rating>=2500 && rating <3500:
                finalPoint = Math.floor(finalPoint*0.70);break;
            case rating>=3500 && rating <5000:
                finalPoint = Math.floor(finalPoint*0.85);break;
            default:
                finalPoint = Math.floor(finalPoint*1);break;
        }
    }
    return finalPoint;
}

exports.studentDataService = (roomCode) => {
    const RoomData = await Room.findOne({ roomCode }).populate(
        "users.userData",
        "name img email rating"
    );
    RoomData.users.sort(compare);
    async.parallel(
        [
            catchAsync(async function (callback) {
                const html = await ejs.renderFile(
                    "../templates/students.ejs",
                    RoomData.users
                );
                htmlPdf.create(html).toBuffer((err, buffer) => {
                    if (err) {
                        callback(err, null);
                    } else {
                        callback(null, buffer);
                    }
                });
            }),
            catchAsync(async function (callback) {
                let rank = 1,
                    prevData = RoomData.users[0].score;
                    prevTime = RoomData.users[0].time;
                const arrayData = RoomData.users.map((data) => {
                    const obj = {};
                    if (data.score === prevData && data.time === prevTime) {
                        obj.rank = rank;
                    } else {
                        rank++;
                        obj.rank = rank;
                    }
                    obj.name = data.userData.name || "";
                    obj.status = data.status || '-';
                    obj.score = data.score || 0;
                    obj.minutes = data.time / 60;
                    obj.seconds = data.time % 60;
                    return obj;
                });
                const styles = {
                    headerDark: {
                        fill: {
                            fgColor: {
                                rgb: "FF000000",
                            },
                        },
                        font: {
                            color: {
                                rgb: "FFFFFFFF",
                            },
                            sz: 14,
                            bold: true,
                            underline: true,
                        },
                    },
                };
                const headings = [["SCORE SHEET"]];
                const specifications = {
                    rank: {
                        displayName: "RANK",
                        headerStyle: styles.headerDark,
                        width: 100,
                    },
                    name: {
                        displayName: "NAME",
                        headerStyle: styles.headerDark,
                        width: 250,
                    },
                    status: {
                        displayName: "STATUS",
                        headerStyle: styles.headerDark,
                        width: 250,
                    },
                    score: {
                        displayName: "SCORE",
                        headerStyle: styles.headerDark,
                        width: 100,
                    },
                    minutes: {
                        displayName: "MINUTES",
                        headerStyle: styles.headerDark,
                        width: 100,
                    },
                    seconds: {
                        displayName: "SECONDS",
                        headerStyle: styles.headerDark,
                        width: 100,
                    },
                };
                const reportResult = excel.buildExport([
                    {
                        name: "Student Score Sheet",
                        heading: heading,
                        specification: specification,
                        data: arrayData,
                    },
                ]);
                callback(null, reportResult);
            }),
        ],
        catchAsync(async function (err, results) {
            await sendEmail({
                to: RoomData.creatorMail,
                subject: "Student Data",
                text: `Here is data of all of the participants of your contest ${RoomData.name}`,
                attachments: [
                    {
                        filename: "participant_data.pdf",
                        content: results[0],
                    },
                    {
                        filename: "student_score_sheet.xls",
                        content: results[1],
                    },
                ],
            });
        })
    );
};

exports.updateRating = catchAsync(async (roomCode) => {
    const RoomData = await Room.findOne({ roomCode });
    const creator = await User.findById(RoomData.creator);
    creator.rating += 100;
    await creator.save();
    const institute = await User.findById(RoomData.institute, "rating");
    if (RoomData.roomType === "tournament")
        institute.rating += RoomData.users.length + 10;
    else institute.rating += RoomData.users.length;
    await institute.save();
    const validPlayers = RoomData.users.filter((data)=>(data.status!== 'kicked' && data.status!== 'banned'));
    validPlayers.sort(compare);
    let rank = 1,
    prevData = RoomData.users[0].score;
    prevTime = RoomData.users[0].time;
    const arrayData = validPlayers.map((data) => {
        const obj = {};
        if (data.score === prevData && data.time === prevTime) {
            obj.rank = rank;
        } else {
            rank++;
            obj.rank = rank;
        }
        obj.userData = data.userData || "";
        return obj;
    });
    async.each(
        arrayData,
        async(user,cb) => {
            try{
                const person = await User.findById(user.userData,'rating');
                const rating = getRating(RoomData.difficulty,Math.floor(user.rank*100/(arrayData.length)),person.rating);
                person.rating += rating;
                await person.save();
                cb();
            }catch(e){
                cb(e);
            }
        },
        (err) => {
            if (err) console.log(err);
            else console.log("RATINGS UPDATED");
        }
    );
});
