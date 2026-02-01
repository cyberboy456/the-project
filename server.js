const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { spawn } = require('child_process');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 5000;

// 🛑 Insert your actual VirusTotal API key here
const VIRUSTOTAL_API_KEY = 'your_virustotal_api_key_here';

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname))); // Serve HTML/CSS/JS

// === Serve homepage ===
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// === Route: Check URL using Python ===
app.post('/api/check-url', (req, res) => {
    const url = req.body.url;
    if (!url) return res.status(400).json({ error: 'Missing URL' });

    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const py = spawn(pythonCmd, ['check_url.py', url]);

    let resultData = '';
    let errorData = '';

    py.stdout.on('data', (data) => {
        resultData += data.toString();
    });

    py.stderr.on('data', (data) => {
        errorData += data.toString();
        console.error('Python stderr:', errorData);
    });

    py.on('close', (code) => {
        if (errorData) {
            return res.status(500).json({ error: 'Python script error', detail: errorData });
        }

        try {
            const parsed = JSON.parse(resultData);
            res.json(parsed);
        } catch (e) {
            console.error('JSON parse error:', e.message);
            res.status(500).json({ error: 'Failed to parse Python output', raw: resultData });
        }
    });
});

// === Optional: VirusTotal URL scan ===
app.post('/api/virustotal-check', async (req, res) => {
    const url = req.body.url;
    if (!VIRUSTOTAL_API_KEY) {
        return res.status(400).json({ error: 'VirusTotal API key not set' });
    }

    try {
        const scanResponse = await axios.post('https://www.virustotal.com/api/v3/urls',
            new URLSearchParams({ url }),
            {
                headers: {
                    'x-apikey': VIRUSTOTAL_API_KEY,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        const scanId = scanResponse.data.data.id;

        const report = await axios.get(`https://www.virustotal.com/api/v3/analyses/${scanId}`, {
            headers: { 'x-apikey': VIRUSTOTAL_API_KEY }
        });

        res.json({ virustotal: report.data });
    } catch (error) {
        console.error('VirusTotal error:', error.response?.data || error.message);
        res.status(500).json({ error: 'VirusTotal scan failed' });
    }
});

// === Start the server ===
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});