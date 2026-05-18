import { useState, useEffect } from "react";
import { db, auth } from "./firebase";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import {
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

export default function FerryBookingWebsite() {
  const companyName = "هيئة وادي النيل للملاحة النهرية";

  const seats = [
    "A1", "A2", "A3", "A4",
    "B1", "B2", "B3", "B4",
    "C1", "C2", "C3", "C4",
  ];

  const [bookedSeats, setBookedSeats] = useState([]);
  const lockedSeats = ["C1"];
  const [selectedSeat, setSelectedSeat] = useState("");
  const [name, setName] = useState("");
  const [passport, setPassport] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [paymentImage, setPaymentImage] = useState("");
  const [bookings, setBookings] = useState([]);
  const [userBooking, setUserBooking] = useState(null);
  const [trips, setTrips] = useState([]);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [cargoType, setCargoType] = useState("");
  const [weight, setWeight] = useState("");
  const [quantity, setQuantity] = useState("");
  const [destination, setDestination] = useState("");
  const [notes, setNotes] = useState("");
  const [shipmentPaymentImage, setShipmentPaymentImage] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackedShipment, setTrackedShipment] = useState(null);

  const trackShipment = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "shipments"));
      const shipment = querySnapshot.docs.find(
        (doc) => doc.data().trackingId === trackingNumber
      );
      if (shipment) {
        setTrackedShipment({ id: shipment.id, ...shipment.data() });
      } else {
        alert("رقم التتبع غير موجود");
        setTrackedShipment(null);
      }
    } catch (error) {
      console.log(error);
      alert(error.message);
    }
  };

  useEffect(() => {
    const unsubscribeBookings = onSnapshot(
      collection(db, "bookings"),
      (snapshot) => {
        const currentTime = Date.now();
        const bookingData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setBookings(bookingData);
        const activeSeats = bookingData
          .filter((booking) => !booking.expiresAt || booking.expiresAt > currentTime)
          .map((booking) => booking.seat);
        setBookedSeats(activeSeats);
      }
    );

    const unsubscribeTrips = onSnapshot(
      collection(db, "trips"),
      (snapshot) => {
        const currentTime = Date.now();
        const tripsData = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((trip) => !trip.tripTimestamp || currentTime < trip.tripTimestamp + 86400000);
        setTrips(tripsData);
      }
    );

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAdmin(!!user);
    });

    return () => {
      unsubscribe();
      unsubscribeTrips();
      unsubscribeBookings();
    };
  }, []);

  useEffect(() => {
    if (!userBooking) return;
    const unsubscribe = onSnapshot(doc(db, "bookings", userBooking.id), (docSnap) => {
      if (docSnap.exists()) {
        setUserBooking({ id: docSnap.id, ...docSnap.data() });
      }
    });
    return () => unsubscribe();
  }, [userBooking]);

  const generateTicketPDF = async (booking) => {
    const doc = new jsPDF();
    doc.setDrawColor(0, 51, 102);
    doc.rect(10, 10, 190, 277);
    doc.setFontSize(22);
    doc.setTextColor(0, 51, 102);

    const logo = "/logo.png";
    doc.addImage(logo, "PNG", 20, 15, 30, 30);
    doc.text("Wadi El Nile Ferry Ticket", 20, 20);
    doc.setFontSize(60);
    doc.setTextColor(120);
    doc.text("WNF", 70, 160, { angle: 45 });

    doc.setTextColor(0);
    doc.setFontSize(14);
    doc.text(`Ticket ID: ${booking.ticketId}`, 20, 60);
    doc.text(`Passenger: ${booking.name}`, 20, 80);
    doc.text(`Passport: ${booking.passport}`, 20, 100);
    doc.text(`Seat: ${booking.seat}`, 20, 120);
    doc.text(`Trip: ${booking.trip}`, 20, 140);
    doc.text(`Issued: ${new Date().toLocaleDateString()}`, 20, 160);

    const qrData = await QRCode.toDataURL(
      JSON.stringify({
        ticketId: booking.ticketId,
        name: booking.name,
        passport: booking.passport,
        seat: booking.seat,
        trip: booking.trip,
        status: booking.status,
      })
    );
    doc.addImage(qrData, "PNG", 140, 30, 50, 50);

    const canvas = document.createElement("canvas");
    JsBarcode(canvas, booking.ticketId, { format: "CODE128" });
    const barcode = canvas.toDataURL("image/png");

    doc.line(20, 170, 190, 170);
    doc.setFontSize(11);
    doc.text("Please arrive 2 hours before departure.", 20, 185);
    doc.text("Keep this ticket during the whole trip.", 20, 195);
    doc.text("Wadi El Nile River Transport Authority", 20, 260);
    doc.addImage(barcode, "PNG", 20, 210, 150, 25);

    doc.save(`${booking.ticketId}.pdf`);
  };

  const saveBooking = async () => {
    if (!selectedSeat) {
      alert("اختر مقعد أولًا");
      return;
    }
    try {
      const querySnapshot = await getDocs(collection(db, "bookings"));
      const currentTime = Date.now();
      const alreadyBooked = querySnapshot.docs.some((doc) => {
        const data = doc.data();
        return (
          data.seat === selectedSeat &&
          (!data.expiresAt || data.expiresAt > currentTime)
        );
      });

      if (alreadyBooked) {
        alert("هذا المقعد تم حجزه بالفعل");
        return;
      }
      const ticketId = "WND-" + Math.floor(100000 + Math.random() * 900000);

      const bookingRef = await addDoc(collection(db, "bookings"), {
        ticketId,
        name,
        passport,
        phone,
        email,
        paymentImage,
        seat: selectedSeat,
        trip: trips[0]?.route || "القاهرة - حلفا",
        status: "pending",
        createdAt: new Date(),
        expiresAt: Date.now() + 10 * 60 * 1000,
      });

      setUserBooking({
        id: bookingRef.id,
        ticketId,
        name,
        passport,
        seat: selectedSeat,
        trip: trips[0]?.route || "القاهرة - حلفا",
        status: "pending",
      });

      alert("تم حفظ الحجز بنجاح");
      setBookedSeats([...bookedSeats, selectedSeat]);
      setName("");
      setPassport("");
      setPhone("");
      setEmail("");
    } catch (error) {
      console.log(error);
      alert(error.message);
    }
  };

  const saveShipment = async () => {
    try {
      const trackingId = "WND-CARGO-" + Math.floor(100000 + Math.random() * 900000);
      await addDoc(collection(db, "shipments"), {
        trackingId,
        senderName,
        senderPhone,
        receiverName,
        receiverPhone,
        cargoType,
        weight,
        quantity,
        destination,
        notes,
        paymentImage: shipmentPaymentImage,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      alert("تم تسجيل الشحنة بنجاح");
      setSenderName("");
      setSenderPhone("");
      setReceiverName("");
      setReceiverPhone("");
      setCargoType("");
      setWeight("");
      setQuantity("");
      setDestination("");
      setNotes("");
    } catch (error) {
      console.log(error);
      alert(error.message);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-100 text-slate-900 font-sans">
      
      {/* Exact Visual Matching Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-sky-100 via-white to-white pb-24">
        
        <div class="absolute bottom-0 left-0 w-full z-0 pointer-events-none">
          <svg viewBox="0 0 1440 200" fill="none" xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" class="w-full h-auto transform translate-y-6">
            <path d="M0,128L120,117.3C240,107,480,85,720,96C960,107,1200,149,1320,170.7L1440,192L1440,320L1320,320C1200,320,960,320,720,320C480,320,240,320,120,320L0,320Z" fill="#1d4ed8"></path>
            <path d="M0,96L120,112C240,128,480,160,720,144C960,128,1200,64,1320,32L1440,0L1440,320L1320,320C1200,320,960,320,720,320C480,320,240,320,120,320L0,320Z" fill="#0ea5e9" opacity="0.3"></path>
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-6 pt-6 relative z-10">
          
          {/* Header Navigation */}
          <header class="w-full flex items-center justify-between py-4">
            <nav class="hidden md:flex items-center gap-8 text-slate-700 font-bold text-lg">
              <div class="relative py-1">
                <a href="#" class="text-blue-900 font-black">الرئيسية</a>
                <span class="absolute bottom-0 right-0 left-0 h-[3px] bg-blue-900 rounded-full"></span>
              </div>
              <a href="#" class="hover:text-blue-900 transition">حجز رحلة</a>
              <a href="#" class="hover:text-blue-900 transition">حجوزاتي</a>
              <a href="#" class="hover:text-blue-900 transition">الشحن</a>
              <a href="#" class="hover:text-blue-900 transition">تتبع شحنتك</a>
              <a href="#" class="hover:text-blue-900 transition">تواصل معنا</a>
            </nav>

            <div class="flex items-center gap-3">
              <div class="text-right">
                <h1 class="text-blue-900 font-black text-xl leading-none">هيئة وادي النيل</h1>
                <p class="text-blue-800 text-sm font-bold mt-1">للملاحة النهرية</p>
              </div>
              <div class="flex items-center gap-1 h-12">
                <img src="/3a-logo.png" alt="3A International" class="h-full object-contain" />
                <img src="/logo.png" alt="Wadi El Nile Logo" class="h-full object-contain" />
              </div>
            </div>
          </header>

          {/* Hero Content Canvas */}
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center pt-12 pb-20">
            
            {/* Left Box: Elegant Framed Canvas Image */}
            <div class="w-full flex justify-center lg:justify-start order-2 lg:order-1">
              <div class="relative w-full max-w-xl aspect-[4/3] rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white">
                <img src="/hero.jpg" alt="River Cruise Ship" class="w-full h-full object-cover" />
              </div>
            </div>

            {/* Right Box: Dynamic Typography Hierarchy */}
            <div class="flex flex-col items-center text-center lg:items-start lg:text-right space-y-6 order-1 lg:order-2">
              <div class="flex items-center gap-4 mb-2">
                <img src="/3a-logo.png" alt="3A International Seal" class="h-24 w-auto object-contain drop-shadow-md" />
                <img src="/logo.png" alt="Wadi El Nile Seal" class="h-24 w-auto object-contain drop-shadow-md" />
              </div>

              <h2 class="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-tight">
                هيئة وادي النيل <br />
                <span class="text-blue-900">للملاحة النهرية</span>
              </h2>

              <div class="w-full max-w-md space-y-4">
                <p class="text-xl md:text-2xl text-slate-600 font-semibold">
                  نربط الأماكن .. نوصل الأمان
                </p>
                <div class="flex items-center justify-center lg:justify-start gap-4 text-blue-900">
                  <div class="h-[1px] bg-slate-300 flex-grow"></div>
                  <span class="text-2xl">⚓</span>
                  <div class="h-[1px] bg-slate-300 flex-grow"></div>
                </div>
              </div>

              <div class="pt-4">
                <button class="bg-[#FBBF24] hover:bg-[#F59E0B] text-slate-900 text-2xl font-black px-14 py-4 rounded-2xl shadow-lg shadow-yellow-500/20 transform hover:-translate-y-0.5 transition duration-150">
                  احجز الآن
                </button>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Booking Form Filter Bar */}
      <section className="max-w-6xl mx-auto px-6 -mt-10 relative z-20">
        <div className="bg-white rounded-3xl shadow-xl p-6 grid md:grid-cols-4 gap-4">
          <input type="date" className="border rounded-xl p-3 outline-none" />
          <select className="border rounded-xl p-3 outline-none">
            <option>راكب واحد</option>
            <option>راكبين</option>
            <option>3 ركاب</option>
          </select>
          <select className="border rounded-xl p-3 outline-none">
            <option>اقتصادي</option>
            <option>VIP</option>
          </select>
          <button className="bg-blue-700 hover:bg-blue-800 text-white rounded-xl p-3 font-semibold transition">
            بحث عن الرحلات
          </button>
        </div>
      </section>

      {/* Available Trips */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold">الرحلات المتاحة</h2>
          <span className="text-slate-500">الحالة المباشرة</span>
        </div>

        <div className="grid gap-6">
          {trips.map((trip) => (
            <div key={trip.id} className="bg-white rounded-3xl shadow-md p-6 grid md:grid-cols-5 gap-6 items-center">
              <div>
                <p className="text-slate-500 text-sm">الرحلة</p>
                <h3 className="font-bold text-xl">{trip.route}</h3>
              </div>
              <div>
                <p className="text-slate-500 text-sm">التاريخ</p>
                <h3 className="font-semibold">{trip.date}</h3>
              </div>
              <div>
                <p className="text-slate-500 text-sm">موعد التحرك</p>
                <h3 className="font-semibold">{trip.time}</h3>
              </div>
              <div>
                <p className="text-slate-500 text-sm">المقاعد المتبقية</p>
                <h3 className="font-semibold text-green-600">
                  {trip.seats - bookings.filter((b) => b.trip === trip.route).length}
                </h3>
              </div>
              <div>
                <p className="text-slate-500 text-sm">السعر</p>
                <h3 className="font-bold text-lg">{trip.price}</h3>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Seat Mapping Configuration */}
      <section className="bg-white py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h2 className="text-3xl font-bold">اختر مقعدك</h2>
              <p className="text-red-600 font-bold mt-2 text-sm">
                ⚠️ بعد اختيار المقعد وإتمام الحجز سيتم حجزه لمدة 10 دقائق فقط لإتمام الدفع.
              </p>
            </div>
            <div className="text-right">
              <p className="text-blue-700 font-black text-lg">
                المقعد المختار: {selectedSeat || "لا يوجد"}
              </p>
              <div className="flex gap-4 text-sm flex-wrap mt-2 justify-end">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span>متاح</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-400 rounded"></div>
                  <span>مقفول مؤقتًا</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span>محجوز</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-100 rounded-3xl p-8 shadow-inner">
            <div className="grid grid-cols-4 gap-4">
              {seats.map((seat) => {
                const isBooked = bookedSeats.includes(seat);
                const isLocked = lockedSeats.includes(seat);
                return (
                  <button
                    key={seat}
                    onClick={() => setSelectedSeat(seat)}
                    disabled={isBooked || isLocked}
                    className={`rounded-2xl py-5 font-bold transition duration-150 ${
                      isBooked
                        ? "bg-red-500 text-white cursor-not-allowed"
                        : isLocked
                        ? "bg-yellow-400 text-black cursor-not-allowed"
                        : selectedSeat === seat
                        ? "bg-blue-700 text-white scale-105 shadow-md"
                        : "bg-green-500 hover:scale-105 text-white shadow-sm"
                    }`}
                  >
                    {seat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Passenger Registration Sheet */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <h2 className="text-3xl font-bold mb-8">بيانات الراكب</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <input type="text" placeholder="الاسم بالكامل" value={name} onChange={(e) => setName(e.target.value)} className="border rounded-2xl p-4 outline-none" />
            <input type="text" placeholder="رقم جواز السفر" value={passport} onChange={(e) => setPassport(e.target.value)} className="border rounded-2xl p-4 outline-none" />
            <input type="text" placeholder="رقم الهاتف" value={phone} onChange={(e) => setPhone(e.target.value)} className="border rounded-2xl p-4 outline-none" />
            <input type="email" placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} className="border rounded-2xl p-4 outline-none" />
          </div>

          <div className="mt-8">
            <label className="block mb-3 font-semibold">ارفع صورة التحويل أو الدفع</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                const reader = new FileReader();
                reader.onloadend = () => setPaymentImage(reader.result);
                if (file) reader.readAsDataURL(file);
              }}
              className="border rounded-2xl p-4 w-full"
            />
          </div>

          <div className="mt-10 flex items-center justify-between flex-wrap gap-6">
            <div>
              <p className="text-slate-500">طريقة الدفع</p>
              <h3 className="font-bold text-xl text-blue-900">InstaPay / Paymob</h3>
            </div>
            <div className="flex gap-4">
              <button onClick={saveBooking} className="bg-blue-700 hover:bg-blue-800 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-lg transition">
                تأكيد الحجز
              </button>
              {userBooking?.status === "confirmed" && (
                <button onClick={() => generateTicketPDF(userBooking)} className="bg-green-600 text-white px-8 py-4 rounded-2xl font-semibold shadow-lg transition">
                  تحميل التذكرة
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Cargo Logistics Handling Area */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <h2 className="text-3xl font-bold mb-8">حجز شحنة بضائع</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <input type="text" placeholder="اسم المرسل" value={senderName} onChange={(e) => setSenderName(e.target.value)} className="border rounded-2xl p-4 outline-none" />
            <input type="text" placeholder="رقم المرسل" value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)} className="border rounded-2xl p-4 outline-none" />
            <input type="text" placeholder="اسم المستلم" value={receiverName} onChange={(e) => setReceiverName(e.target.value)} className="border rounded-2xl p-4 outline-none" />
            <input type="text" placeholder="رقم المستلم" value={receiverPhone} onChange={(e) => setReceiverPhone(e.target.value)} className="border rounded-2xl p-4 outline-none" />
            <input type="text" placeholder="نوع البضاعة" value={cargoType} onChange={(e) => setCargoType(e.target.value)} className="border rounded-2xl p-4 outline-none" />
            <input type="text" placeholder="الوزن الإجمالي" value={weight} onChange={(e) => setWeight(e.target.value)} className="border rounded-2xl p-4 outline-none" />
            <input type="text" placeholder="الكمية / عدد الصناديق" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="border rounded-2xl p-4 outline-none" />
            <input type="text" placeholder="الوجهة النهائية" value={destination} onChange={(e) => setDestination(e.target.value)} className="border rounded-2xl p-4 outline-none" />
          </div>
          <textarea placeholder="ملاحظات إضافية عن الشحنة" value={notes} onChange={(e) => setNotes(e.target.value)} className="border rounded-2xl p-4 outline-none w-full mt-6 min-h-[120px]" />
          <button onClick={saveShipment} className="bg-blue-700 hover:bg-blue-800 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-lg transition mt-6">
            تسجيل الشحنة
          </button>
        </div>
      </section>

      {/* Real-time Cargo Tracking System */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <h2 className="text-3xl font-bold mb-8">تتبع شحنتك</h2>
          <div className="flex gap-4 flex-col md:flex-row">
            <input type="text" placeholder="أدخل رقم التتبع الخاص بالبضائع (e.g., WND-CARGO-...)" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} className="border rounded-2xl p-4 outline-none flex-1" />
            <button onClick={trackShipment} className="bg-blue-700 hover:bg-blue-800 text-white px-8 py-4 rounded-2xl font-semibold shadow-md">
              تتبع الشحنة
            </button>
          </div>

          {trackedShipment && (
            <div className="mt-8 border rounded-3xl p-6 bg-slate-50 shadow-inner">
              <h3 className="text-2xl font-bold mb-4 text-blue-900">بيانات المسار المباشر</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <p><strong>رقم التتبع:</strong> {trackedShipment.trackingId}</p>
                <p><strong>الحالة الحالية:</strong> <span className="text-blue-700 font-bold">{trackedShipment.status}</span></p>
                <p><strong>المرسل:</strong> {trackedShipment.senderName}</p>
                <p><strong>المستلم:</strong> {trackedShipment.receiverName}</p>
                <p><strong>البضاعة:</strong> {trackedShipment.cargoType}</p>
                <p><strong>الوجهة:</strong> {trackedShipment.destination}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Global Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 px-6 text-center border-t border-slate-800">
        <p>© 2026 هيئة وادي النيل للملاحة النهرية | جميع الحقوق محفوظة</p>
      </footer>

    </div>
  );
}