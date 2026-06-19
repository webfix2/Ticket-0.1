function doGet(e) {
  const sheetName = e.parameter.sheetname; 
  if (!sheetName) {
    return ContentService.createTextOutput(JSON.stringify({ error: "Missing parameter" })).setMimeType(ContentService.MimeType.JSON);
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ error: `DB '${sheetName}' not found` })).setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getDataRange().getDisplayValues();
  const headers = data[0]; 
  const rows = data.slice(1); 

  const result = rows.map(row => {
    return headers.reduce((obj, header, i) => {
      obj[header] = row[i];
      return obj;
    }, {});
  });

  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const params = e.parameter; 
    const action = params.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ticketSheet = ss.getSheetByName("ticket"); 
    const userSheet = ss.getSheetByName("user");
    const adminSheet = ss.getSheetByName("admin");

    if (!ticketSheet || !userSheet || !adminSheet) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Required sheets not found" })).setMimeType(ContentService.MimeType.JSON);
    }

    switch (action) {
      case "ticketApproval":
        return ticketApproval(userSheet, params);
      case "retractTicket":
        return retractTicket(userSheet, params);
      case "addTicket":
        return addTicket(ticketSheet, params);
      case "updateTicket":
        return updateTicket(ticketSheet, params);
      case "transferTicket":
        return transferTicket(userSheet, params);
      case "deleteTicket":
        return deleteTicket(ticketSheet, params);
      case "paymentConfirmation":
        return paymentConfirmation(userSheet, params);
      case "updateAdminExpiry":
        updateAdminExpiry();
        return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Admin expiry statuses updated" })).setMimeType(ContentService.MimeType.JSON);
      case "notifyAdminExpiry":
        notifyAdminExpiry();
        return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Admin expiry notifications sent" })).setMimeType(ContentService.MimeType.JSON);
      case "adminLoginByToken":
        return adminLoginByToken(adminSheet, params);
      case "verifyAdminSession":
        return verifyAdminSession(adminSheet, params);
      case "getUserByToken":
        return getUserByToken(userSheet, params);
      case "ensureToken":
        return ensureAdminToken(adminSheet, params);
      case "updateAdmin":
        return updateAdminDetails(adminSheet, params);
      default:
        return ContentService.createTextOutput(JSON.stringify({ error: "Invalid action" })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Helper to get proper display name for a platform
 */
function getPlatformDisplayName(platform) {
  const platformLower = (platform || "").toLowerCase();
  if (platformLower === "uefa") return "UEFA";
  if (platformLower === "ticketmaster") return "Ticketmaster";
  if (platformLower === "fifa") return "FIFA World Cup 26";
  return "Viagogo";
}

/**
 * Helper to get email sender for a platform from settings sheet
 */
function getPlatformEmailSender(platform) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settingsSheet = ss.getSheetByName("settings");
  if (!settingsSheet) return null;
  
  const data = settingsSheet.getDataRange().getDisplayValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  const platformIdx = headers.indexOf("platform");
  const emailIdx = headers.indexOf("emailSender");
  
  if (platformIdx === -1 || emailIdx === -1) return null;
  
  const config = rows.find(row => row[platformIdx].toLowerCase() === platform.toLowerCase());
  return config ? config[emailIdx] : null;
}

function generateToken() {
  return Utilities.getUuid();
}

function ensureAdminToken(sheet, params) {
  const headers = sheet.getDataRange().getValues()[0];
  const adminIdCol = headers.indexOf("adminId");
  const tokenCol = headers.indexOf("token");

  if (adminIdCol === -1 || tokenCol === -1) {
    return ContentService.createTextOutput(JSON.stringify({ error: "Required columns not found" })).setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getDataRange().getValues();
  const rowIndex = data.findIndex(row => String(row[adminIdCol]).trim() === String(params.adminId).trim());

  if (rowIndex === -1) {
    return ContentService.createTextOutput(JSON.stringify({ error: "Admin not found" })).setMimeType(ContentService.MimeType.JSON);
  }

  // Always generate a new token (single-device enforcement)
  // This invalidates any previous session on another device
  const newToken = generateToken();
  const sheetRange = sheet.getRange(rowIndex + 1, tokenCol + 1);
  sheetRange.setValue(newToken);

  return ContentService.createTextOutput(JSON.stringify({ success: true, token: newToken })).setMimeType(ContentService.MimeType.JSON);
}

function adminLoginByToken(sheet, params) {
  const headers = sheet.getDataRange().getValues()[0];
  const tokenCol = headers.indexOf("token");
  const statusCol = headers.indexOf("status");
  const expiryCol = headers.indexOf("subscriptionExpiry");

  if (tokenCol === -1) {
    return ContentService.createTextOutput(JSON.stringify({ error: "Token column not found in admin sheet" })).setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getDataRange().getValues();
  const rowIndex = data.findIndex(row => String(row[tokenCol]).trim() === String(params.token).trim());

  if (rowIndex === -1) {
    return ContentService.createTextOutput(JSON.stringify({ error: "Invalid token" })).setMimeType(ContentService.MimeType.JSON);
  }

  const row = data[rowIndex];
  const adminRecord = {};
  headers.forEach((header, i) => { adminRecord[header] = row[i]; });

  if (adminRecord.role !== 'OWNER' && statusCol !== -1) {
    if (String(adminRecord[statusCol]).toUpperCase() === 'EXPIRED') {
      return ContentService.createTextOutput(JSON.stringify({ error: "Your subscription has expired. Please contact the administrator." })).setMimeType(ContentService.MimeType.JSON);
    }
    if (expiryCol !== -1) {
      const expiry = new Date(adminRecord[expiryCol]);
      if (!isNaN(expiry.getTime()) && expiry < new Date()) {
        return ContentService.createTextOutput(JSON.stringify({ error: "Your subscription has expired. Please contact the administrator." })).setMimeType(ContentService.MimeType.JSON);
      }
    }
  }

  const passwordCol = headers.indexOf("password");
  if (passwordCol !== -1) delete adminRecord[headers[passwordCol]];

  return ContentService.createTextOutput(JSON.stringify({ success: true, admin: adminRecord })).setMimeType(ContentService.MimeType.JSON);
}

function verifyAdminSession(sheet, params) {
  const headers = sheet.getDataRange().getValues()[0];
  const adminIdCol = headers.indexOf("adminId");
  const tokenCol = headers.indexOf("token");
  const statusCol = headers.indexOf("status");
  const expiryCol = headers.indexOf("subscriptionExpiry");
  const planCol = headers.indexOf("plan");
  const roleCol = headers.indexOf("role");

  if (adminIdCol === -1 && tokenCol === -1) {
    return ContentService.createTextOutput(JSON.stringify({ error: "adminId/token column not found" })).setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getDataRange().getValues();

  // Lookup by token ONLY (single-device enforcement)
  // No adminId fallback — if token doesn't match, session is invalid
  let rowIndex = -1;
  if (params.token && tokenCol !== -1) {
    rowIndex = data.findIndex(row => String(row[tokenCol]).trim() === String(params.token).trim());
  }

  if (rowIndex === -1) {
    return ContentService.createTextOutput(JSON.stringify({ valid: false, error: "Admin not found" })).setMimeType(ContentService.MimeType.JSON);
  }

  const row = data[rowIndex];
  const status = statusCol !== -1 ? String(row[statusCol]).toUpperCase() : "UNKNOWN";
  const role = roleCol !== -1 ? String(row[roleCol]).toUpperCase() : "OWNER";
  const subscriptionExpiry = expiryCol !== -1 ? row[expiryCol] : "";
  const plan = planCol !== -1 ? row[planCol] : "";

  let isExpired = false;
  if (expiryCol !== -1 && row[expiryCol]) {
    const expiry = new Date(row[expiryCol]);
    if (!isNaN(expiry.getTime()) && expiry < new Date()) {
      isExpired = true;
    }
  }

  // Match login logic: only reject CUSTOMER with EXPIRED status or expired subscription
  let valid = true;
  if (role === 'CUSTOMER' && (status === 'EXPIRED' || isExpired)) {
    valid = false;
  }

  return ContentService.createTextOutput(JSON.stringify({
    valid: valid,
    status: isExpired ? "EXPIRED" : status,
    plan: plan,
    subscriptionExpiry: subscriptionExpiry
  })).setMimeType(ContentService.MimeType.JSON);
}

function getUserByToken(sheet, params) {
  const headers = sheet.getDataRange().getValues()[0];
  const tokenCol = headers.indexOf("token");

  if (tokenCol === -1) {
    return ContentService.createTextOutput(JSON.stringify({ error: "Token column not found in user sheet" })).setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getDataRange().getValues();
  const rowIndex = data.findIndex(row => String(row[tokenCol]).trim() === String(params.token).trim());

  if (rowIndex === -1) {
    return ContentService.createTextOutput(JSON.stringify({ error: "User not found" })).setMimeType(ContentService.MimeType.JSON);
  }

  const row = data[rowIndex];
  const userRecord = {};
  headers.forEach((header, i) => { userRecord[header] = row[i]; });

  return ContentService.createTextOutput(JSON.stringify({ success: true, user: userRecord })).setMimeType(ContentService.MimeType.JSON);
}

function updateAdminDetails(sheet, params) {
  const headers = sheet.getDataRange().getValues()[0];
  const adminIdCol = headers.indexOf("adminId");
  if (adminIdCol === -1) {
    return ContentService.createTextOutput(JSON.stringify({ error: "adminId column not found" })).setMimeType(ContentService.MimeType.JSON);
  }
  const data = sheet.getDataRange().getValues();
  const rowIndex = data.findIndex(row => String(row[adminIdCol]).trim() === String(params.adminId).trim());
  if (rowIndex === -1) {
    return ContentService.createTextOutput(JSON.stringify({ error: "Admin not found" })).setMimeType(ContentService.MimeType.JSON);
  }
  headers.forEach((header, index) => {
    if (params[header] && header !== "password" && header !== "adminId") {
      sheet.getRange(rowIndex + 1, index + 1).setValue(params[header]);
    }
  });
  return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Admin details updated" })).setMimeType(ContentService.MimeType.JSON);
}

function ticketApproval(sheet, params) {
  const headers = sheet.getDataRange().getValues()[0];
  const userIdCol = headers.indexOf("userId");
  const approvalSTAMPCol = headers.indexOf("approvalSTAMP");
  const platformCol = headers.indexOf("userPlatform");

  if (userIdCol === -1 || approvalSTAMPCol === -1) {
    return ContentService.createTextOutput(JSON.stringify({ error: "Required columns missing" })).setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getDataRange().getValues();
  const rowIndex = data.findIndex(row => row[userIdCol] == params.userId);

  if (rowIndex === -1) {
    return ContentService.createTextOutput(JSON.stringify({ error: "User ID not found" })).setMimeType(ContentService.MimeType.JSON);
  }

  const isDeclined = params.approvalSTAMP === "DECLINED";
  const valueToSet = isDeclined ? "DECLINED" : new Date();
  sheet.getRange(rowIndex + 1, approvalSTAMPCol + 1).setValue(valueToSet);

  if (!isDeclined) {
    const platform = platformCol !== -1 ? (data[rowIndex][platformCol] || "viagogo") : "viagogo";
    const user = {
      fullName: data[rowIndex][headers.indexOf("fullName")],
      eventName: data[rowIndex][headers.indexOf("eventName")],
      eventDate: data[rowIndex][headers.indexOf("eventDate")],
      eventVenue: data[rowIndex][headers.indexOf("eventVenue")],
      seatNumber: data[rowIndex][headers.indexOf("seatNumber")],
      senderName: data[rowIndex][headers.indexOf("senderName")] || "Viagogo",
      approvalStatus: params.approvalSTAMP,
    };

    const receiverEmail = data[rowIndex][headers.indexOf("emailAddress")];
    const templateName = platform + "Accepted"; 
    const subject = `Your ticket for ${user.eventName} is being processed!`;

    // Dynamic Sender Email from Settings
    const senderEmail = getPlatformEmailSender(platform) || data[rowIndex][headers.indexOf("senderEmail")] || "no-reply@viagogo.com";
    const senderDisplayName = getPlatformDisplayName(platform);

    sendTemplatedEmail(senderEmail, receiverEmail, user, templateName, subject, senderDisplayName);
  }

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: `Approval submitted${isDeclined ? '' : ' and email sent'}`
  })).setMimeType(ContentService.MimeType.JSON);
}

function retractTicket(sheet, params) {
  const headers = sheet.getDataRange().getValues()[0];
  const userIdCol = headers.indexOf("userId");
  const cancelledSTAMPCol = headers.indexOf("cancelledSTAMP");
  const platformCol = headers.indexOf("userPlatform");

  const data = sheet.getDataRange().getValues();
  const rowIndex = data.findIndex(row => row[userIdCol] == params.userId);

  if (rowIndex === -1) {
    return ContentService.createTextOutput(JSON.stringify({ error: "User ID not found" })).setMimeType(ContentService.MimeType.JSON);
  }

  sheet.getRange(rowIndex + 1, cancelledSTAMPCol + 1).setValue(new Date());

  const platform = platformCol !== -1 ? (data[rowIndex][platformCol] || "viagogo") : "viagogo";
  const user = {
    fullName: data[rowIndex][headers.indexOf("fullName")],
    eventName: data[rowIndex][headers.indexOf("eventName")],
    senderName: data[rowIndex][headers.indexOf("senderName")] || "Viagogo",
  };

  const receiverEmail = data[rowIndex][headers.indexOf("emailAddress")];
  const templateName = platform + "Returned"; 
  const subject = `Your ticket transfer for ${user.eventName} has been retracted`;

  // Dynamic Sender Email from Settings
  const senderEmail = getPlatformEmailSender(platform) || data[rowIndex][headers.indexOf("senderEmail")] || "no-reply@viagogo.com";
  const senderDisplayName = getPlatformDisplayName(platform);

  sendTemplatedEmail(senderEmail, receiverEmail, user, templateName, subject, senderDisplayName);

  return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Ticket transfer retracted successfully" })).setMimeType(ContentService.MimeType.JSON);
}

function transferTicket(userSheet, params) {
  const headers = userSheet.getDataRange().getValues()[0];
  
  const newRow = headers.map(header => params[header] || "");
  userSheet.appendRow(newRow);

  Utilities.sleep(2000);
  const lastRow = userSheet.getLastRow();
  const rowValues = userSheet.getRange(lastRow, 1, 1, headers.length).getValues()[0];

  const tokenCol = headers.indexOf("token");
  let userToken = "";
  if (tokenCol !== -1) {
    userToken = generateToken();
    userSheet.getRange(lastRow, tokenCol + 1).setValue(userToken);
  }

  // Clear the link cell so the sheet's ARRAYFORMULA can compute the URL from token + platform
  const linkCol = headers.indexOf("link");
  if (linkCol !== -1) {
    userSheet.getRange(lastRow, linkCol + 1).clear();
  }

  Utilities.sleep(2000);
  const refreshedValues = userSheet.getRange(lastRow, 1, 1, headers.length).getValues()[0];

  const userData = {};
  headers.forEach((header, index) => {
    userData[header] = refreshedValues[index];
  });

  const platform = params.userPlatform || "viagogo";
  const sendType = params.sendType || "draft"; // "draft" or "auto"
  const user = {
    fullName: params.fullName,
    eventName: userData.eventName,
    seatNumbers: params.seatNumbers,
    ticketId: params.ticketId,
    senderName: params.senderName,
    senderEmail: params.senderEmail,
    coverImage: userData.coverImage,
    dateTime: userData.dateTime,
    doorTime: userData.doorTime,
    venue: userData.venue,
    location: userData.location,
    section: userData.section,
    sectionNo: userData.sectionNo,
    row: userData.row,
    gate: userData.gate,
    entrance: userData.entrance,
    hospitalityArea: userData.hospitalityArea,
    ageRestriction: userData.ageRestriction,
    description: userData.description,
    terms: userData.terms,
    link: userData.link,
    token: userToken,
    paymentSettings: params.paymentSettings || "",
  };

  const receiverEmail = params.emailAddress;
  const templateName = platform + "Transfer";
  const senderDisplayName = getPlatformDisplayName(platform);
  const subject = `${params.senderName} Transferred your Tickets for ${userData.eventName}`;

  // Dynamic Sender Email from Settings
  const senderEmail = getPlatformEmailSender(platform) || params.senderEmail;

  if (sendType === "draft") {
    draftTemplatedEmail(senderEmail, receiverEmail, user, templateName, subject, senderDisplayName);
  } else {
    sendTemplatedEmail(senderEmail, receiverEmail, user, templateName, subject, senderDisplayName);
  }

  const newTransferSTAMPIndex = headers.indexOf('newTransferSTAMP');
  if (newTransferSTAMPIndex !== -1) {
    userSheet.getRange(lastRow, newTransferSTAMPIndex + 1).setValue(new Date());
  }

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: sendType === "draft" ? "Ticket transferred and email drafted successfully" : "Ticket transferred and email sent successfully"
  })).setMimeType(ContentService.MimeType.JSON);
}

