/**
 * Sai Signature – Lead capture to Google Sheet
 * Paste this into Extensions > Apps Script of your Google Sheet, then deploy as Web App.
 * (Full steps are in google-sheet-setup.txt)
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000); // avoid two leads writing at once
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    var p = (e && e.parameter) ? e.parameter : {};

    // Add header row the first time
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Time', 'Type', 'Name', 'Mobile', 'Budget', 'Message', 'Page']);
    }

    sheet.appendRow([
      p.time || new Date(),
      p.type || '',
      p.Name || '',
      p.Mobile || '',
      p.Budget || '',
      p.Message || '',
      p.page || ''
    ]);

    return ContentService.createTextOutput('ok');
  } catch (err) {
    return ContentService.createTextOutput('error: ' + err);
  } finally {
    lock.releaseLock();
  }
}
