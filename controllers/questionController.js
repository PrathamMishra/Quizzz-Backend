const Question = require("./../models/questionModel");
const tempQuestion = require("./../models/tempQuestionModel");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apiFeatures");
const catchAsync = require("../utils/catchAsync");
const { rawListeners } = require("./../models/questionModel");

exports.getAllQuestions = catchAsync(async (req, res, next) => {
    const features = new APIFeatures(Question.find(), req.query)
        .filter()
        .sort()
        .limitFields()
        .paginate();

    const questions = await features.query;

    res.status(200).json({
        status: "success",
        numberOfQuestons: questions.length,
        data: {
            questions,
        },
    });
});

exports.getQuestion = catchAsync(async (req, res, next) => {
    let question = await Question.findById(req.params.id);

    if (!question)
        return next(new AppError("No document found with that Id", 404));

    res.status(200).json({
        status: "success",
        data: {
            question,
        },
    });
});

exports.createQuestion = catchAsync(async (req, res, next) => {
    const newQuestion = await Question.create(req.body);
    const question = {
        option: newQuestion.option,
        exam: newQuestion.exam,
        field: newQuestion.field,
        questionPreviousRecord: newQuestion.questionPreviousRecord,
        _id: newQuestion._id,
        question: newQuestion.question,
        answer: newQuestion.answer,
        course: newQuestion.course,
        subject: newQuestion.subject,
        topic: newQuestion.topic,
        type: newQuestion.type,
        difficulty: newQuestion.difficulty,
        description: newQuestion.description,
    };
    res.status(201).json({
        status: "Succes",
        data: {
            question,
        },
    });
});

exports.updateQuestion = catchAsync(async (req, res, next) => {
    const updatedQuestion = await Question.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
            new: true,
            runValidators: true,
        }
    );

    if (!updatedQuestion)
        return next(new AppError("No document found with that id", 404));

    res.status(200).json({
        status: "success",
        data: {
            updatedQuestion,
        },
    });
});

exports.deleteQuestion = catchAsync(async (req, res, next) => {
    const doc = await Question.findByIdAndDelete(req.params.id);

    if (!doc) {
        return next(new AppError("No document found with that Id", 404));
    }

    res.status(204).json({
        status: "success",
        data: null,
    });
});

exports.getRendomQuestion = catchAsync(async (req, res, next) => {
    const features = new APIFeatures(Question.find(), req.query).filter();

    const questions = await features;

    if (!questions) return next("No document found", 404);
    res.status(200).json({
        status: "success",
        data: questions,
    });
});
// exports.getRendomQuestion = catchAsync(async (req, res, next)=>{

//     const queryObj = {...req.query}
//     const excludeFields = ['page','sort','limit','fields']
//     excludeFields.forEach(el=>delete queryObj[el]);

//     let queryStr=JSON.stringify(queryObj);
//     queryStr=queryStr.replace(/\b(gte|gt|lte|lt)\b/g,match=>`$${match}`)

//     query=JSON.parse(queryStr);

//     console.log(query)

//     const questions = await Question.aggregate([
//         {
//           $match:{
//             duration:{$lte:7},

//           }
//         },
//         {
//           $sample:{ size: req.params.numberOfQuestion*1 },
//         },
//         // {
//         //   $group:{
//         //     _id:"$_id",
//         //     name:{"$first": "$slug"},
//         //     duration:{"$first" :"$duration"}
//         //   }
//         // },
//     ])
//     if(!questions) return next('No document found',404)
//     res.status(200).json({
//         status: 'success',
//         data: questions
//     });
//   })

exports.createTempQuestion = async (req, res, next) => {
    try {
        const temp = {
            ...req.body,
            timeLimit: parseInt(req.body.timeLimit),
            marks: parseInt(req.body.marks),
            negativeMarks: parseInt(req.body.negativeMarks),
            chapterOf: parseInt(req.body.chapterOf),
        };
        const newQuestion = await tempQuestion.create(temp);
        res.status(201).json({
            status: "Succes",
            data: {
                id: newQuestion._id,
            },
        });
    } catch (e) {
        console.log(e);
        res.status(400).json({
            message: e,
        });
    }
};