function addTicket(sheet, params) {
  const headers = sheet.getDataRange().getValues()[0];
  const newRow = headers.map(header => params[header] || "");
  sheet.appendRow(newRow);
  return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
}

function updateTicket(sheet, params) {
  const headers = sheet.getDataRange().getValues()[0];
  const ticketIdCol = headers.indexOf("ticketId");
  const data = sheet.getDataRange().getValues();
  const rowIndex = data.findIndex(row => row[ticketIdCol] == params.ticketId);

  if (rowIndex === -1) return ContentService.createTextOutput(JSON.stringify({ error: "Not found" })).setMimeType(ContentService.MimeType.JSON);

  headers.forEach((header, index) => {
    if (params[header] && index !== ticketIdCol) {
      sheet.getRange(rowIndex + 1, index + 1).setValue(params[header]);
    }
  });
  return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
}

function deleteTicket(sheet, params) {
  const headers = sheet.getDataRange().getValues()[0];
  const ticketIdCol = headers.indexOf("ticketId");
  const deletedSTAMPCol = headers.indexOf("deletedSTAMP");
  const data = sheet.getDataRange().getValues();
  const rowIndex = data.findIndex(row => row[ticketIdCol] == params.ticketId);

  if (rowIndex === -1) return ContentService.createTextOutput(JSON.stringify({ error: "Not found" })).setMimeType(ContentService.MimeType.JSON);

  sheet.getRange(rowIndex + 1, deletedSTAMPCol + 1).setValue(params.deletedSTAMP);
  return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
}

