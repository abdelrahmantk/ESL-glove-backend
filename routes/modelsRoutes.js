const express = require('express');
const router = express.Router();
const modelController = require('../controllers/modelsController');

router.get('/brief/:modelId', modelController.getModelBrief);
router.get("/models/:lid", modelController.getModels);
router.get("/models/download/:mid",modelController.getModelFile)
router.post("/addModel",modelController.addModel);
router.delete("/:mid", modelController.deleteModel);

module.exports = router;