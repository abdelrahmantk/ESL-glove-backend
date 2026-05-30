const supabase = require('../config/db');
const modelsService = require("../services/modelsService");
const { spawn } = require('child_process');
const supabaseStorageClient = require('../config/supabase')
const path = require('path');
const fs = require('fs');
const axios = require('axios');

// Object to store active training sessions temporarily
global.activeTrainings = global.activeTrainings || {};

exports.initializeTrainingSession = async (req, res) => {
    const { modelName, userId } = req.body;

    if (!modelName) {
        return res.status(400).json({ error: "Missing model name" });
    }

    // Generate a unique session ID for this training run
    const sessionId = `train_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store the metadata so the backend knows what to expect
    global.activeTrainings[sessionId] = {
        userId,
        modelName,
        progress: 0,
        status: 'pending'
    };

    // Return the sessionId to the frontend so it can listen for progress updates
    return res.status(200).json({
        message: "Training session initialized",
        sessionId: sessionId
    });
};

// NEW ENDPOINT: Colab will hit this URL on every epoch to report progress
exports.updateProgress = async (req, res) => {
    const { sessionId, progress, status, errorMessage } = req.body;
    
    if (!global.activeTrainings[sessionId]) {
        return res.status(404).json({ error: "Session not found" });
    }

    const session = global.activeTrainings[sessionId];
    session.progress = progress;
    session.status = status;

    // Grab your socket.io global instance (assuming you attached it to global.io or req.app)
    const io = req.app.get('socketio') || global.io;
    
    if (io) {
        // Emit live update specifically to this user's session room
        io.to(sessionId).emit('training_progress', {
            progress,
            status,
            errorMessage,
            modelName: session.modelName,
        });
    }

    // Clean up memory if finished or failed
    if (status === 'completed' || status === 'failed') {
        setTimeout(() => { delete global.activeTrainings[sessionId]; }, 60000);
    }

    return res.status(200).json({ success: true });
};
exports.fineTune = async (req, res) => {
    const { absolutePath, modelName, base_mid, userId } = req.body;

    if (!absolutePath || !modelName) {
        return res.status(400).json({ error: "Missing path or model name" });
    }

    const scriptPath = path.join(__dirname, '../scripts/fine_tune_script.py'); 
    const pythonProcess = spawn('python', [scriptPath, absolutePath, modelName, base_mid, userId || 'guest']);

    let pythonData = "";
    let errorData = "";

    // Capture the JSON string printed by Python
    pythonProcess.stdout.on('data', (data) => {
        pythonData += data.toString();
    });

    // Capture any actual errors (syntax errors, etc.)
    pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
    });

    // This triggers when the script finishes
    pythonProcess.on('close', (code) => {
        if (code !== 0) {
            return res.status(500).json({ error: "Python script failed", details: errorData });
        }

        try {
            // Parse the JSON string we got from Python's print()
            const result = JSON.parse(pythonData);
            
            if (result.error) {
                return res.status(400).json({ error: result.error });
            }

            // SUCCESS: Return the directory and verified metadata to the user
            return res.status(200).json({
                message: "Training metadata initialized successfully",
                directory: result.created_in,
                fileName: result.pickle_file,
                savedData: result.verified_metadata // This proves the pickle is correct
            });

        } catch (e) {
            return res.status(500).json({ error: "Could not parse Python output", raw: pythonData });
        }
    });
};

exports.getModelBrief = async (req, res) => {

  try {
    const { modelId } = req.params;
    const brief = await modelsService.getModelBrief(modelId);
    res.status(200).json(brief);
  } catch (error) {
    console.error("Error in getModelBrief controller:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.addModel = async (req, res) => {
    try {
        const { userId, lid, base_mid, modelName, fileContent } = req.body;
        
        // 1. Enhanced Validation
        // Ensures all required fields exist before moving to the expensive service layer
        if (!modelName || !lid || !fileContent) {
            return res.status(400).json({ 
                error: "Validation Error", 
                message: "Missing required fields: model Name, base Mid, or lid, file." 
            });
        }
        console.log(base_mid);
        const newMid = await modelsService.addModel({  
          userId,
          lid,
          base_mid,
          modelName,
          fileContent
        });

        // 3. Consistent Success Response
        return res.status(200).json({ 
            success: true, 
            message: "Model uploaded successfully", 
            data: { newMid } 
        });
        
    } catch (error) {
        // 4. Consistent Error Reporting
        console.error(`[upload Error]: ${error.message}`);
        
        return res.status(500).json({ 
            error: "Upload operation failed", 
            message: error.message || "An internal server error occurred." 
        });
    }
};


exports.deleteModel = async (req, res) => {
    try {
        const { mid } = req.params; // Changed from 'id' to 'sid' to match route
        const {model_file} =req.body;
        const deleted = await modelsService.deleteModel(mid, model_file);
        if (!deleted) return res.status(404).json({ error: "Model not found" });
        
        res.status(200).json({ message: "Model deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


exports.getModels = async (req, res) => {

  try {
        if (!req.params.lid) {
        const models = await modelsService.getModels();
        res.json(models);
    }
    const { lid } = req.params;
    const models = await modelsService.getModels(lid);
    res.json(models);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getModelFile = async (req, res) => {
  const { mid } = req.params;
  if (!mid) return res.status(400).json({ error: 'Missing mid' });

  const model = await modelsService.getModelFileById(mid);
  if (!model?.model_file) return res.status(404).json({ error: 'Model file not found' });

  const { data } = supabaseStorageClient.storage.from('models').getPublicUrl(model.model_file);
  const streamResp = await axios.get(data.publicUrl, { responseType: 'stream' });

  res.setHeader('Content-Type', streamResp.headers['content-type'] || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${model.model_file}"`);
  streamResp.data.pipe(res);
};