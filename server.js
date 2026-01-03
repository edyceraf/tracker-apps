// server.js - With Built-in Authentication (No Nginx Required)
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const basicAuth = require('express-basic-auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Admin credentials - CHANGE THESE!
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'aidil';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'P@ssw0rd123';

// Middleware
app.use(cors({
    origin: [
        'https://aidil-visitor-tracker.pages.dev',  // Add this!
        'https://network.acaphacker.qzz.io',
        'http://localhost:3000'
    ],
    credentials: true
}));
app.use(express.json());

// File untuk simpan data visitor
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'visitors-data.json');

// Initialize data file if not exists
if (!fs.existsSync(DATA_FILE)) {
    console.log('Creating new data file:', DATA_FILE);
    fs.writeFileSync(DATA_FILE, JSON.stringify({ visitors: [] }, null, 2));
}

// Basic Authentication Middleware
const authMiddleware = basicAuth({
    users: { [ADMIN_USERNAME]: ADMIN_PASSWORD },
    challenge: true,
    realm: 'AIDIL NETWORK - Admin Access'
});

// Helper function untuk read data
function readVisitorsData() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading data file:', error);
        return { visitors: [] };
    }
}

// Helper function untuk write data
function writeVisitorsData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error writing data file:', error);
    }
}

// ===================================
// PUBLIC ROUTES - NO AUTHENTICATION
// ===================================

// Serve static files (logo, CSS, JS) - PUBLIC
app.use(express.static(__dirname, {
    index: false // Don't auto-serve index files
}));

