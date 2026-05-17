
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
    "A1",
    "A2",
    "A3",
    "A4",
    "B1",
    "B2",
    "B3",
    "B4",
    "C1",
    "C2",
    "C3",
    "C4",
  ];




  // Fixed invalid variable names
  const [bookedSeats, setBookedSeats] = useState([]);
  const lockedSeats = ["C1"];
  const [selectedSeat, setSelectedSeat] = useState("");
  const [name, setName] = useState("");
  const [passport, setPassport] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [paymentImage, setPaymentImage] =
    useState("");
  const [bookings, setBookings] = useState([]);
  const [userBooking, setUserBooking] =
    useState(null);
  const [trips, setTrips] =
    useState([]);
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

const [shipmentPaymentImage, setShipmentPaymentImage] =
  useState("");


  const fetchBookings = async () => {
    try {
      const querySnapshot = await getDocs(
        collection(db, "bookings")
      );

      const currentTime = Date.now();

      const activeSeats = querySnapshot.docs
        .filter((doc) => {
          const data = doc.data();

          return !data.expiresAt || data.expiresAt > currentTime;
        })
        .map((doc) => doc.data().seat);

      setBookedSeats(activeSeats);

      const bookingData = querySnapshot.docs.map(
        (doc) => ({
          id: doc.id,
          ...doc.data(),
        })
      );

      setBookings(bookingData);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    const unsubscribeBookings =
      onSnapshot(
        collection(db, "bookings"),
        (snapshot) => {
          const currentTime =
            Date.now();

          const bookingData =
            snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));

          setBookings(bookingData);

          const activeSeats =
            bookingData
              .filter(
                (booking) =>
                  !booking.expiresAt ||
                  booking.expiresAt >
                  currentTime
              )
              .map(
                (booking) =>
                  booking.seat
              );

          setBookedSeats(
            activeSeats
          );
        }
      );
    const unsubscribeTrips =
      onSnapshot(
        collection(db, "trips"),
        (snapshot) => {
          const currentTime = Date.now();

          const tripsData = snapshot.docs
            .map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }))
            .filter(
              (trip) =>
                !trip.tripTimestamp ||
                currentTime <
                trip.tripTimestamp +
                86400000
            );

          console.log(tripsData);

          setTrips(tripsData);
        }
      );

    const unsubscribe =
      onAuthStateChanged(
        auth,
        (user) => {
          if (user) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        }
      );

    return () => {
      unsubscribe();
      unsubscribeTrips();
      unsubscribeBookings();
    };


  },

    []);


  useEffect(() => {
    if (!userBooking) return;

    const unsubscribe =
      onSnapshot(
        doc(
          db,
          "bookings",
          userBooking.id
        ),
        (docSnap) => {
          if (docSnap.exists()) {
            const data =
              docSnap.data();

            setUserBooking({
              id: docSnap.id,
              ...data,
            });
          }
        }
      );

    return () => unsubscribe();
  }, [userBooking]);

  const generateTicketPDF = async (
    booking
  ) => {
    const doc = new jsPDF();

    doc.setDrawColor(0, 51, 102);

    doc.rect(10, 10, 190, 277);

    doc.setFontSize(28);

    doc.setTextColor(0, 51, 102);

    doc.setFontSize(22);

    const logo = "/logo.png";

    doc.addImage(
      logo,
      "PNG",
      20,
      15,
      30,
      30
    );

    doc.text(
      "Wadi El Nile Ferry Ticket",
      20,
      20
    );

    doc.setFontSize(14);

    doc.setTextColor(120);

    doc.setFontSize(60);

    doc.text(
      "WNF",
      70,
      160,
      {
        angle: 45,
      }
    );

    doc.setTextColor(0);
    doc.setFontSize(14);

    doc.text(
      `Ticket ID: ${booking.ticketId}`,
      20,
      60
    );

    doc.text(
      `Passenger: ${booking.name}`,
      20,
      80
    );

    doc.text(
      `Passport: ${booking.passport}`,
      20,
      100
    );

    doc.text(
      `Seat: ${booking.seat}`,
      20,
      120
    );

    doc.text(
      `Trip: ${booking.trip}`,
      20,
      140
    );

    doc.text(
      `Issued: ${new Date().toLocaleDateString()}`,
      20,
      160
    );

    const qrData =
      await QRCode.toDataURL(
JSON.stringify({
  ticketId:
    booking.ticketId,

  name:
    booking.name,

  passport:
    booking.passport,

  seat:
    booking.seat,

  trip:
    booking.trip,

  status:
    booking.status,
})      );

    doc.addImage(
      qrData,
      "PNG",
      140,
      30,
      50,
      50
    );

    const canvas =
      document.createElement("canvas");

    JsBarcode(
      canvas,
      booking.ticketId,
      {
        format: "CODE128",
      }
    );

    const barcode =
      canvas.toDataURL("image/png");

    doc.line(20, 170, 190, 170);

    doc.setFontSize(11);

    doc.text(
      "Please arrive 2 hours before departure.",
      20,
      185
    );

    doc.text(
      "Keep this ticket during the whole trip.",
      20,
      195
    );

    doc.text(
      "Wadi El Nile River Transport Authority",
      20,
      260
    );

    doc.addImage(
      barcode,
      "PNG",
      20,
      120,
      150,
      25
    );

    doc.save(
      `${booking.ticketId}.pdf`
    );
  };


  const saveBooking = async () => {
    if (!selectedSeat) {
      alert("اختر مقعد أولًا");
      return;
    }
    try {
      const querySnapshot = await getDocs(
        collection(db, "bookings")
      );

      const saveShipment = async () => {

  try {

    const trackingId =
      "WND-CARGO-" +
      Math.floor(
        100000 + Math.random() * 900000
      );

    await addDoc(
      collection(db, "shipments"),
      {
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

        paymentImage:
          shipmentPaymentImage,

        status: "pending",

        createdAt:
          serverTimestamp(),
      }
    );

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

      const currentTime = Date.now();

      const alreadyBooked =
        querySnapshot.docs.some((doc) => {
          const data = doc.data();

          return (
            data.seat === selectedSeat &&
            (!data.expiresAt ||
              data.expiresAt > currentTime)
          );
        });

      if (alreadyBooked) {
        alert("هذا المقعد تم حجزه بالفعل");

        return;
      }
      const ticketId =
        "WND-" +
        Math.floor(
          100000 + Math.random() * 900000
        );


      const bookingRef =
        await addDoc(
          collection(db, "bookings"), {
          ticketId,
          name,
          passport,
          phone,
          email,
          paymentImage,
          seat: selectedSeat,
          trip: trips[0]?.route,
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

        trip:
          trips[0]?.route,

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
  const adminLogin = async () => {
    try {
      await signInWithEmailAndPassword(
        auth,
        adminEmail,
        adminPassword
      );

      setIsAdmin(true);

      alert("تم تسجيل دخول الأدمن");
    } catch (error) {
      console.log(error);

      alert("بيانات الأدمن غير صحيحة");
    }
  };

  const adminLogout = async () => {
    await signOut(auth);

    setIsAdmin(false);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-100 text-slate-900">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-slate-900 to-blue-900 text-white py-20 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div className="text-center">
            <div className="relative w-fit mx-auto mb-4">

  {/* Old Logo */}
  <img
    src="/logo.png"
    alt="Main Logo"
    className="w-30 md:w-37 opacity-95"
  />

  {/* 3A Logo */}
  <img
    src="/3a-logo.png"
    alt="3A Logo"
   className="
  absolute
  -bottom-4
  -right-25
  w-24
  md:w-45
  opacity-150
  drop-shadow-xl
"
  />

</div>
            <h1 className="text-2xl font-bold leading-tight mb-6">
              {companyName}
            </h1>

            <p className="text-lg text-slate-200 mb-8">

            </p>
            <div className="flex justify-center">
              <button className="hidden md:block bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-3 rounded-2xl font-semibold shadow-lg transition">
                احجز الآن
              </button>
            </div>
          </div>

          <div>
            <img

              src="/hero.jpg"
              alt="Nile Ferry"
              className="rounded-3xl shadow-2xl w-full object-cover max-h-[400px]"
            />


            <div className="md:hidden flex justify-center mt-6">
              <button className="bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-3 rounded-2xl font-semibold shadow-lg transition">
                احجز الآن
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="max-w-6xl mx-auto px-6 -mt-10">
        <div className="bg-white rounded-3xl shadow-xl p-6 grid md:grid-cols-4 gap-4">
          <input
            type="date"
            className="border rounded-xl p-3 outline-none"
          />

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

      {/* Trips */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold">الرحلات المتاحة</h2>
          <span className="text-slate-500">الحالة المباشرة</span>
        </div>

        <div className="grid gap-6">
          {trips.map((trip) => (
            <div
              key={trip.id}
              className="bg-white rounded-3xl shadow-md p-6 grid md:grid-cols-5 gap-6 items-center"
            >
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
                  {
                    trip.seats -
                    bookings.filter(
                      (booking) =>
                        booking.trip ===
                        trip.route
                    ).length
                  }                          </h3>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-4">
                <div>
                  <p className="text-slate-500 text-sm">السعر</p>
                  <h3 className="font-bold text-lg">{trip.price}</h3>
                </div>


              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Seat Selection */}
      <section className="bg-white py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold">اختر مقعدك</h2>
            <p className="text-red-600 font-bold mt-3 text-sm">
              ⚠️ بعد اختيار المقعد وإتمام الحجز سيتم حجزه لمدة 10 دقائق فقط،
              وإذا لم يتم تأكيد الدفع سيصبح متاحًا مرة أخرى.
            </p>
            <p className="text-blue-700 font-bold mt-2">
              المقعد المختار: {selectedSeat || "لا يوجد"}
            </p>
            <div className="flex gap-4 text-sm flex-wrap">
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
                    className={`rounded-2xl py-5 font-bold transition ${isBooked
                      ? "bg-red-500 text-white cursor-not-allowed"
                      : isLocked
                        ? "bg-yellow-400 text-black cursor-not-allowed"
                        : selectedSeat === seat
                          ? "bg-blue-700 text-white scale-105"
                          : "bg-green-500 hover:scale-105 text-white"
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

      {/* Booking Form */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <h2 className="text-3xl font-bold mb-8">بيانات الراكب</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <input
              type="text"
              placeholder="الاسم بالكامل"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border rounded-2xl p-4 outline-none"
            />

            <input
              type="text"
              placeholder="رقم جواز السفر"
              value={passport}
              onChange={(e) => setPassport(e.target.value)}
              className="border rounded-2xl p-4 outline-none"
            />

            <input
              type="text"
              placeholder="رقم الهاتف"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="border rounded-2xl p-4 outline-none"
            />
            <input
              type="email"
              placeholder="البريد الإلكتروني"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border rounded-2xl p-4 outline-none"
            />
          </div>

          <div className="mt-8">
            <label className="block mb-3 font-semibold">
              ارفع صورة التحويل أو الدفع
            </label>

            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];

                const reader = new FileReader();

                reader.onloadend = () => {
                  setPaymentImage(reader.result);
                };

                if (file) {
                  reader.readAsDataURL(file);
                }
              }}
              className="border rounded-2xl p-4 w-full"
            />
          </div>

          <div className="mt-10 flex items-center justify-between flex-wrap gap-6">
            <div>
              <p className="text-slate-500">طريقة الدفع</p>
              <h3 className="font-bold text-xl">InstaPay / Paymob</h3>
            </div>
            <button
              onClick={saveBooking}
              className="bg-blue-700 hover:bg-blue-800 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-lg transition"
            >
              تأكيد الحجز
            </button>

            {userBooking?.status ===
              "confirmed" && (
                <button
                  onClick={() =>
                    generateTicketPDF(
                      userBooking
                    )
                  }
                  className="bg-green-600 text-white px-8 py-4 rounded-2xl"
                >
                  تحميل التذكرة
                </button>
              )}
          </div>

        </div>

      </section>
{/* Cargo Booking */}
<section className="max-w-5xl mx-auto px-6 py-16">
  <div className="bg-white rounded-3xl shadow-xl p-8">

    <h2 className="text-3xl font-bold mb-8">
      حجز شحنة
    </h2>

    <div className="grid md:grid-cols-2 gap-6">

      <input
        type="text"
        placeholder="اسم المرسل"
        value={senderName}
        onChange={(e) =>
          setSenderName(e.target.value)
        }
        className="border rounded-2xl p-4 outline-none"
      />

      <input
        type="text"
        placeholder="رقم المرسل"
        value={senderPhone}
        onChange={(e) =>
          setSenderPhone(e.target.value)
        }
        className="border rounded-2xl p-4 outline-none"
      />

      <input
        type="text"
        placeholder="اسم المستلم"
        value={receiverName}
        onChange={(e) =>
          setReceiverName(e.target.value)
        }
        className="border rounded-2xl p-4 outline-none"
      />

      <input
        type="text"
        placeholder="رقم المستلم"
        value={receiverPhone}
        onChange={(e) =>
          setReceiverPhone(e.target.value)
        }
        className="border rounded-2xl p-4 outline-none"
      />

      <input
        type="text"
        placeholder="نوع البضاعة"
        value={cargoType}
        onChange={(e) =>
          setCargoType(e.target.value)
        }
        className="border rounded-2xl p-4 outline-none"
      />

      <input
        type="text"
        placeholder="الوزن"
        value={weight}
        onChange={(e) =>
          setWeight(e.target.value)
        }
        className="border rounded-2xl p-4 outline-none"
      />

      <input
        type="text"
        placeholder="الكمية"
        value={quantity}
        onChange={(e) =>
          setQuantity(e.target.value)
        }
        className="border rounded-2xl p-4 outline-none"
      />

      <input
        type="text"
        placeholder="الوجهة"
        value={destination}
        onChange={(e) =>
          setDestination(e.target.value)
        }
        className="border rounded-2xl p-4 outline-none"
      />

    </div>

    <textarea
      placeholder="ملاحظات إضافية"
      value={notes}
      onChange={(e) =>
        setNotes(e.target.value)
      }
      className="border rounded-2xl p-4 outline-none w-full mt-6 min-h-[120px]"
    />


    <button
  onClick={saveShipment}
  className="
    bg-blue-700
    hover:bg-blue-800
    text-white
    px-8
    py-4
    rounded-2xl
    font-semibold
    text-lg
    shadow-lg
    transition
    mt-6
  "
>
  تسجيل الشحنة
</button>

  </div>
</section>

      {/* Footer */}
      <footer className="bg-black text-slate-400 py-8 px-6 text-center">
        <p>© 2026 هيئة وادي النيل للملاحة النهرية</p>
      </footer>
    </div>
  );
}
