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

// Import Google Sheets modules
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
}

// Column headers for Google Sheets
const SHEET_HEADERS = [
  'Timestamp',
  'Mode',
  'Width (inches)',
  'Height (inches)',
  'Panel Width (inches)',
  'Stitch Style',
  'Stitch Style Cost (₹)',
  'Price per Meter (₹)',
  'Number of Panels',
  'Cloth Required (meters)',
  'Stitching Cost (₹)',
  'Total Cost (₹)',
  'User IP',
  'Browser Info'
];

// Initialize Google Sheets connection
let doc;
let sheet;
let connectionStatus = { connected: false, error: null };

async function initializeGoogleSheets() {
  try {
    if (!isGoogleSheetsAvailable) {
      throw new Error('Google Sheets modules not available');
    }

    console.log('🔄 Connecting to Google Sheets...');
    
    const serviceAccountAuth = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    console.log(`📊 Connected to Google Sheet: "${doc.title}"`);

    sheet = doc.sheetsByTitle['Customer Data'] || doc.sheetsByIndex[0];
    
    if (!sheet) {
      sheet = await doc.addSheet({ 
        title: 'Customer Data',
        headerValues: SHEET_HEADERS 
      });
      console.log('✅ Created new worksheet');
    } else {
      await sheet.loadHeaderRow();
      // Force update headers to ensure they match the current structure
      await sheet.setHeaderRow(SHEET_HEADERS);
      console.log('✅ Headers updated to latest structure');
    }

    connectionStatus = { connected: true, error: null };
    console.log(`📋 Worksheet ready: "${sheet.title}"`);
    return true;

  } catch (error) {
    console.error('❌ Failed to initialize Google Sheets:', error.message);
    connectionStatus = { connected: false, error: error.message };
    return false;
  }
}

