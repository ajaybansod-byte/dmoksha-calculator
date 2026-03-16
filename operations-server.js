const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());
app.use('/images', express.static(path.join(__dirname, 'images')));

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
} catch (error) {
  console.error('❌ Failed to load Google Sheets modules:', error.message);
}

const SHEET_HEADERS = [
  'Timestamp', 'Customer Name', 'Width (inches)', 'Height (inches)', 'Installation Date',
  'Main Fabric', 'Sheer Fabric', 'Lining Fabric',
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
    const serviceAccountAuth = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    console.log(`📊 Connected to: "${doc.title}"`);
    sheet = doc.sheetsByTitle['Cutter Data'] || doc.sheetsByIndex[0];
    if (!sheet) {
      sheet = await doc.addSheet({ title: 'Cutter Data', headerValues: SHEET_HEADERS });
      console.log('✅ Created new worksheet');
    } else {
      await sheet.loadHeaderRow();
      if (sheet.columnCount < SHEET_HEADERS.length) {
        await sheet.resize({ rowCount: sheet.rowCount, columnCount: SHEET_HEADERS.length });
        console.log(`✅ Sheet resized to ${SHEET_HEADERS.length} columns`);
      }
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
      'Width (inches)': parseFloat(data.width || 0),
      'Height (inches)': parseFloat(data.height || 0),
      'Installation Date': data.installationDate || '',
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
    const newRow = await sheet.addRow(rowData);
    console.log(`✅ Added row ${newRow.rowNumber}`);
    return { success: true, rowNumber: newRow.rowNumber };
  } catch (error) {
    console.error('❌ Error appending:', error);
    return { success: false, error: error.message };
  }
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    googleSheets: { connected: connectionStatus.connected, error: connectionStatus.error }
  });
});

