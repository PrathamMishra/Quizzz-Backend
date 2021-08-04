const Question = require("./../models/QuestionModel");

exports.getAllQuestions = async (req, res) => {
    const questions = await Question.find();

    res.status(200).json({
        status: "success",
        numberOfQuestons: questions.length,
        data: {
            questions,
        }
    });
};

exports.getQuestion = (req, res) => {
    res.status(500).json({
        status: "error",
        message: 'this route is not yet defined!'
    });
};

exports.createQuestion = async (req, res) => {
    try {
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
        }
        res.status(201).json({
            status: "Succes",
            data: {
                question
            }
        })
    } catch (err) {
        res.status(404).json({
            status: "error",
            error: {
                err
            }
        })
    }
};

exports.updateQuestion = (req, res) => {
    res.status(500).json({
        status: "error",
        message: 'this route is not yet defined!'
    });
};

exports.deleteQuestion = (req, res) => {
    res.status(500).json({
        status: "error",
        message: 'this route is not yet defined!'
    });
};

