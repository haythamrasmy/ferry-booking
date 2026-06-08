import jsPDF from "jspdf";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import cairoFont from "../../public/fonts/Cairo-Regular.ttf";

/**
 * Pure, self-contained Arabic shaping utility to fix jsPDF script detachment.
 * Maps isolated Arabic glyphs to their proper initial, medial, or final shapes.
 */
const fixArabicText = (text) => {
  if (!text) return "";
  
  const arabicMap = {
    'ا': ['ﺍ', 'ﺎ', 'ﺎ', 'ﺍ'], 'ب': ['ﺏ', 'ﺐ', 'ﺒ', 'ﺑ'], 'ت': ['ﺕ', 'ﺖ', 'ﺘ', 'ﺗ'],
    'ث': ['ﺙ', 'ﺚ', 'ﺜ', 'ﺛ'], 'ج': ['ﺝ', 'ﺞ', 'ﺠ', 'ﺟ'], 'ح': ['ﺡ', 'ﺢ', 'ﺤ', 'ﺣ'],
    'خ': ['ﺥ', 'ﺦ', 'ﺨ', 'ﺧ'], 'د': ['ﺩ', 'ﺪ', 'ﺪ', 'ﺩ'], 'ذ': ['ﺫ', 'ﺬ', 'ﺬ', 'ﺫ'],
    'ر': ['ﺭ', 'ﺮ', 'ﺮ', 'ﺭ'], 'ز': ['ﺯ', 'ﺰ', 'ﺰ', 'ﺯ'], 'س': ['ﺱ', 'ﺲ', 'ﺴ', 'ﺳ'],
    'ش': ['ﺵ', 'ﺶ', 'ﺸ', 'ﺷ'], 'ص': ['ﺹ', 'ﺺ', 'ﺼ', 'ﺻ'], 'ض': ['ﺽ', 'ﺾ', 'ﻀ', 'ﺿ'],
    'ط': ['ﻁ', 'ﻂ', 'ﻄ', 'ﻃ'], 'ظ': ['ﻅ', 'ﻆ', 'ﻈ', ' الظ'], 'ع': ['ﻉ', 'ﻊ', 'ﻌ', 'ﻋ'],
    'غ': ['ﻍ', 'ﻎ', 'ﻐ', 'ﻏ'], 'ف': ['ﻑ', 'ﻒ', 'ﻔ', 'ﻓ'], 'ق': ['ﻕ', 'ﻖ', 'ﻘ', 'ﻗ'],
    'ك': ['ﻙ', 'ﻚ', 'ﻜ', 'ﻛ'], 'ل': ['ﻝ', 'ﻞ', 'ﻠ', 'ﻟ'], 'م': ['ﻡ', 'ﻢ', 'ﻤ', 'ﻣ'],
    'ن': ['ﻥ', 'ﻦ', 'ﻨ', 'ﻧ'], 'ه': ['ﻩ', 'ﻪ', 'ﻬ', 'ﻫ'], 'و': ['ﻭ', 'ﻮ', 'ﻮ', 'ﻭ'],
    'ي': ['ﻱ', 'ﻲ', 'ﻴ', 'ﻳ'], 'ة': ['ﺓ', 'ﺔ', 'ﺔ', 'ﺓ'], 'ى': ['ﻯ', 'ﻰ', 'ﻰ', 'ﻯ'],
    'لا': ['ﻻ', 'ﻼ', 'ﻼ', 'ﻻ']
  };

  let chars = text.split("");
  let shaped = [];

  for (let i = 0; i < chars.length; i++) {
    let current = chars[i];
    if (arabicMap[current]) {
      let prev = chars[i - 1];
      let next = chars[i + 1];
      
      let hasPrev = prev && arabicMap[prev] && !['ا', 'د', 'ذ', 'ر', 'ز', 'و', 'ة', 'ى'].includes(prev);
      let hasNext = next && arabicMap[next];

      if (hasPrev && hasNext) shaped.push(arabicMap[current][2]);      // Medial
      else if (hasPrev && !hasNext) shaped.push(arabicMap[current][1]); // Final
      else if (!hasPrev && hasNext) shaped.push(arabicMap[current][3]); // Initial
      else shaped.push(arabicMap[current][0]);                          // Isolated
    } else {
      shaped.push(current);
    }
  }
  
  // Reverse the string explicitly for Right-To-Left execution blocks
  return shaped.reverse().join("");
};

