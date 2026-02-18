const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/images', express.static(path.join(__dirname, 'images')));

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

let GoogleSpreadsheet, JWT;
let isGoogleSheetsAvailable = false;

try {
  const { GoogleSpreadsheet: GS } = require('google-spreadsheet');
  const { JWT: JWTAuth } = require('google-auth-library');
  GoogleSpreadsheet = GS;
  JWT = JWTAuth;
  isGoogleSheetsAvailable = true;
  console.log('✅ Google Sheets modules loaded');
} catch (error) {
  console.error('❌ Failed to load Google Sheets modules:', error.message);
}

const SHEET_HEADERS = [
  'Timestamp', 'Customer Name', 'Mode', 'Sub Mode', 'Width (inches)', 'Height (inches)',
  'Stitch Style', 'Stitch Style Cost (₹)', 'Panel Width (inches)', 'Lining', 'Lining Cost (₹)',
  'Price per Meter (₹)', 'Number of Panels', 'Cloth Required (meters)', 'Fabric Cost (₹)', 
  'Stitching Cost (₹)', 'Total Cost (₹)', 'User IP', 'Browser Info'
];

let doc, sheet;
let connectionStatus = { connected: false, error: null };

async function initializeGoogleSheets() {
  try {
    if (!isGoogleSheetsAvailable) throw new Error('Google Sheets modules not available');
    console.log('🔄 Connecting to Google Sheets...');
    const serviceAccountAuth = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    console.log(`📊 Connected to: "${doc.title}"`);
    sheet = doc.sheetsByTitle['Customer Data'] || doc.sheetsByIndex[0];
    if (!sheet) {
      sheet = await doc.addSheet({ title: 'Customer Data', headerValues: SHEET_HEADERS });
      console.log('✅ Created new worksheet');
    } else {
      await sheet.loadHeaderRow();
      await sheet.setHeaderRow(SHEET_HEADERS);
      console.log('✅ Headers updated');
    }
    connectionStatus = { connected: true, error: null };
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize:', error.message);
    connectionStatus = { connected: false, error: error.message };
    return false;
  }
}

async function appendToGoogleSheet(data) {
  try {
    if (!sheet) throw new Error('Google Sheets not initialized');
    const rowData = {
      'Timestamp': new Date(data.timestamp).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }),
      'Customer Name': data.customerName || '',
      'Mode': data.mode || '',
      'Sub Mode': data.subMode || '',
      'Width (inches)': parseFloat(data.width || 0),
      'Height (inches)': parseFloat(data.height || 0),
      'Stitch Style': data.stitchStyle || 'American Pleat',
      'Stitch Style Cost (₹)': parseFloat(data.stitchStyleCost || 0),
      'Panel Width (inches)': parseInt(data.panelWidth || 0),
      'Lining': data.lining || 'No Lining',
      'Lining Cost (₹)': parseFloat(data.liningCost || 0),
      'Price per Meter (₹)': parseFloat(data.pricePerMeter || 0),
      'Number of Panels': parseFloat(data.numberOfPanels || 0),
      'Cloth Required (meters)': parseFloat(data.clothMeters || 0),
      'Fabric Cost (₹)': parseFloat(data.fabricCost || 0),
      'Stitching Cost (₹)': parseFloat(data.stitchingCost || 0),
      'Total Cost (₹)': parseFloat(data.totalCost || 0),
      'User IP': data.userIp || 'Unknown',
      'Browser Info': data.userAgent ? data.userAgent.substring(0, 100) : 'Unknown'
    };
    const newRow = await sheet.addRow(rowData);
    console.log(`✅ Added row ${newRow.rowNumber}`);
    return { success: true, rowNumber: newRow.rowNumber, data: rowData };
  } catch (error) {
    console.error('❌ Error appending:', error);
    return { success: false, error: error.message };
  }
}

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

