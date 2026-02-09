// ============================================
// מערכת ניהול לקוחות - עורך דין תעבורה
// Google Apps Script
// ============================================

// === הגדרות גלובליות ===
const SPREADSHEET_NAME = 'מערכת ניהול לקוחות - תעבורה';
const SHEET_CLIENTS = 'לקוחות';
const SHEET_CASES = 'תיקים';
const SHEET_HEARINGS = 'דיונים';
const SHEET_TASKS = 'משימות';

// === אתחול המערכת ===

/**
 * יצירת תפריט מותאם בגיליון
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('מערכת ניהול')
    .addItem('פתח מערכת ניהול', 'openSidebar')
    .addItem('פתח דשבורד מלא', 'openDashboard')
    .addSeparator()
    .addItem('הגדר התראות אוטומטיות', 'setupTriggers')
    .addItem('שלח התראות עכשיו', 'sendDailyAlerts')
    .addSeparator()
    .addItem('אתחול ראשוני של המערכת', 'initializeSystem')
    .addToUi();
}

/**
 * פתיחת סרגל צד
 */
function openSidebar() {
  const html = HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('מערכת ניהול לקוחות')
    .setWidth(450);
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * פתיחת דשבורד כחלון מלא
 */
function openDashboard() {
  const html = HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('מערכת ניהול לקוחות - דשבורד')
    .setWidth(1200)
    .setHeight(800);
  SpreadsheetApp.getUi().showModalDialog(html, 'מערכת ניהול לקוחות');
}

/**
 * פריסה כאפליקציית ווב
 */
function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('מערכת ניהול לקוחות - תעבורה')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * כלול קבצי HTML
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * אתחול המערכת - יצירת גיליונות
 */
function initializeSystem() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // יצירת גיליון לקוחות
  let clientsSheet = ss.getSheetByName(SHEET_CLIENTS);
  if (!clientsSheet) {
    clientsSheet = ss.insertSheet(SHEET_CLIENTS);
    clientsSheet.getRange(1, 1, 1, 8).setValues([[
      'מזהה', 'שם מלא', 'תעודת זהות', 'טלפון', 'אימייל', 'כתובת', 'הערות', 'תאריך הוספה'
    ]]);
    formatHeaderRow(clientsSheet, 8);
  }

  // יצירת גיליון תיקים
  let casesSheet = ss.getSheetByName(SHEET_CASES);
  if (!casesSheet) {
    casesSheet = ss.insertSheet(SHEET_CASES);
    casesSheet.getRange(1, 1, 1, 11).setValues([[
      'מזהה תיק', 'מזהה לקוח', 'שם לקוח', 'מספר תיק בית משפט', 'סוג עבירה',
      'בית משפט', 'סטטוס', 'תאריך פתיחה', 'תאריך עדכון', 'שכר טרחה', 'הערות'
    ]]);
    formatHeaderRow(casesSheet, 11);
  }

  // יצירת גיליון דיונים
  let hearingsSheet = ss.getSheetByName(SHEET_HEARINGS);
  if (!hearingsSheet) {
    hearingsSheet = ss.insertSheet(SHEET_HEARINGS);
    hearingsSheet.getRange(1, 1, 1, 10).setValues([[
      'מזהה דיון', 'מזהה תיק', 'שם לקוח', 'מספר תיק', 'בית משפט',
      'תאריך דיון', 'שעת דיון', 'אולם', 'סוג דיון', 'הערות'
    ]]);
    formatHeaderRow(hearingsSheet, 10);
  }

  // יצירת גיליון משימות
  let tasksSheet = ss.getSheetByName(SHEET_TASKS);
  if (!tasksSheet) {
    tasksSheet = ss.insertSheet(SHEET_TASKS);
    tasksSheet.getRange(1, 1, 1, 9).setValues([[
      'מזהה משימה', 'מזהה תיק', 'שם לקוח', 'תיאור משימה', 'תאריך יעד',
      'עדיפות', 'סטטוס', 'תאריך יצירה', 'הערות'
    ]]);
    formatHeaderRow(tasksSheet, 9);
  }

  SpreadsheetApp.getUi().alert('המערכת אותחלה בהצלחה!');
}

/**
 * עיצוב שורת כותרת
 */
function formatHeaderRow(sheet, numCols) {
  const headerRange = sheet.getRange(1, 1, 1, numCols);
  headerRange.setBackground('#1a73e8')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontSize(11)
    .setHorizontalAlignment('center')
    .setBorder(true, true, true, true, true, true);
  sheet.setFrozenRows(1);
  sheet.setRightToLeft(true);
}