app.post('/api/save', async (req, res) => {
  try {
    if (!connectionStatus.connected) {
      const connected = await initializeGoogleSheets();
      if (!connected) return res.status(500).json({ error: 'Failed to connect', details: connectionStatus.error });
    }
    const data = {
      ...req.body,
      timestamp: req.body.timestamp || new Date().toISOString(),
      userIp: req.ip || 'Unknown',
      userAgent: req.get('User-Agent') || 'Unknown'
    };
    const result = await appendToGoogleSheet(data);
    if (result.success) {
      res.json({ message: 'Saved successfully', rowNumber: result.rowNumber });
    } else {
      res.status(500).json({ error: 'Failed to save', details: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>D'Moksha Operations</title>
<script src="https://unpkg.com/react@18/umd/react.development.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<script src="https://cdn.tailwindcss.com"></script>
<style>
  @media print {
    body * { visibility: hidden !important; }
    #pdf-content, #pdf-content * { visibility: visible !important; }
    #pdf-content {
      position: fixed !important;
      top: 0 !important; left: 0 !important;
      width: 100% !important;
      background: white !important;
      z-index: 99999 !important;
      padding: 0 !important;
      margin: 0 !important;
    }
  }
</style>
</head>
<body><div id="root"></div>
<script type="text/babel">
const{useState,useRef}=React;

const OperationsCalc=()=>{
  const[inputs,setInputs]=useState({
    customerName:'',width:'',height:'',installationDate:'',
    mainEnabled:'No',mainFabric:'',
    sheerEnabled:'No',sheerFabric:'',
    liningEnabled:'No',liningFabric:'',
    stitchingStyle:'American Pleat',gatherStyle:'High'
  });
  const[results,setResults]=useState(null);
  const[saveStatus,setSaveStatus]=useState('');
  const[validationErrors,setValidationErrors]=useState({});

  // Panel options per stitch style
  const gatherOptions={
    'American Pleat':[
      {label:'High (24" Width)',value:'High',panelWidth:24},
      {label:'Medium (26" Width)',value:'Medium',panelWidth:26},
      {label:'Low (28" Width)',value:'Low',panelWidth:28}
    ],
    'Ripple':[{label:'High (22" Width)',value:'High',panelWidth:22}],
    'Rod Pocket':[{label:'High (22" Width)',value:'High',panelWidth:22}],
    'Plain Classic':[
      {label:'High (40" Width)',value:'High',panelWidth:40},
      {label:'Medium (44" Width)',value:'Medium',panelWidth:44},
      {label:'Low (48" Width)',value:'Low',panelWidth:48}
    ]
  };

  const handleChange=(field,value)=>{
    setInputs(prev=>{
      const updated={...prev,[field]:value};
      // Reset gather when stitch style changes
      if(field==='stitchingStyle'){
        updated.gatherStyle=gatherOptions[value][0].value;
      }
      return updated;
    });
    setResults(null);
    setValidationErrors({});
    setSaveStatus('');
  };

  const validate=()=>{
    const errors={};
    if(!inputs.customerName.trim())errors.customerName='Customer name required';
    if(!inputs.width||parseFloat(inputs.width)<=0)errors.width='Width required and must be > 0';
    if(!inputs.height||parseFloat(inputs.height)<=0)errors.height='Height required and must be > 0';
    if(!inputs.installationDate)errors.installationDate='Installation date required';
    setValidationErrors(errors);
    return Object.keys(errors).length===0;
  };

  // ── Smart round (decimal<=0.15 → floor, >0.15 → ceil) ──────
  const smartRound=(v)=>{
    const fl=Math.floor(v);
    return parseFloat((v-fl).toFixed(10))<=0.15?fl:fl+1;
  };

  // ── Main calculation ────────────────────────────────────────
  const calculate=()=>{
    if(!validate())return;
    const w=parseFloat(inputs.width);
    const h=parseFloat(inputs.height);
    const style=inputs.stitchingStyle;
    const gather=inputs.gatherStyle;
    const gatherOpts=gatherOptions[style];
    const gatherObj=gatherOpts.find(g=>g.value===gather)||gatherOpts[0];
    const panelWidth=gatherObj.panelWidth;

    let numberOfPanels=0;
    let clothWidthPerPanel=0;

    if(style==='American Pleat'&&(gather==='High'||gather==='Medium')){
      // New ripple-based calculation
      const x=gather==='High'?6:5.5;
      const yMin=gather==='High'?5.0:5.5;
      const yMax=gather==='High'?5.5:6.0;
      const fwp=Math.ceil(w*1.12/2);
      const target=fwp-6;
      const nMin=Math.max(2,Math.ceil(target/yMax+1));
      const n=nMin;
      const y=target/(n-1);
      clothWidthPerPanel=8.5+(n*x)+((n-1)*y);
      // Panel count using ratio rule
      const ratio=clothWidthPerPanel/54;
      const ratioFloor=Math.floor(ratio);
      const ratioDecimal=parseFloat((ratio-ratioFloor).toFixed(10));
      numberOfPanels=ratioDecimal>0.5?(ratioFloor+1)*2:Math.ceil(ratio*2);
    } else {
      // Old smartRound for Low gather + all other styles
      const adjustedWidth=w*(1+6/50);
      clothWidthPerPanel=adjustedWidth;
      numberOfPanels=smartRound(adjustedWidth/panelWidth);
    }

    // Cut length per panel
    const cutLength=h+9;

    // Last panel width
    const fullPanelsPerSide=Math.floor(clothWidthPerPanel/54);
    const lastPanelWidth=parseFloat((clothWidthPerPanel-(fullPanelsPerSide*54)).toFixed(2));
    const lastPanelDisplay=lastPanelWidth<=0?'None':lastPanelWidth+'"';

    // Final output breakdown
    let finalOutput='';
    if(lastPanelWidth<=0){
      finalOutput=numberOfPanels+' × 54" panels';
    } else {
      const totalFull=fullPanelsPerSide*2;
      const totalLast=numberOfPanels-totalFull;
      finalOutput=totalFull+' × 54"  +  '+totalLast+' × '+lastPanelWidth+'"';
    }

    const res={
      numberOfPanels,
      cutLength:parseFloat(cutLength.toFixed(2)),
      lastPanelWidth:lastPanelDisplay,
      finalOutput,
      panelLabel:(style==='American Pleat'||style==='Plain Classic')?panelWidth+'" Panel':'22" Panel',
      gatherLabel:gatherObj.label
    };
    setResults(res);
    saveToSheet(res);
  };

  const saveToSheet=async(res)=>{
    try{
      setSaveStatus('saving');
      const payload={
        customerName:inputs.customerName,
        width:inputs.width,
        height:inputs.height,
        installationDate:inputs.installationDate,
        mainFabric:inputs.mainEnabled==='Yes'?inputs.mainFabric:'No',
        sheerFabric:inputs.sheerEnabled==='Yes'?inputs.sheerFabric:'No',
        liningFabric:inputs.liningEnabled==='Yes'?inputs.liningFabric:'No',
        stitchingStyle:inputs.stitchingStyle,
        gatherStyle:res.gatherLabel,
        numberOfPanels:res.numberOfPanels,
        cutLength:res.cutLength,
        lastPanelWidth:res.lastPanelWidth,
        finalOutput:res.finalOutput,
        timestamp:new Date().toISOString()
      };
      const response=await fetch('/api/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(response.ok){setSaveStatus('saved');setTimeout(()=>setSaveStatus(''),3000);}
      else{setSaveStatus('error');setTimeout(()=>setSaveStatus(''),3000);}
    }catch{setSaveStatus('error');setTimeout(()=>setSaveStatus(''),3000);}
  };

  const handlePrint=()=>window.print();

  const reset=()=>{
    setInputs({customerName:'',width:'',height:'',installationDate:'',
      mainEnabled:'No',mainFabric:'',sheerEnabled:'No',sheerFabric:'',
      liningEnabled:'No',liningFabric:'',stitchingStyle:'American Pleat',gatherStyle:'High'});
    setResults(null);setSaveStatus('');setValidationErrors({});
  };

  const currentGatherOpts=gatherOptions[inputs.stitchingStyle]||[];
  const canCalc=inputs.customerName&&inputs.width&&inputs.height&&inputs.installationDate;

  // ── PDF / Print content (hidden until print) ────────────────
  const pdfSection=(
    <div id="pdf-content" style={{display:'none',fontFamily:'Arial,sans-serif',background:'white',padding:'0',margin:'0'}}>
      {/* PDF Header */}
      <div style={{background:'#1A1A2E',padding:'24px 32px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{color:'#F0A500',fontSize:'22px',fontWeight:'bold',letterSpacing:'1px'}}>D'MOKSHA HOMES</div>
          <div style={{color:'#AAAAAA',fontSize:'11px',marginTop:'3px',letterSpacing:'2px'}}>EXPRESS YOURSELF. CHOOSE GOODNESS.</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{color:'#F0A500',fontSize:'13px',fontWeight:'bold'}}>CUTTING INSTRUCTION SHEET</div>
          <div style={{color:'#AAAAAA',fontSize:'10px',marginTop:'4px'}}>Generated: {new Date().toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}</div>
        </div>
      </div>

      {/* Gold divider */}
      <div style={{height:'3px',background:'linear-gradient(to right,#F0A500,#FFD700,#F0A500)'}}></div>

      {/* Customer name banner */}
      <div style={{background:'#F0A500',padding:'14px 32px'}}>
        <div style={{fontSize:'11px',color:'#1A1A2E',fontWeight:'600',letterSpacing:'2px',textTransform:'uppercase'}}>Customer</div>
        <div style={{fontSize:'26px',fontWeight:'bold',color:'#1A1A2E',marginTop:'2px'}}>{inputs.customerName||'—'}</div>
      </div>

      {/* Info grid */}
      <div style={{padding:'24px 32px 0'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'16px',marginBottom:'20px'}}>
          {[
            ['Width',inputs.width?inputs.width+'"':'—'],
            ['Height',inputs.height?inputs.height+'"':'—'],
            ['Installation Date',inputs.installationDate||'—'],
            ['Stitching Style',inputs.stitchingStyle],
            ['Gather Style',results?results.gatherLabel:'—'],
            ['Panel',results?results.panelLabel:'—'],
          ].map(([lbl,val])=>(
            <div key={lbl} style={{background:'#F8F9FA',borderRadius:'8px',padding:'12px 14px',borderLeft:'3px solid #F0A500'}}>
              <div style={{fontSize:'10px',color:'#888',fontWeight:'600',letterSpacing:'1px',textTransform:'uppercase'}}>{lbl}</div>
              <div style={{fontSize:'14px',fontWeight:'bold',color:'#1A1A2E',marginTop:'3px'}}>{val}</div>
            </div>
          ))}
        </div>

        {/* Fabric info */}
        {(inputs.mainEnabled==='Yes'||inputs.sheerEnabled==='Yes'||inputs.liningEnabled==='Yes')&&(
          <div style={{marginBottom:'20px',background:'#EBF3FB',borderRadius:'8px',padding:'14px 16px',border:'1px solid #BDD7EE'}}>
            <div style={{fontSize:'11px',color:'#2D4A6B',fontWeight:'700',letterSpacing:'1px',marginBottom:'10px',textTransform:'uppercase'}}>Fabric Information</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px'}}>
              {inputs.mainEnabled==='Yes'&&<div><span style={{fontSize:'10px',color:'#888',fontWeight:'600',display:'block'}}>MAIN</span><span style={{fontSize:'13px',fontWeight:'bold',color:'#1A1A2E'}}>{inputs.mainFabric||'—'}</span></div>}
              {inputs.sheerEnabled==='Yes'&&<div><span style={{fontSize:'10px',color:'#888',fontWeight:'600',display:'block'}}>SHEER</span><span style={{fontSize:'13px',fontWeight:'bold',color:'#1A1A2E'}}>{inputs.sheerFabric||'—'}</span></div>}
              {inputs.liningEnabled==='Yes'&&<div><span style={{fontSize:'10px',color:'#888',fontWeight:'600',display:'block'}}>LINING</span><span style={{fontSize:'13px',fontWeight:'bold',color:'#1A1A2E'}}>{inputs.liningFabric||'—'}</span></div>}
            </div>
          </div>
        )}

        {/* Cutting table */}
        {results&&(
          <div style={{marginBottom:'24px'}}>
            <div style={{fontSize:'11px',color:'#2D4A6B',fontWeight:'700',letterSpacing:'1px',marginBottom:'10px',textTransform:'uppercase'}}>Cutting Instructions</div>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
              <thead>
                <tr style={{background:'#2D4A6B'}}>
                  {['Panel','No. of Panels','Cut Length / Panel','Last Panel Width','Final Output'].map(h=>(
                    <th key={h} style={{padding:'10px 14px',color:'white',textAlign:'left',fontWeight:'600',fontSize:'11px',letterSpacing:'0.5px'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{background:'#F8F9FA'}}>
                  <td style={{padding:'14px',fontWeight:'700',color:'#1A1A2E',borderBottom:'1px solid #E0E0E0'}}>{results.panelLabel}</td>
                  <td style={{padding:'14px',fontWeight:'700',color:'#1A1A2E',borderBottom:'1px solid #E0E0E0',fontSize:'18px'}}>{results.numberOfPanels}</td>
                  <td style={{padding:'14px',fontWeight:'700',color:'#1A1A2E',borderBottom:'1px solid #E0E0E0'}}>{results.cutLength}"</td>
                  <td style={{padding:'14px',fontWeight:'700',color:results.lastPanelWidth==='None'?'#888':'#1A1A2E',borderBottom:'1px solid #E0E0E0'}}>{results.lastPanelWidth}</td>
                  <td style={{padding:'14px',fontWeight:'700',color:'#2D4A6B',borderBottom:'1px solid #E0E0E0'}}>{results.finalOutput}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PDF Footer */}
      <div style={{background:'#1A1A2E',padding:'14px 32px',marginTop:'8px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{color:'#F0A500',fontSize:'11px',fontWeight:'600'}}>D'Moksha Homes — Operations Division</div>
        <div style={{color:'#666',fontSize:'10px'}}>This document is for internal use only</div>
      </div>
    </div>
  );

  return(
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black px-4 py-6">
      {pdfSection}
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <img src="/images/logo.png" alt="D'Moksha Logo" className="h-20 mx-auto mb-4"
            onError={(e)=>{e.target.style.display='none';document.getElementById('fb-title').style.display='block';}}/>
          <h1 id="fb-title" className="text-3xl font-bold text-white mb-2" style={{display:'none'}}>D'Moksha</h1>
          <p className="text-amber-400 text-sm font-medium tracking-wide">Express yourself. Choose goodness</p>
          <p className="text-gray-400 text-xs mt-1">Operations Calculator — Cutter Output</p>
          <div className="w-20 h-0.5 bg-gradient-to-r from-amber-400 to-yellow-500 mx-auto mt-2"></div>
        </div>

        <div className="bg-gray-800 bg-opacity-50 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-gray-700">

          {/* ── Section 1 ── */}
          <div className="mb-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 flex items-center justify-center text-black text-xs font-bold">1</div>
              <span className="text-amber-400 text-sm font-semibold tracking-wide uppercase">Customer & Window Details</span>
            </div>
            <div className="space-y-4">
              {/* Customer Name */}
              <div>
                <label className="block text-amber-400 text-sm font-medium mb-2">Customer Name *</label>
                <input type="text" value={inputs.customerName}
                  onChange={e=>handleChange('customerName',e.target.value)}
                  className={\`w-full bg-gray-700 border rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 \${validationErrors.customerName?'border-red-500':'border-gray-600'}\`}
                  placeholder="Enter customer name"/>
                {validationErrors.customerName&&<p className="mt-1 text-red-400 text-xs">{validationErrors.customerName}</p>}
              </div>
              {/* Width & Height */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-amber-400 text-sm font-medium mb-2">Width (inches) *</label>
                  <input type="number" value={inputs.width}
                    onChange={e=>handleChange('width',e.target.value)}
                    className={\`w-full bg-gray-700 border rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 \${validationErrors.width?'border-red-500':'border-gray-600'}\`}
                    placeholder="Width"/>
                  {validationErrors.width&&<p className="mt-1 text-red-400 text-xs">{validationErrors.width}</p>}
                </div>
                <div>
                  <label className="block text-amber-400 text-sm font-medium mb-2">Height (inches) *</label>
                  <input type="number" value={inputs.height}
                    onChange={e=>handleChange('height',e.target.value)}
                    className={\`w-full bg-gray-700 border rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 \${validationErrors.height?'border-red-500':'border-gray-600'}\`}
                    placeholder="Height"/>
                  {validationErrors.height&&<p className="mt-1 text-red-400 text-xs">{validationErrors.height}</p>}
                </div>
              </div>
              {/* Installation Date */}
              <div>
                <label className="block text-amber-400 text-sm font-medium mb-2">Installation Date *</label>
                <input type="date" value={inputs.installationDate}
                  onChange={e=>handleChange('installationDate',e.target.value)}
                  className={\`w-full bg-gray-700 border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-400 \${validationErrors.installationDate?'border-red-500':'border-gray-600'}\`}/>
                {validationErrors.installationDate&&<p className="mt-1 text-red-400 text-xs">{validationErrors.installationDate}</p>}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-600 my-5"></div>

          {/* ── Section 2 ── */}
          <div className="mb-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 flex items-center justify-center text-black text-xs font-bold">2</div>
              <span className="text-amber-400 text-sm font-semibold tracking-wide uppercase">Fabric Information</span>
            </div>
            <div className="space-y-4">

              {/* Main */}
              <div>
                <label className="block text-amber-400 text-sm font-medium mb-2">Main Fabric</label>
                <div className="flex gap-2 mb-2">
                  {['Yes','No'].map(opt=>(
                    <button key={opt} onClick={()=>handleChange('mainEnabled',opt)}
                      className={\`flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-200 \${inputs.mainEnabled===opt?'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-lg':'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'}\`}>
                      {opt}
                    </button>
                  ))}
                </div>
                {inputs.mainEnabled==='Yes'&&(
                  <input type="text" value={inputs.mainFabric}
                    onChange={e=>handleChange('mainFabric',e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="Main fabric name"/>
                )}
              </div>

              {/* Sheer */}
              <div>
                <label className="block text-amber-400 text-sm font-medium mb-2">Sheer Fabric</label>
                <div className="flex gap-2 mb-2">
                  {['Yes','No'].map(opt=>(
                    <button key={opt} onClick={()=>handleChange('sheerEnabled',opt)}
                      className={\`flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-200 \${inputs.sheerEnabled===opt?'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-lg':'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'}\`}>
                      {opt}
                    </button>
                  ))}
                </div>
                {inputs.sheerEnabled==='Yes'&&(
                  <input type="text" value={inputs.sheerFabric}
                    onChange={e=>handleChange('sheerFabric',e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="Sheer fabric name"/>
                )}
              </div>

              {/* Lining */}
              <div>
                <label className="block text-amber-400 text-sm font-medium mb-2">Lining Fabric</label>
                <div className="flex gap-2 mb-2">
                  {['Yes','No'].map(opt=>(
                    <button key={opt} onClick={()=>handleChange('liningEnabled',opt)}
                      className={\`flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-200 \${inputs.liningEnabled===opt?'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-lg':'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'}\`}>
                      {opt}
                    </button>
                  ))}
                </div>
                {inputs.liningEnabled==='Yes'&&(
                  <input type="text" value={inputs.liningFabric}
                    onChange={e=>handleChange('liningFabric',e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="Lining fabric name"/>
                )}
              </div>

              {/* Stitching Style */}
              <div>
                <label className="block text-amber-400 text-sm font-medium mb-3">Stitching Style</label>
                <div className="grid grid-cols-2 gap-2">
                  {['American Pleat','Ripple','Rod Pocket','Plain Classic'].map(style=>(
                    <button key={style} onClick={()=>handleChange('stitchingStyle',style)}
                      className={\`py-3 px-3 rounded-xl font-medium transition-all duration-200 text-sm \${inputs.stitchingStyle===style?'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-lg':'bg-gray-700 text-white border border-gray-600 hover:bg-gray-600'}\`}>
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gather Style */}
              <div>
                <label className="block text-amber-400 text-sm font-medium mb-3">Gather Style</label>
                <div className={\`grid gap-2 \${currentGatherOpts.length===1?'grid-cols-1':'grid-cols-3'}\`}>
                  {currentGatherOpts.map(opt=>(
                    <button key={opt.value} onClick={()=>handleChange('gatherStyle',opt.value)}
                      className={\`py-3 px-2 rounded-xl font-medium transition-all duration-200 text-xs \${inputs.gatherStyle===opt.value?'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-lg':'bg-gray-700 text-white border border-gray-600 hover:bg-gray-600'}\`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mt-6">
            <button onClick={calculate} disabled={!canCalc}
              className={\`flex-1 font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-200 transform \${!canCalc?'bg-gray-600 text-gray-400 cursor-not-allowed':'bg-gradient-to-r from-amber-400 to-yellow-500 text-black hover:from-amber-500 hover:to-yellow-600 hover:scale-105'}\`}>
              Calculate
            </button>
            <button onClick={reset}
              className="bg-gray-700 text-white font-semibold py-3 px-6 rounded-xl border border-gray-600 hover:bg-gray-600 transition-all duration-200">
              Reset
            </button>
          </div>

          {/* ── Results ── */}
          {results&&(
            <div className="mt-6 p-5 bg-gray-700 bg-opacity-50 rounded-xl border border-amber-400 border-opacity-30">
              <h3 className="text-amber-400 font-bold mb-4 text-center text-lg tracking-wide uppercase">Cutter Output</h3>

              {/* Customer name highlight */}
              <div className="mb-4 p-3 bg-amber-400 bg-opacity-10 rounded-xl border border-amber-400 border-opacity-40 text-center">
                <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-1">Customer</p>
                <p className="text-white text-xl font-bold">{inputs.customerName}</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-600">
                  <span className="text-gray-300 text-sm">Panel</span>
                  <span className="text-white font-medium">{results.panelLabel}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-600">
                  <span className="text-gray-300 text-sm">Number of Panels</span>
                  <span className="text-white font-bold text-lg">{results.numberOfPanels}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-600">
                  <span className="text-gray-300 text-sm">Cut Length per Panel</span>
                  <span className="text-white font-medium">{results.cutLength}"</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-600">
                  <span className="text-gray-300 text-sm">Last Panel Width</span>
                  <span className={\`font-medium \${results.lastPanelWidth==='None'?'text-gray-500':'text-white'}\`}>{results.lastPanelWidth}</span>
                </div>
                <div className="flex justify-between items-start py-2 border-b border-gray-600">
                  <span className="text-gray-300 text-sm">Final Output</span>
                  <span className="text-amber-400 font-bold text-right ml-4">{results.finalOutput}</span>
                </div>
              </div>

              {/* Save status */}
              {saveStatus==='saving'&&<div className="mt-3 p-2 bg-blue-600 bg-opacity-20 border border-blue-500 rounded-lg text-blue-400 text-sm text-center">💾 Saving...</div>}
              {saveStatus==='saved'&&<div className="mt-3 p-2 bg-green-600 bg-opacity-20 border border-green-500 rounded-lg text-green-400 text-sm text-center">✅ Saved to sheet!</div>}
              {saveStatus==='error'&&<div className="mt-3 p-2 bg-red-600 bg-opacity-20 border border-red-500 rounded-lg text-red-400 text-sm text-center">❌ Failed to save</div>}

              {/* Download PDF button */}
              <button onClick={handlePrint}
                className="w-full mt-4 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold py-3 px-6 rounded-xl shadow-lg hover:from-amber-500 hover:to-yellow-600 transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                </svg>
                Download / Print Cutting Sheet
              </button>
            </div>
          )}

        </div>
        <div className="text-center mt-6 text-gray-500 text-xs">
          <p>D'Moksha Homes — Operations Division</p>
          <p className="mt-1">© 2025 D'Moksha. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

ReactDOM.render(React.createElement(OperationsCalc), document.getElementById('root'));
</script>
</body></html>`);
});

async function startServer() {
  console.log("🔄 Starting D'Moksha Operations Server...");
  const sheetsInitialized = await initializeGoogleSheets();
  if (!sheetsInitialized) console.log('⚠️  Google Sheets init failed, but server will continue');
  app.listen(PORT, () => {
    console.log(`🚀 Operations server running on port ${PORT}`);
    console.log(`🌐 Calculator: http://localhost:${PORT}`);
    console.log('🎯 Output: Cutter');
  });
}

startServer();
module.exports = app;
