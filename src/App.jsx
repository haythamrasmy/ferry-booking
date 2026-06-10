
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
  query,
  where,
} from "firebase/firestore";

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";



import {
  generateTicketPDF
} from "./utils/generateTicketPDF";


import * as XLSX from "xlsx";
import { saveAs } from "file-saver";


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

  const [showCargo, setShowCargo] = useState(false);

  const [selectedCargo, setSelectedCargo] =
    useState({});


  const [trackingNumber, setTrackingNumber] =
    useState("");

  const [trackedShipment, setTrackedShipment] =
    useState(null);

  const [trackedItems, setTrackedItems] =
    useState([]);

 const progressPoints = trackedItems.reduce(
  (total, item) => {

    switch (item.status) {

      case "تم الاستلام":
        return total + 20;

      case "في المخزن":
        return total + 40;

      case "تم التحميل":
        return total + 60;

      case "وصلت الوجهة":
        return total + 80;

      case "تم التسليم":
        return total + 100;

      default:
        return total;
    }

  },
  0
);

const progress =
  trackedItems.length > 0
    ? Math.round(
        progressPoints /
        trackedItems.length
      )
    : 0;

    
  const totalCount =
    trackedItems.length;

  const progress =
    totalCount > 0
      ? Math.round(
        (deliveredCount / totalCount) * 100
      )
      : 0;

  const [agentEmail, setAgentEmail] = useState("");
  const [agentPassword, setAgentPassword] = useState("");
  const [agentUser, setAgentUser] = useState(null);

  const [agentStats, setAgentStats] = useState({
    bookings: 0,
    sales: 0,
    commission: 0,
  });

  const [agentSearch, setAgentSearch] = useState("");

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

      const shipmentQuery =
        await getDocs(
          collection(db, "shipments")
        );

      const shipment =
        shipmentQuery.docs.find(
          (doc) =>
            doc.data().trackingId ===
            trackingNumber
        );

      if (!shipment) {

        alert("رقم التتبع غير موجود");

        setTrackedShipment(null);
        setTrackedItems([]);

        return;
      }


      let shipmentStatus = "قيد التجهيز";

