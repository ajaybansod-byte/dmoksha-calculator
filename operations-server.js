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
  GoogleSpreadsheet = GS; JWT = JWTAuth;
  isGoogleSheetsAvailable = true;
  console.log('✅ Google Sheets modules loaded');
} catch (e) { console.error('❌ Google Sheets modules failed:', e.message); }

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
    const auth = new JWT({ email: GOOGLE_SERVICE_ACCOUNT_EMAIL, key: GOOGLE_PRIVATE_KEY, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
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
      'Timestamp': new Date(data.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
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
    const result = await appendToGoogleSheet({ ...req.body, timestamp: req.body.timestamp || new Date().toISOString(), userIp: req.ip || 'Unknown', userAgent: req.get('User-Agent') || 'Unknown' });
    result.success ? res.json({ message: 'Saved', rowNumber: result.rowNumber }) : res.status(500).json({ error: 'Save failed', details: result.error });
  } catch (e) { res.status(500).json({ error: 'Server error', message: e.message }); }
});

app.get('/', (req, res) => { res.send(`<!DOCTYPE html>
<html><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>D'Moksha Operations</title>
<script src="https://unpkg.com/react@18/umd/react.development.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<script src="https://cdn.tailwindcss.com"></script>
</head><body><div id="root"></div>
<script type="text/babel">
const{useState}=React;

const OperationsCalc=()=>{
  const[panelType,setPanelType]=useState('54');
  const[inputs,setInputs]=useState({
    customerName:'',width:'',height:'',installationDate:'',
    mainEnabled:'No',mainFabric:'',
    sheerEnabled:'No',sheerFabric:'',
    liningEnabled:'No',liningFabric:'',
    stitchingStyle:'American Pleat',gatherStyle:'High'
  });
  const[results,setResults]=useState(null);
  const[saveStatus,setSaveStatus]=useState('');
  const[errors,setErrors]=useState({});

  const gatherOptions={
    'American Pleat':[
      {label:'High (24")',value:'High',panelWidth:24},
      {label:'Medium (26")',value:'Medium',panelWidth:26},
      {label:'Low (28")',value:'Low',panelWidth:28}
    ],
    'Ripple':[{label:'High (22")',value:'High',panelWidth:22}],
    'Rod Pocket':[{label:'High (22")',value:'High',panelWidth:22}],
    'Plain Classic':[
      {label:'High (40")',value:'High',panelWidth:40},
      {label:'Medium (44")',value:'Medium',panelWidth:44},
      {label:'Low (48")',value:'Low',panelWidth:48}
    ]
  };

  const handleChange=(field,value)=>{
    setInputs(prev=>{
      const u={...prev,[field]:value};
      if(field==='stitchingStyle') u.gatherStyle=gatherOptions[value][0].value;
      return u;
    });
    setResults(null); setErrors({}); setSaveStatus('');
  };

  const validate=()=>{
    const e={};
    if(!inputs.customerName.trim()) e.customerName='Required';
    if(!inputs.width||parseFloat(inputs.width)<=0) e.width='Required and must be > 0';
    if(!inputs.height||parseFloat(inputs.height)<=0) e.height='Required and must be > 0';
    if(!inputs.installationDate) e.installationDate='Required';
    setErrors(e);
    return Object.keys(e).length===0;
  };

  const smartRound=v=>{const f=Math.floor(v);return parseFloat((v-f).toFixed(10))<=0.15?f:f+1;};

  const calculate=()=>{
    if(!validate()) return;
    const w=parseFloat(inputs.width);
    const h=parseFloat(inputs.height);
    const style=inputs.stitchingStyle;
    const gather=inputs.gatherStyle;
    const gOpts=gatherOptions[style];
    const gObj=gOpts.find(g=>g.value===gather)||gOpts[0];
    const pw=gObj.panelWidth;

    let numberOfPanels=0, clothWidthPerPanel=0;

    if(style==='American Pleat'&&(gather==='High'||gather==='Medium')){
      const x=gather==='High'?6:5.5;
      const yMax=gather==='High'?5.5:6.0;
      const fwp=Math.ceil(w*1.12/2);
      const target=fwp-6;
      const nMin=Math.max(2,Math.ceil(target/yMax+1));
      const n=nMin; const y=target/(n-1);
      clothWidthPerPanel=8.5+(n*x)+((n-1)*y);
      const ratio=clothWidthPerPanel/54;
      const rf=Math.floor(ratio);
      const rd=parseFloat((ratio-rf).toFixed(10));
      numberOfPanels=rd>0.5?(rf+1)*2:Math.ceil(ratio*2);
    } else {
      const adj=w*(1+6/50);
      clothWidthPerPanel=adj;
      numberOfPanels=smartRound(adj/pw);
    }

    const cutLength=parseFloat((h+9).toFixed(2));
    const fullPerSide=Math.floor(clothWidthPerPanel/54);
    const lastW=parseFloat((clothWidthPerPanel-(fullPerSide*54)).toFixed(2));
    const lastPanelDisplay=lastW<=0?'None':lastW+'"';
    const totalFull=fullPerSide*2;
    const totalLast=numberOfPanels-totalFull;
    const finalOutput=lastW<=0
      ?(numberOfPanels+' x 54" panels')
      :(totalFull+' x 54"  +  '+totalLast+' x '+lastW+'"');

    const res={
      numberOfPanels,cutLength,
      lastPanelWidth:lastPanelDisplay,
      finalOutput,
      gatherLabel:gObj.label
    };
    setResults(res);
    saveToSheet(res);
  };

  const saveToSheet=async(res)=>{
    try{
      setSaveStatus('saving');
      const payload={
        customerName:inputs.customerName,width:inputs.width,height:inputs.height,
        installationDate:inputs.installationDate,
        panelType:panelType+'" Panel',
        mainFabric:inputs.mainEnabled==='Yes'?inputs.mainFabric:'No',
        sheerFabric:inputs.sheerEnabled==='Yes'?inputs.sheerFabric:'No',
        liningFabric:inputs.liningEnabled==='Yes'?inputs.liningFabric:'No',
        stitchingStyle:inputs.stitchingStyle,gatherStyle:res.gatherLabel,
        numberOfPanels:res.numberOfPanels,cutLength:res.cutLength,
        lastPanelWidth:res.lastPanelWidth,finalOutput:res.finalOutput,
        timestamp:new Date().toISOString()
      };
      const r=await fetch('/api/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(r.ok){setSaveStatus('saved');setTimeout(()=>setSaveStatus(''),3000);}
      else{setSaveStatus('error');setTimeout(()=>setSaveStatus(''),3000);}
    }catch{setSaveStatus('error');setTimeout(()=>setSaveStatus(''),3000);}
  };

  /* ── PDF via new window (fixes blank PDF bug) ─────────────── */
  const handlePrint=()=>{
    if(!results) return;
    const instDate=inputs.installationDate?new Date(inputs.installationDate).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'}):'-';
    const genDate=new Date().toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
    const fabricRows=[
      inputs.mainEnabled==='Yes'?'<tr><td style="padding:8px 12px;font-weight:600;color:#555;font-size:12px;border-bottom:1px solid #eee">MAIN FABRIC</td><td style="padding:8px 12px;font-weight:700;color:#1A1A2E;font-size:13px;border-bottom:1px solid #eee">'+inputs.mainFabric+'</td></tr>':'',
      inputs.sheerEnabled==='Yes'?'<tr><td style="padding:8px 12px;font-weight:600;color:#555;font-size:12px;border-bottom:1px solid #eee">SHEER FABRIC</td><td style="padding:8px 12px;font-weight:700;color:#1A1A2E;font-size:13px;border-bottom:1px solid #eee">'+inputs.sheerFabric+'</td></tr>':'',
      inputs.liningEnabled==='Yes'?'<tr><td style="padding:8px 12px;font-weight:600;color:#555;font-size:12px">LINING FABRIC</td><td style="padding:8px 12px;font-weight:700;color:#1A1A2E;font-size:13px">'+inputs.liningFabric+'</td></tr>':''
    ].filter(Boolean).join('');

    const html=\`<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Cutting Sheet - \${inputs.customerName}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:Arial,sans-serif;background:#fff;color:#1A1A2E;}
  @media print{@page{margin:0;size:A4;} body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
</style></head><body>

<!-- HEADER -->
<div style="background:#1A1A2E;padding:22px 32px;display:flex;justify-content:space-between;align-items:center;">
  <div>
    <div style="color:#F0A500;font-size:22px;font-weight:900;letter-spacing:2px;">D'MOKSHA HOMES</div>
    <div style="color:#888;font-size:10px;margin-top:4px;letter-spacing:3px;">EXPRESS YOURSELF. CHOOSE GOODNESS.</div>
  </div>
  <div style="text-align:right;">
    <div style="color:#F0A500;font-size:13px;font-weight:700;letter-spacing:1px;">CUTTING INSTRUCTION SHEET</div>
    <div style="color:#888;font-size:10px;margin-top:4px;">Generated: \${genDate}</div>
  </div>
</div>

<!-- GOLD BAR -->
<div style="height:4px;background:linear-gradient(to right,#F0A500,#FFD700,#F0A500);"></div>

<!-- CUSTOMER BANNER -->
<div style="background:#F0A500;padding:16px 32px;">
  <div style="font-size:10px;color:#1A1A2E;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Customer</div>
  <div style="font-size:28px;font-weight:900;color:#1A1A2E;margin-top:3px;">\${inputs.customerName}</div>
</div>

<!-- DETAILS GRID -->
<div style="padding:24px 32px;">
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:22px;">
    \${[
      ['Width',inputs.width+'"'],
      ['Height',inputs.height+'"'],
      ['Installation Date',instDate],
      ['Panel Type',panelType+'" Panel'],
      ['Stitching Style',inputs.stitchingStyle],
      ['Gather Style',results.gatherLabel]
    ].map(([l,v])=>'<div style="background:#F8F9FA;border-radius:8px;padding:12px 14px;border-left:3px solid #F0A500;"><div style="font-size:9px;color:#888;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">'+l+'</div><div style="font-size:13px;font-weight:700;color:#1A1A2E;margin-top:4px;">'+v+'</div></div>').join('')}
  </div>

  \${fabricRows?'<div style="background:#EBF3FB;border-radius:8px;padding:0;margin-bottom:22px;border:1px solid #BDD7EE;overflow:hidden;"><div style="background:#2D4A6B;padding:10px 14px;"><span style="color:#fff;font-size:10px;font-weight:700;letter-spacing:2px;">FABRIC INFORMATION</span></div><table style="width:100%;border-collapse:collapse;">'+fabricRows+'</table></div>':''}

  <!-- CUTTING TABLE -->
  <div style="margin-bottom:24px;">
    <div style="background:#2D4A6B;padding:10px 14px;border-radius:8px 8px 0 0;">
      <span style="color:#fff;font-size:10px;font-weight:700;letter-spacing:2px;">CUTTING INSTRUCTIONS</span>
    </div>
    <table style="width:100%;border-collapse:collapse;border:1px solid #E0E0E0;border-top:none;">
      <thead>
        <tr style="background:#F0A500;">
          <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;color:#1A1A2E;letter-spacing:1px;">PANEL</th>
          <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;color:#1A1A2E;letter-spacing:1px;">NO. OF PANELS</th>
          <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;color:#1A1A2E;letter-spacing:1px;">CUT LENGTH / PANEL</th>
          <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;color:#1A1A2E;letter-spacing:1px;">LAST PANEL WIDTH</th>
          <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;color:#1A1A2E;letter-spacing:1px;">FINAL OUTPUT</th>
        </tr>
      </thead>
      <tbody>
        <tr style="background:#fff;">
          <td style="padding:16px 14px;font-weight:700;font-size:14px;color:#1A1A2E;border-bottom:2px solid #F0A500;">\${panelType}" Panel</td>
          <td style="padding:16px 14px;font-weight:900;font-size:24px;color:#2D4A6B;border-bottom:2px solid #F0A500;">\${results.numberOfPanels}</td>
          <td style="padding:16px 14px;font-weight:700;font-size:14px;color:#1A1A2E;border-bottom:2px solid #F0A500;">\${results.cutLength}"</td>
          <td style="padding:16px 14px;font-weight:700;font-size:14px;color:\${results.lastPanelWidth==='None'?'#999':'#1A1A2E'};border-bottom:2px solid #F0A500;">\${results.lastPanelWidth}</td>
          <td style="padding:16px 14px;font-weight:700;font-size:14px;color:#2D4A6B;border-bottom:2px solid #F0A500;">\${results.finalOutput}</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

<!-- FOOTER -->
<div style="background:#1A1A2E;padding:14px 32px;display:flex;justify-content:space-between;align-items:center;position:fixed;bottom:0;width:100%;">
  <div style="color:#F0A500;font-size:11px;font-weight:700;">D'Moksha Homes — Operations Division</div>
  <div style="color:#555;font-size:10px;">Confidential — Internal Use Only</div>
</div>

<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};<\/script>
</body></html>\`;

    const win=window.open('','_blank','width=900,height=700');
    win.document.write(html);
    win.document.close();
  };

  const reset=()=>{
    setPanelType('54');
    setInputs({customerName:'',width:'',height:'',installationDate:'',
      mainEnabled:'No',mainFabric:'',sheerEnabled:'No',sheerFabric:'',
      liningEnabled:'No',liningFabric:'',stitchingStyle:'American Pleat',gatherStyle:'High'});
    setResults(null); setSaveStatus(''); setErrors({});
  };

  const currentGatherOpts=gatherOptions[inputs.stitchingStyle]||[];
  const canCalc=inputs.customerName&&inputs.width&&inputs.height&&inputs.installationDate;

  return(
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black px-4 py-6">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <img src="/images/logo.png" alt="D'Moksha" className="h-20 mx-auto mb-4"
            onError={e=>{e.target.style.display='none';document.getElementById('fb').style.display='block';}}/>
          <h1 id="fb" className="text-3xl font-bold text-white mb-2" style={{display:'none'}}>D'Moksha</h1>
          <p className="text-amber-400 text-sm font-medium tracking-wide">Express yourself. Choose goodness</p>
          <p className="text-gray-400 text-xs mt-1">Operations Calculator — Cutter Output</p>
          <div className="w-20 h-0.5 bg-gradient-to-r from-amber-400 to-yellow-500 mx-auto mt-2"></div>
        </div>

        <div className="bg-gray-800 bg-opacity-50 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-gray-700">

          {/* Section 1 */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 flex items-center justify-center text-black text-xs font-bold">1</div>
            <span className="text-amber-400 text-sm font-semibold tracking-wide uppercase">Customer & Window Details</span>
          </div>

          <div className="space-y-4 mb-2">
            {/* Customer Name */}
            <div>
              <label className="block text-amber-400 text-sm font-medium mb-2">Customer Name *</label>
              <input type="text" value={inputs.customerName}
                onChange={e=>handleChange('customerName',e.target.value)}
                className={\`w-full bg-gray-700 border rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 \${errors.customerName?'border-red-500':'border-gray-600'}\`}
                placeholder="Enter customer name"/>
              {errors.customerName&&<p className="mt-1 text-red-400 text-xs">{errors.customerName}</p>}
            </div>

            {/* Width & Height */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-amber-400 text-sm font-medium mb-2">Width (inches) *</label>
                <input type="number" value={inputs.width}
                  onChange={e=>handleChange('width',e.target.value)}
                  className={\`w-full bg-gray-700 border rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 \${errors.width?'border-red-500':'border-gray-600'}\`}
                  placeholder="Width"/>
                {errors.width&&<p className="mt-1 text-red-400 text-xs">{errors.width}</p>}
              </div>
              <div>
                <label className="block text-amber-400 text-sm font-medium mb-2">Height (inches) *</label>
                <input type="number" value={inputs.height}
                  onChange={e=>handleChange('height',e.target.value)}
                  className={\`w-full bg-gray-700 border rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 \${errors.height?'border-red-500':'border-gray-600'}\`}
                  placeholder="Height"/>
                {errors.height&&<p className="mt-1 text-red-400 text-xs">{errors.height}</p>}
              </div>
            </div>

            {/* Installation Date */}
            <div>
              <label className="block text-amber-400 text-sm font-medium mb-2">Installation Date *</label>
              <input type="date" value={inputs.installationDate}
                onChange={e=>handleChange('installationDate',e.target.value)}
                className={\`w-full bg-gray-700 border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-400 \${errors.installationDate?'border-red-500':'border-gray-600'}\`}/>
              {errors.installationDate&&<p className="mt-1 text-red-400 text-xs">{errors.installationDate}</p>}
            </div>

            {/* Panel Type — 54" / 48" */}
            <div>
              <label className="block text-amber-400 text-sm font-medium mb-2">Panel Type</label>
              <div className="flex bg-gray-700 rounded-xl p-1">
                {['54','48'].map(pt=>(
                  <button key={pt} onClick={()=>{setPanelType(pt);setResults(null);}}
                    className={\`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-300 \${panelType===pt?'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-lg':'text-gray-300 hover:text-white'}\`}>
                    {pt}" Panel
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-600 my-5"></div>

          {/* Section 2 */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 flex items-center justify-center text-black text-xs font-bold">2</div>
            <span className="text-amber-400 text-sm font-semibold tracking-wide uppercase">Fabric Information</span>
          </div>

          <div className="space-y-4">
            {/* Main / Sheer / Lining */}
            {[['mainEnabled','mainFabric','Main Fabric'],['sheerEnabled','sheerFabric','Sheer Fabric'],['liningEnabled','liningFabric','Lining Fabric']].map(([enabledKey,nameKey,label])=>(
              <div key={label}>
                <label className="block text-amber-400 text-sm font-medium mb-2">{label}</label>
                <div className="flex gap-2 mb-2">
                  {['Yes','No'].map(opt=>(
                    <button key={opt} onClick={()=>handleChange(enabledKey,opt)}
                      className={\`flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-200 \${inputs[enabledKey]===opt?'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-lg':'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'}\`}>
                      {opt}
                    </button>
                  ))}
                </div>
                {inputs[enabledKey]==='Yes'&&(
                  <input type="text" value={inputs[nameKey]}
                    onChange={e=>handleChange(nameKey,e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder={\`Enter \${label.toLowerCase()} name\`}/>
                )}
              </div>
            ))}

            {/* Stitching Style */}
            <div>
              <label className="block text-amber-400 text-sm font-medium mb-3">Stitching Style</label>
              <div className="grid grid-cols-2 gap-2">
                {['American Pleat','Ripple','Rod Pocket','Plain Classic'].map(s=>(
                  <button key={s} onClick={()=>handleChange('stitchingStyle',s)}
                    className={\`py-3 px-3 rounded-xl font-medium transition-all duration-200 text-sm \${inputs.stitchingStyle===s?'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-lg':'bg-gray-700 text-white border border-gray-600 hover:bg-gray-600'}\`}>
                    {s}
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

          {/* Buttons */}
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

          {/* Results */}
          {results&&(
            <div className="mt-6 p-5 bg-gray-700 bg-opacity-50 rounded-xl border border-amber-400 border-opacity-30">
              <h3 className="text-amber-400 font-bold mb-4 text-center text-lg tracking-wide uppercase">Cutter Output</h3>

              {/* Customer highlight */}
              <div className="mb-4 p-3 bg-amber-400 bg-opacity-10 rounded-xl border border-amber-400 border-opacity-40 text-center">
                <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-1">Customer</p>
                <p className="text-white text-xl font-bold">{inputs.customerName}</p>
              </div>

              <div className="space-y-0">
                {[
                  ['Panel',panelType+'" Panel',false],
                  ['Number of Panels',results.numberOfPanels,true],
                  ['Cut Length per Panel',results.cutLength+'"',false],
                  ['Last Panel Width',results.lastPanelWidth,false],
                  ['Final Output',results.finalOutput,false,'amber'],
                ].map(([lbl,val,big,color])=>(
                  <div key={lbl} className="flex justify-between items-center py-3 border-b border-gray-600">
                    <span className="text-gray-300 text-sm">{lbl}</span>
                    <span className={\`font-bold \${big?'text-2xl text-white':color==='amber'?'text-amber-400':'text-white'} \${val==='None'?'text-gray-500':''}\`}>{val}</span>
                  </div>
                ))}
              </div>

              {saveStatus==='saving'&&<div className="mt-3 p-2 bg-blue-600 bg-opacity-20 border border-blue-500 rounded-lg text-blue-400 text-sm text-center">💾 Saving...</div>}
              {saveStatus==='saved'&&<div className="mt-3 p-2 bg-green-600 bg-opacity-20 border border-green-500 rounded-lg text-green-400 text-sm text-center">✅ Saved to sheet!</div>}
              {saveStatus==='error'&&<div className="mt-3 p-2 bg-red-600 bg-opacity-20 border border-red-500 rounded-lg text-red-400 text-sm text-center">❌ Failed to save</div>}

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
ReactDOM.render(React.createElement(OperationsCalc),document.getElementById('root'));
</script></body></html>`);});

async function startServer() {
  console.log("🔄 Starting D'Moksha Operations Server...");
  const ok = await initializeGoogleSheets();
  if (!ok) console.log('⚠️  Google Sheets init failed — server will continue');
  app.listen(PORT, () => {
    console.log(`🚀 Operations server on port ${PORT}`);
    console.log(`🌐 http://localhost:${PORT}`);
  });
}
startServer();
module.exports = app;
