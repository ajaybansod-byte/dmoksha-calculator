const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Google Sheets Configuration - Your credentials
const SPREADSHEET_ID = '1ejcZ4lI3Cua9OYv0kgnbU1tqOvDYi__IIIVXJbXy-aw';
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

// Try to import Google Sheets modules
let GoogleSpreadsheet, JWT;
let isGoogleSheetsAvailable = false;

try {
  const { GoogleSpreadsheet: GS } = require('google-spreadsheet');
  const { JWT: JWTAuth } = require('google-auth-library');
  GoogleSpreadsheet = GS;
  JWT = JWTAuth;
  isGoogleSheetsAvailable = true;
  console.log('✅ Google Sheets modules loaded successfully');
} catch (error) {
  console.error('❌ Failed to load Google Sheets modules:', error.message);
  console.log('📦 Please install: npm install google-spreadsheet google-auth-library');
}

// Column headers for Google Sheets - FIXED ORDER
const SHEET_HEADERS = [
  'Timestamp',
  'Mode', 
  'Width (inches)',
  'Height (inches)',
  'Panel Width (inches)', 
  'Price per Meter (₹)',
  'Number of Panels',
  'Cloth Required (meters)',
  'Total Cost (₹)',
  'User IP',
  'Browser Info'
];

// Initialize Google Sheets connection
let doc;
let sheet;
let connectionStatus = {
  connected: false,
  error: null,
  lastTested: null
};

async function initializeGoogleSheets() {
  try {
    if (!isGoogleSheetsAvailable) {
      throw new Error('Google Sheets modules not available. Run: npm install google-spreadsheet google-auth-library');
    }

    console.log('🔄 Connecting to Google Sheets...');
    
    // Create JWT client
    const serviceAccountAuth = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    // Initialize document
    doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    console.log(`📊 Connected to Google Sheet: "${doc.title}"`);

    // Get or create worksheet
    sheet = doc.sheetsByTitle['Customer Data'] || doc.sheetsByIndex[0];
    
    if (!sheet) {
      sheet = await doc.addSheet({ 
        title: 'Customer Data',
        headerValues: SHEET_HEADERS 
      });
      console.log('✅ Created new "Customer Data" worksheet');
    } else {
      await sheet.loadHeaderRow();
      
      // Always set headers to ensure consistency
      await sheet.setHeaderRow(SHEET_HEADERS);
      console.log('✅ Headers updated in worksheet');
    }

    connectionStatus = {
      connected: true,
      error: null,
      lastTested: new Date().toISOString(),
      totalRows: sheet.rowCount - 1
    };

    console.log(`📋 Worksheet ready: "${sheet.title}"`);
    return true;

  } catch (error) {
    console.error('❌ Failed to initialize Google Sheets:', error.message);
    connectionStatus = {
      connected: false,
      error: error.message,
      lastTested: new Date().toISOString()
    };
    return false;
  }
}