function sendTemplatedEmail(senderEmail, receiverEmail, templateData, templateName, subject, senderDisplayName) {
  try {
    const templateFile = HtmlService.createTemplateFromFile(templateName);
    templateFile.templateData = templateData;
    const htmlBody = templateFile.evaluate().getContent();
    
    GmailApp.sendEmail(receiverEmail, subject, 'Please use an HTML-compatible email client to view this ticket transfer.', {
      htmlBody: htmlBody,
      name: senderDisplayName,
      from: senderEmail
    });
    return true;
  } catch (error) {
    Logger.log("Error: " + error.message);
    return false;
  }
}

function draftTemplatedEmail(senderEmail, receiverEmail, templateData, templateName, subject, senderDisplayName) {
  try {
    const templateFile = HtmlService.createTemplateFromFile(templateName);
    templateFile.templateData = templateData;
    const htmlBody = templateFile.evaluate().getContent();
    
    GmailApp.createDraft(receiverEmail, subject, 'Please use an HTML-compatible email client to view this ticket transfer.', {
      htmlBody: htmlBody,
      name: senderDisplayName,
      from: senderEmail
    });
    return true;
  } catch (error) {
    Logger.log("Error: " + error.message);
    return false;
  }
}

function updateAdminExpiry() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const adminSheet = ss.getSheetByName("admin");
  if (!adminSheet) return;

  const data = adminSheet.getDataRange().getValues();
  const headers = data[0];
  const expiryCol = headers.indexOf("subscriptionExpiry");
  const statusCol = headers.indexOf("status");
  const roleCol = headers.indexOf("role");

  if (expiryCol === -1 || statusCol === -1) return;

  const now = new Date();
  for (let i = 1; i < data.length; i++) {
    const role = data[i][roleCol];
    if (role === 'OWNER') continue;

    const expiryDate = new Date(data[i][expiryCol]);
    if (isNaN(expiryDate.getTime())) continue;

    const currentStatus = data[i][statusCol];
    let newStatus = currentStatus;

    if (expiryDate < now) {
      newStatus = "EXPIRED";
    } else {
      newStatus = "ACTIVE";
    }

    if (newStatus !== currentStatus) {
      adminSheet.getRange(i + 1, statusCol + 1).setValue(newStatus);
    }
  }
}

