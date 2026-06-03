try {
  // 1. Create a high-DPI canvas wrapper
  const cargoCanvas = document.createElement("canvas");
  
  // 2. Force high resolution scale by setting explicit canvas width/height dimensions
  cargoCanvas.width = 400;  // High internal width resolution
  cargoCanvas.height = 100; // High internal height resolution

  // 3. Keep data clean, short, and strictly matching your database ID key
  const cleanBarcodeData = serialNumber; // or booking.ticketId

  JsBarcode(cargoCanvas, cleanBarcodeData, {
    format: "CODE128",
    height: 80,
    width: 2,         // Ensures structural thickness of lines
    displayValue: false
  });
  
  const cargoBarcodeImg = cargoCanvas.toDataURL("image/png");

  // Render to PDF using your existing dimensions
  doc.addImage(cargoBarcodeImg, "PNG", 25, cargoY + 10, 110, 22);
  
} catch (err) {
  console.error(err);
}