if (items.some(i => i.status === "تم التسليم")) {
  shipmentStatus = "تم التسليم";
}
else if (items.some(i => i.status === "وصلت الوجهة")) {
  shipmentStatus = "وصلت الوجهة";
}
else if (items.some(i => i.status === "تم التحميل")) {
  shipmentStatus = "تم التحميل";
}
else if (items.some(i => i.status === "في المخزن")) {
  shipmentStatus = "في المخزن";
}

     setTrackedShipment({
  id: shipment.id,
  ...shipment.data(),
  status: shipmentStatus,
});
      const cargoQuery = query(
        collection(db, "cargoItems"),
        where(
          "trackingId",
          "==",
          trackingNumber
        )
      );

      const cargoSnapshot =
        await getDocs(cargoQuery);

      const items =
        cargoSnapshot.docs.map(
          (doc) => ({
            id: doc.id,
            ...doc.data(),
          })
        );

      items.sort((a, b) =>
        a.item.localeCompare(b.item, "ar")
      );

      setTrackedItems(items);

    } catch (error) {

      console.log(error);

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

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (user) => {

          if (!user) {

            setAgentUser(null);

            return;
          }

          try {

            const querySnapshot =
              await getDocs(
                collection(db, "agents")
              );

            const agentDoc =
              querySnapshot.docs.find(
                (doc) =>
                  doc.data().email ===
                  user.email
              );

            if (agentDoc) {

              setAgentUser({
                id: agentDoc.id,
                ...agentDoc.data(),
              });

            }

          } catch (error) {

            console.log(error);

          }

        }
      );

    return () => unsubscribe();

  }, []);

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



  useEffect(() => {

    if (!agentUser) return;

    const unsubscribe =
      onSnapshot(
        collection(db, "bookings"),
        (snapshot) => {

          const myBookings =
            snapshot.docs
              .map((doc) => ({
                id: doc.id,
                ...doc.data(),
              }))
              .filter(
                (booking) =>
                  booking.agentId ===
                  agentUser.id
              );

          const sales =
            myBookings.reduce(
              (sum, booking) =>
                sum +
                Number(
                  booking.ticketPrice || 0
                ),
              0
            );

          const commission =
            sales * 0.07;

          setAgentStats({
            bookings:
              myBookings.length,

            sales,

            commission,
          });

        }
      );

    return () => unsubscribe();

  }, [agentUser]);



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


      const ticketPrice =
        selectedTicketType === "Cabin"
          ? Number(selectedTrip.cabinPrice)
          : Number(selectedTrip.secondClassPrice);

      const bookingRef =
        await addDoc(
          collection(db, "bookings"), {
          trackingId,
          ticketId,
          agentId: agentUser?.id || null,
          agentName: agentUser?.fullName || null,
          ticketPrice,
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

      for (const [item, qty] of Object.entries(selectedCargo)) {

        const itemIndex =
          Object.keys(selectedCargo).indexOf(item);

        for (let i = 1; i <= qty; i++) {

          const serialNumber =
            `${ticketId}-${item.replaceAll(" ", "_")}-${i}`;

          await addDoc(
            collection(db, "cargoItems"),
            {
              serial: serialNumber,
              item: item,
              ticketId: ticketId,
              trackingId: trackingId,
              senderName: name,
              receiverName: name,
              destination: selectedTrip?.route,

              status: "تم الاستلام",

              history: [
                {
                  status: "تم الاستلام",
                  time: new Date().toLocaleString("ar-EG")
                }
              ],

              createdAt: new Date(),
            }
          );

        }

      }

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





  const agentLogin = async () => {
    try {

      const credential =
        await signInWithEmailAndPassword(
          auth,
          agentEmail,
          agentPassword
        );

      const querySnapshot = await getDocs(
        collection(db, "agents")
      );

      const agentDoc =
        querySnapshot.docs.find(
          (doc) =>
            doc.data().email ===
            credential.user.email
        );

      console.log("Logged Email:", credential.user.email);

      console.log(
        "Agents Count:",
        querySnapshot.docs.length
      );

      querySnapshot.docs.forEach((d) => {
        console.log(
          "Agent Email:",
          d.data().email
        );
      });

      console.log("agentDoc =", agentDoc);

      if (!agentDoc) {

        console.log(
          "Email From Auth =",
          credential.user.email
        );

        alert("هذا الحساب ليس وكيلاً");

        return;
      }

      setAgentUser({
        id: agentDoc.id,
        ...agentDoc.data(),
      });

      alert("تم تسجيل دخول الوكيل");

    } catch (error) {

      console.log(error);

      alert("بيانات الدخول غير صحيحة");
    }
  };

  const exportMyBookings = () => {

    if (!agentUser) return;

    const myBookings = bookings.filter(
      (booking) =>
        booking.agentId === agentUser.id
    );

    const excelData = myBookings.map(
      (booking) => ({
        الراكب: booking.name,
        الهاتف: booking.phone,
        الجواز: booking.passport,
        الرحلة: booking.trip,
        "نوع التذكرة": booking.ticketType,
        السعر: booking.ticketPrice,
        الحالة: booking.status,
      })
    );

    const worksheet =
      XLSX.utils.json_to_sheet(
        excelData
      );

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Bookings"
    );

    const excelBuffer =
      XLSX.write(
        workbook,
        {
          bookType: "xlsx",
          type: "array",
        }
      );

    const file =
      new Blob(
        [excelBuffer],
        {
          type:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
        }
      );

    saveAs(
      file,
      `${agentUser.fullName}-bookings.xlsx`
    );
  };

  const agentLogout = async () => {

    try {

      await signOut(auth);

      setAgentUser(null);

    } catch (error) {

      console.log(error);

    }

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
          <div className="flex justify-end">
            <div
              className="
      bg-white/10
      backdrop-blur-xl
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
                className="w-10 opacity-85"
              />

              <img
                src="/3a-logo.png"
                alt="3A"
                className="w-10 opacity-85"
              />

              <div className="text-white font-black text-xl">
                3A International
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

        <button
          onClick={() => {
            document
              .getElementById("agent-portal")
              ?.scrollIntoView({
                behavior: "smooth",
              });
          }}
          className="
    absolute
    left-0
    top-[35%]
    z-40

    bg-white/10
    backdrop-blur-xl

    border
    border-white/20

    text-white

    px-4
    py-5

    rounded-r-3xl

    shadow-2xl

    hover:bg-white/15
    hover:translate-x-2

    transition-all
    duration-300

    font-bold
    text-sm

    flex
    flex-col
    items-center
    justify-center
    gap-2

    w-[95px]
  "
        >
          <span className="text-2xl">
            👤
          </span>

          <div className="text-center leading-tight">
            <div>بوابة</div>
            <div>الوكيل</div>
          </div>
        </button>

      </section>

      {/* Floating Search Card */}

      <section
        className="
    relative
    z-30
    max-w-7xl
    mx-auto
    px-6
    -mt-10 md:-mt-3
  "
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




      <section id="available-trips" className="max-w-5xl mx-auto px-6 py-16">


        <div
          className="
    relative
    overflow-hidden
    bg-gradient-to-br
    from-slate-900
    via-fuchsia-950
    to-slate-900
    text-white
    rounded-[32px]
    shadow-2xl
    p-8
    border
    border-fuchsia-700/40
  "
        >
          <div className="mb-8">

            <h2 className="text-4xl font-black">
              الرحلات المتاحة
            </h2>

            <p className="text-slate-300 mt-2">
              اختر الرحلة المناسبة ثم نوع التذكرة
            </p>

          </div>

          <div className="grid md:grid-cols-2 gap-6">

            {trips.map((trip) => (

              <div
                key={trip.id}

                className={`
    rounded-[28px]
    p-6
    transition-all
    duration-300
    cursor-pointer
    border-2
    shadow-lg
    hover:shadow-2xl
    hover:-translate-y-1
    ${selectedTrip?.id === trip.id
                    ? `
          border-blue-600
          bg-gradient-to-br
          from-fuchsia-900/60
to-purple-900/60

        `
                    : `
         border-white/10
bg-white/5
backdrop-blur-xl
hover:border-fuchsia-400
        `
                  }
`}
                onClick={() =>
                  setSelectedTrip(trip)
                }
              >

                <div className="flex items-center justify-between mb-4">

                  <h3 className="text-2xl font-bold">
                    🚢 {trip.route}
                  </h3>



                  {selectedTrip?.id === trip.id && (

                    <span
                      className="
        bg-blue-600
        text-white
        px-3
        py-1
        rounded-xl
        text-sm
        font-bold
      "
                    >
                      مختارة
                    </span>

                  )}

                </div>
                <div className="flex flex-wrap gap-3 mb-5">

                  <span
                    className="
bg-white/10
text-white
      px-3
      py-2
      rounded-xl
      text-sm
      font-medium
    "
                  >
                    📅 {trip.date}
                  </span>

                  <span
                    className="
bg-white/10
text-white
      px-3
      py-2
      rounded-xl
      text-sm
      font-medium
    "
                  >
                    🕒 {trip.time}
                  </span>

                </div>
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

                <div className="flex flex-wrap gap-3 mt-4">

                  <span
                    className={`
      px-4
      py-2
      rounded-xl
      font-bold
      ${(
                        trip.remainingCabinTickets ??
                        trip.cabinTickets ??
                        0
                      ) <= 3
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700"
                      }
    `}
                  >
                    🛏️ {
                      trip.remainingCabinTickets ??
                      trip.cabinTickets ??
                      0
                    } كابينة
                  </span>

                  <span
                    className={`
      px-4
      py-2
      rounded-xl
      font-bold
      ${(
                        trip.remainingSecondClassTickets ??
                        trip.secondClassTickets ??
                        0
                      ) <= 5
                        ? "bg-red-100 text-red-700"
                        : "bg-blue-100 text-blue-700"
                      }
    `}
                  >
                    🎫 {
                      trip.remainingSecondClassTickets ??
                      trip.secondClassTickets ??
                      0
                    } درجة ثانية
                  </span>

                </div>
                <div className="grid grid-cols-2 gap-3 mt-4">

                  <div
                    onClick={(e) => {
                      e.stopPropagation();

                      if (
                        (trip.remainingCabinTickets ??
                          trip.cabinTickets ??
                          0) <= 0
                      ) {
                        alert("الكبائن غير متاحة");
                        return;
                      }

                      setSelectedTrip(trip);
                      setSelectedTicketType("Cabin");
                    }}
                    className={`
    rounded-2xl
    p-3
    cursor-pointer
    transition
    ${selectedTrip?.id === trip.id &&
                        selectedTicketType === "Cabin"
                        ? "bg-blue-600 text-white"
                        : "bg-white/10 hover:bg-white/20"
                      }
  `}
                  >
                    <p className="text-sm text-slate-300">
                      كابينة
                    </p>

                    <p className="font-bold text-lg">
                      {trip.cabinPrice} ج.م
                    </p>
                  </div>

                  <div
                    onClick={(e) => {
                      e.stopPropagation();

                      if (
                        (trip.remainingSecondClassTickets ??
                          trip.secondClassTickets ??
                          0) <= 0
                      ) {
                        alert("الدرجة الثانية غير متاحة");
                        return;
                      }

                      setSelectedTrip(trip);
                      setSelectedTicketType("Second Class");
                    }}
                    className={`
    rounded-2xl
    p-3
    cursor-pointer
    transition
    ${selectedTrip?.id === trip.id &&
                        selectedTicketType === "Second Class"
                        ? "bg-blue-600 text-white"
                        : "bg-white/10 hover:bg-white/20"
                      }
  `}
                  >
                    <p className="text-sm text-slate-300">
                      درجة ثانية
                    </p>

                    <p className="font-bold text-lg">
                      {trip.secondClassPrice} ج.م
                    </p>
                  </div>

                </div>

              </div>

            ))}


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

            <button
              onClick={() =>
                setShowCargo(!showCargo)
              }
              className="
    w-full
    flex
    justify-between
    items-center
    mb-8
    text-right
  "
            >

              <h2 className="text-3xl font-bold">
                البضائع المصاحبة
              </h2>

              <span className="text-2xl">
                {showCargo ? "−" : "+"}
              </span>

            </button>

            {showCargo && (

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
            )}
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
                <div className="md:col-span-2 mt-6">

                  <div className="mb-6">

                    <div className="flex justify-between mb-2">

                      <span className="font-bold">
                        نسبة إنجاز الشحنة
                      </span>

                      <span className="font-bold">
                        {progress}%
                      </span>

                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-5">

                      <div
                        className="bg-green-500 h-5 rounded-full transition-all duration-500"
                        style={{
                          width: `${progress}%`
                        }}
                      />

                    </div>

                  </div>

                  <h4 className="text-xl font-bold mb-4">
                    جميع القطع وحالة كل قطعة
                  </h4>

                  <div className="space-y-3">

                    {trackedItems.map((item) => (

                      <div
                        key={item.id}
                        className="
          bg-white
          border
          rounded-xl
          p-4
        "
                      >

                        <p>
                          <strong>الصنف:</strong>
                          {" "}
                          {item.item}
                        </p>

                        <p>
                          <strong>السيريال:</strong>
                          {" "}
                          {item.serial}
                        </p>

                        <p>
                          <strong>الحالة الحالية:</strong>

                          <span
                            className={
                              item.status === "تم التسليم"
                                ? "text-green-600 font-bold"
                                : item.status === "وصلت الوجهة"
                                  ? "text-purple-600 font-bold"
                                  : item.status === "تم التحميل"
                                    ? "text-orange-600 font-bold"
                                    : item.status === "في المخزن"
                                      ? "text-blue-600 font-bold"
                                      : "text-gray-600 font-bold"
                            }
                          >
                            {item.status}
                          </span>
                        </p>

                        {item.history?.length > 0 && (

                          <div className="mt-4 border-t pt-3">

                            <p className="font-bold mb-2">
                              سجل حركة القطعة
                            </p>

                            {item.history
                              .slice()
                              .reverse()
                              .map((entry, index) => (

                                <div
                                  key={index}
                                  className="
            text-sm
            bg-slate-50
            border
            rounded-lg
            p-2
            mb-2
          "
                                >

                                  <div>
                                    <p>
                                      <strong>عدد القطع:</strong>
                                      {trackedItems.length}
                                    </p>
                                  </div>

                                  <div>
                                    <strong>بواسطة:</strong>
                                    النظام
                                  </div>

                                  <div>
                                    <strong>التاريخ:</strong>
                                    {entry.time}
                                  </div>

                                </div>

                              ))}

                          </div>

                        )}

                      </div>

                    ))}

                  </div>

                </div>
              </div>

            </div>
          )}

        </div>

      </section>

      <section
        id="agent-portal"
        className="max-w-5xl mx-auto px-6 py-16"
      >
        <div
          className="
    bg-gradient-to-br
    from-fuchsia-950
    via-purple-950
    to-slate-950
    text-white
    rounded-3xl
    shadow-2xl
    p-8
    border
    border-fuchsia-700/50
  "
        >
          <div className="flex items-center gap-4 mb-8">

            <div
              className="
      w-14
      h-14
      rounded-full
      bg-fuchsia-500/20
      flex
      items-center
      justify-center
      text-2xl
    "
            >
              👥
            </div>

            <div>

              <h2 className="text-3xl font-bold">
                بوابة الوكلاء
              </h2>

              <p className="text-slate-300">
                إدارة الحجوزات والمبيعات
              </p>

            </div>

          </div>

          <div
            className="
    absolute
    top-0
    left-0
    w-full
    h-full
    bg-gradient-to-br
    from-fuchsia-600/10
    via-purple-600/10
    to-transparent
    pointer-events-none
  "
          />

          {!agentUser ? (

            <div className="space-y-4">

              <input
                type="email"
                placeholder="البريد الإلكتروني"
                value={agentEmail}
                onChange={(e) =>
                  setAgentEmail(e.target.value)
                }
                className="
  bg-white/10
  border
  border-white/20
  rounded-2xl
  p-4
  w-full
  text-white
  placeholder:text-slate-400
"              />

              <input
                type="password"
                placeholder="كلمة المرور"
                value={agentPassword}
                onChange={(e) =>
                  setAgentPassword(e.target.value)
                }
                className="border rounded-2xl p-4 w-full"
              />

              <button
                onClick={agentLogin}
                className="
bg-fuchsia-600
hover:bg-fuchsia-700
            text-white
            px-8
            py-4
            rounded-2xl
          "
              >
                دخول الوكيل
              </button>

            </div>

          ) : (

            <div>

              <div className="flex items-center gap-4 mb-6">

                <div
                  className="
      w-16
      h-16
      rounded-full
      bg-fuchsia-500/20
      flex
      items-center
      justify-center
      text-3xl
    "
                >
                  👤
                </div>

                <div>

                  <h3 className="text-2xl font-bold">
                    {agentUser.fullName}
                  </h3>

                  <p className="text-slate-300">
                    بوابة الوكيل
                  </p>

                  <p>         وكيل معتمد
                  </p>

                </div>

              </div>

              <div
                className="
    flex
    flex-wrap
    gap-3
    mb-6
  "
              >

                <div
                  className="
      bg-emerald-500/15
      border
      border-emerald-500/20
      px-4
      py-2
      rounded-xl
      text-emerald-300
      text-sm
    "
                >
                  🟢 متصل الآن
                </div>

                <div
                  className="
      bg-white/10
      border
      border-white/10
      px-4
      py-2
      rounded-xl
      text-slate-300
      text-sm
    "
                >
                  {agentStats.bookings} حجز
                </div>

              </div>

              <div className="flex flex-wrap gap-3 mb-6">

                <button
                  onClick={exportMyBookings}
                  className="
      bg-green-600
      text-white
      px-6
      py-3
      rounded-2xl
    "
                >
                  Export Excel ({agentStats.bookings})
                </button>

                <button
                  onClick={agentLogout}
                  className="
      bg-red-600
      text-white
      px-6
      py-3
      rounded-2xl
    "
                >
                  تسجيل خروج الوكيل
                </button>

              </div>

              <div className="grid md:grid-cols-3 gap-4 mt-6">

                <div
                  className="
    bg-white/10
    backdrop-blur-xl
    border
    border-white/10
    rounded-3xl
    p-5
  "
                >    <p className="text-slate-300">
                    عدد الحجوزات
                  </p>

                  <h3 className="text-3xl font-bold">
                    {agentStats.bookings}
                  </h3>
                </div>

                <div
                  className="
    bg-emerald-500/10
    backdrop-blur-xl
    border
    border-emerald-500/20
    rounded-3xl
    p-5
  "
                ><p className="text-emerald-300">
                    إجمالي المبيعات
                  </p>

                  <h3 className="text-3xl font-bold text-green-700">
                    {agentStats.sales}
                  </h3>
                </div>

                <div
                  className="
    bg-fuchsia-500/10
    backdrop-blur-xl
    border
    border-fuchsia-500/20
    rounded-3xl
    p-5
  "
                >    <p className="text-fuchsia-300">
                    العمولة
                  </p>

                  <h3 className="text-3xl font-bold text-blue-700">
                    {agentStats.commission.toFixed(2)}
                  </h3>
                </div>

              </div>

            </div>

          )}

        </div>

        {agentUser && (

          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">

              <h3 className="text-2xl font-bold">
                آخر الحجوزات
              </h3>

              <span
                className="
      bg-blue-100
      text-blue-700
      px-4
      py-2
      rounded-xl
      font-bold
    "
              >
                {bookings.filter(
                  booking =>
                    booking.agentId === agentUser.id
                ).length}
                {" "}راكب
              </span>

            </div>

            <input
              type="text"
              placeholder="ابحث بالاسم أو الجواز أو الهاتف"
              value={agentSearch}
              onChange={(e) =>
                setAgentSearch(e.target.value)
              }

              className="
  w-full
  bg-white/10
  border
  border-white/10
  rounded-2xl
  p-4
  mb-4
  outline-none
  text-white
  placeholder:text-slate-400
"
            />

            <div className="overflow-x-auto">

              <table
                className="
    w-full
    overflow-hidden
    rounded-3xl
  "
              >
                <thead>

                  <tr
                    className="
    bg-white/10
    border-b
    border-white/10
  "
                  >
                    <th className="p-3 text-right">
                      الراكب
                    </th>

                    <th className="p-3 text-right">
                      الرحلة
                    </th>

                    <th className="p-3 text-right">
                      التذكرة
                    </th>

                    <th className="p-3 text-right">
                      السعر
                    </th>

                    <th className="p-3 text-right">
                      الحالة
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {bookings
                    .filter((booking) => {

                      if (
                        booking.agentId !==
                        agentUser.id
                      ) {
                        return false;
                      }

                      const searchValue =
                        agentSearch.toLowerCase();

                      return (

                        booking.name
                          ?.toLowerCase()
                          .includes(searchValue)

                        ||

                        booking.passport
                          ?.toString()
                          .includes(agentSearch)

                        ||

                        booking.phone
                          ?.toString()
                          .includes(agentSearch)

                      );

                    })
                    .slice()
                    .reverse()
                    .map((booking) => (

                      <tr
                        key={booking.id}
                        className="border-b"
                      >

                        <td className="p-3">
                          {booking.name}
                        </td>

                        <td className="p-3">
                          {booking.trip}
                        </td>

                        <td className="p-3">
                          {booking.ticketType}
                        </td>

                        <td className="p-3">
                          {booking.ticketPrice}
                        </td>

                        <td className="p-3">

                          {booking.status === "confirmed"
                            ? (
                              <span className="text-green-600 font-bold">
                                مؤكد
                              </span>
                            )
                            : (
                              <span className="text-yellow-600 font-bold">
                                قيد المراجعة
                              </span>
                            )}

                        </td>

                      </tr>

                    ))}

                </tbody>

              </table>

            </div>

          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-black text-slate-400 py-8 px-6 text-center">
        <p>© 2026 هيئة وادي النيل للملاحة النهرية</p>
      </footer>
    </div>
  );
}