export const generateTicketPDF = async (booking) => {
  const doc = new jsPDF();

  // 1. Setup Fonts
  doc.addFont(cairoFont, "Cairo", "normal");
  doc.setFont("Cairo");

  // --- PAGE 1: PASSENGER TICKET ---
  
  // Outer Border
  doc.setDrawColor(0, 51, 102);
  doc.rect(10, 10, 190, 277);

  // Logo Placeholder / Image
  const logo = "/logo.png";
  try {
    doc.addImage(logo, "PNG", 15, 15, 35, 35);
  } catch (e) {
    console.warn("Logo image could not be loaded, skipping placeholder.", e);
  }

  // Header Typography
  doc.setTextColor(0, 51, 102);
  doc.setFontSize(22);
  doc.text("Wadi El Nile Ferry Ticket", 55, 35);

  // Large Background Watermark
  doc.setTextColor(230, 230, 230); 
  doc.setFontSize(70);
  doc.text("WNF", 70, 160, { angle: 45 });

  // Main Ticket Details
  doc.setTextColor(0);
  doc.setFontSize(14);
  doc.text(`Ticket ID: ${booking.ticketId || "N/A"}`, 20, 70);
  doc.text(`Passenger: ${booking.name || "N/A"}`, 20, 82);
  doc.text(`Passport: ${booking.passport || "N/A"}`, 20, 94);
  doc.text(`Ticket Type: ${booking.ticketType || "N/A"}`, 20, 106);
  
  // Cleanly handle mixed Trip labels using our safe BiDi helper
  const tripLabel = "Trip: ";
const processedTripData =
  booking.trip || "N/A";
doc.text(
  `${tripLabel}${processedTripData}`,
  20,
  118
);

  // Tracking Section
  doc.setFontSize(14);
  doc.setTextColor(0, 51, 153);
  doc.text(`Tracking ID: ${booking.trackingId || "N/A"}`, 20, 135);

  doc.setTextColor(100);
  doc.setFontSize(11);
  doc.text(`Issued: ${new Date().toLocaleDateString()}`, 20, 145);

  // QR Code Generation
  try {
    const qrData = await QRCode.toDataURL(
      JSON.stringify({
        ticketId: booking.ticketId,
        name: booking.name,
        passport: booking.passport,
        ticketType: booking.ticketType,
        trip: booking.trip,
        status: booking.status,
      })
    );
    doc.addImage(qrData, "PNG", 145, 65, 45, 45);
  } catch (err) {
    console.error("Failed to generate QR code", err);
  }

  // Primary Ticket Barcode (Using Tracking ID)
  if (booking.trackingId && typeof window !== "undefined") {
    try {
      const ticketCanvas = document.createElement("canvas");
      JsBarcode(ticketCanvas, booking.trackingId, { format: "CODE128", displayValue: false });
      const ticketBarcodeImg = ticketCanvas.toDataURL("image/png");
      
      doc.setTextColor(0);
      doc.setFontSize(12);
      doc.text("Ticket Barcode:", 20, 165);
      doc.addImage(ticketBarcodeImg, "PNG", 20, 170, 100, 20);
    } catch (err) {
      console.error("Failed to generate ticket barcode", err);
    }
  }

  // Separation Line
  doc.setDrawColor(200);
  doc.line(20, 205, 190, 205);

  // Footer / Important Terms
  doc.setTextColor(80);
  doc.setFontSize(11);
  doc.text("Please arrive 2 hours before departure.", 20, 220);
  doc.text("Keep this ticket during the whole trip.", 20, 230);
  
  doc.setTextColor(0, 51, 102);
  doc.setFontSize(12);
  doc.text("Wadi El Nile River Transport Authority", 20, 265);

  // Clean local app state if necessary
  localStorage.removeItem("pendingBooking");

  // --- PAGE 2+: CARGO ITEMS SECTION ---
  if (booking.cargo && Object.keys(booking.cargo).length > 0 && typeof window !== "undefined") {

    console.log("BOOKING =", booking);
console.log("CARGO =", booking.cargo);
    doc.addPage();

    
    
    let cargoY = 30;
    doc.setTextColor(0, 51, 102);
    doc.setFontSize(18);
    doc.text("Cargo Tracking Tags", 20, 20);
    doc.line(20, 23, 190, 23);

    // Prepare clear high-DPI canvas wrapper
    const cargoCanvas = document.createElement("canvas");
    cargoCanvas.width = 400;  
    cargoCanvas.height = 100;

    console.log("CARGO PDF:", booking.cargo);

    Object.entries(booking.cargo).forEach(([item, qty], itemIndex) => {
      for (let i = 1; i <= qty; i++) {
        if (cargoY > 235) {
          doc.addPage();
          cargoY = 30; 
        }

        const serialNumber = `${booking.ticketId || "CRG"}-${itemIndex + 1}-${i}`;

        // Create a URL-safe, clean alphanumeric data string for the scanner lookup payload
        const safeItemString = item.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, "_");
const barcodeData = serialNumber;

        // Shape and format the item name securely using our internal helper function
        const rtlItemName = fixArabicText(item);
        const labelDisplayText = `(${i}/${qty}) :Item ${rtlItemName}`;

        try {
          // Generate sharp barcode graphics
          JsBarcode(cargoCanvas, barcodeData, {
            format: "CODE128",
            height: 80,
            width: 2,
            displayValue: false 
          });
          
          const cargoBarcodeImg = cargoCanvas.toDataURL("image/png");

          // Render Text Metadata Block
          doc.setTextColor(0);
          doc.setFontSize(13);
          doc.setFont("Cairo"); 
          doc.text(labelDisplayText, 25, cargoY);
          
          doc.setFontSize(10);
          doc.setTextColor(100);
          doc.text(`Serial: ${serialNumber}`, 25, cargoY + 6);

          // Render Accompanying Barcode Graphics
          doc.addImage(cargoBarcodeImg, "PNG", 25, cargoY + 10, 110, 22);
          
          // Outer card boundary box decoration around each item block
          doc.setDrawColor(220);
          doc.rect(20, cargoY - 6, 170, 42);

          cargoY += 52;
        } catch (err) {
          console.error(`Error rendering cargo barcode tag for serial: ${serialNumber}`, err);
        }
      }
    });
  }

  // Save Executed Document Assembly Stream
  doc.save(`${booking.ticketId || "ticket"}.pdf`);
};