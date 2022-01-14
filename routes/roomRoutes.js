const express = require("express");
const roomController = require("../controllers/roomController");

const router = express.Router();

router
    .route("/joinRoom")
    .post(roomController.getAllRooms)
    .get(roomController.getRoomDetails);

router.route("/createRoom").post(roomController.createRoom);

module.exports = router;
