/**
 * ============================================================================
 * TuneTagZ Unified Google Sheets & Instant Email Notification Webhook
 * ============================================================================
 * 
 * Instructions for Setup in Google Sheets:
 * 1. Open your Google Sheet (e.g., "TuneTagz Orders").
 * 2. In the top menu, click Extensions > Apps Script.
 * 3. Delete any default code in Code.gs, paste this entire file, and click Save (Ctrl+S / Cmd+S).
 * 4. (Optional) Set your custom email in ADMIN_EMAIL below, or leave it blank to automatically
 *    use the Google account hosting this script.
 * 5. Click "Deploy" (top right) > "New deployment".
 * 6. Select type: "Web app".
 *    - Description: "TuneTagz Order Webhook v2"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone" (important for customer checkouts)
 * 7. Click "Deploy", authorize permissions when prompted, and copy the "Web app URL".
 * 8. If you get a new Web app URL, paste it into window.TUNETAGZ_GOOGLE_SHEET_URL
 *    or GOOGLE_SHEET_WEBHOOK_URL in order.html.
 * ============================================================================
 */

// CONFIGURATION: Set your notification email or leave blank for auto-detection
var ADMIN_EMAIL = ""; // e.g. "tunetagz.official@gmail.com" or leave empty to auto-use your Google email
var SHEET_NAME = "Orders";
var DRIVE_FOLDER_NAME = "TuneTagz Orders Uploads";

