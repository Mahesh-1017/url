const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { nanoid } = require('nanoid');
const path = require('path');
const app = express();


const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('Connected to SQLite database');
        db.run(`CREATE TABLE IF NOT EXISTS urls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            shortCode TEXT UNIQUE,
            originalUrl TEXT NOT NULL,
            clicks INTEGER DEFAULT 0,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    }
});


app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Add root path handler
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/urls', (req, res) => {
    db.all('SELECT * FROM urls ORDER BY createdAt DESC LIMIT 10', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

app.post('/api/shorten', (req, res) => {
    const { originalUrl } = req.body;
    
    if (!originalUrl) {
        return res.status(400).json({ error: 'URL is required' });
    }
    
    
    try {
        new URL(originalUrl);
    } catch (err) {
        return res.status(400).json({ error: 'Invalid URL' });
    }
    
    const shortCode = nanoid(6);
    
    db.run(
        'INSERT INTO urls (shortCode, originalUrl) VALUES (?, ?)',
        [shortCode, originalUrl],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Error creating short URL' });
            }
            res.json({ 
                id: this.lastID,
                shortCode,
                originalUrl,
                clicks: 0
            });
        }
    );
});

app.get('/:shortCode', (req, res) => {
    const { shortCode } = req.params;
    
    db.get('SELECT originalUrl FROM urls WHERE shortCode = ?', [shortCode], (err, row) => {
        if (err || !row) {
            return res.status(404).send('URL not found');
        }
        
        
        db.run('UPDATE urls SET clicks = clicks + 1 WHERE shortCode = ?', [shortCode]);
        
        res.redirect(row.originalUrl);
    });
});

app.delete('/api/urls/:id', (req, res) => {
    db.run('DELETE FROM urls WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Error deleting URL' });
        }
        res.sendStatus(200);
    });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
