const express = require('express')
const roomController = require('../controllers/roomController');


const router = express.Router()

router
    .route('/joinRoom')
    .get(roomController.getAllRooms)
    .post(roomController.getRoomDetails);

router
    .route('/createRoom')
    .post(roomController.createRoom)

module.exports = router;