/**
 * HTTP POST Handler - Receives order JSON from TuneTagz website
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "No post data received"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var payload = JSON.parse(e.postData.contents);
    var sheet = getOrCreateOrdersSheet();
    var driveFolder = getOrCreateDriveFolder();

    var processedItems = [];

    // Iterate through each keychain item in the order
    // (If multiple different keychains were in cart, each is added as its own row with the SAME order number)
    var items = payload.items && payload.items.length > 0 ? payload.items : [payload];

    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var itemNum = it.itemNumber || (i + 1);
      var totalUnits = it.totalUnits || items.length;
      var unitLabel = it.unitLabel || (itemNum + " of " + totalUnits);

      // Save uploaded Spotify code image to Google Drive if present
      var codeImgDriveUrl = "";
      if (it.uploadedCodeImg && it.uploadedCodeImg.indexOf("data:image") === 0) {
        var codeFileName = payload.orderId + "_Item" + itemNum + "_SpotifyCode_" + (it.uploadedCodeName || "code.png");
        codeImgDriveUrl = saveBase64ImageToDrive(it.uploadedCodeImg, codeFileName, driveFolder);
      } else if (it.uploadedCodeName) {
        codeImgDriveUrl = it.uploadedCodeName;
      }

      // Save uploaded metal back photo to Google Drive if present
      var backImgDriveUrl = "";
      if (it.uploadedBackImg && it.uploadedBackImg.indexOf("data:image") === 0) {
        var backFileName = payload.orderId + "_Item" + itemNum + "_BackPhoto_" + (it.uploadedBackImgName || "back_photo.png");
        backImgDriveUrl = saveBase64ImageToDrive(it.uploadedBackImg, backFileName, driveFolder);
      } else if (it.uploadedBackImgName) {
        backImgDriveUrl = it.uploadedBackImgName;
      }

      // Format clean back customization string
      var backCustomType = it.backCustomization || "none";
      var backDesc = "None (Plain / Standard Art)";
      if (backCustomType === "text") {
        backDesc = "Text Engraving: \"" + (it.backText || it.engrave || "") + "\" (" + (it.backTextSize || it.textSize || "18px") + ")";
      } else if (backCustomType === "image") {
        backDesc = "Custom Image: " + (it.uploadedBackImgName || "Photo Uploaded");
      }

      // Construct complete spreadsheet row (33 comprehensive columns)
      var row = [
        payload.createdAt || new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }), // 1. Timestamp (IST)
        payload.orderId || "TZ-N/A",                                                           // 2. Order ID (SAME for all keychains)
        unitLabel,                                                                             // 3. Keychain Unit #
        payload.customerName || "",                                                            // 4. Customer Name
        payload.phone || "",                                                                   // 5. Customer Phone Number
        payload.streetAddress || "",                                                           // 6. Delivery Street Address
        payload.city || "",                                                                    // 7. City
        payload.pincode || "",                                                                 // 8. Pincode
        payload.fullAddress || payload.address || "",                                          // 9. Full Shipping Address
        it.productName || "Spotify Keychain",                                                  // 10. Keychain Model Name
        it.productKey || "",                                                                   // 11. Product SKU / Key
        it.finish || "Standard",                                                               // 12. Finish / Tone
        it.quantity || 1,                                                                      // 13. Quantity
        it.unitBasePrice || 0,                                                                 // 14. Unit Base Price (₹)
        it.unitTotalPrice || 0,                                                                // 15. Item Subtotal (₹)
        it.spotifySource || (it.uploadedCodeImg ? "Custom Code Image" : "Spotify Link"),       // 16. Spotify Code Source
        it.songTitle || it.song || "",                                                         // 17. Spotify Song / Track Title
        it.artist || "",                                                                       // 18. Artist Name
        it.spotifyUrl || "",                                                                   // 19. Spotify Track URL
        codeImgDriveUrl ? (codeImgDriveUrl.indexOf("http") === 0 ? '=HYPERLINK("' + codeImgDriveUrl + '", "🖼️ View Code Image")' : codeImgDriveUrl) : "None", // 20. Code Image Link
        it.song2 || "",                                                                        // 21. Duo Tag 2 Song Title
        it.spotifyUrl2 || "",                                                                  // 22. Duo Tag 2 Spotify Link
        backCustomType.toUpperCase(),                                                          // 23. Back Customization Type
        it.backText || it.engrave || "",                                                       // 24. Back Engraved Text
        it.backTextSize || it.textSize || "",                                                  // 25. Back Text Font Size
        backImgDriveUrl ? (backImgDriveUrl.indexOf("http") === 0 ? '=HYPERLINK("' + backImgDriveUrl + '", "🖼️ View Back Photo")' : backImgDriveUrl) : (it.backCustomization === "none" ? "None" : ""), // 26. Back Photo Link
        it.engrave2 || "",                                                                     // 27. Duo Tag 2 Back Name
        it.hasNfc ? "YES (+₹80)" : "NO",                                                       // 28. Smart NFC Feature
        it.hasGiftBox ? "YES (+₹99)" : "NO",                                                   // 29. Luxury Gift Box
        payload.totalAmount || 0,                                                              // 30. Order Grand Total (₹)
        payload.channel || payload.paymentMethod || "Online Order",                            // 31. Payment / Checkout Channel
        payload.paymentStatus || "Pending Verification",                                       // 32. Payment Status
        JSON.stringify(it)                                                                     // 33. Raw Item JSON (Zero Data Loss)
      ];

      sheet.appendRow(row);

      processedItems.push({
        unitLabel: unitLabel,
        productName: it.productName,
        finish: it.finish,
        unitPrice: it.unitTotalPrice,
        songTitle: it.songTitle || it.song,
        artist: it.artist,
        spotifyUrl: it.spotifyUrl,
        codeImgDriveUrl: codeImgDriveUrl,
        backDesc: backDesc,
        backImgDriveUrl: backImgDriveUrl,
        hasNfc: it.hasNfc,
        hasGiftBox: it.hasGiftBox,
        isDuoSeparate: it.isDuoSeparate,
        song2: it.song2,
        spotifyUrl2: it.spotifyUrl2,
        engrave2: it.engrave2
      });
    }

    // Send instant email notification with full order breakdown
    try {
      sendOrderEmailNotification(payload, processedItems);
    } catch (mailErr) {
      Logger.log("Email Notification Warning: " + mailErr.toString());
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      orderId: payload.orderId,
      unitsLogged: items.length,
      timestamp: payload.createdAt
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log("Fatal doPost Error: " + err.toString());
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * HTTP GET Handler - Diagnostic status page
 */
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  var rowCount = sheet ? Math.max(0, sheet.getLastRow() - 1) : 0;

  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>TuneTagZ Webhook Status</title>' +
    '<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#030c07;color:#f1eada;padding:40px;line-height:1.6;}' +
    '.card{max-width:580px;margin:0 auto;background:#051910;border:1px solid #16a34a;border-radius:8px;padding:30px;box-shadow:0 10px 30px rgba(0,0,0,0.5);}' +
    'h2{color:#22c55e;margin-top:0;} .badge{background:#15803d;color:#fff;padding:4px 10px;border-radius:4px;font-size:0.8rem;font-weight:bold;}' +
    '.meta{margin-top:20px;font-size:0.9rem;border-top:1px dashed rgba(241,234,218,0.2);padding-top:15px;color:rgba(241,234,218,0.7);}' +
    '</style></head><body>' +
    '<div class="card">' +
    '<h2>🎵 TuneTagZ Google Sheets & Email Webhook</h2>' +
    '<p><span class="badge">ACTIVE & READY</span> Order logging endpoint is running normally.</p>' +
    '<div class="meta">' +
    '<strong>Connected Spreadsheet:</strong> ' + ss.getName() + '<br/>' +
    '<strong>Target Sheet Tab:</strong> ' + SHEET_NAME + '<br/>' +
    '<strong>Total Logged Orders:</strong> ' + rowCount + '<br/>' +
    '<strong>Recipient Admin Email:</strong> ' + (ADMIN_EMAIL || Session.getActiveUser().getEmail()) +
    '</div></div></body></html>';

  return HtmlService.createHtmlOutput(html);
}

