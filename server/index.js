import express from 'express';
import multer from 'multer';
import cors from 'cors';
import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import { PDFDocument } from 'pdf-lib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- File Storage ---
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const SIGNED_DIR = path.join(__dirname, 'signed');
const DB_PATH = path.join(__dirname, 'data', 'documents.json');

[UPLOADS_DIR, SIGNED_DIR, path.join(__dirname, 'data')].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9\u0590-\u05FF._-]/g, '_');
    const uniqueName = Date.now() + '-' + safeName;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// --- Simple JSON Database ---
function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    }
  } catch (e) { console.error('DB load error:', e); }
  return { documents: [], contacts: [] };
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// --- Email Transporter ---
let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass) {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: smtpUser, pass: smtpPass }
    });
    console.log(`Email configured with SMTP: ${smtpHost}`);
  } else {
    // Try Ethereal test account, fall back to JSON transport (logs only)
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass }
      });
      console.log('Email configured with Ethereal test account');
      console.log(`Test email inbox: https://ethereal.email/login`);
      console.log(`  User: ${testAccount.user}`);
      console.log(`  Pass: ${testAccount.pass}`);
    } catch (etherealErr) {
      // Fallback: use jsonTransport for logging
      transporter = nodemailer.createTransport({ jsonTransport: true });
      console.log('Email configured in LOG-ONLY mode (no SMTP configured)');
      console.log('Emails will be logged to console. Configure SMTP_HOST/SMTP_USER/SMTP_PASS for real delivery.');
    }
  }
  return transporter;
}

// --- Serve uploaded files ---
app.use('/api/files', express.static(UPLOADS_DIR));
app.use('/api/signed', express.static(SIGNED_DIR));

// --- Upload PDF ---
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const fileUrl = `/api/files/${req.file.filename}`;
  res.json({
    success: true,
    filename: req.file.filename,
    originalName: req.file.originalname,
    fileUrl,
    size: req.file.size
  });
});

// --- Document CRUD ---
app.get('/api/documents', (req, res) => {
  const db = loadDB();
  res.json(db.documents);
});