app.post('/api/save', async (req, res) => {
  console.log('💾 Save request:', JSON.stringify(req.body, null, 2));
  try {
    if (!connectionStatus.connected) {
      const connected = await initializeGoogleSheets();
      if (!connected) {
        return res.status(500).json({ error: 'Failed to connect', details: connectionStatus.error });
      }
    }
    const { customerName, mode, subMode, width, height, stitchStyle, stitchStyleCost,
      panelWidth, lining, liningCost, pricePerMeter, numberOfPanels, clothMeters, fabricCost,
      stitchingCost, totalCost, timestamp } = req.body;
    if (!width || !height || !pricePerMeter || numberOfPanels === undefined ||
        clothMeters === undefined || totalCost === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const dataToSave = { customerName, mode, subMode, width, height, stitchStyle, stitchStyleCost,
      panelWidth, lining, liningCost, pricePerMeter, numberOfPanels, clothMeters, fabricCost, stitchingCost, totalCost,
      timestamp: timestamp || new Date().toISOString(),
      userIp: req.ip || 'Unknown', userAgent: req.get('User-Agent') || 'Unknown' };
    const result = await appendToGoogleSheet(dataToSave);
    if (result.success) {
      res.json({ message: 'Saved successfully', rowNumber: result.rowNumber,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}` });
    } else {
      res.status(500).json({ error: 'Failed to save', details: result.error });
    }
  } catch (error) {
    console.error('❌ Error in /api/save:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

app.get('/api/open-sheet', (req, res) => {
  res.redirect(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`);
});

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>D'Moksha Calculator</title>
<script src="https://unpkg.com/react@18/umd/react.development.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<script src="https://cdn.tailwindcss.com"></script></head><body><div id="root"></div>
<script type="text/babel">
const{useState}=React;const CurtainCalculator=()=>{const[mode,setMode]=useState('single');
const[subMode,setSubMode]=useState('54');const[inputs,setInputs]=useState({customerName:'',width:'',height:'',stitchStyle:'American Pleat',panelWidth:24,lining:'No Lining',pricePerMeter:''});
const[results,setResults]=useState({numberOfPanels:0,clothMeters:0,fabricCost:0,stitchingCost:0,liningCost:0,totalCost:0});
const[saveStatus,setSaveStatus]=useState('');const[isCalculated,setIsCalculated]=useState(false);
const[validationErrors,setValidationErrors]=useState({});const panelWidthOptions={single54:{'American Pleat':[{label:'High Gather',value:24},{label:'Medium Gather',value:26},{label:'Low Gather',value:28}],'Ripple':[{label:'High Gather',value:22}],'Rod Pocket':[{label:'High Gather',value:22}],'Plain Classic':[{label:'High Gather',value:40},{label:'Medium Gather',value:44},{label:'Low Gather',value:48}]},single48:{'American Pleat':[{label:'High Gather',value:22},{label:'Medium Gather',value:24},{label:'Low Gather',value:26}],'Ripple':[{label:'High Gather',value:20}],'Rod Pocket':[{label:'High Gather',value:20}],'Plain Classic':[{label:'High Gather',value:38},{label:'Medium Gather',value:42},{label:'Low Gather',value:46}]},double:{'American Pleat':[{label:'High Gather',value:24},{label:'Medium Gather',value:26},{label:'Low Gather',value:28}],'Ripple':[{label:'High Gather',value:22}],'Rod Pocket':[{label:'High Gather',value:22}],'Plain Classic':[{label:'High Gather',value:40},{label:'Medium Gather',value:44},{label:'Low Gather',value:48}]}};
const stitchStyleOptions=[{label:'American Pleat',value:'American Pleat',cost:250},{label:'Ripple',value:'Ripple',cost:350},{label:'Rod Pocket',value:'Rod Pocket',cost:300},{label:'Plain Classic',value:'Plain Classic',cost:200}];
const liningOptions=[{label:'No Lining',value:'No Lining',cost:0},{label:'Normal Lining',value:'Normal Lining',cost:250},{label:'80% Blackout Lining',value:'80% Blackout Lining',cost:250},{label:'100% Blackout Lining',value:'100% Blackout Lining',cost:375}];
const handleModeSwitch=(newMode)=>{setMode(newMode);if(newMode==='single'){setSubMode('54');}else{setSubMode('');}
setIsCalculated(false);setValidationErrors({});setSaveStatus('');const key=newMode==='single'?'single54':'double';
const firstOption=panelWidthOptions[key]['American Pleat'][0];setInputs(prev=>({...prev,stitchStyle:'American Pleat',panelWidth:firstOption.value}));};
const handleSubModeSwitch=(newSubMode)=>{setSubMode(newSubMode);setIsCalculated(false);setValidationErrors({});setSaveStatus('');
const key=\`single\${newSubMode}\`;const firstOption=panelWidthOptions[key][inputs.stitchStyle][0];setInputs(prev=>({...prev,panelWidth:firstOption.value}));};
const handleInputChange=(field,value)=>{if(field==='stitchStyle'){const key=mode==='roman'?'':(mode==='single'?\`single\${subMode}\`:'double');
if(mode!=='roman'){const firstOption=panelWidthOptions[key][value][0];setInputs(prev=>({...prev,stitchStyle:value,panelWidth:firstOption.value}));}else{setInputs(prev=>({...prev,[field]:value}));}}else{setInputs(prev=>({...prev,[field]:value}));}
setIsCalculated(false);setValidationErrors({});setSaveStatus('');};const validateInputs=()=>{const errors={};
const{width,height,pricePerMeter}=inputs;if(!width||parseFloat(width)<=0){errors.width='Width required and must be >0';}
if(!height||parseFloat(height)<=0){errors.height='Height required and must be >0';}
if(mode==='double'&&parseFloat(height)>105){errors.height='Height cannot exceed 105" for double width';}
if(!pricePerMeter||parseFloat(pricePerMeter)<=0){errors.pricePerMeter='Price per meter required and must be >0';}
setValidationErrors(errors);return Object.keys(errors).length===0;};const getStitchStyleCost=(styleName)=>{const style=stitchStyleOptions.find(s=>s.value===styleName);return style?style.cost:250;};
const getLiningCost=(liningName)=>{const lining=liningOptions.find(l=>l.value===liningName);return lining?lining.cost:0;};
const saveToGoogleSheets=async(calculationResults,isAutoSave=false)=>{try{setSaveStatus('saving');
const stitchStyleCost=mode!=='roman'?getStitchStyleCost(inputs.stitchStyle):0;const liningCost=mode!=='roman'?getLiningCost(inputs.lining):0;const dataToSave={customerName:inputs.customerName,mode:mode,subMode:mode==='single'?\`\${subMode}" Panel\`:'',width:inputs.width,height:inputs.height,stitchStyle:mode!=='roman'?inputs.stitchStyle:'N/A',stitchStyleCost:stitchStyleCost,panelWidth:mode==='roman'?50:inputs.panelWidth,lining:mode!=='roman'?inputs.lining:'N/A',liningCost:liningCost,pricePerMeter:inputs.pricePerMeter,numberOfPanels:calculationResults.numberOfPanels,clothMeters:calculationResults.clothMeters,fabricCost:calculationResults.fabricCost,stitchingCost:calculationResults.stitchingCost,totalCost:calculationResults.totalCost,timestamp:new Date().toISOString()};
const response=await fetch('/api/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(dataToSave)});
const result=await response.json();if(response.ok){setSaveStatus(isAutoSave?'auto-saved':'success');setTimeout(()=>setSaveStatus(''),3000);}else{setSaveStatus('error');setTimeout(()=>setSaveStatus(''),3000);}}catch(error){setSaveStatus('error');setTimeout(()=>setSaveStatus(''),3000);}};
const calculateResults=()=>{if(!validateInputs())return;const{width,height,panelWidth,pricePerMeter,stitchStyle,lining}=inputs;
let numberOfPanels,clothRequiredMeters,stitchingCost=0;if(mode==='roman'){const panelWidthRoman=50;
numberOfPanels=Math.ceil(parseFloat(width)/panelWidthRoman);const extraHeight=20;const extraCloth=10;
clothRequiredMeters=((parseFloat(height)+extraHeight)*numberOfPanels+extraCloth)*(2.54/100);
stitchingCost=((parseFloat(width)/12)*(parseFloat(height)/12))*175;}else if(mode==='single'){const extraWidth=(6/50)*parseFloat(width);const adjustedWidth=parseFloat(width)+extraWidth;
numberOfPanels=Math.ceil(adjustedWidth/panelWidth);clothRequiredMeters=Math.ceil((numberOfPanels*(parseFloat(height)+12)+10))*(2.54/100);
const stitchStyleCost=getStitchStyleCost(stitchStyle);stitchingCost=stitchStyleCost*numberOfPanels;}else{const extraWidth=(6/50)*parseFloat(width);const adjustedWidth=parseFloat(width)+extraWidth;
numberOfPanels=Math.ceil(adjustedWidth/panelWidth);const finalWidth=adjustedWidth*54/panelWidth;
clothRequiredMeters=finalWidth*(2.54/100);const stitchStyleCost=getStitchStyleCost(stitchStyle);stitchingCost=stitchStyleCost*numberOfPanels;}
const roundedClothMeters=parseFloat(clothRequiredMeters.toFixed(1));const fabricCost=parseFloat((roundedClothMeters*parseFloat(pricePerMeter)).toFixed(2));
stitchingCost=parseFloat(stitchingCost.toFixed(2));const liningCost=mode!=='roman'?parseFloat((getLiningCost(lining)*numberOfPanels).toFixed(2)):0;const totalCost=parseFloat((fabricCost+stitchingCost+liningCost).toFixed(2));
const calculationResults={numberOfPanels:numberOfPanels,clothMeters:roundedClothMeters,fabricCost:fabricCost,stitchingCost:stitchingCost,liningCost:liningCost,totalCost:totalCost};
setResults(calculationResults);setIsCalculated(true);saveToGoogleSheets(calculationResults,true);};const resetForm=()=>{const key=mode==='roman'?'':(mode==='single'?\`single\${subMode}\`:'double');
const firstPanelWidth=mode==='roman'?50:panelWidthOptions[key]['American Pleat'][0].value;
setInputs({customerName:'',width:'',height:'',stitchStyle:'American Pleat',panelWidth:firstPanelWidth,lining:'No Lining',pricePerMeter:''});
setResults({numberOfPanels:0,clothMeters:0,fabricCost:0,stitchingCost:0,liningCost:0,totalCost:0});setIsCalculated(false);setSaveStatus('');setValidationErrors({});};
const isCalculateDisabled=()=>{const{width,height,pricePerMeter}=inputs;return!width||!height||!pricePerMeter||(mode==='double'&&parseFloat(height)>105)||Object.keys(validationErrors).length>0;};
const getPanelOptions=()=>{if(mode==='roman')return[];const key=mode==='single'?\`single\${subMode}\`:'double';
return panelWidthOptions[key][inputs.stitchStyle]||[];};return(<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black px-4 py-6">
<div className="max-w-md mx-auto"><div className="text-center mb-8">
<img src="/images/logo.png" alt="D'Moksha Logo" className="h-20 mx-auto mb-4" onError={(e)=>{e.target.style.display='none';document.getElementById('fallback-title').style.display='block';}}/>
<h1 id="fallback-title" className="text-3xl font-bold text-white mb-2" style={{display:'none'}}>D'Moksha</h1>
<p className="text-amber-400 text-sm font-medium tracking-wide">Express yourself. Choose goodness</p>
<p className="text-gray-400 text-xs mt-1">Pricing Calculator</p>
<div className="w-20 h-0.5 bg-gradient-to-r from-amber-400 to-yellow-500 mx-auto mt-2"></div></div>
<div className="bg-gray-800 bg-opacity-50 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-gray-700">
<div className="mb-6"><div className="flex bg-gray-700 rounded-xl p-1"><button onClick={()=>handleModeSwitch('single')} className={\`flex-1 py-2 px-4 rounded-lg text-xs font-medium transition-all duration-300 \${mode==='single'?'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-lg':'text-gray-300 hover:text-white'}\`}>Single Width</button>
<button onClick={()=>handleModeSwitch('double')} className={\`flex-1 py-2 px-4 rounded-lg text-xs font-medium transition-all duration-300 \${mode==='double'?'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-lg':'text-gray-300 hover:text-white'}\`}>Double Width</button>
<button onClick={()=>handleModeSwitch('roman')} className={\`flex-1 py-2 px-4 rounded-lg text-xs font-medium transition-all duration-300 \${mode==='roman'?'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-lg':'text-gray-300 hover:text-white'}\`}>Roman Blind</button></div></div>
{mode==='single'&&(<div className="mb-6"><div className="flex bg-gray-700 rounded-xl p-1"><button onClick={()=>handleSubModeSwitch('54')} className={\`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-300 \${subMode==='54'?'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-lg':'text-gray-300 hover:text-white'}\`}>54" Panel</button>
<button onClick={()=>handleSubModeSwitch('48')} className={\`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-300 \${subMode==='48'?'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-lg':'text-gray-300 hover:text-white'}\`}>48" Panel</button></div></div>)}
<h2 className="text-xl font-semibold text-white mb-6 text-center">{mode==='single'?\`Single Width - \${subMode}" Panel\`:mode==='double'?'Double Width':'Roman Blind'} Calculator</h2>
<div className="space-y-5"><div><label className="block text-amber-400 text-sm font-medium mb-2">Customer Name</label>
<input type="text" value={inputs.customerName} onChange={(e)=>handleInputChange('customerName',e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all duration-200" placeholder="Enter customer name"/></div>
<div><label className="block text-amber-400 text-sm font-medium mb-2">Width (inches) *</label>
<input type="number" value={inputs.width} onChange={(e)=>handleInputChange('width',e.target.value)} className={\`w-full bg-gray-700 border rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all duration-200 \${validationErrors.width?'border-red-500':'border-gray-600'}\`} placeholder="Enter width"/>
{validationErrors.width&&<p className="mt-1 text-red-400 text-xs">{validationErrors.width}</p>}</div>
<div><label className="block text-amber-400 text-sm font-medium mb-2">Height (inches) * {mode==='double'&&<span className="text-red-400">(Max: 105")</span>}</label>
<input type="number" value={inputs.height} onChange={(e)=>handleInputChange('height',e.target.value)} className={\`w-full bg-gray-700 border rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all duration-200 \${validationErrors.height?'border-red-500':'border-gray-600'}\`} placeholder="Enter height" max={mode==='double'?105:undefined}/>
{validationErrors.height&&<p className="mt-1 text-red-400 text-xs">{validationErrors.height}</p>}</div>
{mode!=='roman'&&(<div><label className="block text-amber-400 text-sm font-medium mb-3">Stitch Style</label>
<div className="grid grid-cols-2 gap-2">{stitchStyleOptions.map((option)=>(<button key={option.value} onClick={()=>handleInputChange('stitchStyle',option.value)} className={\`py-3 px-3 rounded-xl font-medium transition-all duration-200 text-sm \${inputs.stitchStyle===option.value?'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-lg':'bg-gray-700 text-white border border-gray-600 hover:bg-gray-600'}\`}>
<div className="font-bold">{option.label}</div></button>))}</div></div>)}
{mode!=='roman'&&(<div><label className="block text-amber-400 text-sm font-medium mb-3">Finished Panel</label>
<div className="grid grid-cols-2 gap-2">{getPanelOptions().map((option)=>(<button key={option.value} onClick={()=>handleInputChange('panelWidth',option.value)} className={\`py-3 px-3 rounded-xl font-medium transition-all duration-200 text-sm \${inputs.panelWidth===option.value?'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-lg':'bg-gray-700 text-white border border-gray-600 hover:bg-gray-600'}\`}>
<div className="text-xs opacity-80">{option.label}</div><div className="font-bold">{\`\${option.value}" Width\`}</div></button>))}</div></div>)}
{mode!=='roman'&&(<div><label className="block text-amber-400 text-sm font-medium mb-3">Lining</label>
<div className="grid grid-cols-2 gap-2">{liningOptions.map((option)=>(<button key={option.value} onClick={()=>handleInputChange('lining',option.value)} className={\`py-3 px-3 rounded-xl font-medium transition-all duration-200 text-sm \${inputs.lining===option.value?'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-lg':'bg-gray-700 text-white border border-gray-600 hover:bg-gray-600'}\`}>
<div className="font-bold text-xs">{option.label}</div></button>))}</div></div>)}
<div><label className="block text-amber-400 text-sm font-medium mb-2">Price per Meter (₹) *</label>
<input type="number" step="0.01" value={inputs.pricePerMeter} onChange={(e)=>handleInputChange('pricePerMeter',e.target.value)} className={\`w-full bg-gray-700 border rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all duration-200 \${validationErrors.pricePerMeter?'border-red-500':'border-gray-600'}\`} placeholder="Enter price per meter"/>
{validationErrors.pricePerMeter&&<p className="mt-1 text-red-400 text-xs">{validationErrors.pricePerMeter}</p>}</div></div>
<div className="flex gap-3 mt-6"><button onClick={calculateResults} disabled={isCalculateDisabled()} className={\`flex-1 font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-200 transform \${isCalculateDisabled()?'bg-gray-600 text-gray-400 cursor-not-allowed':'bg-gradient-to-r from-amber-400 to-yellow-500 text-black hover:from-amber-500 hover:to-yellow-600 hover:scale-105'}\`}>Calculate & Auto-Save</button>
<button onClick={resetForm} className="bg-gray-700 text-white font-semibold py-3 px-6 rounded-xl border border-gray-600 hover:bg-gray-600 transition-all duration-200">Reset</button></div>
{isCalculated&&(<div className="mt-6 p-4 bg-gray-700 bg-opacity-50 rounded-xl border border-gray-600"><h3 className="text-amber-400 font-semibold mb-3 text-center">Results</h3>
<div className="space-y-3"><div className="flex justify-between items-center"><span className="text-gray-300 text-sm">Number of Panels:</span>
<span className="text-white font-medium">{results.numberOfPanels}</span></div><div className="flex justify-between items-center">
<span className="text-gray-300 text-sm">Cloth Required:</span><span className="text-white font-medium">{\`\${results.clothMeters}m\`}</span></div>
<div className="flex justify-between items-center"><span className="text-gray-300 text-sm">Fabric Cost:</span>
<span className="text-white font-medium">₹{results.fabricCost}</span></div><div className="flex justify-between items-center">
<span className="text-gray-300 text-sm">Stitching Cost:</span><span className="text-white font-medium">₹{results.stitchingCost}</span></div>
{mode!=='roman'&&results.liningCost>0&&(<div className="flex justify-between items-center"><span className="text-gray-300 text-sm">Lining Cost:</span><span className="text-white font-medium">₹{results.liningCost}</span></div>)}
<div className="flex justify-between items-center border-t border-gray-600 pt-3"><span className="text-amber-400 font-medium">Total Cost:</span>
<span className="text-amber-400 font-bold text-lg">₹{results.totalCost}</span></div></div>
<div className="mt-3 text-center"><span className={\`inline-block px-3 py-1 rounded-full text-xs font-medium \${mode==='single'?'bg-blue-600 bg-opacity-20 text-blue-400 border border-blue-500':mode==='double'?'bg-purple-600 bg-opacity-20 text-purple-400 border border-purple-500':'bg-green-600 bg-opacity-20 text-green-400 border border-green-500'}\`}>
{mode==='single'?\`Single Width - \${subMode}" Panel\`:mode==='double'?'Double Width':'Roman Blind'}</span></div>
{saveStatus==='saving'&&(<div className="mt-2 p-2 bg-blue-600 bg-opacity-20 border border-blue-500 rounded-lg text-blue-400 text-sm text-center">💾 Saving...</div>)}
{saveStatus==='auto-saved'&&(<div className="mt-2 p-2 bg-green-600 bg-opacity-20 border border-green-500 rounded-lg text-green-400 text-sm text-center">✅ Auto-saved!</div>)}
{saveStatus==='error'&&(<div className="mt-2 p-2 bg-red-600 bg-opacity-20 border border-red-500 rounded-lg text-red-400 text-sm text-center">❌ Failed to save</div>)}</div>)}</div>
<div className="text-center mt-6 text-gray-500 text-xs"><p>Premium Curtain Solutions</p><p className="mt-1">© 2025 D'Moksha. All rights reserved.</p></div></div></div>);};
ReactDOM.render(React.createElement(CurtainCalculator),document.getElementById('root'));
</script></body></html>`);
});

async function startServer() {
  console.log('🔄 Starting D\'Moksha Calculator Server...');
  const sheetsInitialized = await initializeGoogleSheets();
  if (!sheetsInitialized) console.log('⚠️  Google Sheets init failed, but server will continue');
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Spreadsheet: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`);
    console.log(`🌐 Calculator: http://localhost:${PORT}`);
    console.log(`🖼️  Logo: http://localhost:${PORT}/images/logo.png`);
    console.log('🎯 Features: Single Width (54"/48"), Double Width, Roman Blind');
  });
}

startServer();
module.exports = app;