/**
 * Retrieves or creates the Orders sheet tab with formatted headers
 */
function getOrCreateOrdersSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME, 0);
  }

  // Create header row if empty
  if (sheet.getLastRow() === 0) {
    var headers = [
      "Timestamp (IST)",
      "Order ID",
      "Keychain Unit #",
      "Customer Name",
      "Phone Number",
      "Street Address",
      "City",
      "Pincode",
      "Full Shipping Address",
      "Keychain Model",
      "Product SKU",
      "Finish / Tone",
      "Quantity",
      "Unit Base Price (₹)",
      "Item Total (₹)",
      "Spotify Code Source",
      "Song / Track Title",
      "Artist Name",
      "Spotify URL / Track Link",
      "Uploaded Code Image",
      "Duo Tag 2 Song Title",
      "Duo Tag 2 Spotify Link",
      "Back Customization Type",
      "Back Engraved Text",
      "Back Text Font Size",
      "Back Photo / Image",
      "Duo Tag 2 Back Name",
      "Smart NFC Feature",
      "Luxury Gift Box",
      "Order Grand Total (₹)",
      "Payment Channel",
      "Payment Status",
      "Raw Item JSON"
    ];

    sheet.appendRow(headers);

    // Format Header Row: TuneTagz Dark Green Palette
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#072a1a");
    headerRange.setFontColor("#f1eada");
    headerRange.setFontWeight("bold");
    headerRange.setFontFamily("Segoe UI");
    headerRange.setFontSize(10);
    headerRange.setHorizontalAlignment("center");
    headerRange.setVerticalAlignment("middle");
    sheet.setRowHeight(1, 38);
    sheet.setFrozenRows(1);
    sheet.setFrozenColumns(2); // Freeze Timestamp and Order ID
  }

  return sheet;
}

/**
 * Retrieves or creates a Google Drive folder for order image uploads
 */
function getOrCreateDriveFolder() {
  try {
    var folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
    if (folders.hasNext()) {
      return folders.next();
    }
    var folder = DriveApp.createFolder(DRIVE_FOLDER_NAME);
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return folder;
  } catch (e) {
    Logger.log("Drive folder retrieval error: " + e.toString());
    return null;
  }
}

/**
 * Saves a Base64 data URL string directly to Google Drive as an image file
 */