// ============================================
// === פעולות CRUD - לקוחות ===
// ============================================

/**
 * קבלת כל הלקוחות
 */
function getClients() {
  const sheet = getOrCreateSheet(SHEET_CLIENTS);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  return data.slice(1).map(row => ({
    id: row[0],
    name: row[1],
    idNumber: row[2],
    phone: row[3],
    email: row[4],
    address: row[5],
    notes: row[6],
    dateAdded: row[7]
  }));
}

/**
 * הוספת לקוח חדש
 */
function addClient(clientData) {
  const sheet = getOrCreateSheet(SHEET_CLIENTS);
  const id = generateId('CLT');
  const now = new Date();

  sheet.appendRow([
    id,
    clientData.name,
    clientData.idNumber,
    clientData.phone,
    clientData.email,
    clientData.address,
    clientData.notes,
    now
  ]);

  return { success: true, id: id, message: 'לקוח נוסף בהצלחה' };
}

/**
 * עדכון לקוח
 */
function updateClient(clientData) {
  const sheet = getOrCreateSheet(SHEET_CLIENTS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === clientData.id) {
      sheet.getRange(i + 1, 2, 1, 6).setValues([[
        clientData.name,
        clientData.idNumber,
        clientData.phone,
        clientData.email,
        clientData.address,
        clientData.notes
      ]]);
      return { success: true, message: 'לקוח עודכן בהצלחה' };
    }
  }
  return { success: false, message: 'לקוח לא נמצא' };
}

/**
 * מחיקת לקוח
 */
function deleteClient(clientId) {
  const sheet = getOrCreateSheet(SHEET_CLIENTS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === clientId) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'לקוח נמחק בהצלחה' };
    }
  }
  return { success: false, message: 'לקוח לא נמצא' };
}

// ============================================
// === פעולות CRUD - תיקים ===
// ============================================

/**
 * קבלת כל התיקים
 */
function getCases() {
  const sheet = getOrCreateSheet(SHEET_CASES);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  return data.slice(1).map(row => ({
    id: row[0],
    clientId: row[1],
    clientName: row[2],
    caseNumber: row[3],
    offenseType: row[4],
    court: row[5],
    status: row[6],
    openDate: row[7],
    updateDate: row[8],
    fee: row[9],
    notes: row[10]
  }));
}

/**
 * קבלת תיקים לפי לקוח
 */
function getCasesByClient(clientId) {
  const cases = getCases();
  return cases.filter(c => c.clientId === clientId);
}

/**
 * הוספת תיק חדש
 */
function addCase(caseData) {
  const sheet = getOrCreateSheet(SHEET_CASES);
  const id = generateId('CASE');
  const now = new Date();

  // קבלת שם הלקוח
  const clientName = getClientName(caseData.clientId);

  sheet.appendRow([
    id,
    caseData.clientId,
    clientName,
    caseData.caseNumber,
    caseData.offenseType,
    caseData.court,
    caseData.status || 'פתוח',
    now,
    now,
    caseData.fee || '',
    caseData.notes || ''
  ]);

  return { success: true, id: id, message: 'תיק נוסף בהצלחה' };
}

/**
 * עדכון תיק
 */
function updateCase(caseData) {
  const sheet = getOrCreateSheet(SHEET_CASES);
  const data = sheet.getDataRange().getValues();
  const now = new Date();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === caseData.id) {
      sheet.getRange(i + 1, 4, 1, 8).setValues([[
        caseData.caseNumber,
        caseData.offenseType,
        caseData.court,
        caseData.status,
        data[i][7], // תאריך פתיחה נשאר
        now,
        caseData.fee,
        caseData.notes
      ]]);
      return { success: true, message: 'תיק עודכן בהצלחה' };
    }
  }
  return { success: false, message: 'תיק לא נמצא' };
}

/**
 * מחיקת תיק
 */
function deleteCase(caseId) {
  const sheet = getOrCreateSheet(SHEET_CASES);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === caseId) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'תיק נמחק בהצלחה' };
    }
  }
  return { success: false, message: 'תיק לא נמצא' };
}

// ============================================
// === פעולות CRUD - דיונים ===
// ============================================

/**
 * קבלת כל הדיונים
 */
