import jsPDF from "jspdf";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";

// Correct configuration import for arabic-reshaper package
import ArabicReshaper from "arabic-reshaper";
import cairoFont from "../../public/fonts/Cairo-Regular.ttf";

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
  doc.text(`Trip: ${booking.trip || "N/A"}`, 20, 118);

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
    doc.addPage();
    
    let cargoY = 30;
    doc.setTextColor(0, 51, 102);
    doc.setFontSize(18);
    doc.text("Cargo Tracking Tags", 20, 20);
    doc.line(20, 23, 190, 23);

    const cargoCanvas = document.createElement("canvas");
    cargoCanvas.width = 400;  
    cargoCanvas.height = 100;

    // Safely instantiate the reshaper engine once outside the loop
    let reshaperInstance = null;
    try {
      reshaperInstance = new ArabicReshaper();
    } catch(e) {
      console.warn("ArabicReshaper could not initialize, falling back to primitive text fallback.", e);
    }

    Object.entries(booking.cargo).forEach(([item, qty], itemIndex) => {
      for (let i = 1; i <= qty; i++) {
        if (cargoY > 235) {
          doc.addPage();
          cargoY = 30; 
        }

        const serialNumber = `${booking.ticketId || "CRG"}-${itemIndex + 1}-${i}`;

        // Prepare the dual-data layout barcode payload (Serial + Item description)
        const safeItemString = item.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, "_");
        const barcodeData = `${serialNumber}|${safeItemString}`;

        // Shape and format the layout string safely
        let shapedItemName = item;
        if (reshaperInstance && typeof reshaperInstance.convert === "function") {
          shapedItemName = reshaperInstance.convert(item);
        } else if (typeof ArabicReshaper.reshape === "function") {
          shapedItemName = ArabicReshaper.reshape(item);
        }

        const rtlItemName = shapedItemName.split("").reverse().join("");
        const labelDisplayText = `(${i}/${qty}) :Item ${rtlItemName}`;

        try {
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
          
          // Outer boundary line box decoration around each individual tag item
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