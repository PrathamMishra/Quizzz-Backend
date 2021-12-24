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
                const arrayData = RoomData.users.map((data) => {
                    const obj = {};
                    if (data.score === prevData) {
                        obj.rank = rank;
                    } else {
                        rank++;
                        obj.rank = rank;
                    }
                    obj.name = data.userData.name || "";
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
    async.each(
        RoomData.users,
        (users) => {},
        (err) => {
            if (err) console.log(err);
            else console.log("RATINGS UPDATED");
        }
    );
});