function getHearings() {
  const sheet = getOrCreateSheet(SHEET_HEARINGS);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  return data.slice(1).map(row => ({
    id: row[0],
    caseId: row[1],
    clientName: row[2],
    caseNumber: row[3],
    court: row[4],
    date: row[5],
    time: row[6],
    hall: row[7],
    type: row[8],
    notes: row[9]
  }));
}

/**
 * קבלת דיונים קרובים
 */
function getUpcomingHearings(daysAhead) {
  daysAhead = daysAhead || 7;
  const hearings = getHearings();
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  return hearings.filter(h => {
    const hearingDate = new Date(h.date);
    return hearingDate >= now && hearingDate <= futureDate;
  }).sort((a, b) => new Date(a.date) - new Date(b.date));
}

/**
 * הוספת דיון חדש
 */
function addHearing(hearingData) {
  const sheet = getOrCreateSheet(SHEET_HEARINGS);
  const id = generateId('HRG');

  // קבלת פרטי התיק
  const caseInfo = getCaseInfo(hearingData.caseId);

  sheet.appendRow([
    id,
    hearingData.caseId,
    caseInfo.clientName,
    caseInfo.caseNumber,
    hearingData.court || caseInfo.court,
    new Date(hearingData.date),
    hearingData.time,
    hearingData.hall || '',
    hearingData.type || 'דיון',
    hearingData.notes || ''
  ]);

  // יצירת אירוע ביומן
  if (hearingData.addToCalendar) {
    createCalendarEvent(hearingData, caseInfo);
  }

  return { success: true, id: id, message: 'דיון נוסף בהצלחה' };
}

/**
 * עדכון דיון
 */
function updateHearing(hearingData) {
  const sheet = getOrCreateSheet(SHEET_HEARINGS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === hearingData.id) {
      sheet.getRange(i + 1, 5, 1, 6).setValues([[
        hearingData.court,
        new Date(hearingData.date),
        hearingData.time,
        hearingData.hall,
        hearingData.type,
        hearingData.notes
      ]]);
      return { success: true, message: 'דיון עודכן בהצלחה' };
    }
  }
  return { success: false, message: 'דיון לא נמצא' };
}

/**
 * מחיקת דיון
 */
function deleteHearing(hearingId) {
  const sheet = getOrCreateSheet(SHEET_HEARINGS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === hearingId) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'דיון נמחק בהצלחה' };
    }
  }
  return { success: false, message: 'דיון לא נמצא' };
}

// ============================================
// === פעולות CRUD - משימות ===
// ============================================

/**
 * קבלת כל המשימות
 */
function getTasks() {
  const sheet = getOrCreateSheet(SHEET_TASKS);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  return data.slice(1).map(row => ({
    id: row[0],
    caseId: row[1],
    clientName: row[2],
    description: row[3],
    dueDate: row[4],
    priority: row[5],
    status: row[6],
    createdDate: row[7],
    notes: row[8]
  }));
}

/**
 * קבלת משימות פתוחות
 */
function getOpenTasks() {
  const tasks = getTasks();
  return tasks.filter(t => t.status !== 'הושלם')
    .sort((a, b) => {
      // מיון לפי עדיפות ואז לפי תאריך יעד
      const priorityOrder = { 'דחוף': 0, 'גבוה': 1, 'רגיל': 2, 'נמוך': 3 };
      const pA = priorityOrder[a.priority] || 2;
      const pB = priorityOrder[b.priority] || 2;
      if (pA !== pB) return pA - pB;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
}

/**
 * הוספת משימה חדשה
 */
function addTask(taskData) {
  const sheet = getOrCreateSheet(SHEET_TASKS);
  const id = generateId('TSK');
  const now = new Date();

  // קבלת שם הלקוח מהתיק
  let clientName = '';
  if (taskData.caseId) {
    const caseInfo = getCaseInfo(taskData.caseId);
    clientName = caseInfo.clientName;
  }

  sheet.appendRow([
    id,
    taskData.caseId || '',
    clientName,
    taskData.description,
    taskData.dueDate ? new Date(taskData.dueDate) : '',
    taskData.priority || 'רגיל',
    'ממתין',
    now,
    taskData.notes || ''
  ]);

  return { success: true, id: id, message: 'משימה נוספה בהצלחה' };
}

/**
 * עדכון משימה
 */
function updateTask(taskData) {
  const sheet = getOrCreateSheet(SHEET_TASKS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === taskData.id) {
      sheet.getRange(i + 1, 4, 1, 6).setValues([[
        taskData.description,
        taskData.dueDate ? new Date(taskData.dueDate) : data[i][4],
        taskData.priority,
        taskData.status,
        data[i][7], // תאריך יצירה נשאר
        taskData.notes
      ]]);
      return { success: true, message: 'משימה עודכנה בהצלחה' };
    }
  }
  return { success: false, message: 'משימה לא נמצאה' };
}

/**
 * עדכון סטטוס משימה
 */
function updateTaskStatus(taskId, newStatus) {
  const sheet = getOrCreateSheet(SHEET_TASKS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === taskId) {
      sheet.getRange(i + 1, 7).setValue(newStatus);
      return { success: true, message: 'סטטוס עודכן' };
    }
  }
  return { success: false, message: 'משימה לא נמצאה' };
}

