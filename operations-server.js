const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// Serve static files from /public (index.html + images)
app.use(express.static(path.join(__dirname, 'public')));

const SPREADSHEET_ID = '1lTK8BvE1YY24jh3BvKs82yT8X7CehI5JZU4ZbD_Le7w';
const GOOGLE_SERVICE_ACCOUNT_EMAIL = 'dmoksha-calculator-service@dmoksha-calculator.iam.gserviceaccount.com';
const GOOGLE_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCtJn/GyDK7/dum
t2slflErjZSZmySZCP8oKgvFrogKr6aJmYynU6Qt0DzjlBU9IJ0+MPAI4D87EFxy
fcpwRBs5A8Zn0J+LcQ6W7XqU3Q4c9PLiBUyuSPdwGOYOxyY45lJnY0ElmoEODFpK
Lz3aHh09cVpUIdLKWO718Il0iXVZqb08Ksw11cTTjI/YAar34lKZ4oHUkM8h5xOp
GspBCqPz30SzDWrVb+s8mH9/XimX6ZFz+APugWG//17DqcwNBVNTdTO2i7p3zt77
ZuAPyqdPXtxWWIvnHZc4lxavZ2vBPQ84NXvLCbhuxHcVWG+iqBEfhM1799Yebywq
rHcLhjkvAgMBAAECggEAOxJb3F7XhDBGvBluSgPOwGuUa1U1Bqq9lh/GFWKGUhL7
34zNohZUeDbHVyLhnhGe46VBdt2+ZLGfwIWux19M5EYn7aoMjD99aTtKqzfBRVrB
9B83umv1Ur6D2j3SCe515YTEqIYOClNniFCWqu/ELP6bgQFrDxKJL8mos2Pj77r7
Qg3/CLGKjQzPfiO0OllP6p4cuA/ijku+bIPFYcb93pGmNhyLfZv9gYLzahvlz85J
C7YssAt+dzmgAS95D52VUNf2t6zkkHi1IMITyniIQEmlFTdt5SRDo8oRvESwPxsA
n/jMcqK9yRfuqzuMviSYBL73OdXodN388IaMX2H0UQKBgQDlNiU1feucGnp5wM2f
Qwas20y1TrjLYqF58DBkALdagYMZJMMJNuz15AWms3f/MjNt9KdUeyjHcF0yX4h+
SISPlWmA8sZ5LpW+J51GuGe07DxQTsb/eK1nGIWvlvSqhiRJco302bR6SNKRs1pq
Wj/KJIyWzZj4VbkTfWRzRAl2nwKBgQDBYwrt1nBe4pVbijVaPuPyC/CHZIvw4DcX
UVmfsbylaSMUC+LSlLvRErOprJj3Yt128vj/ktqUopvp2N9SUtbeJvIG9YknAS2R
i4rwggzpHW+CGTTxAWflJsZw0XdYk5J2xNS1ebKfVIUniDKcGljCzk3dMSAllR0O
GN0WHesDcQKBgBWjffHF2HddPJC/9emCH2A0N9KqAuIYhpwHY9odAzJFJcY65Tq6
d7Zi93GcYciyyY4o2Z8tHVVusy2tPSqG2BTiCxrEUJ5iGnrgLIXfpNK8tpjyRvEZ
SG2CMCS6gJCUp1pTuTkTUGl29IISx4dgy8LennMiJ73SAe3oGZKUKryLAoGBAJpi
FhR/D6BAJNo6QJN2B4Vw0KlVtH4skO51jCX3v1ER2OYlAwP3puSmmHVJC6ja7VAL
coqdUxA7rFqIPug6p7wbvTWfCMnxn85EZzvPprznOeDTfLc11xpR1TO1lSBKVy+n
vOPPbrDRyacgjL6gLeH+zpxZnn9CRjq90KnaYoaRAoGAKMua/Qcd7AfUMyfi+w07
ySBY4AYIwNfWf8pPiiY2H/ncq7BmYPMBKugOsSbRbDub3bACN4LfR/cr/bhWZ65i
o+Kzyk7xdWdGn9TAr1LtelcJRvheqS5jiGz6jRjzikkZp0vwOW0g1CHMGTKYFxcq
lxjd/WzGJug4dirqQ/0rtD4=
-----END PRIVATE KEY-----`;

let GoogleSpreadsheet, JWT;
let isGoogleSheetsAvailable = false;
try {
  const { GoogleSpreadsheet: GS } = require('google-spreadsheet');
  const { JWT: JWTAuth } = require('google-auth-library');
  GoogleSpreadsheet = GS;
  JWT = JWTAuth;
  isGoogleSheetsAvailable = true;
  console.log('✅ Google Sheets modules loaded');
} catch (e) {
  console.error('❌ Google Sheets modules failed:', e.message);
}

const SHEET_HEADERS = [
  'Timestamp', 'Customer Name', 'Width (inches)', 'Height (inches)', 'Installation Date',
  'Panel Type', 'Main Fabric', 'Sheer Fabric', 'Lining Fabric',
  'Stitching Style', 'Gather Style',
  'Number of Panels', 'Cut Length per Panel (inches)', 'Last Panel Width (inches)', 'Final Output',
  'User IP', 'Browser Info'
];

let doc, sheet;
let connectionStatus = { connected: false, error: null };

async function initializeGoogleSheets() {
  try {
    if (!isGoogleSheetsAvailable) throw new Error('Google Sheets modules not available');
    console.log('🔄 Connecting to Google Sheets...');
    const auth = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    doc = new GoogleSpreadsheet(SPREADSHEET_ID, auth);
    await doc.loadInfo();
    console.log(`📊 Connected to: "${doc.title}"`);
    sheet = doc.sheetsByTitle['Cutter Data'] || doc.sheetsByIndex[0];
    if (!sheet) {
      sheet = await doc.addSheet({ title: 'Cutter Data', headerValues: SHEET_HEADERS });
      console.log('✅ Created new sheet with headers');
    } else {
      await sheet.loadHeaderRow();
      if (sheet.columnCount < SHEET_HEADERS.length) {
        await sheet.resize({ rowCount: sheet.rowCount, columnCount: SHEET_HEADERS.length });
        console.log(`✅ Resized to ${SHEET_HEADERS.length} columns`);
      }
      await sheet.setHeaderRow(SHEET_HEADERS);
      console.log('✅ Headers pushed successfully');
    }
    connectionStatus = { connected: true, error: null };
    return true;
  } catch (e) {
    console.error('❌ Failed to initialize:', e.message);
    connectionStatus = { connected: false, error: e.message };
    return false;
  }
}

async function appendToGoogleSheet(data) {
  try {
    if (!sheet) throw new Error('Sheet not initialized');
    const row = {
      'Timestamp': new Date(data.timestamp).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit',
        day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
      }),
      'Customer Name': data.customerName || '',
      'Width (inches)': parseFloat(data.width || 0),
      'Height (inches)': parseFloat(data.height || 0),
      'Installation Date': data.installationDate || '',
      'Panel Type': data.panelType || '',
      'Main Fabric': data.mainFabric || 'No',
      'Sheer Fabric': data.sheerFabric || 'No',
      'Lining Fabric': data.liningFabric || 'No',
      'Stitching Style': data.stitchingStyle || '',
      'Gather Style': data.gatherStyle || '',
      'Number of Panels': parseInt(data.numberOfPanels || 0),
      'Cut Length per Panel (inches)': parseFloat(data.cutLength || 0),
      'Last Panel Width (inches)': data.lastPanelWidth || 'None',
      'Final Output': data.finalOutput || '',
      'User IP': data.userIp || 'Unknown',
      'Browser Info': data.userAgent ? data.userAgent.substring(0, 100) : 'Unknown'
    };
    const newRow = await sheet.addRow(row);
    console.log(`✅ Row ${newRow.rowNumber} added`);
    return { success: true, rowNumber: newRow.rowNumber };
  } catch (e) {
    console.error('❌ Append error:', e.message);
    return { success: false, error: e.message };
  }
}

app.get('/api/health', (req, res) => res.json({ status: 'OK', googleSheets: connectionStatus }));

app.post('/api/save', async (req, res) => {
  try {
    if (!connectionStatus.connected) {
      const ok = await initializeGoogleSheets();
      if (!ok) return res.status(500).json({ error: 'Sheet connection failed', details: connectionStatus.error });
    }
    const result = await appendToGoogleSheet({
      ...req.body,
      timestamp: req.body.timestamp || new Date().toISOString(),
      userIp: req.ip || 'Unknown',
      userAgent: req.get('User-Agent') || 'Unknown'
    });
    result.success
      ? res.json({ message: 'Saved', rowNumber: result.rowNumber })
      : res.status(500).json({ error: 'Save failed', details: result.error });
  } catch (e) {
    res.status(500).json({ error: 'Server error', message: e.message });
  }
});

// Serve index.html for all other routes (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function startServer() {
  console.log("🔄 Starting D'Moksha Operations Server...");
  const ok = await initializeGoogleSheets();
  if (!ok) console.log('⚠️  Google Sheets init failed — server will continue');
  app.listen(PORT, () => {
    console.log(`🚀 Operations server running on port ${PORT}`);
    console.log(`🌐 http://localhost:${PORT}`);
  });
}
startServer();
module.exports = app;
