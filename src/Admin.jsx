import { useEffect, useState } from "react";

import { db, auth } from "./firebase";

import {
    collection,
    addDoc,
    onSnapshot,
    updateDoc,
    deleteDoc,
    doc,
} from "firebase/firestore";

import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
} from "firebase/auth";

import { Html5QrcodeScanner }
from "html5-qrcode";

export default function Admin() {
    const [bookings, setBookings] =
        useState([]);

    const [trips, setTrips] =
        useState([]);

    const [adminEmail, setAdminEmail] =
        useState("");

    const [
        adminPassword,
        setAdminPassword,
    ] = useState("");

    const [isAdmin, setIsAdmin] =
        useState(false);

    const [loading, setLoading] =
        useState(true);

    const [search, setSearch] =
        useState("");

    const [route, setRoute] =
        useState("");

    const [date, setDate] =
        useState("");

    const [time, setTime] =
        useState("");

    const [
        previewImage,
        setPreviewImage
    ] = useState("");



    const [
        cabinTickets,
        setCabinTickets,
    ] = useState("");

    const [
        secondClassTickets,
        setSecondClassTickets,
    ] = useState("");

    const [
        cabinPrice,
        setCabinPrice,
    ] = useState("");

    const [
        secondClassPrice,
        setSecondClassPrice,
    ] = useState("");

    const [showTripForm, setShowTripForm] =
        useState(false);

        const [
  scannedCode,
  setScannedCode
] = useState("");

    useEffect(() => {
        let unsubscribeBookings = null;

        const unsubscribeTrips =
            onSnapshot(
                collection(db, "trips"),
                (snapshot) => {
                    const tripsData =
                        snapshot.docs.map((doc) => ({
                            id: doc.id,
                            ...doc.data(),
                        }));

                    setTrips(tripsData);
                }
            );


        const unsubscribe =
            onAuthStateChanged(auth, (user) => {
                if (user) {
                    setIsAdmin(true);

                    unsubscribeBookings =
                        fetchBookings();
                } else {
                    setIsAdmin(false);
                }

                setLoading(false);
            });

        return () => {
            unsubscribe();

            if (unsubscribeBookings) {
                unsubscribeBookings();
                unsubscribeTrips();
            }
        };
    }, []);



const fetchBookings = () => {

    return onSnapshot(
        collection(db, "bookings"),
        (snapshot) => {

            const currentTime =
                Date.now();

            const bookingData =
                snapshot.docs
                    .filter((doc) => {

                        const data =
                            doc.data();

                        return (
                            !data.expiresAt ||
                            data.expiresAt >
                            currentTime
                        );

                    })
                    .map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    }))
                    .sort(
                        (a, b) =>
                            b.createdAt?.seconds -
                            a.createdAt?.seconds
                    );

            setBookings(
                bookingData
            );

        }
    );

};


 useEffect(() => {

  if (!isAdmin) return;

  const readerElement =
    document.getElementById(
      "reader"
    );

  if (!readerElement) return;

  const scanner =
    new Html5QrcodeScanner(
      "reader",
      {
        qrbox: {
          width: 250,
          height: 250,
        },
        fps: 5,
      },
      false
    );

  scanner.render(

    (decodedText) => {

      setScannedCode(
        decodedText
      );

    },

    (error) => {
      console.log(error);
    }

  );

  return () => {
    scanner.clear();
  };

}, [isAdmin]);

    const confirmBooking = async (id) => {

        try {

            const booking =
                bookings.find(
                    (b) => b.id === id
                );

            if (!booking) return;

            const trip =
                trips.find(
                    (t) =>
                        t.route === booking.trip
                );

            if (!trip) {

                alert("الرحلة غير موجودة");

                return;
            }

            if (
                booking.ticketType ===
                "Cabin"
            ) {

                if (
                    trip.cabinTickets <= 0
                ) {

                    alert(
                        "لا توجد كبائن متاحة"
                    );

                    return;
                }

                await updateDoc(
                    doc(
                        db,
                        "trips",
                        trip.id
                    ),
                    {
                        cabinTickets:
                            trip.cabinTickets - 1,
                    }
                );

            } else {

                if (
                    trip.secondClassTickets <=
                    0
                ) {

                    alert(
                        "لا توجد تذاكر درجة ثانية متاحة"
                    );

                    return;
                }

                await updateDoc(
                    doc(
                        db,
                        "trips",
                        trip.id
                    ),
                    {
                        secondClassTickets:
                            trip.secondClassTickets - 1,
                    }
                );

            }

            await updateDoc(
                doc(db, "bookings", id),
                {
                    status: "confirmed",
                    expiresAt: null,
                }
            );

            alert("تم تأكيد الحجز");

        } catch (error) {

            console.log(error);

        }

    };

    const addTrip = async () => {
        try {
            await addDoc(
                collection(db, "trips"),
                {
                    route,
                    date,
                    time,
                    cabinPrice,

                    secondClassPrice,

                    cabinTickets:
                        Number(cabinTickets),

                    secondClassTickets:
                        Number(secondClassTickets),
                    tripTimestamp:
                        new Date(date).getTime(),
                }
            );

            alert("تم إضافة الرحلة");

            setRoute("");
            setDate("");
            setTime("");
            setCabinPrice("");
            setSecondClassPrice("");
            setCabinTickets("");
            setSecondClassTickets("");


        } catch (error) {
            console.log(error);
        }
    };

    const deleteTrip = async (id) => {
        try {
            await deleteDoc(
                doc(db, "trips", id)
            );

            alert("تم حذف الرحلة");

        } catch (error) {
            console.log(error);
        }
    };

    const deleteBooking = async (
        id
    ) => {

        try {

            const booking =
                bookings.find(
                    (b) => b.id === id
                );

            if (!booking) return;

            if (
                booking.status ===
                "confirmed"
            ) {

                const trip =
                    trips.find(
                        (t) =>
                            t.route ===
                            booking.trip
                    );

                if (trip) {

                    if (
                        booking.ticketType ===
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
                                    trip.secondClassTickets + 1,
                            }
                        );

                    }

                }

            }

            await deleteDoc(
                doc(
                    db,
                    "bookings",
                    id
                )
            );

            alert("تم حذف الحجز");

        } catch (error) {

            console.log(error);

        }

    };


    const adminLogin = async () => {
        try {
            await signInWithEmailAndPassword(
                auth,
                adminEmail,
                adminPassword
            );

            alert("تم تسجيل دخول الأدمن");

        } catch (error) {
            console.log(error);

            alert("بيانات غير صحيحة");
        }
    };

    const adminLogout = async () => {
        await signOut(auth);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-3xl">
                Loading...
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
                <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md">
                    <h2 className="text-3xl font-bold mb-6 text-center">
                        دخول الإدارة
                    </h2>

                    <div className="grid gap-4">
                        <input
                            type="email"
                            placeholder="Email"
                            value={adminEmail}
                            onChange={(e) =>
                                setAdminEmail(
                                    e.target.value
                                )
                            }
                            className="border rounded-2xl p-4"
                        />

                        <input
                            type="password"
                            placeholder="Password"
                            value={adminPassword}
                            onChange={(e) =>
                                setAdminPassword(
                                    e.target.value
                                )
                            }
                            className="border rounded-2xl p-4"
                        />

                        <button
                            onClick={adminLogin}
                            className="bg-black text-white rounded-2xl p-4"
                        >
                            تسجيل دخول الأدمن
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const confirmedBookings =
        bookings.filter(
            (booking) =>
                booking.status ===
                "confirmed"
        );

    const pendingBookings =
        bookings.filter(
            (booking) =>
                booking.status !==
                "confirmed"
        );
    return (
        <div className="min-h-screen bg-slate-900 text-white p-10">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-10">
                    <h1 className="text-4xl font-bold">
                        لوحة التحكم
                    </h1>

                    <button
                        onClick={adminLogout}
                        className="bg-red-600 px-5 py-3 rounded-2xl"
                    >
                        تسجيل الخروج
                    </button>
                </div>

                <div className="grid md:grid-cols-3 gap-6 mb-10">
                    <div className="bg-slate-800 rounded-3xl p-6">
                        <p className="text-slate-400">
                            إجمالي الحجوزات
                        </p>

                        <h3 className="text-4xl font-bold mt-3">
                            {bookings.length}
                        </h3>
                    </div>

                    <div className="bg-slate-800 rounded-3xl p-6">
                        <p className="text-slate-400">
                            الحجوزات المؤكدة
                        </p>

                        <h3 className="text-4xl font-bold mt-3 text-green-400">
                            {confirmedBookings.length}
                        </h3>
                    </div>

                    <div className="bg-slate-800 rounded-3xl p-6">
                        <p className="text-slate-400">
                            قيد المراجعة
                        </p>

                        <h3 className="text-4xl font-bold mt-3 text-yellow-400">
                            {pendingBookings.length}
                        </h3>
                    </div>
                </div>

                <div className="mb-6">
                    <input
                        type="text"
                        placeholder="ابحث باسم الراكب أو نوع التذكرة" value={search}
                        onChange={(e) =>
                            setSearch(e.target.value)
                        }
                        className="w-full bg-slate-700 text-white p-4 rounded-2xl outline-none"
                    />
                </div>

                <div className="bg-slate-800 rounded-3xl overflow-x-auto">




                    <table className="min-w-[1100px] w-full text-right">
                        <thead className="bg-slate-700">
                            <tr>
                                <th className="p-4">
                                    الراكب
                                </th>

                                <th className="p-4">
                                    نوع التذكرة
                                </th>
                                <th className="p-4">
                                    الهاتف
                                </th>

                                <th className="p-4">
                                    الجواز
                                </th>

                                <th className="p-4">
                                    الإيصال
                                </th>

                                <th className="p-4">
                                    الجواز
                                </th>
                                <th className="p-4">
                                    الحالة
                                </th>

                                <th className="p-4">
                                    الإجراء
                                </th>
                                <th className="p-4"></th>

                            </tr>
                        </thead>





                        <tbody>
                            {bookings
                                .filter((booking) => {
                                    return (
                                        booking.name
                                            ?.toLowerCase()
                                            .includes(
                                                search.toLowerCase()
                                            ) ||
                                        booking.ticketType
                                            ?.toLowerCase()
                                            .includes(
                                                search.toLowerCase()
                                            )
                                    );
                                })
                                .map((booking) => (
                                    <tr
                                        key={booking.id}
                                        className="border-t border-slate-700"
                                    >
                                        <td className="p-4">
                                            {booking.name}
                                        </td>

                                        <td className="p-4">
                                            {booking.ticketType}
                                        </td>

                                        <td className="p-4">
                                            {booking.phone}
                                        </td>

                                        <td className="p-4">
                                            {booking.passport}
                                        </td>

                                        <td className="p-4 text-center">
                                            {booking.paymentImage && (
                                                <img
                                                    src={booking.paymentImage}
                                                    alt="Payment"
                                                    onClick={() =>
                                                        setPreviewImage(
                                                            booking.paymentImage
                                                        )
                                                    }
                                                    className="w-20 h-20 object-cover rounded-xl cursor-pointer mx-auto hover:scale-105 transition"
                                                />
                                            )}
                                        </td>

                                        <td className="p-4 text-center">

                                            {booking.passportImage && (

                                                <img
                                                    src={
                                                        booking.passportImage
                                                    }
                                                    alt="Passport"
                                                    onClick={() =>
                                                        setPreviewImage(
                                                            booking.passportImage
                                                        )
                                                    }
                                                    className="
        w-20
        h-20
        object-cover
        rounded-xl
        cursor-pointer
        mx-auto
        hover:scale-105
        transition
      "
                                                />

                                            )}

                                        </td>

                                        <td className="p-4">
                                            {booking.status === "confirmed"
                                                ? "مؤكد"
                                                : "قيد المراجعة"}
                                        </td>

                                        <td className="p-4">
                                            {booking.status !==
                                                "confirmed" ? (
                                                <button
                                                    onClick={() =>
                                                        confirmBooking(
                                                            booking.id
                                                        )
                                                    }
                                                    className="bg-green-600 px-4 py-2 rounded-xl"
                                                >
                                                    تأكيد
                                                </button>
                                            ) : (
                                                <span className="text-green-400 font-bold">
                                                    تم التأكيد
                                                </span>
                                            )}
                                        </td>

                                        <td className="p-4">
                                            <button
                                                onClick={() =>
                                                    deleteBooking(
                                                        booking.id
                                                    )
                                                }
                                                className="bg-red-600 px-4 py-2 rounded-xl"
                                            >
                                                حذف
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>


                    </table>

                    <button
                        onClick={() =>
                            setShowTripForm(
                                !showTripForm
                            )
                        }
                        className="fixed bottom-6 left-6 z-50 bg-blue-600 text-white px-6 py-4 rounded-full shadow-2xl"
                    >
                        إضافة رحلة
                    </button>
                    {showTripForm && (
                        <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-6">

                            <div className="bg-blue-950 rounded-3xl p-6 w-full max-w-4xl shadow-2xl relative">
                                <h2 className="text-2xl font-bold mb-6 pr-12 text-right">
                                    إضافة رحلة
                                </h2>
                                <button
                                    onClick={() =>
                                        setShowTripForm(false)
                                    }
                                    className="absolute top-4 left-4 bg-white/20 hover:bg-white/30 backdrop-blur-md w-10 h-10 rounded-full transition"
                                >
                                    ✕
                                </button>
                                <div className="grid md:grid-cols-5 gap-4">

                                    <input
                                        type="text"
                                        placeholder="خط الرحلة"
                                        value={route}
                                        onChange={(e) =>
                                            setRoute(e.target.value)
                                        }
                                        className="bg-slate-700 p-4 rounded-2xl outline-none"
                                    />

                                    <input
                                        type="date" placeholder="التاريخ"
                                        value={date}
                                        onChange={(e) =>
                                            setDate(e.target.value)
                                        }
                                        className="bg-slate-700 p-4 rounded-2xl outline-none"
                                    />

                                    <input
                                        type="time"
                                        placeholder="الوقت"
                                        value={time}
                                        onChange={(e) =>
                                            setTime(e.target.value)
                                        }
                                        className="bg-slate-700 p-4 rounded-2xl outline-none"
                                    />


                                    <input
                                        type="number"
                                        placeholder="عدد تذاكر الدرجة الثانية" value={secondClassTickets}
                                        onChange={(e) =>
                                            setSecondClassTickets(
                                                e.target.value
                                            )
                                        }
                                        className="
    bg-slate-700
    p-4
    rounded-2xl
    outline-none
  "
                                    />




                                    <input
                                        type="text"
                                        placeholder="سعر الدرجة الثانية" value={secondClassPrice}
                                        onChange={(e) =>
                                            setSecondClassPrice(
                                                e.target.value
                                            )
                                        }
                                        className="
    bg-slate-700
    p-4
    rounded-2xl
    outline-none
  "
                                    />

                                    <input
                                        type="number"
                                        placeholder="عدد تذاكر الكابن"
                                        value={cabinTickets}
                                        onChange={(e) =>
                                            setCabinTickets(
                                                e.target.value
                                            )
                                        }
                                        className="
    bg-slate-700
    p-4
    rounded-2xl
    outline-none
  "
                                    />


                                    <input
                                        type="text"
                                        placeholder="سعر الكابن"
                                        value={cabinPrice}
                                        onChange={(e) =>
                                            setCabinPrice(
                                                e.target.value
                                            )
                                        }
                                        className="
    bg-slate-700
    p-4
    rounded-2xl
    outline-none
  "
                                    />




                                </div>

                                <button
                                    onClick={addTrip}
                                    className="bg-blue-600 mt-6 px-6 py-3 rounded-2xl"
                                >
                                    إضافة الرحلة
                                </button>
                                <div className="mt-8 grid gap-4">
                                    {trips.map((trip) => (
                                        <div
                                            key={trip.id}
                                            className="bg-slate-800 rounded-2xl p-4 flex items-center justify-between"
                                        >
                                            <div>
                                                <h3 className="font-bold">
                                                    {trip.route}
                                                </h3>

                                                <div className="text-slate-400 text-sm">

                                                    <p>
                                                        {trip.date} - {trip.time}
                                                    </p>

                                                    <p className="text-sm text-green-400 mt-2">

                                                        المتبقي كابينة:
                                                        {trip.cabinTickets}

                                                    </p>

                                                    <p className="text-sm text-yellow-400">

                                                        المتبقي درجة ثانية:
                                                        {trip.secondClassTickets}

                                                    </p>

                                                    <p className="text-sm text-slate-300">
                                                        كابينة:
                                                        {trip.cabinPrice} ج.م
                                                    </p>

                                                    <p className="text-sm text-slate-300">
                                                        الدرجة الثانية:
                                                        {trip.secondClassPrice} ج.م
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() =>
                                                    deleteTrip(trip.id)
                                                }
                                                className="bg-red-600 px-4 py-2 rounded-xl"
                                            >
                                                حذف
                                            </button>
                                        </div>
                                    ))}
                                </div>

                            </div>
                        </div>
                    )}
                </div>
            </div>

            {previewImage && (

  <div
    onClick={() =>
      setPreviewImage("")
    }
    className="
      fixed
      inset-0
      bg-black/80
      flex
      items-center
      justify-center
      z-50
      p-6
    "
  >

    <img
      src={previewImage}
      alt="Preview"
      className="
        max-w-full
        max-h-full
        rounded-3xl
        shadow-2xl
      "
    />

  </div>

)}
<div
  className="
    mt-16
    bg-white
    rounded-3xl
    p-8
    shadow-xl
  "
>

  <h2
    className="
      text-3xl
      font-bold
      mb-6
    "
  >
    ماسح التذاكر
  </h2>

  <div id="reader" />

  {scannedCode && (

    <div
      className="
        mt-6
        p-4
        bg-green-100
        rounded-2xl
        font-bold
      "
    >

      الكود:
      {" "}
      {scannedCode}

    </div>

  )}

</div>

        </div>

    );
};