/**
 * מחיקת משימה
 */
function deleteTask(taskId) {
  const sheet = getOrCreateSheet(SHEET_TASKS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === taskId) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'משימה נמחקה בהצלחה' };
    }
  }
  return { success: false, message: 'משימה לא נמצאה' };
}

// ============================================
// === דשבורד וסטטיסטיקות ===
// ============================================

/**
 * קבלת נתוני דשבורד
 */
function getDashboardData() {
  const clients = getClients();
  const cases = getCases();
  const hearings = getHearings();
  const tasks = getTasks();
  const now = new Date();

  // דיונים קרובים (7 ימים)
  const upcomingHearings = hearings.filter(h => {
    const d = new Date(h.date);
    const diff = (d - now) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

  // דיונים היום
  const todayStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const todayHearings = hearings.filter(h => {
    const d = new Date(h.date);
    return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd') === todayStr;
  });

  // משימות באיחור
  const overdueTasks = tasks.filter(t => {
    if (t.status === 'הושלם') return false;
    const d = new Date(t.dueDate);
    return d < now;
  });

  // משימות פתוחות
  const openTasks = tasks.filter(t => t.status !== 'הושלם');

  // תיקים פתוחים
  const openCases = cases.filter(c => c.status === 'פתוח' || c.status === 'בטיפול');

  // סטטיסטיקות לפי סטטוס תיקים
  const casesByStatus = {};
  cases.forEach(c => {
    casesByStatus[c.status] = (casesByStatus[c.status] || 0) + 1;
  });

  return {
    totalClients: clients.length,
    totalCases: cases.length,
    openCases: openCases.length,
    todayHearings: todayHearings,
    upcomingHearings: upcomingHearings,
    overdueTasks: overdueTasks,
    openTasks: openTasks,
    casesByStatus: casesByStatus,
    urgentItems: overdueTasks.length + todayHearings.length
  };
}

// ============================================
// === חיפוש ===
// ============================================

/**
 * חיפוש גלובלי
 */
function globalSearch(query) {
  const results = [];
  query = query.toLowerCase();

  // חיפוש בלקוחות
  const clients = getClients();
  clients.forEach(c => {
    if ((c.name && c.name.toLowerCase().includes(query)) ||
        (c.idNumber && c.idNumber.toString().includes(query)) ||
        (c.phone && c.phone.includes(query))) {
      results.push({ type: 'לקוח', id: c.id, text: c.name, detail: c.phone });
    }
  });

  // חיפוש בתיקים
  const cases = getCases();
  cases.forEach(c => {
    if ((c.caseNumber && c.caseNumber.toLowerCase().includes(query)) ||
        (c.clientName && c.clientName.toLowerCase().includes(query)) ||
        (c.offenseType && c.offenseType.toLowerCase().includes(query))) {
      results.push({ type: 'תיק', id: c.id, text: c.caseNumber, detail: c.clientName });
    }
  });

  return results;
}

// ============================================
// === התראות ושליחת מיילים ===
// ============================================

/**
 * הגדרת טריגרים אוטומטיים
 */
function setupTriggers() {
  // מחיקת טריגרים קיימים
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'sendDailyAlerts' ||
        trigger.getHandlerFunction() === 'sendMorningReminder') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // התראה יומית בבוקר - 7:00
  ScriptApp.newTrigger('sendMorningReminder')
    .timeBased()
    .everyDays(1)
    .atHour(7)
    .create();

  // התראה יומית - 20:00 (ערב לפני יום למחרת)
  ScriptApp.newTrigger('sendDailyAlerts')
    .timeBased()
    .everyDays(1)
    .atHour(20)
    .create();

  SpreadsheetApp.getUi().alert('התראות אוטומטיות הוגדרו בהצלחה!\n\nהתראות ישלחו:\n- בוקר: 07:00\n- ערב: 20:00');
}

/**
 * שליחת תזכורת בוקר
 */
function sendMorningReminder() {
  const dashboard = getDashboardData();
  const email = Session.getActiveUser().getEmail();

  if (dashboard.todayHearings.length === 0 && dashboard.overdueTasks.length === 0) {
    return; // אין מה לשלוח
  }

  let body = '<div dir="rtl" style="font-family: Arial, sans-serif;">';
  body += '<h2 style="color: #1a73e8;">🔔 תזכורת בוקר - מערכת ניהול לקוחות</h2>';

  // דיונים היום
  if (dashboard.todayHearings.length > 0) {
    body += '<h3 style="color: #d93025;">📅 דיונים היום:</h3>';
    body += '<table style="border-collapse: collapse; width: 100%;">';
    body += '<tr style="background: #e8f0fe;"><th style="padding: 8px; border: 1px solid #ddd;">לקוח</th><th style="padding: 8px; border: 1px solid #ddd;">תיק</th><th style="padding: 8px; border: 1px solid #ddd;">שעה</th><th style="padding: 8px; border: 1px solid #ddd;">בית משפט</th><th style="padding: 8px; border: 1px solid #ddd;">אולם</th></tr>';
    dashboard.todayHearings.forEach(h => {
      body += '<tr>';
      body += '<td style="padding: 8px; border: 1px solid #ddd;">' + h.clientName + '</td>';
      body += '<td style="padding: 8px; border: 1px solid #ddd;">' + h.caseNumber + '</td>';
      body += '<td style="padding: 8px; border: 1px solid #ddd;">' + h.time + '</td>';
      body += '<td style="padding: 8px; border: 1px solid #ddd;">' + h.court + '</td>';
      body += '<td style="padding: 8px; border: 1px solid #ddd;">' + (h.hall || '-') + '</td>';
      body += '</tr>';
    });
    body += '</table>';
  }

  // משימות באיחור
  if (dashboard.overdueTasks.length > 0) {
    body += '<h3 style="color: #d93025;">⚠️ משימות באיחור:</h3>';
    body += '<ul>';
    dashboard.overdueTasks.forEach(t => {
      body += '<li><strong>' + t.description + '</strong>';
      if (t.clientName) body += ' (' + t.clientName + ')';
      body += ' - תאריך יעד: ' + formatDateHebrew(new Date(t.dueDate));
      body += '</li>';
    });
    body += '</ul>';
  }

  body += '<hr><p style="color: #666;">מערכת ניהול לקוחות - עורך דין תעבורה</p>';
  body += '</div>';

  MailApp.sendEmail({
    to: email,
    subject: '🔔 תזכורת בוקר - ' + dashboard.todayHearings.length + ' דיונים היום',
    htmlBody: body
  });
}

/**
 * שליחת התראות יומיות (ערב)
 */
function sendDailyAlerts() {
  const dashboard = getDashboardData();
  const email = Session.getActiveUser().getEmail();

  if (dashboard.upcomingHearings.length === 0 && dashboard.openTasks.length === 0) {
    return;
  }

  let body = '<div dir="rtl" style="font-family: Arial, sans-serif;">';
  body += '<h2 style="color: #1a73e8;">📊 סיכום יומי - מערכת ניהול לקוחות</h2>';

  // סטטיסטיקות
  body += '<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0;">';
  body += '<strong>סיכום:</strong> ';
  body += dashboard.totalClients + ' לקוחות | ';
  body += dashboard.openCases + ' תיקים פתוחים | ';
  body += dashboard.openTasks.length + ' משימות פתוחות';
  body += '</div>';

  // דיונים קרובים
  if (dashboard.upcomingHearings.length > 0) {
    body += '<h3 style="color: #1a73e8;">📅 דיונים ב-7 הימים הקרובים:</h3>';
    body += '<table style="border-collapse: collapse; width: 100%;">';
    body += '<tr style="background: #e8f0fe;"><th style="padding: 8px; border: 1px solid #ddd;">תאריך</th><th style="padding: 8px; border: 1px solid #ddd;">שעה</th><th style="padding: 8px; border: 1px solid #ddd;">לקוח</th><th style="padding: 8px; border: 1px solid #ddd;">תיק</th><th style="padding: 8px; border: 1px solid #ddd;">בית משפט</th></tr>';
    dashboard.upcomingHearings.forEach(h => {
      const isToday = isSameDay(new Date(h.date), new Date());
      const isTomorrow = isTomorrowDate(new Date(h.date));
      let rowStyle = '';
      if (isToday) rowStyle = 'background: #fce8e6;';
      else if (isTomorrow) rowStyle = 'background: #fef7e0;';

      body += '<tr style="' + rowStyle + '">';
      body += '<td style="padding: 8px; border: 1px solid #ddd;">' + formatDateHebrew(new Date(h.date));
      if (isToday) body += ' <strong>(היום!)</strong>';
      if (isTomorrow) body += ' <strong>(מחר)</strong>';
      body += '</td>';
      body += '<td style="padding: 8px; border: 1px solid #ddd;">' + h.time + '</td>';
      body += '<td style="padding: 8px; border: 1px solid #ddd;">' + h.clientName + '</td>';
      body += '<td style="padding: 8px; border: 1px solid #ddd;">' + h.caseNumber + '</td>';
      body += '<td style="padding: 8px; border: 1px solid #ddd;">' + h.court + '</td>';
      body += '</tr>';
    });
    body += '</table>';
  }

  body += '<hr><p style="color: #666;">מערכת ניהול לקוחות - עורך דין תעבורה</p>';
  body += '</div>';

  MailApp.sendEmail({
    to: email,
    subject: '📊 סיכום יומי - ' + dashboard.upcomingHearings.length + ' דיונים קרובים',
    htmlBody: body
  });
}

// ============================================
// === אינטגרציה עם Google Calendar ===
// ============================================

/**
 * יצירת אירוע ביומן
 */
function createCalendarEvent(hearingData, caseInfo) {
  try {
    const calendar = CalendarApp.getDefaultCalendar();
    const dateStr = hearingData.date;
    const timeStr = hearingData.time || '09:00';
    const parts = timeStr.split(':');

    const startDate = new Date(dateStr);
    startDate.setHours(parseInt(parts[0]), parseInt(parts[1] || 0));

    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 1);

    const title = 'דיון: ' + caseInfo.clientName + ' - תיק ' + caseInfo.caseNumber;
    const description = 'בית משפט: ' + (hearingData.court || caseInfo.court) +
      '\nאולם: ' + (hearingData.hall || '') +
      '\nסוג דיון: ' + (hearingData.type || '') +
      '\nהערות: ' + (hearingData.notes || '');

    const event = calendar.createEvent(title, startDate, endDate, {
      description: description,
      location: hearingData.court || caseInfo.court
    });

    // תזכורת 60 דקות לפני
    event.addPopupReminder(60);
    // תזכורת 24 שעות לפני
    event.addPopupReminder(1440);

    return { success: true, eventId: event.getId() };
  } catch (e) {
    Logger.log('Error creating calendar event: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ============================================
// === פונקציות עזר ===
// ============================================

/**
 * קבלה או יצירת גיליון
 */
function getOrCreateSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    initializeSystem();
    sheet = ss.getSheetByName(sheetName);
  }
  return sheet;
}

/**
 * יצירת מזהה ייחודי
 */
function generateId(prefix) {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 1000);
  return prefix + '-' + timestamp + '-' + random;
}

/**
 * קבלת שם לקוח לפי מזהה
 */
function getClientName(clientId) {
  const clients = getClients();
  const client = clients.find(c => c.id === clientId);
  return client ? client.name : '';
}

/**
 * קבלת פרטי תיק
 */
function getCaseInfo(caseId) {
  const cases = getCases();
  const c = cases.find(cs => cs.id === caseId);
  return c || { clientName: '', caseNumber: '', court: '' };
}

/**
 * פורמט תאריך בעברית
 */
function formatDateHebrew(date) {
  if (!date || !(date instanceof Date) || isNaN(date)) return '';
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd/MM/yyyy');
}

/**
 * בדיקה אם אותו יום
 */
function isSameDay(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();
}

/**
 * בדיקה אם מחר
 */
function isTomorrowDate(date) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return isSameDay(date, tomorrow);
}

/**
 * ייצוא נתונים ל-PDF (דוח תיק)
 */
function generateCaseReport(caseId) {
  const caseInfo = getCaseInfo(caseId);
  const hearings = getHearings().filter(h => h.caseId === caseId);
  const tasks = getTasks().filter(t => t.caseId === caseId);

  return {
    caseInfo: caseInfo,
    hearings: hearings,
    tasks: tasks
  };
}