function notifyAdminExpiry() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const adminSheet = ss.getSheetByName("admin");
  if (!adminSheet) return;

  const data = adminSheet.getDataRange().getValues();
  const headers = data[0];
  const usernameCol = headers.indexOf("username");
  const expiryCol = headers.indexOf("subscriptionExpiry");
  const statusCol = headers.indexOf("status");
  const roleCol = headers.indexOf("role");
  const telegramIdCol = headers.indexOf("telegramId");
  const statusStampCol = headers.indexOf("statusStamp");

  if (expiryCol === -1 || statusCol === -1) return;

  const now = new Date();
  const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
  const oneDayInMs = 24 * 60 * 60 * 1000;

  for (let i = 1; i < data.length; i++) {
    const role = data[i][roleCol];
    if (role === 'OWNER') continue;

    const username = data[i][usernameCol];
    const expiryDate = new Date(data[i][expiryCol]);
    const status = data[i][statusCol];
    const telegramId = telegramIdCol !== -1 ? data[i][telegramIdCol] : null;
    const statusStamp = statusStampCol !== -1 ? data[i][statusStampCol] : "";

    if (isNaN(expiryDate.getTime())) continue;
    if (!telegramId) continue; // Only notify if Telegram ID is present

    const timeDiff = expiryDate.getTime() - now.getTime();
    let message = "";
    let currentMilestone = "";

    // 1. On Expiry (or already expired)
    if (timeDiff <= 0 || status === "EXPIRED") {
      if (statusStamp !== "NOTIFIED_EXPIRED") {
        message = `🚨 *PLAN EXPIRED*\n\nHello ${username},\nYour subscription has officially expired. Please contact the administrator to renew your access.\n\n📅 Expiry: ${expiryDate.toLocaleString()}`;
        currentMilestone = "NOTIFIED_EXPIRED";
      }
    } 
    // 2. 1 Day Before
    else if (timeDiff <= oneDayInMs) {
      if (statusStamp !== "NOTIFIED_1_DAY" && statusStamp !== "NOTIFIED_EXPIRED") {
        message = `⚠️ *PLAN EXPIRING TOMORROW*\n\nHello ${username},\nYour subscription will expire in less than 24 hours. Renew now to avoid interruption.\n\n📅 Expiry: ${expiryDate.toLocaleString()}`;
        currentMilestone = "NOTIFIED_1_DAY";
      }
    } 
    // 3. 1 Week Before
    else if (timeDiff <= oneWeekInMs) {
      if (statusStamp !== "NOTIFIED_1_WEEK" && statusStamp !== "NOTIFIED_1_DAY" && statusStamp !== "NOTIFIED_EXPIRED") {
        message = `ℹ️ *PLAN EXPIRING SOON*\n\nHello ${username},\nYour subscription will expire in 7 days. This is a friendly reminder to check your plan status.\n\n📅 Expiry: ${expiryDate.toLocaleString()}`;
        currentMilestone = "NOTIFIED_1_WEEK";
      }
    }

    if (message && telegramId) {
      const payload = {
        chat_id: telegramId,
        text: message,
        parse_mode: "Markdown"
      };
      
      try {
        const success = sendMediaAndMessageToTelegram(payload, null);
        if (success && statusStampCol !== -1) {
          // Update statusStamp in the sheet
          adminSheet.getRange(i + 1, statusStampCol + 1).setValue(currentMilestone);
        }
      } catch (e) {
        Logger.log(`Failed to send Telegram message to ${username}: ${e.message}`);
      }
    }
  }
}

function paymentConfirmation(sheet, params) {
  const headers = sheet.getDataRange().getValues()[0];
  const userIdCol = headers.indexOf("userId");
  const paymentSTAMPCol = headers.indexOf("paymentSTAMP");

  if (userIdCol === -1 || paymentSTAMPCol === -1) {
    return ContentService.createTextOutput(JSON.stringify({ error: "Required columns missing. Ensure 'paymentSTAMP' column exists." })).setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getDataRange().getValues();
  const rowIndex = data.findIndex(row => row[userIdCol] == params.userId);

  if (rowIndex === -1) {
    return ContentService.createTextOutput(JSON.stringify({ error: "User ID not found" })).setMimeType(ContentService.MimeType.JSON);
  }

  sheet.getRange(rowIndex + 1, paymentSTAMPCol + 1).setValue(new Date());

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: "Payment confirmation submitted"
  })).setMimeType(ContentService.MimeType.JSON);
}