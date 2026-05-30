const pool = require("../config/db");
const supabase = require('../config/supabase');
const axios = require('axios');
const { GET_MODEL_BRIEF, GET_MODELs, ADD_MODEL, DELETE_MODEL, ADD_MODELs, GET_MODEL_FILE_BY_ID } = require("../utils/queries");

exports.getModelBrief = async (modelId) => {

  const result = await pool.query(
    GET_MODEL_BRIEF,
    [modelId]
  );

  return result.rows;
};

exports.getModels = async (lid) => {

    if (!lid) {
        const result = await pool.query(GET_MODELs);
        return result.rows;
    }
    const result = await pool.query(GET_MODELs, [lid]);

    return result.rows;
};


exports.deleteModel = async (mid, model_file) => {
    const result = await pool.query(DELETE_MODEL, [mid]);
    const fileName = model_file.split('/').pop();
    await supabase.storage.from('models').remove([fileName]);
    return result.rowCount > 0; 
};
exports.createModelEntry = async (client, {userId, lid, base_mid, modelName, modelFileName }) => {
    const result = await client.query(ADD_MODEL, [userId, Number(lid), base_mid, modelName, modelFileName]);
    return Number(result.rows[0].mid);
};

exports.addModel = async ({userId, lid, base_mid, modelName, fileContent}) => {
    const client = await pool.connect();

    try {
        // 1. Generate Filename
        // Sanitizes the model name and appends timestamp
        const modelFileName = `${Date.now()}_${modelName.replace(/\s+/g, '_')}.pkl`;

        // 2. Storage Upload (Models Bucket)
        // Note: We do NOT use JSON.stringify because pickle files are binary
        const { error: uploadErr } = await supabase.storage
            .from('models')
            .upload(modelFileName, fileContent, { 
                contentType: 'application/octet-stream', // Correct for binary/pickle files
                upsert: false 
            });

        if (uploadErr) throw uploadErr;

        // 3. Database Transaction
        await client.query('BEGIN');

        // We only pass the fileName (not the public URL) as requested
        const newMid = await exports.createModelEntry(client, {
            userId, 
            lid, 
            base_mid,
            modelName, 
            modelFileName 
        });


        await client.query('COMMIT');

        return newMid;

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`[ModelService Error]: ${error.message}`);
        throw error;
    } finally {
        client.release();
    }
};

exports.getModelFileById = async (mid) => {
  const result = await pool.query(GET_MODEL_FILE_BY_ID, [mid]);
  return result.rows[0] || null;
};