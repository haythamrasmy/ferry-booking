import jsPDF from "jspdf";
import QRCode from "qrcode";
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
  console.log("PDF BOOKING =", booking);
  console.log("PDF TRACKING =", booking.trackingId);
  console.log("PDF TICKET =", booking.ticketId);
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
    const qrData =
      await QRCode.toDataURL(
        JSON.stringify({
          ticketId: booking.ticketId,
          name: booking.name,
          passport: booking.passport,
          ticketType: booking.ticketType,
          trip: booking.trip,
          status: booking.status,
        }),
        {
          width: 500,
          margin: 1,
        }
      );

    doc.addImage(qrData, "PNG", 145, 65, 45, 45);
  } catch (err) {
    console.error("Failed to generate QR code", err);
  }

  // Primary Ticket Barcode (Using Tracking ID)

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


    console.log("CARGO PDF:", booking.cargo);

    console.log(
      "CARGO KEYS:",
      Object.keys(booking.cargo)
    );

    console.log(
      "CARGO ENTRIES:",
      Object.entries(booking.cargo)
    );

    for (const [itemIndex, [item, qty]] of Object.entries(
      Object.entries(booking.cargo)
    )) {
      for (let i = 1; i <= qty; i++) {
if (cargoY > 180)
            {
          doc.addPage();
          cargoY = 30;
        }

        const serialNumber =
          `${booking.ticketId}-${item.replaceAll(" ", "_")}-${i}`;

        console.log(
          "PDF SERIAL =",
          serialNumber
        );

        // Create a URL-safe, clean alphanumeric data string for the scanner lookup payload


        // Shape and format the item name securely using our internal helper function
        const rtlItemName = item;
        const labelDisplayText =
          `${rtlItemName} (${i}/${qty})`;
        try {

          const cargoQrData =
            await QRCode.toDataURL(
              serialNumber,
              {
                width: 300,
                margin: 1,
              }
            );

        // ================================
// CUT HERE TOP
// ================================
doc.setDrawColor(180);
doc.setLineDashPattern([2, 2], 0);
doc.line(20, cargoY - 12, 190, cargoY - 12);

doc.setFontSize(10);
doc.setTextColor(120);
doc.text("✂ CUT HERE ✂", 95, cargoY - 15, {
  align: "center",
});

// Main Tag Border
doc.setLineDashPattern([], 0);
doc.setDrawColor(0, 51, 102);
doc.setLineWidth(1);

doc.roundedRect(
  20,
  cargoY - 5,
  170,
  70,
  3,
  3
);

// Header Bar
doc.setFillColor(0, 51, 102);
doc.rect(20, cargoY - 5, 170, 12, "F");

doc.setTextColor(255);
doc.setFontSize(12);
doc.text("CARGO TRACKING TAG", 105, cargoY + 3, {
  align: "center",
});

// Large QR Code
doc.addImage(
  cargoQrData,
  "PNG",
  28,
  cargoY + 10,
  45,
  45
);

// Cargo Information
doc.setTextColor(0);
doc.setFont("Cairo");

doc.setFontSize(14);
doc.text(labelDisplayText, 80, cargoY + 20);

doc.setFontSize(11);

doc.text(
  `Ticket ID: ${booking.ticketId}`,
  80,
  cargoY + 32
);

doc.text(
  `Tracking ID: ${booking.trackingId || "N/A"}`,
  80,
  cargoY + 42
);

doc.text(
  `Piece: ${i}/${qty}`,
  80,
  cargoY + 52
);

doc.setFontSize(9);
doc.setTextColor(120);

doc.text(
  serialNumber,
  80,
  cargoY + 60
);

// CUT HERE BOTTOM
doc.setDrawColor(180);
doc.setLineDashPattern([2, 2], 0);

doc.line(
  20,
  cargoY + 78,
  190,
  cargoY + 78
);

doc.setFontSize(10);

doc.text(
  "✂ CUT HERE ✂",
  95,
  cargoY + 74,
  {
    align: "center",
  }
);

doc.setLineDashPattern([], 0);

// Move Next Tag
cargoY += 90;
        }
         catch (err) {
          console.error(`Error rendering cargo barcode tag for serial: ${serialNumber}`, err);
        }
      }
    }
  }

  // Save Executed Document Assembly Stream
  doc.save(`${booking.ticketId || "ticket"}.pdf`);
};