app.get('/api/documents/:id', (req, res) => {
  const db = loadDB();
  const doc = db.documents.find(d => d.id === req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  res.json(doc);
});

app.post('/api/documents', (req, res) => {
  const db = loadDB();
  const doc = req.body;
  const existing = db.documents.findIndex(d => d.id === doc.id);
  if (existing >= 0) {
    db.documents[existing] = doc;
  } else {
    db.documents.push(doc);
  }
  saveDB(db);
  res.json({ success: true, document: doc });
});

app.put('/api/documents/:id', (req, res) => {
  const db = loadDB();
  const idx = db.documents.findIndex(d => d.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Document not found' });
  db.documents[idx] = { ...db.documents[idx], ...req.body };
  saveDB(db);
  res.json({ success: true, document: db.documents[idx] });
});

app.delete('/api/documents/:id', (req, res) => {
  const db = loadDB();
  db.documents = db.documents.filter(d => d.id !== req.params.id);
  saveDB(db);
  res.json({ success: true });
});

// --- Contacts ---
app.get('/api/contacts', (req, res) => {
  const db = loadDB();
  res.json(db.contacts || []);
});

app.post('/api/contacts', (req, res) => {
  const db = loadDB();
  if (!db.contacts) db.contacts = [];
  const contact = req.body;
  const existing = db.contacts.findIndex(c => c.id === contact.id);
  if (existing >= 0) {
    db.contacts[existing] = contact;
  } else {
    db.contacts.push(contact);
  }
  saveDB(db);
  res.json({ success: true });
});

// --- Sign Document ---
app.post('/api/sign/:docId', async (req, res) => {
  try {
    const db = loadDB();
    const doc = db.documents.find(d => d.id === req.params.docId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const { signatures, signerName, signerEmail } = req.body;

    // Load the original PDF
    const filename = doc.fileUrl.replace('/api/files/', '');
    const pdfPath = path.join(UPLOADS_DIR, filename);

    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ error: 'PDF file not found' });
    }

    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Embed each signature
    if (signatures && signatures.length > 0) {
      for (const sig of signatures) {
        if (!sig.dataUrl) continue;

        try {
          const base64Data = sig.dataUrl.replace(/^data:image\/png;base64,/, '');
          const sigImageBytes = Buffer.from(base64Data, 'base64');
          const sigImage = await pdfDoc.embedPng(sigImageBytes);

          const pageIndex = (sig.page || 1) - 1;
          if (pageIndex >= 0 && pageIndex < pdfDoc.getPageCount()) {
            const page = pdfDoc.getPage(pageIndex);
            const { width, height } = page.getSize();

            const sigWidth = 150;
            const sigHeight = 60;
            const xPos = (sig.x / 100) * width - sigWidth / 2;
            const yPos = height - (sig.y / 100) * height - sigHeight / 2;

            page.drawImage(sigImage, {
              x: Math.max(0, xPos),
              y: Math.max(0, yPos),
              width: sigWidth,
              height: sigHeight,
            });
          }
        } catch (embedErr) {
          console.error('Error embedding signature:', embedErr);
        }
      }
    }

    // Save signed PDF
    const signedPdfBytes = await pdfDoc.save();
    const signedFilename = `signed_${Date.now()}_${filename}`;
    const signedPath = path.join(SIGNED_DIR, signedFilename);
    fs.writeFileSync(signedPath, Buffer.from(signedPdfBytes));

    // Update document status
    const docIdx = db.documents.findIndex(d => d.id === req.params.docId);
    if (docIdx >= 0) {
      db.documents[docIdx].status = 'COMPLETED';
      db.documents[docIdx].updatedAt = new Date().toISOString();
      db.documents[docIdx].signedFileUrl = `/api/signed/${signedFilename}`;
      db.documents[docIdx].signers = db.documents[docIdx].signers.map(s => ({
        ...s,
        hasSigned: true,
        signedAt: new Date().toISOString()
      }));
    }
    saveDB(db);

    // Send signed document to admin via email
    try {
      const transport = await getTransporter();
      const info = await transport.sendMail({
        from: `"SignSmart" <${process.env.SMTP_USER || 'signsmart@example.com'}>`,
        to: 'peri@bettylaw.co.il',
        subject: `מסמך נחתם בהצלחה: ${doc.title}`,
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 30px; border-radius: 20px; color: white; text-align: center; margin-bottom: 20px;">
              <h1 style="margin: 0; font-size: 24px;">SignSmart</h1>
              <p style="margin: 5px 0 0; opacity: 0.9; font-size: 14px;">מערכת חתימה חכמה</p>
            </div>
            <div style="background: #f8fafc; padding: 30px; border-radius: 20px; border: 1px solid #e2e8f0;">
              <h2 style="color: #1e293b; margin-top: 0;">מסמך נחתם בהצלחה!</h2>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-weight: bold;">שם המסמך:</td>
                  <td style="padding: 10px 0; color: #1e293b;">${doc.title}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-weight: bold;">נחתם על ידי:</td>
                  <td style="padding: 10px 0; color: #1e293b;">${signerName || 'לא צוין'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-weight: bold;">תאריך חתימה:</td>
                  <td style="padding: 10px 0; color: #1e293b;">${new Intl.DateTimeFormat('he-IL', { dateStyle: 'full', timeStyle: 'short' }).format(new Date())}</td>
                </tr>
              </table>
              <p style="color: #64748b; font-size: 14px;">המסמך החתום מצורף להודעה זו.</p>
            </div>
            <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">נשלח אוטומטית ממערכת SignSmart</p>
          </div>
        `,
        attachments: [{
          filename: `${doc.title}_signed.pdf`,
          content: Buffer.from(signedPdfBytes)
        }]
      });

      console.log('Signed document email sent:', info.messageId);
      if (transporter && transporter.options?.host === 'smtp.ethereal.email') {
        console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
      }
    } catch (emailErr) {
      console.error('Error sending email notification:', emailErr);
    }

    res.json({
      success: true,
      signedFileUrl: `/api/signed/${signedFilename}`,
      message: 'Document signed successfully'
    });

  } catch (err) {
    console.error('Signing error:', err);
    res.status(500).json({ error: 'Failed to process signature', details: err.message });
  }
});

// --- Send Signing Link via Email ---
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, signerName, docTitle, signingLink } = req.body;

    if (!to || !signingLink) {
      return res.status(400).json({ error: 'Missing required fields: to, signingLink' });
    }

    const transport = await getTransporter();
    const info = await transport.sendMail({
      from: `"SignSmart - משרד עו״ד" <${process.env.SMTP_USER || 'signsmart@example.com'}>`,
      to,
      subject: `בקשה לחתימה על מסמך: ${docTitle || 'מסמך לחתימה'}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 30px; border-radius: 20px; color: white; text-align: center; margin-bottom: 20px;">
            <h1 style="margin: 0; font-size: 24px;">SignSmart</h1>
            <p style="margin: 5px 0 0; opacity: 0.9; font-size: 14px;">מערכת חתימה חכמה</p>
          </div>
          <div style="background: #f8fafc; padding: 30px; border-radius: 20px; border: 1px solid #e2e8f0;">
            <h2 style="color: #1e293b; margin-top: 0;">שלום ${signerName || ''},</h2>
            <p style="color: #475569; line-height: 1.8; font-size: 16px;">
              קיבלת בקשה לחתום על המסמך <strong>"${docTitle}"</strong>.
            </p>
            <p style="color: #475569; line-height: 1.8; font-size: 16px;">
              החתימה מתבצעת באופן מקוון ולוקחת פחות מדקה.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${signingLink}" style="display: inline-block; background: #2563eb; color: white; padding: 16px 40px; border-radius: 16px; text-decoration: none; font-weight: bold; font-size: 18px; box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);">
                חתום על המסמך
              </a>
            </div>
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">
              או העתק את הקישור הבא:<br/>
              <a href="${signingLink}" style="color: #2563eb; word-break: break-all;">${signingLink}</a>
            </p>
          </div>
          <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
            נשלח ממערכת SignSmart | מערכת חתימה חכמה
          </p>
        </div>
      `
    });

    console.log('Signing link email sent:', info.messageId);
    let previewUrl = null;
    if (transporter && transporter.options?.host === 'smtp.ethereal.email') {
      previewUrl = nodemailer.getTestMessageUrl(info);
      console.log('Preview URL:', previewUrl);
    }

    res.json({ success: true, messageId: info.messageId, previewUrl });

  } catch (err) {
    console.error('Email sending error:', err);
    res.status(500).json({ error: 'Failed to send email', details: err.message });
  }
});

// --- Serve frontend in production ---
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  SignSmart Backend Server`);
  console.log(`  Running on http://localhost:${PORT}`);
  console.log(`========================================\n`);

  getTransporter().catch(err => console.error('Email init error:', err));
});
