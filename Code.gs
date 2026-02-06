
function doGet(e) {
  var template = HtmlService.createTemplateFromFile('index');
  
  // קבלת הכתובת הציבורית האמיתית של האפליקציה
  var scriptUrl = ScriptApp.getService().getUrl();
  template.scriptUrl = scriptUrl;
  
  // העברת ה-ID אם קיים (לחותמים)
  template.signId = e.parameter.sign || null;
  
  return template.evaluate()
      .setTitle('SignSmart - מערכת חתימה חכמה')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * פונקציה לשליחת התראה על מסמך שנחתם
 */
function sendSignedDocumentNotification(docTitle, signerName) {
  var recipient = "peri@bettylaw.co.il";
  var subject = "מסמך נחתם בהצלחה: " + docTitle;
  
  var body = "שלום רב,\n\n" +
             "הרינו לעדכן כי המסמך '" + docTitle + "' נחתם זה עתה על ידי " + signerName + ".\n" +
             "עותק דיגיטלי נשמר במערכת SignSmart.\n\n" +
             "בברכה,\n" +
             "צוות SignSmart";
             
  try {
    MailApp.sendEmail(recipient, subject, body);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}
