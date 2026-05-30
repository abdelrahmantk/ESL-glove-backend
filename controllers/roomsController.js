const roomsService = require('../services/roomsService');

exports.startRoom = async (req, res) => {
    try {
        const { userId, lid } = req.body;
        if (!userId || !lid) {
            return res.status(400).json({ error: "User ID and Language ID are required." });
        }

        const roomId = await roomsService.createRoom(userId, lid);
        res.status(201).json({ success: true, roomId });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
};

exports.endRoom = async (req, res) => {
    try {
        const { roomId, userId } = req.body; // userId to ensure only owner can close
        const success = await roomsService.closeRoom(roomId, userId);

        if (!success) {
            return res.status(404).json({ error: "Room not found or unauthorized." });
        }
        res.status(200).json({ success: true, message: "Room closed." });
    } catch (error) {
        res.status(500).json({ error: error.message });
        console.log(error.message)
    }
};

exports.getRoomInfo = async (req, res) => {
    try {
        const { roomId } = req.params;
        const info = await roomsService.checkRoomStatus(roomId);
        if (!info) return res.status(404).json({ error: "Room does not exist." });
        
        res.status(200).json({ success: true, info });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};