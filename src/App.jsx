
import { useState, useEffect } from "react";
import { db, auth } from "./firebase";


import { motion } from "framer-motion";
import cairoFont from "../public/fonts/Cairo-Regular.ttf";
import {
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
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



import {
  generateTicketPDF
} from "./utils/generateTicketPDF";


export default function FerryBookingWebsite() {
  const companyName = "هيئة وادي النيل للملاحة النهرية";







  // Fixed invalid variable names
  const [
    selectedTicketType,
    setSelectedTicketType,
  ] = useState("");
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
  const [selectedTrip, setSelectedTrip] =
    useState(null);

  const [
    passportImage,
    setPassportImage
  ] = useState("");

  const [
    scannedCode,
    setScannedCode
  ] = useState("");

  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);



  const [selectedCargo, setSelectedCargo] =
    useState({});


  const [trackingNumber, setTrackingNumber] =
    useState("");

  const [trackedShipment, setTrackedShipment] =
    useState(null);

  const cargoItems = [
    "ثلاجه 11 قدم",
    "ثلاجه 14 قدم",
    "غساله اتوماتيك",
    "بوتاجاز 4 عين",
    "بوتاجاز 5 عين",
    "بوتاجاز 6 عين",
    "التكييف الصحراوي",
    "شاشه 32 بوصه",
    "شاشه 43",
    "غرفة نوم كامله",
    "طقم مكتب 3 كرسي",
    "طقم مكتب 6 كرسي",
    "سرير 120 إلى 100",
    "مرتبة سرير متر",
    "التروسيكل / توك توك صندوق",
    "شنطه شخصيه",
  ];





  const trackShipment = async () => {

    try {

      const querySnapshot =
        await getDocs(
          collection(db, "shipments")
        );

      const shipment =
        querySnapshot.docs.find(
          (doc) =>
            doc.data().trackingId ===
            trackingNumber
        );

      if (shipment) {

        setTrackedShipment({
          id: shipment.id,
          ...shipment.data(),
        });

      } else {

        alert("رقم التتبع غير موجود");

        setTrackedShipment(null);
      }

    } catch (error) {

      console.log(error);

      alert(error.message);
    }
  };

  const updateCargoQuantity = (
    item,
    amount
  ) => {

    setSelectedCargo((prev) => {

      const current =
        prev[item] || 0;

      const updated =
        current + amount;

      if (updated <= 0) {

        const copy = { ...prev };

        delete copy[item];

        return copy;
      }

      return {
        ...prev,
        [item]: updated,
      };

    });

  };

  const fetchBookings = async () => {
    try {
      const querySnapshot = await getDocs(
        collection(db, "bookings")
      );

      const currentTime = Date.now();


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

          snapshot.docs.forEach(
            async (docSnap) => {

              const data =
                docSnap.data();

              if (
                data.status !==
                "confirmed" &&
                data.expiresAt &&
                data.expiresAt <
                currentTime
              ) {

                try {

                  const trip =
                    trips.find(
                      (trip) =>
                        trip.route ===
                        data.trip
                    );

                  if (trip) {

                    if (
                      data.ticketType ===
                      "Cabin"
                    ) {

                      await updateDoc(
                        doc(
                          db,
                          "trips",
                          trip.id
                        ),
                        {
                          cabinTickets:
                            trip.cabinTickets + 1,
                        }
                      );

                    } else {

                      await updateDoc(
                        doc(
                          db,
                          "trips",
                          trip.id
                        ),
                        {
                          secondClassTickets:
                            trip.secondClassTickets +
                            1,
                        }
                      );

                    }

                  }

                  await deleteDoc(
                    doc(
                      db,
                      "bookings",
                      docSnap.id
                    )
                  );

                } catch (error) {

                  console.log(error);

                }

              }

            }
          );

          const bookingData =
            snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));

          setBookings(bookingData);




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
            .filter((trip) => {
              const tripDateTime = new Date(
                `${trip.date}T${trip.time || "00:00"}`
              ).getTime();

              return tripDateTime > currentTime;
            });


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

    const bookingId =
      localStorage.getItem(
        "bookingId"
      );

    if (!bookingId) return;

    const unsubscribe =
      onSnapshot(
        doc(
          db,
          "bookings",
          bookingId
        ),
        (docSnap) => {

          if (
            docSnap.exists()
          ) {

            setUserBooking({
              id: docSnap.id,
              ...docSnap.data(),
            });

          } else {

            localStorage.removeItem(
              "bookingId"
            );

          }

        }
      );

    return () => unsubscribe();

  }, []);

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


  const sendTelegramNotification = async (bookingData) => {

    const BOT_TOKEN = "8744549066:AAGT0Z3eszoSGPOReK9SrpuKRJBs5lg9nn8";

    const CHAT_ID = "-5205180446";

    const message = `
🔔 حجز جديد

👤 الاسم: ${bookingData.name}

📞 الهاتف: ${bookingData.phone}

🛂 الجواز: ${bookingData.passport}

🚢 الرحلة: ${bookingData.trip}

🎫 نوع التذكرة: ${bookingData.ticketType}
`;

    try {

      await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chat_id: CHAT_ID,
            text: message,
          }),
        }
      );

    } catch (error) {

      console.log(error);

    }

  };

  const saveBooking = async () => {
    if (!selectedTicketType) {

      alert("اختر نوع التذكرة");

      return;
    }

    if (!passportImage) {

      alert(
        "ارفع صورة جواز السفر"
      );

      return;
    }

    if (!paymentImage) {

      alert(
        "ارفع صورة التحويل"
      );

      return;
    }
    try {

      const ticketId =
        "TKT-" +
        Math.floor(
          100000 +
          Math.random() * 900000
        );
      const tripDate =
        new Date(
          selectedTrip?.date
        ).getTime();

      const now = Date.now();

      const daysLeft =
        (tripDate - now) /
        (1000 * 60 * 60 * 24);

      let expirationTime;

      if (daysLeft > 30) {

        expirationTime =
          7 * 24 * 60 * 60 * 1000;

      } else if (
        daysLeft > 14
      ) {

        expirationTime =
          5 * 24 * 60 * 60 * 1000;

      } else if (
        daysLeft > 7
      ) {

        expirationTime =
          3 * 24 * 60 * 60 * 1000;

      } else if (
        daysLeft > 3
      ) {

        expirationTime =
          24 * 60 * 60 * 1000;

      } else {

        expirationTime =
          2 * 60 * 60 * 1000;

      }
      const trackingId =
        "TRK-" +
        Math.floor(
          100000 +
          Math.random() * 900000
        );
      const updatedTrip =
        trips.find(
          (trip) =>
            trip.id ===
            selectedTrip.id
        );

      if (
        selectedTicketType ===
        "Cabin"
      ) {

        if (
          updatedTrip.remainingCabinTickets <=
          0
        ) {

          alert(
            "الكبائن نفدت"
          );

          return;
        }

      } else {

        if (
          updatedTrip.remainingSecondClassTickets <=
          0
        ) {

          alert(
            "الدرجة الثانية نفدت"
          );

          return;
        }

      }

      const bookingRef =
        await addDoc(
          collection(db, "bookings"), {
          trackingId,
          ticketId,
          name,
          passport,
          passportImage,
          phone,
          email,
          paymentImage,
          cargo: selectedCargo,
          ticketType:
            selectedTicketType,
          trip: selectedTrip?.route,
          tripId: selectedTrip?.id,
          status: "pending",
          createdAt: new Date(),
          expiresAt:
            Date.now() +
            expirationTime,
        });
      await addDoc(
        collection(db, "shipments"),
        {



          trackingId,

          ticketId,

          senderName:
            name,

          receiverName:
            name,

          cargo:
            selectedCargo,

          destination:
            selectedTrip?.route,

          status:
            "قيد التجهيز",

          createdAt:
            new Date(),

        }
      );



      setUserBooking({
        id: bookingRef.id,
        trackingId,
        ticketId,

        name,
        passport,
        cargo: selectedCargo,


        ticketType:
          selectedTicketType,
        trip: selectedTrip?.route,
        tripId: selectedTrip?.id,
        status: "pending",
      });
      localStorage.setItem(
        "bookingId",
        bookingRef.id
      );


      await sendTelegramNotification({
        name,
        phone,
        passport,
        trip: selectedTrip?.route,
        ticketType: selectedTicketType,
      });
      alert("تم حفظ الحجز بنجاح");


      setName("");
      setPassport("");
      setPhone("");
      setEmail("");
      setSelectedCargo({});
      setSelectedTicketType("");
    } catch (error) {

      console.log(error);
      alert(error.message);
    }
  };



  const downloadTicket = async () => {
    try {

      // Generate and download the PDF
      generateTicketPDF(userBooking);

      // Mark the ticket as downloaded
      await updateDoc(
        doc(db, "bookings", userBooking.id),
        {
          ticketDownloaded: true,
        }
      );

    } catch (error) {
      console.log(error);
      alert("حدث خطأ أثناء تحميل التذكرة");
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
      <section
        dir="rtl"
        className="
    relative
    min-h-screen
    overflow-hidden
    flex
    items-center
  "
      >
        {/* Video Background */}

        <video
          autoPlay
          muted
          loop
          playsInline
          className="
    absolute
    inset-0
    w-full
    h-full
    object-cover
  "
        >

          <source
            src="/hero-video.mp4"
            type="video/mp4"
          />

        </video>

        {/* Dark Overlay */}

        <div
          className="
    absolute
    inset-0
bg-black/55  "
        />

        {/* Top Area */}

        <div className="
  max-w-[1500px]
  mx-auto
  px-6
  pt-4
  relative
  z-20
  w-full
"
        >

          {/* Navbar */}
          <div className="flex items-start justify-between">

            {/* Nav Links */}
            <div
              className="
          hidden
          md:flex
          items-center
          gap-14
text-white
          font-bold
          text-[22px]
          pt-2
        "
            >

              <a
                href="#"
                className="
text-white
            border-b-4
border-white
            pb-2
          "
              >
                الرئيسية
              </a>

              <a
                href="#"
                className="hover:text-black-500 transition"
              >
                حجز رحلة
              </a>

              <a
                href="#"
                className="hover:text-black-500 transition"
              >
                حجوزاتي
              </a>

              <a
                href="#"
                className="hover:text-black-500 transition"
              >
                الشحن
              </a>

              <a
                href="#"
                className="hover:text-black-500 transition"
              >
                تتبع شحنتك
              </a>

              <a
                href="#"
                className="hover:text-black-500 transition"
              >
                تواصل معنا
              </a>

            </div>

            {/* Small Top Banner */}
            <div
              className="
bg-white/10 backdrop-blur-xlshadow-md
rounded-[32px]
px-5
py-3
border
border-white/20
          flex
          items-center
          gap-4
        "
            >

              <img
                src="/logo.png"
                alt="Logo"
                className="
w-10  opacity-85
"        />

              <img
                src="/3a-logo.png"
                alt="3A"
                className="
w-10
  opacity-85
"        />

              <div
                className="
text-white
            font-black
            text-xl
            leading-tight
          "
              >
                3A   international

                <br />

                <span className="text-base font-bold">
                </span>

              </div>

            </div>

          </div>

          {/* Main Hero */}
          <div
            className="
       flex
items-center
justify-center
        gap-16
        pt-2
        pb-8
      "
          >

            {/* Right Content */}
            <motion.div
              initial={{
                opacity: 0,
                y: 60,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 1.2,
              }}
              className="
    text-center
    max-w-4xl
    mx-auto
  "
            >

              {/* Big Logos */}

              <motion.div
                animate={{
                  y: [0, -8, 0],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 4,
                }}
                className="
    flex
    items-center
    justify-center
    md:justify-end
    mb-4
    relative
    h-[150px]
    mt-6
  "
              >

                {/* 3A Logo */}
                <img
                  src="/3a-logo.png"
                  alt="3A"
                  className="
      w-28
      md:w-36
      opacity-75
      relative
      z-10
      translate-x-4
      drop-shadow-xl
    "
                />

                {/* Nile Logo */}
                <img
                  src="/logo.png"
                  alt="Logo"
                  className="
      w-28
      md:w-36
      opacity-80
      relative
      -mr-10
      mix-blend-multiply
      drop-shadow-xl
    "
                />
              </motion.div>

              {/* Title */}
              <h1
                className="
            text-3xl
md:text-[58px]
            font-black
            leading-[1.05]
text-white mb-4mt-2          "
              >
                هيئة وادي النيل
                <br />
                للملاحة النهرية
              </h1>

              {/* Subtitle */}
              <p
                className="
text-[20px]
mt-3          
text-white/80 mb-14          "
              >
                ثمرة التكامل بين شطري وادي النيل        </p>

              {/* Divider */}
              <div
                className="
            flex
            items-center
            justify-center
            md:justify-end
            gap-4
            mb-10
          "
              >

                <div className="h-[2px] w-32 bg-blue-600" />

                <div className="text-5xl text-black-700">
                  ⚓
                </div>

                <div className="h-[2px] w-32 bg-blue-600" />

              </div>

              {/* CTA */}
              <motion.button

                onClick={() => {

                  document
                    .getElementById(
                      "available-trips"
                    )
                    ?.scrollIntoView({
                      behavior: "smooth",
                    });

                }}

                whileHover={{
                  scale: 1.06,
                }}

                whileTap={{
                  scale: 0.96,
                }}

                className="
    bg-white
    hover:bg-slate-200
    text-black
    px-12
    py-3
    rounded-[22px]
    text-[24px]
    font-black
    shadow-xl
    transition
  "
              >

                احجز الآن
              </motion.button>
            </motion.div>


          </div>



          {/* Bottom Waves */}
          <div
            className="
      absolute
      bottom-0
      left-0
      w-full
      overflow-hidden
      leading-none
    "
          >

            <svg
              viewBox="0 0 1440 220"
              className="w-full"
              preserveAspectRatio="none"
            >

              <path
                fill="#1d4ed8"
                fillOpacity="1"
                d="M0,160L80,154.7C160,149,320,139,480,149.3C640,160,800,192,960,197.3C1120,203,1280,181,1360,170.7L1440,160L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"
              />

            </svg>

          </div>

        </div>

      </section>

      {/* Floating Search Card */}

      <section
        className="
    relative
    z-30
    max-w-7xl
    mx-auto
    px-6
-mt-10 md:-mt-24  "
      >

        <div
          className="
      backdrop-blur-2xl
      bg-white/10
      border
      border-white/20
      rounded-[40px]
      shadow-2xl
      p-6
    "
        >

          <div
            className="
        grid
        md:grid-cols-4
        gap-4
      "
          >
            <div className="flex flex-col">

              <label
                className="
      text-sm
      text-black
      mb-2
      font-semibold
    "
              >
                تاريخ الرحلة
              </label>

              <input



                type="date"
                className="
          bg-white/10
          border
          border-white/20
          rounded-2xl
          p-4
          outline-none
          text-black
placeholder:text-black/50        "
              />

            </div>
            <select
              className="
    bg-white
    border
    border-white/20
    rounded-2xl
    p-4
    outline-none
    text-black
  "
            >

              <option>
                السد العالي - حلفا
              </option>

              <option>
                حلفا - السد العالي
              </option>

            </select>

            <select
              className="
          bg-white/10
          border
          border-white/20
          rounded-2xl
          p-4
          outline-none
          text-white
        "
            >

              <option className="text-black">
                كابينة
              </option>

              <option className="text-black">
                درجة ثانية
              </option>

            </select>

            <button
              className="
          bg-white
          hover:bg-slate-200
          text-black
          rounded-2xl
          p-4
          font-black
          transition
        "
            >
              بحث عن الرحلات
            </button>

          </div>

        </div>

      </section>


      {isAdmin && (

        <section className="max-w-5xl mx-auto px-6 py-16">

        </section>
      )}

      <section id="available-trips" className="max-w-5xl mx-auto px-6 py-16">


        <div className="bg-white rounded-3xl shadow-xl p-8">

          <h2 className="text-3xl font-bold mb-8">
            الرحلات المتاحة
          </h2>

          <div className="grid md:grid-cols-2 gap-6">

            {trips.map((trip) => (

              <div
                key={trip.id}
                className={`
            border
            rounded-3xl
            p-6
            transition
            cursor-pointer
            ${selectedTrip?.id ===
                    trip.id
                    ? "border-blue-700 bg-blue-50"
                    : "bg-slate-50"
                  }
          `}
                onClick={() =>
                  setSelectedTrip(trip)
                }
              >

                <h3 className="text-2xl font-bold mb-4">
                  {trip.route}
                </h3>
                <p className="text-slate-500">
                  التاريخ:
                  {trip.date}
                </p>

                <p className="text-slate-500">
                  الوقت:
                  {trip.time}
                </p>
                <div className="space-y-3 text-lg">

                  <p>
                    عدد تذاكر الدرجة الثانية:
                    {" "}
                    {trip.totalSecondClassTickets || 0}
                  </p>

                  <p>
                    عدد الكبائن:
                    {" "}
                    {trip.totalCabinTickets || 0}
                  </p>

                  <p
                    className={
                      (
                        trip.remainingCabinTickets ??
                        trip.cabinTickets ??
                        0
                      ) <= 3
                        ? "text-red-600 font-bold"
                        : "text-green-700"
                    }
                  >
                    المتبقي كابينة:
                    {
                      trip.remainingCabinTickets ??
                      trip.cabinTickets ??
                      0
                    }
                  </p>

                  <p
                    className={
                      (
                        trip.remainingSecondClassTickets ??
                        trip.secondClassTickets ??
                        0
                      ) <= 5
                        ? "text-red-600 font-bold"
                        : "text-green-700"
                    }
                  >
                    المتبقي درجة ثانية:
                    {
                      trip.remainingSecondClassTickets ??
                      trip.secondClassTickets ??
                      0
                    }                  </p>
                  <p>
                    كابينة:
                    {trip.cabinPrice} ج.م
                  </p>

                  <p>
                    الدرجة الثانية:
                    {trip.secondClassPrice} ج.م
                  </p>
                </div>

              </div>
            ))}

          </div>

        </div>

      </section>

      <section className="max-w-6xl mx-auto px-6 py-16">

        <div className="grid md:grid-cols-2 gap-6">

          {/* Cabin */}

          <div
            onClick={() => {

              if (
                (
                  selectedTrip?.remainingCabinTickets ??
                  selectedTrip?.cabinTickets ??
                  0
                ) <= 0
              ) {
                alert(
                  "الكبائن غير متاحة"
                );
                return;
              }

              setSelectedTicketType(
                "Cabin"
              );

            }}
            className={`
        rounded-3xl
        p-8
        cursor-pointer
        transition
        shadow-xl
        ${selectedTicketType ===
                "Cabin"
                ? "bg-blue-700 text-white"
                : "bg-white"
              }
      `}
          >

            <h2 className="text-3xl font-bold mb-4">
              كابينة            </h2>

            <p className="text-2xl font-bold">

              {
                selectedTrip?.cabinPrice
              } ج.م

            </p>

          </div>

          {/* Second Class */}

          <div
            onClick={() => {

              if (
                (
                  selectedTrip?.remainingSecondClassTickets ??
                  selectedTrip?.secondClassTickets ??
                  0
                ) <= 0
              ) {
                alert(
                  "الدرجة الثانية غير متاحة"
                );
                return;
              }

              setSelectedTicketType(
                "Second Class"
              );

            }}
            className={`
        rounded-3xl
        p-8
        cursor-pointer
        transition
        shadow-xl
        ${selectedTicketType ===
                "Second Class"
                ? "bg-blue-700 text-white"
                : "bg-white"
              }
      `}
          >

            <h2 className="text-3xl font-bold mb-4">
              الدرجة الثانية            </h2>

            <p className="text-2xl font-bold">

              {
                selectedTrip?.secondClassPrice
              } ج.م

            </p>

          </div>

        </div>

      </section>
      {/* Booking Form */}
      <section id="booking-section" className="max-w-5xl mx-auto px-6 py-16">
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

          <div className="mt-10">

            <h2 className="text-3xl font-bold mb-8">
              البضائع المصاحبة
            </h2>

            <div className="grid md:grid-cols-2 gap-4">

              {cargoItems.map((item) => (

                <div
                  key={item}
                  className="
          border
          rounded-2xl
          p-4
          flex
          items-center
          justify-between
        "
                >

                  <span className="font-semibold">
                    {item}
                  </span>

                  <div className="flex items-center gap-3">

                    <button
                      onClick={() =>
                        updateCargoQuantity(
                          item,
                          -1
                        )
                      }
                      className="
              bg-red-500
              text-white
              w-8
              h-8
              rounded-full
            "
                    >
                      -
                    </button>

                    <span className="font-bold text-lg">
                      {selectedCargo[item] || 0}
                    </span>

                    <button
                      onClick={() =>
                        updateCargoQuantity(
                          item,
                          1
                        )
                      }
                      className="
              bg-green-600
              text-white
              w-8
              h-8
              rounded-full
            "
                    >
                      +
                    </button>

                  </div>

                </div>

              ))}

            </div>

          </div>

          <div className="mt-8">

            <label className="block mb-3 font-semibold">
              ارفع صورة جواز السفر
            </label>

            <input
              type="file"
              accept="image/*"
              onChange={(e) => {

                const file =
                  e.target.files[0];

                const reader =
                  new FileReader();

                reader.onloadend =
                  () => {

                    setPassportImage(
                      reader.result
                    );

                  };

                if (file) {

                  reader.readAsDataURL(
                    file
                  );

                }

              }}
              className="
      border
      rounded-2xl
      p-4
      w-full
    "
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
              <div className="flex items-center gap-4">

                <img
                  src="/instapay.png"
                  alt="InstaPay"
                  className="w-16"
                />

                <div>

                  <h3 className="font-bold text-xl">
                    InstaPay
                  </h3>

                  <p className="text-slate-500">
                    الدفع عبر إنستاباي فقط
                  </p>

                </div>

              </div>            </div>
            <button
              onClick={saveBooking}
              disabled={
                !selectedTrip ||
                !selectedTicketType ||
                !name ||
                !passport ||
                !phone
              }
              className={`
  px-8
  py-4
  rounded-2xl
  font-semibold
  text-lg
  shadow-lg
  transition
  ${!selectedTrip ||
                  !selectedTicketType ||
                  !name ||
                  !passport ||
                  !phone
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-blue-700 hover:bg-blue-800 text-white"
                }
`}            >
              تأكيد الحجز
            </button>
            {userBooking &&
              userBooking.status !==
              "confirmed" &&
              userBooking.expiresAt && (

                <div
                  className="
      bg-yellow-100
      border
      border-yellow-400
      text-yellow-900
      p-4
      rounded-2xl
      mt-6
      font-bold
    "
                >

                  ينتهي الحجز خلال:
                  {" "}

                  {Math.max(
                    0,
                    Math.floor(
                      (
                        userBooking.expiresAt -
                        Date.now()
                      ) /
                      (1000 * 60 * 60)
                    )
                  )} ساعة

                </div>

              )}
            {userBooking?.status === "confirmed" &&
              !userBooking?.ticketDownloaded && (
                <button
                  onClick={downloadTicket}
                  className="
        bg-green-600
        text-white
        px-8
        py-4
        rounded-2xl
      "
                >
                  تحميل التذكرة
                </button>
              )}
          </div>

        </div>

      </section>


      {/* Shipment Tracking */}
      <section className="max-w-4xl mx-auto px-6 py-16">

        <div className="bg-white rounded-3xl shadow-xl p-8">

          <h2 className="text-3xl font-bold mb-8">
            تتبع الشحنة
          </h2>

          <div className="flex gap-4 flex-col md:flex-row">

            <input
              type="text"
              placeholder="أدخل رقم التتبع"
              value={trackingNumber}
              onChange={(e) =>
                setTrackingNumber(e.target.value)
              }
              className="border rounded-2xl p-4 outline-none flex-1"
            />

            <button
              onClick={trackShipment}
              className="
          bg-blue-700
          hover:bg-blue-800
          text-white
          px-8
          py-4
          rounded-2xl
          font-semibold
        "
            >
              تتبع
            </button>

          </div>

          {trackedShipment && (

            <div className="mt-8 border rounded-3xl p-6 bg-slate-50">

              <h3 className="text-2xl font-bold mb-4">
                بيانات الشحنة
              </h3>

              <div className="grid md:grid-cols-2 gap-4">

                <p>
                  <strong>رقم التتبع:</strong>
                  {" "}
                  {trackedShipment.trackingId}
                </p>

                <p>
                  <strong>الحالة:</strong>
                  {" "}
                  {trackedShipment.status}
                </p>

                <p>
                  <strong>المرسل:</strong>
                  {" "}
                  {trackedShipment.senderName}
                </p>

                <p>
                  <strong>المستلم:</strong>
                  {" "}
                  {trackedShipment.receiverName}
                </p>

                <div className="md:col-span-2">

                  <strong>البضائع:</strong>

                  <div className="mt-3 space-y-2">

                    {trackedShipment.cargo &&
                      Object.entries(
                        trackedShipment.cargo
                      ).map(([item, qty]) => (

                        <div
                          key={item}
                          className="
            flex
            justify-between
            bg-white
            border
            rounded-xl
            p-3
          "
                        >

                          <span>{item}</span>

                          <span>
                            {qty} قطعة
                          </span>

                        </div>

                      ))}

                  </div>

                </div>

                <p>
                  <strong>الوجهة:</strong>
                  {" "}
                  {trackedShipment.destination}
                </p>

              </div>

            </div>
          )}

        </div>

      </section>

      {/* Footer */}
      <footer className="bg-black text-slate-400 py-8 px-6 text-center">
        <p>© 2026 هيئة وادي النيل للملاحة النهرية</p>
      </footer>
    </div>
  );
}
