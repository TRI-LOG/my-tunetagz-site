# 📊 TuneTagZ Google Sheets & Email Webhook Integration Guide

This guide explains how to connect your **TuneTagZ** store with **Google Sheets** and **Instant Email Notifications**.

---

## ⚡ What Happens on Every Order

1. **Every Detail Captured Without Data Loss**:
   - **Order ID** (e.g. `TZ-74291`)
   - **Customer & Shipping**: Name, Phone, Street Address, City, Pincode, and Full Shipping Address
   - **Keychain Model**: Exact model name (`Spotify Metal Tag`, `Spotify Code Tag`, `Spotify Duo Set`, `Vinyl Record NFC Tag`, `Rocky Keychain`) and SKU
   - **Finish / Tone**: E.g., `Metallic Edition`, `Silk Gold PLA`, `Silk Silver PLA`, `Emerald PLA`, etc.
   - **Spotify Code / Track**: Song title, Artist, Spotify track link, or custom uploaded image
   - **Back Customization**: None / Text Engraving (with exact text and font size) / Custom Uploaded Photo
   - **Duo Set Details**: Tag 1 and Tag 2 separate details (songs, links, and engravings)
   - **Add-ons**: Smart NFC Chip (+₹80), Luxury Gift Box (+₹99)
   - **Payment Details**: Channel (WhatsApp / Instagram / Direct), Order Grand Total (₹), Payment Status
   - **Raw Item JSON**: Complete, uncompressed JSON data stored in Column 33 for 100% data preservation.

2. **Multi-Keychain Cart Handling**:
   - If multiple different keychains (or multiple quantities) are added to the cart, **each keychain is added as its own individual row** in the spreadsheet, all sharing the **exact same Order ID**.
   - Manufacturing and engraving workshops can inspect and track each keychain row independently without confusion!

3. **High-Resolution Image Preservation (Zero Truncation)**:
   - When customers upload Spotify code images or metal back photos, the Google Apps Script automatically saves the images directly to a Google Drive folder (`TuneTagz Orders Uploads`).
   - A clickable `=HYPERLINK(...)` link to view the high-resolution image is placed right into the sheet cell and email.

4. **Instant Email Alerts**:
   - A branded HTML email is automatically dispatched to the store owner's email address upon checkout with the customer's phone (with 1-click WhatsApp/Call links), shipping address, and a breakdown of all keychains.

---

## 🚀 Step-by-Step Setup Instructions

### Step 1: Open Google Sheets
1. Create a new Google Sheet (or open an existing one) named **`TuneTagz Orders`**.
2. In the top navigation bar, click **Extensions** > **Apps Script**.

### Step 2: Paste the Webhook Code
1. Delete any existing boilerplate code in the editor (`Code.gs`).
2. Open [`google-apps-script.js`](./google-apps-script.js) from your project folder.
3. Copy all code and paste it into the Google Apps Script editor.
4. *(Optional)* If you want email alerts sent to a specific email rather than your Google account, set `ADMIN_EMAIL = "your-email@gmail.com"` on line 22.
5. Click **Save** (💾 icon or `Ctrl + S` / `Cmd + S`).

### Step 3: Deploy as a Web App
1. Click the blue **Deploy** button in the top right > **New deployment**.
2. Click the gear icon (⚙️) next to "Select type" and select **Web app**.
3. Fill in the fields:
   - **Description**: `TuneTagz Order Webhook v2`
   - **Execute as**: `Me (your-email@gmail.com)`
   - **Who has access**: `Anyone` *(Crucial so orders from your website visitors can sync)*
4. Click **Deploy**.
5. When prompted with "Authorization required", click **Authorize access**, select your Google account, click **Advanced** > **Go to Untitled project (unsafe)**, and click **Allow**.
6. Copy the **Web app URL** (it looks like `https://script.google.com/macros/s/.../exec`).

### Step 4: Verify in `order.html`
- In [`order.html`](./order.html#L6939), update `GOOGLE_SHEET_WEBHOOK_URL` with your new Web app URL if it has changed:
  ```javascript
  const GOOGLE_SHEET_WEBHOOK_URL = window.TUNETAGZ_GOOGLE_SHEET_URL || "YOUR_NEW_WEB_APP_URL_HERE";
  ```

---

## 📋 Spreadsheet Column Structure

The script automatically generates and formats the following 33 columns in the **`Orders`** sheet tab:

| Col # | Header Name | Description |
|---|---|---|
| **A** | `Timestamp (IST)` | Date & time order was placed in Indian Standard Time |
| **B** | `Order ID` | Order number (e.g. `TZ-74291`, shared across all keychains in cart) |
| **C** | `Keychain Unit #` | E.g. `1 of 3`, `2 of 3`, `3 of 3` |
| **D** | `Customer Name` | Customer's full name |
| **E** | `Phone Number` | Customer's 10-digit mobile number |
| **F** | `Street Address` | Flat, House, Building, Street |
| **G** | `City` | Delivery city |
| **H** | `Pincode` | Postal code |
| **I** | `Full Shipping Address` | Complete consolidated delivery destination |
| **J** | `Keychain Model` | Model name (e.g., `Spotify Metal Tag`, `Spotify Duo Set`) |
| **K** | `Product SKU` | `mtl001`, `spt001`, `duo001`, `nfc001`, `rky001` |
| **L** | `Finish / Tone` | `Metallic Edition`, `Silk Gold PLA`, `Silk Silver PLA`, `Emerald PLA`, etc. |
| **M** | `Quantity` | Unit count (1) |
| **N** | `Unit Base Price (₹)` | Keychain base launch price |
| **O** | `Item Total (₹)` | Final subtotal including add-ons |
| **P** | `Spotify Code Source` | `Spotify Track Link` or `Custom Code Image` |
| **Q** | `Song / Track Title` | Name of the song |
| **R** | `Artist Name` | Track artist |
| **S** | `Spotify URL / Track Link` | Link to open track in Spotify |
| **T** | `Uploaded Code Image` | Clickable Google Drive link to uploaded Spotify code |
| **U** | `Duo Tag 2 Song Title` | Tag 2 song title (if Duo Set) |
| **V** | `Duo Tag 2 Spotify Link` | Tag 2 Spotify URL (if Duo Set) |
| **W** | `Back Customization Type` | `NONE`, `TEXT`, or `IMAGE` |
| **X** | `Back Engraved Text` | Exact back engraved text |
| **Y** | `Back Text Font Size` | Font size (e.g., `18px`, `22px`) |
| **Z** | `Back Photo / Image` | Clickable Google Drive link to customer's uploaded back image |
| **AA** | `Duo Tag 2 Back Name` | Tag 2 back engraving name (if Duo Set) |
| **AB** | `Smart NFC Feature` | `YES (+₹80)` or `NO` |
| **AC** | `Luxury Gift Box` | `YES (+₹99)` or `NO` |
| **AD** | `Order Grand Total (₹)` | Total order amount across all items |
| **AE** | `Payment Channel` | `WhatsApp Checkout`, `Instagram DM`, or `Direct Receipt` |
| **AF** | `Payment Status` | `Pending Verification` / `Receipt Logged` |
| **AG** | `Raw Item JSON` | Complete uncompressed JSON for 100% data preservation |