function saveBase64ImageToDrive(base64Data, fileName, folder) {
  try {
    if (!folder) folder = getOrCreateDriveFolder();
    if (!folder) return "";

    var parts = base64Data.split(",");
    if (parts.length < 2) return "";

    var meta = parts[0];
    var data = parts[1];
    var mimeMatch = meta.match(/:(.*?);/);
    var mimeType = mimeMatch ? mimeMatch[1] : "image/png";

    var decodedBytes = Utilities.base64Decode(data);
    var blob = Utilities.newBlob(decodedBytes, mimeType, fileName);

    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (err) {
    Logger.log("Save Base64 to Drive error: " + err.toString());
    return fileName || "Image Saved";
  }
}

/**
 * Sends a rich, formatted HTML email notification to the store owner
 */
function sendOrderEmailNotification(payload, items) {
  var recipient = ADMIN_EMAIL || Session.getActiveUser().getEmail();
  if (!recipient) return;

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetUrl = ss.getUrl();

  var subject = "🎵 TuneTagZ New Order #" + payload.orderId + " - " + payload.customerName + " (₹" + payload.totalAmount + ")";

  // Build items table HTML
  var itemsTableHtml = "";
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    itemsTableHtml += '<tr style="border-bottom:1px solid #1a3325;">' +
      '<td style="padding:12px; font-weight:bold; color:#22c55e;">#' + (i + 1) + ' (' + it.unitLabel + ')</td>' +
      '<td style="padding:12px;">' +
        '<strong style="font-size:15px; color:#f1eada;">' + it.productName + '</strong><br/>' +
        '<span style="color:#94a3b8; font-size:12px;">Tone: ' + it.finish + '</span><br/>' +
        (it.songTitle ? '🎵 <b>' + it.songTitle + '</b> ' + (it.artist ? '— ' + it.artist : '') + '<br/>' : '') +
        (it.spotifyUrl ? '🔗 <a href="' + it.spotifyUrl + '" style="color:#22c55e; text-decoration:none;">Spotify Link ↗</a><br/>' : '') +
        (it.codeImgDriveUrl && it.codeImgDriveUrl.indexOf("http") === 0 ? '📁 <a href="' + it.codeImgDriveUrl + '" style="color:#38bdf8; text-decoration:none;">View Uploaded Code Image ↗</a><br/>' : '') +
        (it.isDuoSeparate ? '<div style="background:rgba(244,63,94,0.1); padding:6px; border-radius:4px; margin-top:4px;">' +
          '<b>Tag 2:</b> ' + (it.song2 || '') + (it.spotifyUrl2 ? ' (<a href="' + it.spotifyUrl2 + '" style="color:#f43f5e;">Link ↗</a>)' : '') + '<br/>' +
          (it.engrave2 ? '<b>Tag 2 Back:</b> "' + it.engrave2 + '"' : '') +
        '</div>' : '') +
      '</td>' +
      '<td style="padding:12px; font-size:13px; color:#cbd5e1;">' +
        it.backDesc + '<br/>' +
        (it.backImgDriveUrl && it.backImgDriveUrl.indexOf("http") === 0 ? '<a href="' + it.backImgDriveUrl + '" style="color:#38bdf8; text-decoration:none;">🖼️ Open High-Res Back Photo ↗</a><br/>' : '') +
        (it.hasNfc ? '<span style="color:#f59e0b;">📶 Smart NFC (+₹80)</span><br/>' : '') +
        (it.hasGiftBox ? '<span style="color:#eab308;">🎁 Gift Box (+₹99)</span>' : '') +
      '</td>' +
      '<td style="padding:12px; text-align:right; font-weight:bold; color:#f1eada; font-size:15px;">₹' + it.unitPrice + '</td>' +
    '</tr>';
  }

  var htmlBody = '<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif; background:#020a06; color:#f1eada; margin:0; padding:24px;">' +
    '<div style="max-width:680px; margin:0 auto; background:#051810; border:1px solid #166534; border-radius:8px; overflow:hidden; box-shadow:0 8px 30px rgba(0,0,0,0.6);">' +
      '<div style="background:linear-gradient(135deg, #072a1a, #0d4a2b); padding:24px 28px; border-bottom:2px solid #22c55e;">' +
        '<h1 style="margin:0; font-size:24px; color:#22c55e; letter-spacing:0.04em;">TuneTagZ Order Recorded</h1>' +
        '<div style="color:rgba(241,234,218,0.8); font-size:13px; margin-top:6px;">Order ID: <strong style="color:#fff; font-size:15px;">' + payload.orderId + '</strong> • ' + payload.createdAt + '</div>' +
      '</div>' +
      
      '<div style="padding:24px 28px;">' +
        '<div style="background:#030f09; border:1px solid rgba(241,234,218,0.1); border-radius:6px; padding:16px 20px; margin-bottom:22px;">' +
          '<h3 style="margin:0 0 10px; font-size:14px; text-transform:uppercase; color:#22c55e; letter-spacing:0.05em;">Customer & Delivery Details</h3>' +
          '<table style="width:100%; font-size:13px; color:#cbd5e1; border-collapse:collapse;">' +
            '<tr><td style="padding:4px 0; width:130px; color:#94a3b8;">Customer Name:</td><td style="padding:4px 0; font-weight:bold; color:#fff;">' + payload.customerName + '</td></tr>' +
            '<tr><td style="padding:4px 0; color:#94a3b8;">Phone:</td><td style="padding:4px 0;"><a href="tel:' + payload.phone + '" style="color:#22c55e; text-decoration:none; font-weight:bold;">' + payload.phone + '</a> (<a href="https://wa.me/91' + payload.phone.replace(/[^0-9]/g, '') + '" style="color:#22c55e; text-decoration:none;">Open WhatsApp ↗</a>)</td></tr>' +
            '<tr><td style="padding:4px 0; color:#94a3b8;">Shipping Address:</td><td style="padding:4px 0; color:#f1eada;">' + (payload.fullAddress || payload.address) + '</td></tr>' +
            '<tr><td style="padding:4px 0; color:#94a3b8;">Checkout Channel:</td><td style="padding:4px 0; color:#e2e8f0;">' + payload.channel + '</td></tr>' +
          '</table>' +
        '</div>' +

        '<h3 style="margin:0 0 12px; font-size:14px; text-transform:uppercase; color:#22c55e; letter-spacing:0.05em;">Ordered Keychain Items (' + items.length + ')</h3>' +
        '<table style="width:100%; border-collapse:collapse; margin-bottom:20px;">' +
          '<thead><tr style="background:#072a1a; color:#22c55e; font-size:11px; text-transform:uppercase; letter-spacing:0.05em;">' +
            '<th style="padding:8px 12px; text-align:left;">#</th>' +
            '<th style="padding:8px 12px; text-align:left;">Keychain / Spotify Code</th>' +
            '<th style="padding:8px 12px; text-align:left;">Back & Features</th>' +
            '<th style="padding:8px 12px; text-align:right;">Subtotal</th>' +
          '</tr></thead>' +
          '<tbody>' + itemsTableHtml + '</tbody>' +
        '</table>' +

        '<div style="text-align:right; padding:16px 0; border-top:1px dashed rgba(241,234,218,0.2); font-size:18px;">' +
          'Total Order Amount: <strong style="color:#22c55e; font-size:24px;">₹' + payload.totalAmount + '</strong>' +
          '<div style="font-size:11px; color:#94a3b8; margin-top:4px;">Includes Free Tracked Shipping Across India</div>' +
        '</div>' +

        '<div style="margin-top:24px; text-align:center;">' +
          '<a href="' + sheetUrl + '" style="display:inline-block; background:#22c55e; color:#030c07; text-decoration:none; font-weight:bold; font-size:13px; padding:12px 24px; border-radius:4px; text-transform:uppercase; letter-spacing:0.06em;">Open Orders in Google Sheets ↗</a>' +
        '</div>' +
      '</div>' +

      '<div style="background:#020a06; padding:16px 28px; text-align:center; font-size:11px; color:rgba(241,234,218,0.5); border-top:1px solid rgba(241,234,218,0.08);">' +
        'TuneTagZ Production Notification System • Automatically logged to Google Sheets' +
      '</div>' +
    '</div></body></html>';

  MailApp.sendEmail({
    to: recipient,
    subject: subject,
    htmlBody: htmlBody,
    body: "New TuneTagz Order #" + payload.orderId + "\n\nCustomer: " + payload.customerName + " (" + payload.phone + ")\nAddress: " + (payload.fullAddress || payload.address) + "\nTotal: ₹" + payload.totalAmount + "\n\n" + (payload.itemsSummary || "") + "\n\nView Sheet: " + sheetUrl
  });
}

