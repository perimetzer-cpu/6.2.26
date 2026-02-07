// ============================================
// SignSmart - Google Apps Script Backend
// ============================================

const ADMIN_EMAIL = 'peri@bettylaw.co.il';
const FOLDER_NAME = 'SignSmart_Documents';

// --- Web App Entry Point ---
function doGet(e) {
  var template = HtmlService.createTemplateFromFile('index');
  template.scriptUrl = ScriptApp.getService().getUrl();
  template.signId = (e && e.parameter && e.parameter.sign) ? e.parameter.sign : '';
  template.signerId = (e && e.parameter && e.parameter.signer) ? e.parameter.signer : '';

  return template.evaluate()
    .setTitle('SignSmart - מערכת חתימה דיגיטלית')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// --- Drive Folder ---
function getOrCreateFolder_() {
  var folders = DriveApp.getFoldersByName(FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(FOLDER_NAME);
}

// --- Document Storage (ScriptProperties) ---
function getAllDocuments() {
  var props = PropertiesService.getScriptProperties();
  try {
    var data = props.getProperty('ss_documents');
    return data ? JSON.parse(data) : [];
  } catch (e) {
    Logger.log('Error loading documents: ' + e);
    return [];
  }
}

function saveAllDocuments_(docs) {
  var lock = LockService.getScriptLock();
  try {
    lock.tryLock(10000);
    var props = PropertiesService.getScriptProperties();
    props.setProperty('ss_documents', JSON.stringify(docs));
  } catch (e) {
    Logger.log('Error saving documents: ' + e);
  } finally {
    lock.releaseLock();
  }
}

function saveDocument(docData) {
  var docs = getAllDocuments();
  var idx = -1;
  for (var i = 0; i < docs.length; i++) {
    if (docs[i].id === docData.id) { idx = i; break; }
  }
  if (idx >= 0) {
    docs[idx] = docData;
  } else {
    docs.push(docData);
  }
  saveAllDocuments_(docs);
  return { success: true };
}

function getDocument(docId) {
  var docs = getAllDocuments();
  for (var i = 0; i < docs.length; i++) {
    if (docs[i].id === docId) return docs[i];
  }
  return null;
}

function deleteDocument(docId) {
  var docs = getAllDocuments();
  var filtered = [];
  for (var i = 0; i < docs.length; i++) {
    if (docs[i].id !== docId) filtered.push(docs[i]);
  }
  saveAllDocuments_(filtered);
  return { success: true };
}

// --- Contacts Storage ---
function getAllContacts() {
  var props = PropertiesService.getScriptProperties();
  try {
    var data = props.getProperty('ss_contacts');
    return data ? JSON.parse(data) : [];
  } catch (e) { return []; }
}

function saveAllContacts(contacts) {
  var lock = LockService.getScriptLock();
  try {
    lock.tryLock(5000);
    var props = PropertiesService.getScriptProperties();
    props.setProperty('ss_contacts', JSON.stringify(contacts));
  } catch (e) {
    Logger.log('Error saving contacts: ' + e);
  } finally {
    lock.releaseLock();
  }
  return { success: true };
}

// --- File Operations ---
function uploadFile(base64Data, fileName) {
  var folder = getOrCreateFolder_();
  var decoded = Utilities.base64Decode(base64Data);
  var blob = Utilities.newBlob(decoded, 'application/pdf', fileName);
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return {
    fileId: file.getId(),
    fileName: file.getName()
  };
}

function getFileBase64(fileId) {
  try {
    var file = DriveApp.getFileById(fileId);
    var bytes = file.getBlob().getBytes();
    return Utilities.base64Encode(bytes);
  } catch (e) {
    Logger.log('Error reading file: ' + e);
    return null;
  }
}

// --- Sign Document & Email to Admin ---
function saveSignedDocument(signedBase64, docId, signerName) {
  var folder = getOrCreateFolder_();
  var docs = getAllDocuments();
  var doc = null;
  var docIdx = -1;

  for (var i = 0; i < docs.length; i++) {
    if (docs[i].id === docId) {
      doc = docs[i];
      docIdx = i;
      break;
    }
  }

  if (!doc) return { success: false, error: 'Document not found' };

  // Save signed PDF
  var decoded = Utilities.base64Decode(signedBase64);
  var blob = Utilities.newBlob(decoded, 'application/pdf', doc.title + '_signed.pdf');
  var signedFile = folder.createFile(blob);

  // Update document status
  doc.status = 'COMPLETED';
  doc.signedFileId = signedFile.getId();
  doc.updatedAt = new Date().toISOString();
  var signers = doc.signers || [];
  for (var j = 0; j < signers.length; j++) {
    signers[j].hasSigned = true;
    signers[j].signedAt = new Date().toISOString();
  }
  doc.signers = signers;
  docs[docIdx] = doc;
  saveAllDocuments_(docs);

  // Send signed document to admin via email
  try {
    var dateStr = Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'dd/MM/yyyy HH:mm');

    GmailApp.sendEmail(ADMIN_EMAIL,
      'מסמך נחתם בהצלחה: ' + doc.title,
      'המסמך "' + doc.title + '" נחתם על ידי ' + signerName + ' בתאריך ' + dateStr + '.\nהמסמך מצורף.',
      {
        htmlBody:
          '<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">' +
            '<div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:30px;border-radius:20px;color:white;text-align:center;margin-bottom:20px">' +
              '<h1 style="margin:0;font-size:24px">SignSmart</h1>' +
              '<p style="margin:5px 0 0;opacity:0.9;font-size:14px">מערכת חתימה דיגיטלית</p>' +
            '</div>' +
            '<div style="background:#f8fafc;padding:30px;border-radius:20px;border:1px solid #e2e8f0">' +
              '<h2 style="color:#1e293b;margin-top:0">מסמך נחתם בהצלחה!</h2>' +
              '<table style="width:100%;border-collapse:collapse;margin:20px 0">' +
                '<tr><td style="padding:10px 0;color:#64748b;font-weight:bold">שם המסמך:</td><td style="padding:10px 0;color:#1e293b">' + doc.title + '</td></tr>' +
                '<tr><td style="padding:10px 0;color:#64748b;font-weight:bold">נחתם על ידי:</td><td style="padding:10px 0;color:#1e293b">' + signerName + '</td></tr>' +
                '<tr><td style="padding:10px 0;color:#64748b;font-weight:bold">תאריך:</td><td style="padding:10px 0;color:#1e293b">' + dateStr + '</td></tr>' +
              '</table>' +
              '<p style="color:#64748b;font-size:14px">המסמך החתום מצורף להודעה זו.</p>' +
            '</div>' +
            '<p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:20px">נשלח אוטומטית ממערכת SignSmart</p>' +
          '</div>',
        attachments: [blob],
        name: 'SignSmart - מערכת חתימה דיגיטלית'
      }
    );
    Logger.log('Signed document email sent to ' + ADMIN_EMAIL);
  } catch (e) {
    Logger.log('Email error: ' + e);
  }

  return { success: true, signedFileId: signedFile.getId() };
}

// --- Send Signing Link via Email ---
function sendSigningEmail(to, signerName, docTitle, signingLink) {
  try {
    GmailApp.sendEmail(to,
      'בקשה לחתימה על מסמך: ' + docTitle,
      'שלום ' + signerName + ',\n\nנא לחתום על המסמך "' + docTitle + '".\nהחתימה לוקחת פחות מדקה.\n\nקישור לחתימה:\n' + signingLink,
      {
        htmlBody:
          '<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">' +
            '<div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:30px;border-radius:20px;color:white;text-align:center;margin-bottom:20px">' +
              '<h1 style="margin:0;font-size:24px">SignSmart</h1>' +
              '<p style="margin:5px 0 0;opacity:0.9;font-size:14px">מערכת חתימה דיגיטלית</p>' +
            '</div>' +
            '<div style="background:#f8fafc;padding:30px;border-radius:20px;border:1px solid #e2e8f0">' +
              '<h2 style="color:#1e293b;margin-top:0">שלום ' + (signerName || '') + ',</h2>' +
              '<p style="color:#475569;line-height:1.8;font-size:16px">' +
                'קיבלת בקשה לחתום על המסמך <strong>"' + docTitle + '"</strong>.' +
              '</p>' +
              '<p style="color:#475569;line-height:1.8;font-size:16px">החתימה מתבצעת באופן מקוון ולוקחת פחות מדקה.</p>' +
              '<div style="text-align:center;margin:30px 0">' +
                '<a href="' + signingLink + '" style="display:inline-block;background:#2563eb;color:white;padding:16px 40px;border-radius:16px;text-decoration:none;font-weight:bold;font-size:18px;box-shadow:0 4px 15px rgba(37,99,235,0.3)">' +
                  'חתום על המסמך' +
                '</a>' +
              '</div>' +
              '<p style="color:#94a3b8;font-size:12px;text-align:center">' +
                'או העתק את הקישור:<br/>' +
                '<a href="' + signingLink + '" style="color:#2563eb;word-break:break-all">' + signingLink + '</a>' +
              '</p>' +
            '</div>' +
            '<p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:20px">נשלח ממערכת SignSmart</p>' +
          '</div>',
        name: 'SignSmart - מערכת חתימה דיגיטלית'
      }
    );
    return { success: true };
  } catch (e) {
    Logger.log('Send signing email error: ' + e);
    return { success: false, error: e.toString() };
  }
}
