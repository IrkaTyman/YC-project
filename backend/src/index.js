const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
const { S3Client } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(helmet());
app.use(express.json());

const pool = new Pool({
  host: "rc1a-3n15f88sd5nq2oau.mdb.yandexcloud.net",
  database: "db1",
  user: "user1",
  password: "qwertyuio",
  port: 6432,
  ssl: {
    rejectUnauthorized: false 
  }
});

const s3Client = new S3Client({
  region: 'default-ru-central1',
  endpoint: 'https://storage.yandexcloud.net',
  credentials: {
    accessKeyId: "YCAJE8Omc0CdXJuwSzrFxLpcg",
    secretAccessKey: "YCM7uiuSXFX4MjXQrYvt8vyfcaLV_ggxqQ6WFQFR"
  }
});

const sqsClient = new SQSClient({
  region: 'ru-central1',
  endpoint: 'https://message-queue.api.cloud.yandex.net',
  credentials: {
    accessKeyId: "YCAJE8Omc0CdXJuwSzrFxLpcg",
    secretAccessKey: "YCM7uiuSXFX4MjXQrYvt8vyfcaLV_ggxqQ6WFQFR"
  }
});

async function sendNotification(eventType, payload) {
  try {
    const queueUrl = `https://message-queue.api.cloud.yandex.net/b1gqj511sh43s2rg4joo/dj6000000055m5ri0443/notes-notifications`;
    const message = JSON.stringify({
      event: eventType,
      payload,
      timestamp: new Date().toISOString()
    });
    
    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: message
    });
    
    const response = await sqsClient.send(command);
    console.log('Message sent to queue:', response.MessageId);
    return response.MessageId;
  } catch (error) {
    console.error('Error sending message to queue:', error);
    throw error;
  }
}

app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', dbTime: result.rows[0].now });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.get('/api/notes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM notes ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM notes WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching note:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/notes', async (req, res) => {
  try {
    const { value } = req.body;
    
    if (!value) {
      return res.status(400).json({ error: 'Value are required' });
    }
    
    const result = await pool.query(
      'INSERT INTO notes (value) VALUES ($1) RETURNING *',
      [value]
    );
    

    await sendNotification('note.created', result.rows[0]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { value } = req.body;
    
    if (!value) {
      return res.status(400).json({ error: 'Value are required' });
    }
    
    const result = await pool.query(
      'UPDATE notes SET value = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [value, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    await sendNotification('note.updated', result.rows[0]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const noteResult = await pool.query('SELECT * FROM notes WHERE id = $1', [id]);
    
    if (noteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    const note = noteResult.rows[0];
    
    await pool.query('DELETE FROM notes WHERE id = $1', [id]);
    
    await sendNotification('note.deleted', { id, title: note.title });
    
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/upload', async (req, res) => {
  try {
    const { fileName, fileType, noteId } = req.body;
    
    if (!fileName || !fileType || !noteId) {
      return res.status(400).json({ error: 'File details are required' });
    }
    
    const uniqueFileName = `${noteId}/${Date.now()}-${fileName}`;
    
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: uniqueFileName,
      ContentType: fileType
    });
    
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 600 });
    
    res.json({
      uploadUrl,
      fileUrl: `https://storage.yandexcloud.net/irkatyman-project-files/${uniqueFileName}`
    });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;