/**
 * Quick Test Function: Run directly from Apps Script editor to test spreadsheet and email
 */
function testSync() {
  var samplePayload = {
    orderId: "TZ-99999",
    customerName: "Test Customer",
    phone: "9876543210",
    streetAddress: "123 Music Boulevard, Suite 4B",
    city: "Mumbai",
    pincode: "400001",
    fullAddress: "123 Music Boulevard, Suite 4B, Mumbai - 400001",
    totalAmount: 518,
    channel: "WhatsApp Checkout",
    paymentStatus: "Pending Verification",
    createdAt: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    items: [
      {
        itemNumber: 1,
        totalUnits: 2,
        unitLabel: "1 of 2",
        productKey: "mtl001",
        productName: "Spotify Metal Tag",
        finish: "Metallic Edition",
        quantity: 1,
        unitBasePrice: 169,
        unitTotalPrice: 219,
        spotifySource: "Spotify Track Link",
        songTitle: "Blinding Lights",
        artist: "The Weeknd",
        spotifyUrl: "https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b",
        backCustomization: "text",
        backText: "Sneha & Arjun • 14.02.2024",
        backTextSize: "18px",
        hasNfc: false,
        hasGiftBox: false
      },
      {
        itemNumber: 2,
        totalUnits: 2,
        unitLabel: "2 of 2",
        productKey: "spt001",
        productName: "Spotify Code Tag",
        finish: "Matte Black + Silk Gold PLA",
        quantity: 1,
        unitBasePrice: 249,
        unitTotalPrice: 299,
        spotifySource: "Custom Uploaded Image",
        uploadedCodeName: "custom_code_qr.png",
        backCustomization: "none",
        backText: "",
        hasNfc: false,
        hasGiftBox: false
      }
    ]
  };

  var fakeEvent = { postData: { contents: JSON.stringify(samplePayload) } };
  var res = doPost(fakeEvent);
  Logger.log("Test Output: " + res.getContent());
}
