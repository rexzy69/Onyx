const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = 8000;

app.use(bodyParser.json());
app.use(express.static('.'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/update_json', async (req, res) => {
  try {
    const { filename, content } = req.body;
    await fs.writeFile(filename, JSON.stringify(content));
    res.json({ status: 'success' });
  } catch (error) {
    console.error(`Error writing to ${filename}:`, error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.get('/read_json/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const content = await fs.readFile(filename, 'utf-8');
    res.json(JSON.parse(content));
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
