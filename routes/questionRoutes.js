const express = require('express')
const questionController = require('../controllers/questionController');


const router = express.Router()

router.get("/getRendomAuestion/:numberOfQuestion",questionController.getRendomQuestion)

router
    .route('/')
    .get(questionController.getAllQuestions)
    .post(questionController.createQuestion);

router
    .route('/:id')
    .get(questionController.getQuestion)
    .patch(questionController.updateQuestion)
    .delete(questionController.deleteQuestion);



module.exports = router;