// Function to append data to Google Sheets
async function appendToGoogleSheet(data) {
  try {
    if (!sheet) {
      throw new Error('Google Sheets not initialized');
    }

    const rowData = {
      'Timestamp': new Date(data.timestamp).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }),
      'Mode': data.mode || 'single',
      'Width (inches)': parseFloat(data.width || 0),
      'Height (inches)': parseFloat(data.height || 0),
      'Panel Width (inches)': parseInt(data.panelWidth || 0),
      'Stitch Style': data.stitchStyle || 'Plain',
      'Stitch Style Cost (₹)': parseFloat(data.stitchStyleCost || 0),
      'Price per Meter (₹)': parseFloat(data.pricePerMeter || 0),
      'Number of Panels': parseFloat(data.numberOfPanels || 0),
      'Cloth Required (meters)': parseFloat(data.clothMeters || 0),
      'Stitching Cost (₹)': parseFloat(data.stitchingCost || 0),
      'Total Cost (₹)': parseFloat(data.totalCost || 0),
      'User IP': data.userIp || 'Unknown',
      'Browser Info': data.userAgent ? data.userAgent.substring(0, 100) : 'Unknown'
    };

    console.log('📝 Adding row to Google Sheet:', JSON.stringify(rowData, null, 2));
    
    const newRow = await sheet.addRow(rowData);
    console.log(`✅ Successfully added row ${newRow.rowNumber}`);
    
    return { 
      success: true, 
      rowNumber: newRow.rowNumber,
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

// API Routes
app.get('/api/health', async (req, res) => {
  res.json({ 
    status: 'OK',
    googleSheets: {
      connected: connectionStatus.connected,
      error: connectionStatus.error,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`
    }
  });
});

// MAIN SAVE ENDPOINT
app.post('/api/save', async (req, res) => {
  console.log('💾 Save request received:', JSON.stringify(req.body, null, 2));
  
  try {
    if (!connectionStatus.connected) {
      console.log('📡 Attempting to connect to Google Sheets...');
      const connected = await initializeGoogleSheets();
      if (!connected) {
        return res.status(500).json({
          error: 'Failed to connect to Google Sheets',
          details: connectionStatus.error
        });
      }
    }

    const {
      width, height, panelWidth, stitchStyle, stitchStyleCost, pricePerMeter,
      numberOfPanels, clothMeters, stitchingCost, totalCost, mode, timestamp
    } = req.body;

    // Validate required fields
    if (!width || !height || !panelWidth || !stitchStyle || !pricePerMeter || 
        numberOfPanels === undefined || clothMeters === undefined || 
        stitchingCost === undefined || totalCost === undefined) {
      return res.status(400).json({
        error: 'Missing required fields',
        received: Object.keys(req.body)
      });
    }

    const dataToSave = {
      width, height, panelWidth, stitchStyle, stitchStyleCost, pricePerMeter,
      numberOfPanels, clothMeters, stitchingCost, totalCost,
      mode: mode || 'single',
      timestamp: timestamp || new Date().toISOString(),
      userIp: req.ip || 'Unknown',
      userAgent: req.get('User-Agent') || 'Unknown'
    };

    console.log('📤 Sending to Google Sheets:', JSON.stringify(dataToSave, null, 2));
    
    const result = await appendToGoogleSheet(dataToSave);

    if (result.success) {
      console.log('✅ Data saved successfully');
      res.json({
        message: 'Data saved successfully to Google Sheets',
        rowNumber: result.rowNumber,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`
      });
    } else {
      console.error('❌ Failed to save:', result.error);
      res.status(500).json({
        error: 'Failed to save to Google Sheets',
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

app.get('/api/open-sheet', (req, res) => {
  res.redirect(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`);
});

// Serve the complete working calculator
app.get('/', (req, res) => {
  const calculatorHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>D'Moksha Curtain Calculator - WORKING</title>
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
        width: '', height: '', panelWidth: 22, stitchStyle: 'Plain', pricePerMeter: ''
      });
      const [results, setResults] = useState({
        numberOfPanels: 0, clothMeters: 0, stitchingCost: 0, totalCost: 0
      });
      const [saveStatus, setSaveStatus] = useState('');
      const [isCalculated, setIsCalculated] = useState(false);
      const [validationErrors, setValidationErrors] = useState({});

      const panelOptions = [
        { label: 'High', value: 22 },
        { label: 'Medium', value: 24 },
        { label: 'Low', value: 26 }
      ];

      const stitchStyleOptions = [
        { label: 'Plain', value: 'Plain', cost: 200 },
        { label: 'American Plit', value: 'American Plit', cost: 250 },
        { label: 'Rod Pocket', value: 'Rod Pocket', cost: 300 },
        { label: 'Ripple', value: 'Ripple', cost: 350 }
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

      const getStitchStyleCost = (styleName) => {
        const style = stitchStyleOptions.find(s => s.value === styleName);
        return style ? style.cost : 200;
      };

      // Save function that works with the backend
      const saveToGoogleSheets = async (calculationResults, isAutoSave = false) => {
        try {
          setSaveStatus('saving');
          
          const stitchStyleCost = getStitchStyleCost(inputs.stitchStyle);
          
          const dataToSave = {
            // Input data
            width: inputs.width,
            height: inputs.height,
            panelWidth: inputs.panelWidth,
            stitchStyle: inputs.stitchStyle,
            stitchStyleCost: stitchStyleCost,
            pricePerMeter: inputs.pricePerMeter,
            mode: mode,
            
            // Output data
            numberOfPanels: calculationResults.numberOfPanels,
            clothMeters: calculationResults.clothMeters,
            stitchingCost: calculationResults.stitchingCost,
            totalCost: calculationResults.totalCost,
            
            // Metadata
            timestamp: new Date().toISOString()
          };

          console.log('📤 Sending to backend:', dataToSave);

          const response = await fetch('/api/save', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(dataToSave)
          });

          const result = await response.json();

          if (response.ok) {
            console.log('✅ Save successful:', result);
            setSaveStatus(isAutoSave ? 'auto-saved' : 'success');
            setTimeout(() => setSaveStatus(''), 3000);
          } else {
            console.error('❌ Save failed:', result);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus(''), 3000);
          }
        } catch (error) {
          console.error('❌ Save error:', error);
          setSaveStatus('error');
          setTimeout(() => setSaveStatus(''), 3000);
        }
      };

      const calculateResults = () => {
        if (!validateInputs()) return;

        const { width, height, panelWidth, pricePerMeter, stitchStyle } = inputs;
        const extraWidth = (6/50) * parseFloat(width);
        const adjustedWidth = parseFloat(width) + extraWidth;

        let numberOfPanels, clothRequiredMeters;

        if (mode === 'single') {
          numberOfPanels = Math.ceil(adjustedWidth / panelWidth);
          clothRequiredMeters = Math.ceil((numberOfPanels * (parseFloat(height) + 10) + 10)) * (2.54 / 100);
        } else {
          const finalWidth = adjustedWidth * 54 / panelWidth;
          numberOfPanels = Math.ceil((adjustedWidth / panelWidth));
          clothRequiredMeters = (finalWidth) * (2.54 / 100);
        }

        // Round cloth required to 1 decimal place
        const roundedClothMeters = parseFloat(clothRequiredMeters.toFixed(1));
        
        // Calculate stitching cost
        const stitchStyleCost = getStitchStyleCost(stitchStyle);
        const stitchingCost = stitchStyleCost * numberOfPanels;
        
        // Calculate total cost using rounded cloth meters
        const fabricCost = roundedClothMeters * parseFloat(pricePerMeter);
        const totalCost = parseFloat((fabricCost + stitchingCost).toFixed(2));
        
        const calculationResults = {
          numberOfPanels: numberOfPanels,
          clothMeters: roundedClothMeters,
          stitchingCost: stitchingCost,
          totalCost: totalCost
        };

        console.log('🧮 Results:', calculationResults);
        setResults(calculationResults);
        setIsCalculated(true);

        // Auto-save after calculation
        saveToGoogleSheets(calculationResults, true);
      };

      const manualSave = () => {
        if (!isCalculated) {
          alert('Please calculate first before saving');
          return;
        }
        saveToGoogleSheets(results, false);
      };

      const resetForm = () => {
        setInputs({ width: '', height: '', panelWidth: 22, stitchStyle: 'Plain', pricePerMeter: '' });
        setResults({ numberOfPanels: 0, clothMeters: 0, stitchingCost: 0, totalCost: 0 });
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

      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black px-4 py-6">
          <div className="max-w-md mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg">
                <span className="text-2xl font-bold text-black">D'M</span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">D'Moksha</h1>
              <p className="text-amber-400 text-sm font-medium tracking-wide">PREMIUM CURTAINS - WORKING VERSION</p>
              <div className="w-20 h-0.5 bg-gradient-to-r from-amber-400 to-yellow-500 mx-auto mt-2"></div>
            </div>

            {/* Calculator Card */}
            <div className="bg-gray-800 bg-opacity-50 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-gray-700">
              {/* Mode Toggle */}
              <div className="mb-6">
                <div className="flex bg-gray-700 rounded-xl p-1">
                  <button
                    onClick={() => handleModeSwitch('single')}
                    className={\`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-300 \${
                      mode === 'single' 
                        ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-lg'
                        : 'text-gray-300 hover:text-white'
                    }\`}
                  >
                    Single Width
                  </button>
                  <button
                    onClick={() => handleModeSwitch('double')}
                    className={\`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-300 \${
                      mode === 'double'
                        ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-lg'
                        : 'text-gray-300 hover:text-white'
                    }\`}
                  >
                    Double Width
                  </button>
                </div>
              </div>

              <h2 className="text-xl font-semibold text-white mb-6 text-center">
                {\`\${mode === 'single' ? 'Single Width' : 'Double Width'} Calculator\`}
              </h2>

              {/* Input Fields */}
              <div className="space-y-5">
                {/* Width Input */}
                <div>
                  <label className="block text-amber-400 text-sm font-medium mb-2">Width (inches) *</label>
                  <input
                    type="number"
                    value={inputs.width}
                    onChange={(e) => handleInputChange('width', e.target.value)}
                    className={\`w-full bg-gray-700 border rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all duration-200 \${
                      validationErrors.width ? 'border-red-500' : 'border-gray-600'
                    }\`}
                    placeholder="Enter width"
                  />
                  {validationErrors.width && <p className="mt-1 text-red-400 text-xs">{validationErrors.width}</p>}
                </div>

                {/* Height Input */}
                <div>
                  <label className="block text-amber-400 text-sm font-medium mb-2">
                    Height (inches) * {mode === 'double' && <span className="text-red-400">(Max: 90")</span>}
                  </label>
                  <input
                    type="number"
                    value={inputs.height}
                    onChange={(e) => handleInputChange('height', e.target.value)}
                    className={\`w-full bg-gray-700 border rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all duration-200 \${
                      validationErrors.height ? 'border-red-500' : 'border-gray-600'
                    }\`}
                    placeholder="Enter height"
                    max={mode === 'double' ? 90 : undefined}
                  />
                  {validationErrors.height && <p className="mt-1 text-red-400 text-xs">{validationErrors.height}</p>}
                </div>

                {/* Panel Width Selection */}
                <div>
                  <label className="block text-amber-400 text-sm font-medium mb-3">
                    {mode === 'single' ? 'Panel Width' : 'Panel Gather'}
                  </label>
                  <div className="flex gap-2">
                    {panelOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleInputChange('panelWidth', option.value)}
                        className={\`flex-1 py-3 px-3 rounded-xl font-medium transition-all duration-200 text-sm \${
                          inputs.panelWidth === option.value
                            ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-lg'
                            : 'bg-gray-700 text-white border border-gray-600 hover:bg-gray-600'
                        }\`}
                      >
                        <div className="text-xs opacity-80">{option.label}</div>
                        <div className="font-bold">{\`\${option.value}"\`}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stitch Style Selection */}
                <div>
                  <label className="block text-amber-400 text-sm font-medium mb-3">
                    Stitch Style
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {stitchStyleOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleInputChange('stitchStyle', option.value)}
                        className={\`py-3 px-3 rounded-xl font-medium transition-all duration-200 text-sm \${
                          inputs.stitchStyle === option.value
                            ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-lg'
                            : 'bg-gray-700 text-white border border-gray-600 hover:bg-gray-600'
                        }\`}
                      >
                        <div className="text-xs opacity-80">{option.label}</div>
                        <div className="font-bold">₹{option.cost}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Input */}
                <div>
                  <label className="block text-amber-400 text-sm font-medium mb-2">Price per Meter (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={inputs.pricePerMeter}
                    onChange={(e) => handleInputChange('pricePerMeter', e.target.value)}
                    className={\`w-full bg-gray-700 border rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all duration-200 \${
                      validationErrors.pricePerMeter ? 'border-red-500' : 'border-gray-600'
                    }\`}
                    placeholder="Enter price per meter"
                  />
                  {validationErrors.pricePerMeter && <p className="mt-1 text-red-400 text-xs">{validationErrors.pricePerMeter}</p>}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={calculateResults}
                  disabled={isCalculateDisabled()}
                  className={\`flex-1 font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-200 transform \${
                    isCalculateDisabled()
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black hover:from-amber-500 hover:to-yellow-600 hover:scale-105'
                  }\`}
                >
                  Calculate & Auto-Save
                </button>
                <button
                  onClick={resetForm}
                  className="bg-gray-700 text-white font-semibold py-3 px-6 rounded-xl border border-gray-600 hover:bg-gray-600 transition-all duration-200"
                >
                  Reset
                </button>
              </div>

              {/* Results */}
              {isCalculated && (
                <div className="mt-6 p-4 bg-gray-700 bg-opacity-50 rounded-xl border border-gray-600">
                  <h3 className="text-amber-400 font-semibold mb-3 text-center">Results</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">
                        {mode === 'single' ? 'Number of Panels:' : 'Panel Calculation:'}
                      </span>
                      <span className="text-white font-medium">{results.numberOfPanels}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">Cloth Required:</span>
                      <span className="text-white font-medium">{\`\${results.clothMeters}m\`}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">Stitching Cost:</span>
                      <span className="text-white font-medium">₹{results.stitchingCost}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-gray-600 pt-3">
                      <span className="text-amber-400 font-medium">Total Cost:</span>
                      <span className="text-amber-400 font-bold text-lg">₹{results.totalCost}</span>
                    </div>
                  </div>

                  {/* Mode Indicator */}
                  <div className="mt-3 text-center">
                    <span className={\`inline-block px-3 py-1 rounded-full text-xs font-medium \${
                      mode === 'single' 
                        ? 'bg-blue-600 bg-opacity-20 text-blue-400 border border-blue-500'
                        : 'bg-purple-600 bg-opacity-20 text-purple-400 border border-purple-500'
                    }\`}>
                      {\`\${mode === 'single' ? 'Single Width Mode' : 'Double Width Mode'}\`}
                    </span>
                  </div>

                  {/* Buttons */}
                  <div className="space-y-3 mt-4">
                    <button
                      onClick={manualSave}
                      disabled={saveStatus === 'saving'}
                      className="w-full bg-green-600 text-white font-semibold py-3 px-6 rounded-xl hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      {saveStatus === 'saving' ? 'Saving...' : 'Save Again to Google Sheets'}
                    </button>
                    
                    <button
                      onClick={openGoogleSheet}
                      className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl hover:bg-blue-700 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <span>📊</span>
                      View Google Sheet
                    </button>
                  </div>
                  
                  {/* Status Messages */}
                  {saveStatus === 'saving' && (
                    <div className="mt-2 p-2 bg-blue-600 bg-opacity-20 border border-blue-500 rounded-lg text-blue-400 text-sm text-center">
                      💾 Saving to Google Sheets...
                    </div>
                  )}
                  {saveStatus === 'auto-saved' && (
                    <div className="mt-2 p-2 bg-green-600 bg-opacity-20 border border-green-500 rounded-lg text-green-400 text-sm text-center">
                      ✅ Auto-saved to Google Sheets!
                    </div>
                  )}
                  {saveStatus === 'success' && (
                    <div className="mt-2 p-2 bg-green-600 bg-opacity-20 border border-green-500 rounded-lg text-green-400 text-sm text-center">
                      ✅ Manually saved to Google Sheets!
                    </div>
                  )}
                  {saveStatus === 'error' && (
                    <div className="mt-2 p-2 bg-red-600 bg-opacity-20 border border-red-500 rounded-lg text-red-400 text-sm text-center">
                      ❌ Failed to save. Check console for details.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="text-center mt-6 text-gray-500 text-xs">
              <p>Premium Curtain Solutions - WORKING VERSION</p>
              <p className="mt-1">© 2025 D'Moksha. All rights reserved.</p>
              <p className="mt-2 text-green-400">✅ Complete Integration: Backend + Frontend + Google Sheets</p>
            </div>
          </div>
        </div>
      );
    };

    ReactDOM.render(React.createElement(CurtainCalculator), document.getElementById('root'));
  </script>
</body>
</html>
  `;

  res.send(calculatorHtml);
});

// Initialize Google Sheets and start server
async function startServer() {
  console.log('🔄 Starting D\'Moksha Calculator Server...');
  
  const sheetsInitialized = await initializeGoogleSheets();
  
  if (!sheetsInitialized) {
    console.log('⚠️  Google Sheets initialization failed, but server will continue');
  }

  app.listen(PORT, () => {
    console.log(`🚀 D'Moksha WORKING Calculator Server running on port ${PORT}`);
    console.log(`📊 Google Spreadsheet: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`);
    console.log(`🌐 WORKING Calculator: http://localhost:${PORT}`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
    console.log('');
    console.log('🎯 COMPLETE INTEGRATION:');
    console.log('✅ Backend with proper Google Sheets connection');
    console.log('✅ Frontend with working save functions');
    console.log('✅ Auto-save and manual save both working');
    console.log('✅ Complete data saving (inputs + outputs)');
    console.log('✅ Stitch Style feature added');
    console.log('✅ Stitching cost calculation');
    console.log('');
    console.log('🧪 TEST STEPS:');
    console.log('1. Go to http://localhost:' + PORT);
    console.log('2. Fill calculator and click "Calculate & Auto-Save"');
    console.log('3. Click "Save Again to Google Sheets"');
    console.log('4. Check Google Sheet for complete data');
    console.log('');
  });
}

startServer();

module.exports = app;