// FIXED: Function to append data with ALL inputs and outputs
async function appendToGoogleSheet(data) {
  try {
    if (!sheet) {
      throw new Error('Google Sheets not initialized');
    }

    // FIXED: Include ALL data - inputs AND outputs
    const rowData = {
      'Timestamp': new Date(data.timestamp).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }),
      'Mode': data.mode || 'single',
      'Width (inches)': parseFloat(data.width || 0),           // INPUT
      'Height (inches)': parseFloat(data.height || 0),         // INPUT  
      'Panel Width (inches)': parseInt(data.panelWidth || 0),  // INPUT
      'Price per Meter (₹)': parseFloat(data.pricePerMeter || 0), // INPUT
      'Number of Panels': parseFloat(data.numberOfPanels || 0),   // OUTPUT
      'Cloth Required (meters)': parseFloat(data.clothMeters || 0), // OUTPUT
      'Total Cost (₹)': parseFloat(data.totalCost || 0),          // OUTPUT
      'User IP': data.userIp || 'Unknown',
      'Browser Info': data.userAgent ? data.userAgent.substring(0, 100) : 'Unknown'
    };

    console.log('📝 Saving to Google Sheet:', JSON.stringify(rowData, null, 2));
    
    const newRow = await sheet.addRow(rowData);
    console.log(`✅ Successfully added row ${newRow.rowNumber} to Google Sheet`);
    
    // Update row count
    await sheet.loadCells('A:A');
    const totalRows = sheet.rowCount - 1;

    return { 
      success: true, 
      rowNumber: newRow.rowNumber,
      totalRows: totalRows,
      data: rowData
    };

  } catch (error) {
    console.error('❌ Error appending to Google Sheet:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

// Function to read recent data from Google Sheets
async function getRecentDataFromSheet(limit = 10) {
  try {
    if (!sheet) {
      throw new Error('Google Sheets not initialized');
    }

    const rows = await sheet.getRows({ limit: limit, offset: 0 });
    
    const data = rows.reverse().map((row) => ({
      rowNumber: row.rowNumber,
      timestamp: row.get('Timestamp'),
      mode: row.get('Mode'),
      width_in: row.get('Width (inches)'),
      height_in: row.get('Height (inches)'),
      panel_width_in: row.get('Panel Width (inches)'),
      price_per_meter: row.get('Price per Meter (₹)'),
      number_of_panels: row.get('Number of Panels'),
      cloth_meters: row.get('Cloth Required (meters)'),
      total_cost: row.get('Total Cost (₹)'),
      user_ip: row.get('User IP'),
      user_agent: row.get('Browser Info')
    }));

    return { 
      success: true, 
      data: data,
      totalRows: sheet.rowCount - 1
    };

  } catch (error) {
    console.error('❌ Error reading from Google Sheet:', error);
    return { 
      success: false, 
      error: error.message,
      data: [],
      totalRows: 0
    };
  }
}

// API Routes

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const sheetsConnected = connectionStatus.connected;
  let sheetInfo = {};
  
  if (sheetsConnected && sheet) {
    try {
      await sheet.loadCells('A1:A1');
      sheetInfo = {
        connected: true,
        title: doc.title,
        sheetName: sheet.title,
        totalRows: sheet.rowCount - 1,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`
      };
    } catch (error) {
      sheetInfo = {
        connected: false,
        error: error.message
      };
    }
  } else {
    sheetInfo = connectionStatus;
  }
  
  res.json({ 
    status: 'OK', 
    message: 'D\'Moksha Curtain Calculator API is running',
    timestamp: new Date().toISOString(),
    googleSheets: sheetInfo
  });
});

// FIXED: Save customer data endpoint with proper data handling
app.post('/api/save', async (req, res) => {
  console.log('💾 Save request received:', JSON.stringify(req.body, null, 2));
  
  try {
    if (!isGoogleSheetsAvailable) {
      return res.status(500).json({
        error: 'Google Sheets modules not available',
        details: 'Please install: npm install google-spreadsheet google-auth-library'
      });
    }

    if (!connectionStatus.connected) {
      console.log('📡 Attempting to reconnect to Google Sheets...');
      const connected = await initializeGoogleSheets();
      if (!connected) {
        return res.status(500).json({
          error: 'Failed to connect to Google Sheets',
          details: connectionStatus.error,
          troubleshooting: 'Check Google Sheet sharing and permissions'
        });
      }
    }

    // FIXED: Extract ALL required fields properly
    const {
      width, height, panelWidth, pricePerMeter,     // INPUTS
      numberOfPanels, clothMeters, totalCost,       // OUTPUTS  
      mode, timestamp
    } = req.body;

    console.log('📋 Extracted data:');
    console.log('  Inputs:', { width, height, panelWidth, pricePerMeter, mode });
    console.log('  Outputs:', { numberOfPanels, clothMeters, totalCost });

    // Validate required fields
    const missing = [];
    if (width === undefined || width === null || width === '') missing.push('width');
    if (height === undefined || height === null || height === '') missing.push('height');
    if (panelWidth === undefined || panelWidth === null || panelWidth === '') missing.push('panelWidth');
    if (pricePerMeter === undefined || pricePerMeter === null || pricePerMeter === '') missing.push('pricePerMeter');
    if (numberOfPanels === undefined || numberOfPanels === null) missing.push('numberOfPanels');
    if (clothMeters === undefined || clothMeters === null) missing.push('clothMeters');
    if (totalCost === undefined || totalCost === null) missing.push('totalCost');

    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        missing: missing,
        received: Object.keys(req.body)
      });
    }

    // FIXED: Prepare complete data object
    const dataToSave = {
      // Include original inputs
      width: width,
      height: height,
      panelWidth: panelWidth,
      pricePerMeter: pricePerMeter,
      mode: mode || 'single',
      
      // Include calculated outputs
      numberOfPanels: numberOfPanels,
      clothMeters: clothMeters,
      totalCost: totalCost,
      
      // Add metadata
      timestamp: timestamp || new Date().toISOString(),
      userIp: req.ip || req.connection.remoteAddress || 'Unknown',
      userAgent: req.get('User-Agent') || 'Unknown'
    };

    console.log('📤 Complete data to save:', JSON.stringify(dataToSave, null, 2));
    
    // Save to Google Sheets
    const result = await appendToGoogleSheet(dataToSave);

    if (result.success) {
      console.log('✅ Data saved successfully to Google Sheets');
      res.json({
        message: 'Customer data saved successfully to Google Sheets',
        timestamp: dataToSave.timestamp,
        rowNumber: result.rowNumber,
        totalRows: result.totalRows,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`,
        savedData: result.data
      });
    } else {
      console.error('❌ Failed to save to Google Sheets:', result.error);
      res.status(500).json({
        error: 'Failed to save data to Google Sheets',
        details: result.error
      });
    }

  } catch (error) {
    console.error('❌ Error in /api/save:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Get recent records from Google Sheets
app.get('/api/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const result = await getRecentDataFromSheet(limit);

    if (result.success) {
      res.json({
        message: `Retrieved ${result.data.length} most recent records from Google Sheets`,
        totalRows: result.totalRows,
        limit: limit,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`,
        data: result.data
      });
    } else {
      res.status(500).json({
        error: 'Failed to read data from Google Sheets',
        details: result.error
      });
    }

  } catch (error) {
    console.error('Error in /api/recent:', error);
    res.status(500).json({
      error: 'Failed to retrieve recent records',
      message: error.message
    });
  }
});

// Open Google Sheets in browser
app.get('/api/open-sheet', (req, res) => {
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`;
  res.redirect(spreadsheetUrl);
});

// FIXED: Test endpoint that saves complete data
app.get('/api/test-save', async (req, res) => {
  try {
    // Complete test data with inputs AND outputs
    const testData = {
      // INPUTS
      width: 100,
      height: 80, 
      panelWidth: 24,
      pricePerMeter: 50,
      mode: 'single',
      
      // OUTPUTS (calculated)
      numberOfPanels: 5,
      clothMeters: 12.0000,
      totalCost: 600.00,
      
      // METADATA
      timestamp: new Date().toISOString(),
      userIp: 'Test-IP',
      userAgent: 'Test-Browser'
    };

    console.log('🧪 Testing save with complete data:', JSON.stringify(testData, null, 2));

    const result = await appendToGoogleSheet(testData);
    
    if (result.success) {
      res.json({
        message: 'Test data saved successfully with all inputs and outputs',
        result: result,
        testData: testData
      });
    } else {
      res.status(500).json({
        error: 'Failed to save test data',
        details: result.error
      });
    }

  } catch (error) {
    res.status(500).json({
      error: 'Test save failed',
      message: error.message
    });
  }
});

// Serve the FIXED calculator
app.get('/', (req, res) => {
  const calculatorHtml = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>D'Moksha Curtain Calculator - FIXED</title>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="root"></div>

    <script type="text/babel">
      const { useState } = React;

      const CurtainCalculator = () => {
        const [mode, setMode] = useState('single');
        const [inputs, setInputs] = useState({
          width: '', height: '', panelWidth: 22, pricePerMeter: ''
        });
        const [results, setResults] = useState({
          numberOfPanels: 0, clothMeters: 0, totalCost: 0
        });
        const [saveStatus, setSaveStatus] = useState('');
        const [isCalculated, setIsCalculated] = useState(false);
        const [validationErrors, setValidationErrors] = useState({});

        const panelOptions = [
          { label: 'High', value: 22 },
          { label: 'Medium', value: 24 },
          { label: 'Low', value: 26 }
        ];

        const handleModeSwitch = (newMode) => {
          setMode(newMode);
          setIsCalculated(false);
          setValidationErrors({});
          setSaveStatus('');
        };

        const handleInputChange = (field, value) => {
          setInputs(prev => ({ ...prev, [field]: value }));
          setIsCalculated(false);
          setValidationErrors({});
          setSaveStatus('');
        };

        const validateInputs = () => {
          const errors = {};
          const { width, height, pricePerMeter } = inputs;

          if (!width || parseFloat(width) <= 0) {
            errors.width = 'Width is required and must be greater than 0';
          }
          if (!height || parseFloat(height) <= 0) {
            errors.height = 'Height is required and must be greater than 0';
          }
          if (mode === 'double' && parseFloat(height) > 90) {
            errors.height = 'Height cannot exceed 90 inches for double width curtains';
          }
          if (!pricePerMeter || parseFloat(pricePerMeter) <= 0) {
            errors.pricePerMeter = 'Price per meter is required and must be greater than 0';
          }

          setValidationErrors(errors);
          return Object.keys(errors).length === 0;
        };

        // FIXED: Auto-save function with complete data
        const autoSaveToGoogleSheets = async (calculationResults) => {
          try {
            setSaveStatus('saving');
            
            // FIXED: Send complete data including inputs AND outputs
            const completeData = {
              // INPUTS (from form)
              width: inputs.width,
              height: inputs.height,
              panelWidth: inputs.panelWidth,
              pricePerMeter: inputs.pricePerMeter,
              mode: mode,
              
              // OUTPUTS (calculated results)
              numberOfPanels: calculationResults.numberOfPanels,
              clothMeters: calculationResults.clothMeters,
              totalCost: calculationResults.totalCost,
              
              // METADATA
              timestamp: new Date().toISOString()
            };

            console.log('📤 Sending complete data to Google Sheets:', completeData);

            const response = await fetch('/api/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(completeData)
            });

            const data = await response.json();

            if (response.ok) {
              console.log('✅ Auto-saved successfully:', data);
              setSaveStatus('auto-saved');
              setTimeout(() => setSaveStatus(''), 3000);
            } else {
              console.error('❌ Auto-save failed:', data);
              setSaveStatus('auto-save-failed');
              setTimeout(() => setSaveStatus(''), 3000);
            }
          } catch (error) {
            console.error('❌ Auto-save error:', error);
            setSaveStatus('auto-save-failed');
            setTimeout(() => setSaveStatus(''), 3000);
          }
        };

        const calculateResults = () => {
          if (!validateInputs()) return;

          const { width, height, panelWidth, pricePerMeter } = inputs;
          const extraWidth = (6/50) * parseFloat(width);
          const adjustedWidth = parseFloat(width) + extraWidth;

          let numberOfPanels, clothRequiredMeters;

          if (mode === 'single') {
            numberOfPanels = Math.ceil(adjustedWidth / panelWidth);
            clothRequiredMeters = Math.ceil(Math.ceil((numberOfPanels * (parseFloat(height) + 10) + 10)) * (2.54 / 100));
          } else {
            const finalWidth = adjustedWidth * 54 / 22;
            numberOfPanels = parseFloat((adjustedWidth / panelWidth).toFixed(4));
            clothRequiredMeters = Math.ceil(finalWidth) * (2.54 / 100);
          }

          const totalCost = parseFloat((clothRequiredMeters * parseFloat(pricePerMeter)).toFixed(2));
          
          const calculationResults = {
            numberOfPanels: mode === 'single' ? numberOfPanels : numberOfPanels,
            clothMeters: parseFloat(clothRequiredMeters.toFixed(4)),
            totalCost: totalCost
          };

          console.log('🧮 Calculation results:', calculationResults);
          console.log('📋 Current inputs:', inputs);

          setResults(calculationResults);
          setIsCalculated(true);

          // Auto-save with complete data
          autoSaveToGoogleSheets(calculationResults);
        };

        const resetForm = () => {
          setInputs({ width: '', height: '', panelWidth: 22, pricePerMeter: '' });
          setResults({ numberOfPanels: 0, clothMeters: 0, totalCost: 0 });
          setIsCalculated(false);
          setSaveStatus('');
          setValidationErrors({});
        };

        const openGoogleSheet = () => {
          window.open('/api/open-sheet', '_blank');
        };

        const isCalculateDisabled = () => {
          const { width, height, pricePerMeter } = inputs;
          return !width || !height || !pricePerMeter || 
                 (mode === 'double' && parseFloat(height) > 90) ||
                 Object.keys(validationErrors).length > 0;
        };

        return React.createElement('div', {
          className: "min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black px-4 py-6"
        }, 
          React.createElement('div', { className: "max-w-md mx-auto" },
            // Header
            React.createElement('div', { className: "text-center mb-8" },
              React.createElement('div', { 
                className: "w-16 h-16 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg"
              }, React.createElement('span', { className: "text-2xl font-bold text-black" }, "D'M")),
              React.createElement('h1', { className: "text-3xl font-bold text-white mb-2" }, "D'Moksha"),
              React.createElement('p', { className: "text-amber-400 text-sm font-medium tracking-wide" }, "LUXURY CURTAINS - FIXED VERSION"),
              React.createElement('div', { className: "w-20 h-0.5 bg-gradient-to-r from-amber-400 to-yellow-500 mx-auto mt-2" })
            ),

            // Calculator Card
            React.createElement('div', { className: "bg-gray-800 bg-opacity-50 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-gray-700" },
              // Mode Toggle
              React.createElement('div', { className: "mb-6" },
                React.createElement('div', { className: "flex bg-gray-700 rounded-xl p-1" },
                  React.createElement('button', {
                    onClick: () => handleModeSwitch('single'),
                    className: \`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-300 \${
                      mode === 'single' 
                        ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-lg'
                        : 'text-gray-300 hover:text-white'
                    }\`
                  }, "Single Width"),
                  React.createElement('button', {
                    onClick: () => handleModeSwitch('double'),
                    className: \`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-300 \${
                      mode === 'double'
                        ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-lg'
                        : 'text-gray-300 hover:text-white'
                    }\`
                  }, "Double Width")
                )
              ),

              React.createElement('h2', { className: "text-xl font-semibold text-white mb-6 text-center" },
                \`\${mode === 'single' ? 'Single Width' : 'Double Width'} Calculator - FIXED\`
              ),

              // Input Fields
              React.createElement('div', { className: "space-y-5" },
                // Width Input
                React.createElement('div', {},
                  React.createElement('label', { className