// Homepage - PUBLIC
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>AIDIL NETWORK - Visitor Tracker</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    max-width: 800px;
                    margin: 50px auto;
                    padding: 20px;
                    background: linear-gradient(to bottom, #000000, #0f172a, #000000);
                    color: white;
                }
                .card {
                    background: rgba(15, 23, 42, 0.6);
                    padding: 30px;
                    border-radius: 20px;
                    border: 1px solid rgba(100, 116, 139, 0.3);
                    margin-bottom: 20px;
                }
                h1 { 
                    background: linear-gradient(to right, #67e8f9, #a78bfa);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                a {
                    display: inline-block;
                    background: linear-gradient(135deg, #67e8f9, #a78bfa);
                    color: white;
                    padding: 15px 30px;
                    text-decoration: none;
                    border-radius: 12px;
                    margin: 10px 10px 10px 0;
                    font-weight: 600;
                    transition: transform 0.2s;
                }
                a:hover {
                    transform: translateY(-2px);
                }
                .public { border-left: 4px solid #67e8f9; }
                .protected { border-left: 4px solid #f59e0b; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>🗺️ AIDIL NETWORK</h1>
                <h2>Visitor Analytics System</h2>
                <p>Infrastruktur moden, rangkaian selamat & automasi DevOps untuk sistem berskala.</p>
            </div>
            
            <div class="card public">
                <h3>🌐 Public Access</h3>
                <p>Accessible by everyone</p>
                <a href="/visitor-tracker-aidil.html">📱 Visitor Tracking Page</a>
            </div>
            
            <div class="card protected">
                <h3>🔐 Admin Access</h3>
                <p>Login required (username & password)</p>
                <a href="/dashboard.html">📊 Admin Dashboard</a>
                <a href="/test.html">🧪 Test Page</a>
            </div>
            
            <div class="card" style="text-align: center; font-size: 14px; color: #94a3b8;">
                <p>© 2025 AIDIL NETWORK · Powered by DevOps</p>
            </div>
        </body>
        </html>
    `);
});

// Visitor tracking page - PUBLIC
app.get('/visitor-tracker-aidil.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'visitor-tracker-aidil.html'));
});

// Track visitor endpoint - PUBLIC (untuk collect data)
app.post('/api/track-visitor', (req, res) => {
    const visitorData = req.body;
    
    // Add additional server-side data
    const enrichedData = {
        ...visitorData,
        id: Date.now().toString(),
        ip: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'],
        receivedAt: new Date().toISOString(),
        headers: {
            userAgent: req.headers['user-agent'],
            acceptLanguage: req.headers['accept-language'],
            referer: req.headers['referer']
        }
    };

    // Read existing data
    const data = readVisitorsData();
    
    // Add new visitor
    data.visitors.push(enrichedData);
    
    // Save to file
    writeVisitorsData(data);
    
    console.log(`✅ New visitor tracked: ${enrichedData.id} | Device: ${enrichedData.device?.brand || 'Unknown'} ${enrichedData.device?.model || ''}`);
    if (enrichedData.latitude) {
        console.log(`   Location: ${enrichedData.latitude}, ${enrichedData.longitude}`);
    }
    
    res.json({
        success: true,
        message: 'Location tracked successfully',
        visitorId: enrichedData.id
    });
});

// Health check - PUBLIC
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// ===================================
// PROTECTED ROUTES - AUTHENTICATION REQUIRED
// ===================================

// Dashboard - PROTECTED
app.get('/dashboard.html', authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Test page - PROTECTED
app.get('/test.html', authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'test.html'));
});

// Get all visitors - PROTECTED
app.get('/api/visitors', authMiddleware, (req, res) => {
    const data = readVisitorsData();
    res.json(data);
});

// Get visitor stats - PROTECTED
app.get('/api/stats', authMiddleware, (req, res) => {
    const data = readVisitorsData();
    const visitors = data.visitors;
    
    const stats = {
        totalVisitors: visitors.length,
        withLocation: visitors.filter(v => v.latitude && v.longitude).length,
        withoutLocation: visitors.filter(v => !v.latitude || !v.longitude).length,
        lastVisit: visitors.length > 0 ? visitors[visitors.length - 1].timestamp : null,
        devices: {},
        brands: {},
        os: {},
        browsers: {}
    };
    
    // Analyze devices
    visitors.forEach(v => {
        const deviceType = v.device?.type || 'Unknown';
        stats.devices[deviceType] = (stats.devices[deviceType] || 0) + 1;
        
        const brand = v.device?.brand || 'Unknown';
        stats.brands[brand] = (stats.brands[brand] || 0) + 1;
        
        const os = v.device?.os || 'Unknown';
        stats.os[os] = (stats.os[os] || 0) + 1;
        
        const browser = v.device?.browser || 'Unknown';
        stats.browsers[browser] = (stats.browsers[browser] || 0) + 1;
    });
    
    res.json(stats);
});

// Delete specific visitor - PROTECTED
app.delete('/api/visitors/:id', authMiddleware, (req, res) => {
    const { id } = req.params;
    const data = readVisitorsData();
    
    const initialLength = data.visitors.length;
    data.visitors = data.visitors.filter(v => v.id !== id);
    
    if (data.visitors.length < initialLength) {
        writeVisitorsData(data);
        console.log(`🗑️ Visitor deleted: ${id}`);
        res.json({ success: true, message: 'Visitor deleted' });
    } else {
        res.status(404).json({ success: false, message: 'Visitor not found' });
    }
});

// Clear all data - PROTECTED
app.delete('/api/visitors', authMiddleware, (req, res) => {
    writeVisitorsData({ visitors: [] });
    console.log('🗑️ All visitors data cleared');
    res.json({ success: true, message: 'All visitors data cleared' });
});

// ===================================
// START SERVER
// ===================================

app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║     🗺️  AIDIL NETWORK VISITOR TRACKER         ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log('');
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
    console.log('');
    console.log('🌐 PUBLIC ACCESS:');
    console.log(`   Visitor Page: http://0.0.0.0:${PORT}/visitor-tracker-aidil.html`);
    console.log(`   Track API:    POST http://0.0.0.0:${PORT}/api/track-visitor`);
    console.log('');
    console.log('🔐 PROTECTED ACCESS (Login Required):');
    console.log(`   Dashboard:    http://0.0.0.0:${PORT}/dashboard.html`);
    console.log(`   Stats API:    GET http://0.0.0.0:${PORT}/api/stats`);
    console.log(`   Admin: ${ADMIN_USERNAME}`);
    console.log('');
    console.log(`💾 Data file: ${DATA_FILE}`);
    console.log('');
    console.log('Press Ctrl+C to stop');
    console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\nSIGINT signal received: closing HTTP server');
    process.exit(0);
});