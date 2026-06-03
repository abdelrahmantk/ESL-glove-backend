const supabase = require('../config/db');
const modelsService = require("../services/modelsService");
const { spawn } = require('child_process');
const supabaseStorageClient = require('../config/supabase')
const path = require('path');
const fs = require('fs');
const axios = require('axios');

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
        
        if (!modelName || !lid || !fileContent) {
            return res.status(400).json({ 
                error: "Validation Error", 
                message: "Missing required fields: model Name, base Mid, or lid, file." 
            });
        }
        const newMid = await modelsService.addModel({ userId, lid, base_mid, modelName, fileContent});

        return res.status(200).json({ 
            success: true, 
            message: "Model uploaded successfully", 
            data: { newMid } 
        });
        
    } catch (error) {
        console.error(`[upload Error]: ${error.message}`);
        
        return res.status(500).json({ 
            error: "Upload operation failed", 
            message: error.message || "An internal server error occurred." 
        });
    }
};


exports.deleteModel = async (req, res) => {
    try {
        const { mid } = req.params;
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