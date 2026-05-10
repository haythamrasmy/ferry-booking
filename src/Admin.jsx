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

    const [price, setPrice] =
        useState("");

    const [seats, setSeats] =
        useState("");
    const [showTripForm, setShowTripForm] =
        useState(false);

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
                const currentTime = Date.now();

                const bookingData = snapshot.docs
                    .filter((doc) => {
                        const data = doc.data();

                        return (
                            !data.expiresAt ||
                            data.expiresAt > currentTime
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


                setBookings(bookingData);
            }
        );
    };

    const confirmBooking = async (id) => {
        try {
            await updateDoc(
                doc(db, "bookings", id),
                {
                    status: "confirmed",
                    expiresAt: null,
                }
            );
        } catch (error) {
            console.log(error);
        }
    };

    const deleteBooking = async (id) => {
        try {
            await deleteDoc(doc(db, "bookings", id));

            fetchBookings();

            alert("تم حذف الحجز");

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
                    price,
                    seats: Number(seats),
                    tripTimestamp:
                        new Date(date).getTime(),
                }
            );

            alert("تم إضافة الرحلة");

            setRoute("");
            setDate("");
            setTime("");
            setPrice("");
            setSeats("");

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
                        placeholder="ابحث باسم الراكب أو المقعد"
                        value={search}
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
                                    المقعد
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
                                        booking.seat
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
                                            {booking.seat}
                                        </td>

                                        <td className="p-4">
                                            {booking.phone}
                                        </td>

                                        <td className="p-4">
                                            {booking.passport}
                                        </td>

                                        <td className="p-4 text-center">                                            {booking.paymentImage && (
                                            <img
                                                src={booking.paymentImage}
                                                alt="Payment"
                                                onClick={() =>
                                                    booking.paymentImage &&
                                                    window.open(
                                                        booking.paymentImage,
                                                        "_blank"
                                                    )
                                                }
                                                className="w-20 h-20 object-cover rounded-xl cursor-pointer mx-auto hover:scale-105 transition"
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
                                                "confirmed" && (
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
                                                )}
                                        </td>

                                        <td className="p-4">
                                            <button
                                                onClick={() =>
                                                    deleteBooking(booking.id)
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
                        <div className="bg-blue-950 rounded-3xl p-6 mb-10">                        <h2 className="text-2xl font-bold mb-6">
                            إضافة رحلة
                        </h2>

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
                                    type="text"
                                    placeholder="الوقت"
                                    value={time}
                                    onChange={(e) =>
                                        setTime(e.target.value)
                                    }
                                    className="bg-slate-700 p-4 rounded-2xl outline-none"
                                />

                                <input
                                    type="text"
                                    placeholder="السعر"
                                    value={price}
                                    onChange={(e) =>
                                        setPrice(e.target.value)
                                    }
                                    className="bg-slate-700 p-4 rounded-2xl outline-none"
                                />

                                <input
                                    type="number"
                                    placeholder="عدد المقاعد"
                                    value={seats}
                                    onChange={(e) =>
                                        setSeats(e.target.value)
                                    }
                                    className="bg-slate-700 p-4 rounded-2xl outline-none"
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

                                            <p className="text-slate-400 text-sm">
                                                {trip.date} - {trip.time}
                                            </p>
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
                    )}
                </div>
            </div>
        </div>
    );
}