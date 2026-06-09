import { useEffect, useState } from "react";

import { db, auth } from "./firebase";

import {
    collection,
    addDoc,
    onSnapshot,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    query,
    where
} from "firebase/firestore";

import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
} from "firebase/auth";

import { Html5QrcodeScanner }
    from "html5-qrcode";

import {
    generateTicketPDF
} from "./utils/generateTicketPDF";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import {

    setDoc
} from "firebase/firestore";




export default function Admin() {

    const ADMIN_EMAIL = "hrasmy2010@hotmail.com";

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

    const [scannedCargo, setScannedCargo] =
        useState(null);

    const [scannedCargoId, setScannedCargoId] = useState(null);

    const [agents, setAgents] = useState([]);

    const [selectedAgent, setSelectedAgent] =
        useState(null);

    const [expandedTrip, setExpandedTrip] =
        useState(null);

    const [archives, setArchives] =
        useState([]);

    const [
        showArchives,
        setShowArchives
    ] = useState(false);


    const [
        showAgents,
        setShowAgents
    ] = useState(false);

    const [
        showTripsSection,
        setShowTripsSection
    ] = useState(false);



    const [
        showBookingsSection,
        setShowBookingsSection
    ] = useState(false);


    const updateCargoStatus = async (
        newStatus
    ) => {

        if (
            !scannedCargoId
        ) return;

        try {

            await updateDoc(
                doc(
                    db,
                    "cargoItems",
                    scannedCargoId
                ),
                {
                    status:
                        newStatus
                }
            );

            setScannedCargo(
                prev => ({
                    ...prev,
                    status:
                        newStatus
                })
            );

        } catch (err) {

            console.error(err);

            alert(
                "فشل تحديث الحالة"
            );

        }

    };


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


        const unsubscribeAgents =
            onSnapshot(
                collection(db, "agents"),
                (snapshot) => {

                    const agentsData =
                        snapshot.docs.map((doc) => ({
                            id: doc.id,
                            ...doc.data(),
                        }));

                    setAgents(agentsData);

                }
            );

        const unsubscribeArchives =
            onSnapshot(
                collection(
                    db,
                    "tripArchives"
                ),
                (snapshot) => {

                    const archivesData =
                        snapshot.docs.map(
                            (doc) => ({
                                id: doc.id,
                                ...doc.data(),
                            })
                        );

                    setArchives(
                        archivesData
                    );

                }
            );



        const unsubscribe =
            onAuthStateChanged(auth, (user) => {
                if (
                    user &&
                    user.email === ADMIN_EMAIL
                ) {

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

            unsubscribeAgents();

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
                    fps: 10,
                },
                false
            );

        document.documentElement.style.setProperty(
            "--qr-color",
            "black"
        );
        scanner.render(

            async (decodedText) => {

                console.log(
                    "QR CONTENT =",
                    decodedText
                );

                setScannedCode(decodedText);

                const q = query(
                    collection(db, "cargoItems"),
                    where("serial", "==", decodedText)
                );

                const snapshot =
                    await getDocs(q);

                console.log(
                    "FOUND DOCS:",
                    snapshot.size
                );


                if (!snapshot.empty) {

                    const cargoDoc =
                        snapshot.docs[0];

                    setScannedCargo(
                        cargoDoc.data()
                    );

                    setScannedCargoId(
                        cargoDoc.id
                    );

                } else {

                    setScannedCargo(null);

                    alert(
                        "لم يتم العثور على هذه القطعة"
                    );

                }

            },

            () => { }

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
                        t.id === booking.tripId
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
                    trip.remainingCabinTickets <= 0
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
                        remainingCabinTickets:
                            trip.remainingCabinTickets - 1,
                    }
                );

            } else {

                if (
                    trip.remainingSecondClassTickets <= 0
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
                        remainingSecondClassTickets:
                            trip.remainingSecondClassTickets - 1,
                    }
                );

            }

            await updateDoc(
                doc(db, "bookings", id),
                {
                    status: "confirmed",
                    expiresAt: null,
                    ticketDownloaded: false,
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

                    tripTimestamp:
                        new Date(
                            `${date}T${time}`
                        ).getTime(),

                    cabinPrice: Number(
                        cabinPrice
                            .replace(/٠/g, "0")
                            .replace(/١/g, "1")
                            .replace(/٢/g, "2")
                            .replace(/٣/g, "3")
                            .replace(/٤/g, "4")
                            .replace(/٥/g, "5")
                            .replace(/٦/g, "6")
                            .replace(/٧/g, "7")
                            .replace(/٨/g, "8")
                            .replace(/٩/g, "9")
                    ),

                    secondClassPrice: Number(
                        secondClassPrice
                            .replace(/٠/g, "0")
                            .replace(/١/g, "1")
                            .replace(/٢/g, "2")
                            .replace(/٣/g, "3")
                            .replace(/٤/g, "4")
                            .replace(/٥/g, "5")
                            .replace(/٦/g, "6")
                            .replace(/٧/g, "7")
                            .replace(/٨/g, "8")
                            .replace(/٩/g, "9")
                    ),

                    totalCabinTickets:
                        Number(cabinTickets),

                    remainingCabinTickets:
                        Number(cabinTickets),

                    totalSecondClassTickets:
                        Number(secondClassTickets),

                    remainingSecondClassTickets:
                        Number(secondClassTickets),
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

            if (
                !window.confirm(
                    `هل تريد حذف حجز ${booking?.name} ؟`
                )
            ) {
                return;
            }

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
                                remainingCabinTickets:
                                    trip.remainingCabinTickets + 1,
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
                                remainingSecondClassTickets:
                                    trip.remainingSecondClassTickets + 1,
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

            const credential =
                await signInWithEmailAndPassword(
                    auth,
                    adminEmail,
                    adminPassword
                );

            if (
                credential.user.email !==
                ADMIN_EMAIL
            ) {

                await signOut(auth);

                alert(
                    "هذا الحساب ليس حساب الأدمن"
                );

                return;
            }

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


    const exportTripExcel = (
        trip
    ) => {

        const tripBookings =
            bookings.filter(
                (booking) =>
                    booking.tripId === trip.id
            );

        const excelData =
            tripBookings.map(
                (booking) => ({

                    الاسم:
                        booking.name,

                    الهاتف:
                        booking.phone,

                    الجواز:
                        booking.passport,

                    "نوع التذكرة":
                        booking.ticketType,

                    الوكيل:
                        booking.agentName ||
                        "حجز مباشر",

                    الحالة:
                        booking.status,

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
            "Passengers"
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
            `${trip.route}.xlsx`
        );

    };



    const exportAgentExcel = (
        agent
    ) => {

        const agentBookings =
            bookings.filter(
                (booking) =>
                    booking.agentId ===
                    agent.id
            );

        const excelData =
            agentBookings.map(
                (booking) => ({

                    الراكب:
                        booking.name,

                    الهاتف:
                        booking.phone,

                    الجواز:
                        booking.passport,

                    الرحلة:
                        booking.trip,

                    "نوع التذكرة":
                        booking.ticketType,

                    السعر:
                        booking.ticketPrice,

                    الحالة:
                        booking.status,

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
            `${agent.fullName}.xlsx`
        );

    };

    const archiveTrip = async (
        trip
    ) => {

        try {

            const tripBookings =
                bookings.filter(
                    (booking) =>
                        booking.tripId ===
                        trip.id
                );

            await addDoc(
                collection(db, "tripArchives"),
                {
                    originalTripId: trip.id,

                    tripData: trip,

                    passengers:
                        tripBookings,

                    archivedAt:
                        new Date(),

                    passengerCount:
                        tripBookings.length,

                }
            );

            await deleteDoc(
                doc(
                    db,
                    "trips",
                    trip.id
                )
            );

            alert(
                "تمت أرشفة الرحلة بنجاح"
            );

        } catch (error) {

            console.log(error);

            alert(
                "حدث خطأ أثناء الأرشفة"
            );

        }

    };

    const restoreTrip = async (
        archive
    ) => {

        try {

            const originalId =
                archive.originalTripId;

            const tripData = {
                ...archive.tripData,
            };

            delete tripData.id;

            await setDoc(
                doc(
                    db,
                    "trips",
                    originalId
                ),
                tripData
            );

            await deleteDoc(
                doc(
                    db,
                    "tripArchives",
                    archive.id
                )
            );

            alert(
                "تم استرجاع الرحلة"
            );

        } catch (error) {

            console.log(error);

            alert(
                "حدث خطأ أثناء الاسترجاع"
            );

        }

    };

    const groupedTrips =
        trips.map((trip) => ({
            ...trip,

            passengers:
                bookings.filter(
                    (booking) =>
                        booking.tripId ===
                        trip.id
                ),
        }));




    return (
        <div
            className="
    min-h-screen
    text-white
    p-10
    bg-[#020817]
  "
        >
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between mb-10">


                    <div className="flex-1 text-center">

                        <h1 className="text-5xl font-black">
                            لوحة التحكم
                        </h1>

                        <p className="text-slate-400 mt-2">
                            إدارة الرحلات والحجوزات والوكلاء
                        </p>

                    </div>
                    <button
                        onClick={adminLogout}
                        className="bg-red-600 px-5 py-3 rounded-2xl"
                    >
                        تسجيل الخروج
                    </button>
                </div>



                <div className="grid grid-cols-3 gap-2 mb-8">

                    <div
                        className="
bg-slate-800/50
backdrop-blur-xl
border
border-blue-500/40
rounded-3xl
flex-1
h-24
flex
flex-col
justify-center
items-center
text-center
shadow-[0_0_35px_rgba(59,130,246,0.35)]
"
                    >
                        <p className="text-[14px] text-slate-400">
                            إجمالي الحجوزات
                        </p>

                        <h3 className="text-2xl font-bold mt-1">                            {bookings.length}
                        </h3>
                    </div>

                    <div

                        className="
bg-slate-800/50
backdrop-blur-xl
border
border-blue-500/40
rounded-3xl
flex-1
h-24
flex
flex-col
justify-center
items-center
text-center
shadow-[0_0_35px_rgba(59,130,246,0.35)]
"

                    >
                        <p className="text-[15px] text-slate-400">
                            الحجوزات المؤكدة
                        </p>

                        <h3 className="text-2xl font-bold mt-1 text-green-400">
                            {confirmedBookings.length}
                        </h3>


                    </div>

                    <div

                        className="
bg-slate-800/50
backdrop-blur-xl
border
border-blue-500/40
rounded-3xl
flex-1
h-24
flex
flex-col
justify-center
items-center
text-center
shadow-[0_0_35px_rgba(59,130,246,0.35)]
"

                    >


                        <p className="text-[15px] text-slate-400">
                            قيد المراجعة
                        </p>

                        <h3 className="text-2xl font-bold mt-1 text-yellow-400">
                            {pendingBookings.length}
                        </h3>
                    </div>
                </div>

                <div className="mb-6 sticky top-0 z-20 bg-slate-900 py-2">
                    <input
                        type="text"
                        placeholder="ابحث بالاسم أو رقم الهاتف أو رقم الجواز أو نوع التذكرة" value={search}
                        onChange={(e) =>
                            setSearch(e.target.value)
                        }
                        className="w-full bg-slate-700 text-white p-4 rounded-2xl outline-none"
                    />
                </div>

                <div
                    className="
    mt-10
bbg-[#071427]
border
border-[#12315f]
rounded-[28px]
py-8
px-10
shadow-[0_0_30px_rgba(37,99,235,0.12)]
    mb-4
  "
                >


                    <button
                        onClick={() =>
                            setShowBookingsSection(
                                !showBookingsSection
                            )
                        }
                        className="
relative
w-full
flex
justify-center
items-center
"
                    >



                        <div className="flex items-center gap-3">

                            <div className="w-3 h-8 rounded-full bg-blue-400"></div>

                            <h2 className="text-3xl font-bold">
                                الحجوزات
                            </h2>

                            <span
                                className="
          bg-blue-500/20
          text-blue-300
          px-3
          py-1
          rounded-xl
          text-sm
        "
                            >
                                {bookings.length}
                            </span>

                        </div>



                        <span className="text-2xl">
                            {showBookingsSection ? "▲" : "▼"}
                        </span>

                    </button>

                </div>



                {showBookingsSection && (

                    <div className="bg-slate-800 rounded-3xl overflow-hidden">


                        <div className="overflow-x-auto">
                            <table className="min-w-[1300px] w-full text-right">


                                <thead className="bg-slate-700 sticky top-0 z-10">
                                    <tr>
                                        <th className="p-4">
                                            الراكب
                                        </th>

                                        <th className="p-4">
                                            الوكيل
                                        </th>
                                        <th className="p-4">
                                            نوع التذكرة
                                        </th>
                                        <th className="p-4">
                                            الهاتف
                                        </th>

                                        <th className="p-4">
                                            تاريخ الحجز
                                        </th>

                                        <th className="p-4">
                                            رقم الجواز
                                        </th>

                                        <th className="p-4">
                                            الإيصال
                                        </th>

                                        <th className="p-4">
                                            صورة الجواز
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

                                            const trip = trips.find(
                                                (t) => t.id === booking.tripId
                                            );

                                            if (
                                                trip &&
                                                trip.tripTimestamp &&
                                                trip.tripTimestamp < Date.now()
                                            ) {
                                                return false;
                                            }

                                            const searchValue =
                                                search.toLowerCase();

                                            return (

                                                booking.name
                                                    ?.toLowerCase()
                                                    .includes(searchValue)

                                                ||

                                                booking.ticketType
                                                    ?.toLowerCase()
                                                    .includes(searchValue)

                                                ||

                                                booking.phone
                                                    ?.toString()
                                                    .includes(search)

                                                ||

                                                booking.passport
                                                    ?.toString()
                                                    .includes(search)

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
                                                    {booking.agentName || "حجز مباشر"}
                                                </td>

                                                <td className="p-4">
                                                    {booking.ticketType}
                                                </td>

                                                <td className="p-4">
                                                    {booking.phone}
                                                </td>

                                                <td className="p-4 whitespace-nowrap">
                                                    {booking.createdAt
                                                        ? booking.createdAt
                                                            .toDate()
                                                            .toLocaleString("ar-EG")
                                                        : "-"}
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

                                                    {booking.status === "confirmed" ? (

                                                        <span
                                                            className="
                bg-green-600
                text-white
                px-3
                py-1
                rounded-full
                text-sm
                font-semibold
            "
                                                        >
                                                            مؤكد
                                                        </span>

                                                    ) : (

                                                        <span
                                                            className="
                bg-yellow-500
                text-black
                px-3
                py-1
                rounded-full
                text-sm
                font-semibold
            "
                                                        >
                                                            قيد المراجعة
                                                        </span>

                                                    )}

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

                                                <td className="p-4 flex gap-2">

                                                    {booking.status ===
                                                        "confirmed" && (

                                                            <button
                                                                onClick={() =>
                                                                    generateTicketPDF(
                                                                        booking
                                                                    )
                                                                }
                                                                className="
    bg-blue-600
    px-4
    py-2
    rounded-xl
  "
                                                            >
                                                                إعادة إصدار
                                                            </button>

                                                        )}

                                                    <button
                                                        onClick={() =>
                                                            deleteBooking(
                                                                booking.id
                                                            )
                                                        }
                                                        className="
      bg-red-600
      px-4
      py-2
      rounded-xl
    "
                                                    >
                                                        حذف
                                                    </button>

                                                </td>
                                            </tr>
                                        ))}
                                </tbody>

                            </table>

                        </div>

                    </div>

                )}

                <div
                    className="
    bg-[#071427]
border-[#12315f]
    rounded-3xl
    p-6
    mt-8
    shadow-2xl
  "
                >
                    <div className="flex items-center gap-3 mb-6">


                        <button
                            onClick={() =>
                                setShowAgents(
                                    !showAgents
                                )
                            }
                            className="
relative
w-full
flex
justify-center
items-center
"
                        >

                            <div className="flex items-center gap-3">

                                <div className="w-3 h-8 rounded-full bg-fuchsia-400"></div>

                                <h2 className="text-2xl font-bold">
                                    الوكلاء
                                </h2>

                                <span
                                    className="
        bg-fuchsia-500/20
        text-fuchsia-300
        px-3
        py-1
        rounded-xl
        text-sm
      "
                                >
                                    {agents.length}
                                </span>

                            </div>

                            <span className="text-2xl">
                                {showAgents ? "▲" : "▼"}
                            </span>

                        </button>



                    </div>

                    {showAgents && (

                        <div className="space-y-4">

                            {agents.map((agent) => {

                                const agentBookings =
                                    bookings.filter(
                                        (booking) =>
                                            booking.agentId ===
                                            agent.id
                                    );

                                const sales =
                                    agentBookings.reduce(
                                        (sum, booking) =>
                                            sum +
                                            Number(
                                                booking.ticketPrice || 0
                                            ),
                                        0
                                    );

                                const commission =
                                    sales * (
                                        Number(
                                            agent.commissionRate
                                        ) / 100
                                    );

                                return (

                                    <div
                                        key={agent.id}
                                        onClick={() =>
                                            setSelectedAgent(agent)
                                        }
                                        className="
  bg-cyan-950
  border
  border-cyan-700
  rounded-3xl
  p-6
  mt-8
  shadow-2xl
"
                                    >


                                        <div className="flex items-center gap-3">

                                            <div
                                                className="
      w-12
      h-12
      rounded-full
      bg-fuchsia-500/20
      flex
      items-center
      justify-center
      text-xl
    "
                                            >
                                                👤
                                            </div>

                                            <h3 className="font-bold text-lg">
                                                {agent.fullName}
                                            </h3>

                                        </div>

                                        <div
                                            className="
    text-2xl
    text-fuchsia-300
  "
                                        >
                                            ›
                                        </div>

                                    </div>

                                );

                            })}

                        </div>
                    )}

                </div>

                <div
                    className="
mt-16
bg-[#071427]
  border
border-[#112b52]
  rounded-3xl
  p-6
  shadow-2xl
"
                >


                    <button
                        onClick={() =>
                            setShowTripsSection(
                                !showTripsSection
                            )
                        }
                        className="
relative
w-full
flex
justify-center
items-center
"
                    >



                        <div className="flex items-center gap-3">

                            <div className="w-3 h-8 rounded-full bg-emerald-400"></div>

                            <h2 className="text-3xl font-bold">
                                الرحلات والركاب
                            </h2>

                        </div>

                        <span className="text-2xl">
                            {showTripsSection ? "▲" : "▼"}
                        </span>

                    </button>

                    {showTripsSection && (

                        <div className="space-y-6">

                            {groupedTrips.map((trip) => (

                                <div
                                    key={trip.id}

                                    className="
          bg-slate-800
          rounded-3xl
          p-6
        "
                                >

                                    <div
                                        className="
relative
w-full
flex
justify-center
items-center
"
                                    >

                                        <div>

                                            <h3 className="text-2xl font-bold">
                                                {trip.route}
                                            </h3>

                                            <p className="text-slate-400">
                                                {trip.date} - {trip.time}
                                            </p>

                                            <p className="text-slate-400">
                                                عدد الركاب:
                                                {" "}
                                                {trip.passengers.length}
                                            </p>

                                        </div>

                                        <div className="flex gap-2">

                                            <button
                                                onClick={() =>
                                                    exportTripExcel(trip)
                                                }
                                                className="
      bg-green-600
      px-4
      py-2
      rounded-xl
    "
                                            >
                                                Export Excel
                                            </button>

                                            <button
                                                onClick={() =>
                                                    archiveTrip(trip)
                                                }
                                                className="
      bg-yellow-600
      px-4
      py-2
      rounded-xl
    "
                                            >
                                                Archive
                                            </button>

                                            <button
                                                onClick={() =>
                                                    setExpandedTrip(
                                                        expandedTrip === trip.id
                                                            ? null
                                                            : trip.id
                                                    )
                                                }
                                                className="
      bg-blue-600
      px-4
      py-2
      rounded-xl
    "
                                            >
                                                عرض الركاب
                                            </button>

                                        </div>

                                    </div>

                                    {expandedTrip === trip.id && (

                                        <div className="mt-6 overflow-x-auto">

                                            <div className="overflow-x-auto">

                                                <table className="min-w-[700px] w-full">
                                                    <thead>

                                                        <tr>

                                                            <th className="p-3">
                                                                الاسم
                                                            </th>

                                                            <th className="p-3">
                                                                الهاتف
                                                            </th>

                                                            <th className="p-3">
                                                                الجواز
                                                            </th>

                                                            <th className="p-3">
                                                                نوع التذكرة
                                                            </th>

                                                            <th className="p-3">
                                                                الوكيل
                                                            </th>

                                                        </tr>

                                                    </thead>

                                                    <tbody>

                                                        {trip.passengers.map(
                                                            (passenger) => (

                                                                <tr
                                                                    key={passenger.id}
                                                                    className="
                        border-t
                        border-slate-700
                      "
                                                                >

                                                                    <td className="p-3">
                                                                        {passenger.name}
                                                                    </td>

                                                                    <td className="p-3">
                                                                        {passenger.phone}
                                                                    </td>

                                                                    <td className="p-3">
                                                                        {passenger.passport}
                                                                    </td>

                                                                    <td className="p-3">
                                                                        {passenger.ticketType}
                                                                    </td>

                                                                    <td className="p-3">
                                                                        {passenger.agentName ||
                                                                            "حجز مباشر"}
                                                                    </td>

                                                                </tr>

                                                            )
                                                        )}

                                                    </tbody>

                                                </table>
                                            </div>

                                        </div>

                                    )}

                                </div>

                            ))}

                        </div>
                    )}
                </div>



                <div
                    className="
mt-16
    bg-amber-950
    border
    border-amber-700
    rounded-3xl
    p-6
    shadow-2xl
  "
                >
                    <button
                        onClick={() =>
                            setShowArchives(
                                !showArchives
                            )
                        }
                        className="
relative
w-full
flex
justify-center
items-center
"
                    >

                        <div className="flex items-center gap-3">

                            <div className="w-3 h-8 rounded-full bg-amber-400"></div>

                            <h2 className="text-3xl font-bold">
                                الرحلات المؤرشفة
                            </h2>

                        </div>

                        <span className="text-2xl">

                            {showArchives
                                ? "▲"
                                : "▼"}

                        </span>

                    </button>

                    {showArchives && (

                        <div className="space-y-4 overflow-x-auto">
                            {archives.map(
                                (archive) => (

                                    <div
                                        key={archive.id}
                                        className="
  bg-slate-900/60
  border
  border-amber-700/40
  rounded-3xl
  p-6
  flex
  flex-col
  md:flex-row
  gap-4
  md:justify-between
  md:items-center
"
                                    >

                                        <div>

                                            <h3 className="text-2xl font-bold">
                                                {
                                                    archive.tripData
                                                        ?.route
                                                }
                                            </h3>

                                            <p>
                                                عدد الركاب:
                                                {" "}
                                                {
                                                    archive.passengerCount
                                                }
                                            </p>

                                        </div>

                                        <div
                                            className="
    flex
    flex-wrap
    gap-2
    w-full
    md:w-auto
  "
                                        >



                                            <button
                                                onClick={() =>
                                                    restoreTrip(
                                                        archive
                                                    )
                                                }
                                                className="
    bg-green-600
    px-4
    py-2
    rounded-xl
  "
                                            >
                                                Restore
                                            </button>

                                            <button
                                                className="
      bg-yellow-600
      px-4
      py-2
      rounded-xl
    "
                                            >
                                                Excel
                                            </button>

                                        </div>
                                    </div>

                                )
                            )}

                        </div>
                    )}
                </div>





                <button
                    onClick={() =>
                        setShowTripForm(!showTripForm)
                    }
                    className="
    fixed
    bottom-8
    left-8
    z-50

    w-[88px]
    h-[88px]

    rounded-full

    flex
    flex-col
    items-center
    justify-center

    bg-gradient-to-br
    from-fuchsia-600
    via-indigo-600
    to-cyan-500

    border-4
    border-white/20

    shadow-[0_0_40px_rgba(168,85,247,0.7)]

    text-white

    hover:scale-105
    transition-all
    duration-300
  "
                >
                    <span className="text-4xl leading-none">
                        +
                    </span>

                    <span className="text-[10px] font-bold leading-none">
                        إضافة رحلة
                    </span>
                </button>

                {showTripForm && (
                    <div
                        className="
    fixed
    inset-0
    bg-black/60
    z-40
    overflow-y-auto
    p-6
  "
                    >
                        <div
                            className="
bg-[#071427]
    rounded-3xl
    p-6
    w-full
    max-w-4xl
    shadow-2xl
    relative
    my-10
    mx-auto
  "
                        >
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
                                    type="number"
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
                                    type="number"
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
                                {trips
                                    .filter(
                                        (trip) =>
                                            !trip.tripTimestamp ||
                                            trip.tripTimestamp > Date.now()
                                    )
                                    .map((trip) => (
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
                                                        {trip.remainingCabinTickets}
                                                    </p>

                                                    <p className="text-sm text-yellow-400">

                                                        المتبقي درجة ثانية:
                                                        {trip.remainingSecondClassTickets}
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

                                            <div className="flex gap-2">

                                                <button
                                                    onClick={() =>
                                                        exportTripExcel(trip)
                                                    }
                                                    className="
      bg-green-600
      px-4
      py-2
      rounded-xl
    "
                                                >
                                                    Excel
                                                </button>

                                                <button
                                                    onClick={() =>
                                                        archiveTrip(trip)
                                                    }
                                                    className="
      bg-yellow-600
      px-4
      py-2
      rounded-xl
    "
                                                >
                                                    Archive
                                                </button>

                                            </div>
                                        </div>
                                    ))}
                            </div>

                        </div>
                    </div>
                )}

            </div>

            {selectedAgent && (

                <div
                    className="
      fixed
      inset-0
      bg-black/70
      z-[9999]
      p-6
      overflow-y-auto
    "
                >

                    <div
                        className="
  max-w-7xl
  mx-auto
  bg-[#071427]
border-[#12315f]
  rounded-3xl
  p-6
  shadow-2xl
"
                    >

                        <div
                            className="
relative
w-full
flex
justify-center
items-center
"
                        >

                            <div className="flex items-center gap-4">

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

                                    <h2 className="text-3xl font-bold">
                                        {selectedAgent.fullName}
                                    </h2>

                                    <p className="text-slate-400">
                                        وكيل معتمد
                                    </p>

                                </div>

                            </div>

                            <div className="flex gap-3">

                                <button
                                    onClick={() =>
                                        exportAgentExcel(
                                            selectedAgent
                                        )
                                    }
                                    className="
        bg-green-600
        px-4
        py-2
        rounded-xl
      "
                                >
                                    Export Excel
                                </button>

                                <button
                                    onClick={() =>
                                        setSelectedAgent(null)
                                    }
                                    className="
        bg-red-600
        px-4
        py-2
        rounded-xl
      "
                                >
                                    إغلاق
                                </button>

                            </div>

                        </div>


                        <div className="grid md:grid-cols-3 gap-4 mb-8">

                            <div className="bg-slate-900/40 rounded-2xl p-4">

                                <p className="text-slate-400">
                                    الحجوزات
                                </p>

                                <h3 className="text-3xl font-bold">
                                    {
                                        bookings.filter(
                                            booking =>
                                                booking.agentId ===
                                                selectedAgent.id
                                        ).length
                                    }
                                </h3>

                            </div>

                            <div className="bg-green-900/30 rounded-2xl p-4">

                                <p className="text-green-300">
                                    المبيعات
                                </p>

                                <h3 className="text-3xl font-bold">
                                    {
                                        bookings
                                            .filter(
                                                booking =>
                                                    booking.agentId ===
                                                    selectedAgent.id
                                            )
                                            .reduce(
                                                (sum, booking) =>
                                                    sum +
                                                    Number(
                                                        booking.ticketPrice || 0
                                                    ),
                                                0
                                            )
                                    }
                                    ج.م
                                </h3>

                            </div>

                            <div className="bg-blue-900/30 rounded-2xl p-4">

                                <p className="text-blue-300">
                                    العمولة
                                </p>

                                <h3 className="text-3xl font-bold">

                                    {(
                                        bookings
                                            .filter(
                                                booking =>
                                                    booking.agentId ===
                                                    selectedAgent.id
                                            )
                                            .reduce(
                                                (sum, booking) =>
                                                    sum +
                                                    Number(
                                                        booking.ticketPrice || 0
                                                    ),
                                                0
                                            ) *
                                        (
                                            Number(
                                                selectedAgent.commissionRate
                                            ) / 100
                                        )
                                    ).toFixed(2)}

                                    ج.م

                                </h3>

                            </div>

                        </div>

                        <div className="overflow-x-auto">

                            <table
                                className="
      min-w-[700px]
      w-full
    "
                            >

                                <thead>

                                    <tr className="
  border-b
  border-slate-700
  bg-fuchsia-900/20
">

                                        <th className="p-3">
                                            الراكب
                                        </th>

                                        <th className="p-3">
                                            الرحلة
                                        </th>

                                        <th className="p-3">
                                            نوع التذكرة
                                        </th>

                                        <th className="p-3">
                                            السعر
                                        </th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {bookings
                                        .filter(
                                            (booking) =>
                                                booking.agentId ===
                                                selectedAgent.id
                                        )
                                        .map((booking) => (

                                            <tr
                                                key={booking.id}
                                                className="
  border-b
  border-slate-800
  hover:bg-fuchsia-900/20
  transition
"
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

                                            </tr>

                                        ))}

                                </tbody>

                            </table>
                        </div>

                    </div>

                </div>

            )}

            {previewImage && (
                <div
                    onClick={() => setPreviewImage("")}
                    className="
      fixed
      inset-0
      bg-black/90
      flex
      items-center
      justify-center
      z-[9999]
      p-6
    "
                >
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setPreviewImage("");
                        }}
                        className="
        absolute
        top-6
        right-6
        text-white
        text-5xl
        font-bold
      "
                    >
                        ×
                    </button>

                    <img
                        src={previewImage}
                        alt="Preview"
                        onClick={(e) => e.stopPropagation()}
                        className="
        max-w-[90vw]
        max-h-[90vh]
        object-contain
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

                <div
                    id="reader"
                    className="
    text-black
    bg-white
    p-4
    rounded-2xl
  "
                >

                </div>

                {scannedCargo && (

                    <div
                        className="
      mt-6
      p-5
      rounded-xl
      border
      bg-white
      shadow
    "
                    >

                        <h3 className="text-xl font-bold mb-4">
                            بيانات القطعة
                        </h3>

                        <p>
                            <strong>
                                الصنف:
                            </strong>
                            {" "}
                            {scannedCargo.item}
                        </p>

                        <p>
                            <strong>
                                الرقم:
                            </strong>
                            {" "}
                            {scannedCargo.serial}
                        </p>

                        <p>
                            <strong>
                                التتبع:
                            </strong>
                            {" "}
                            {scannedCargo.trackingId}
                        </p>

                        <p>
                            <strong>
                                الوجهة:
                            </strong>
                            {" "}
                            {scannedCargo.destination}
                        </p>

                        <p>
                            <strong>
                                الحالة:
                            </strong>
                            {" "}
                            {scannedCargo.status}
                        </p>

                        <div className="flex flex-wrap gap-2 mt-4">

                            <button
                                onClick={() =>
                                    updateCargoStatus(
                                        "تم الاستلام"
                                    )
                                }
                            >
                                تم الاستلام
                            </button>

                            <button
                                onClick={() =>
                                    updateCargoStatus(
                                        "في المخزن"
                                    )
                                }
                            >
                                في المخزن
                            </button>

                            <button
                                onClick={() =>
                                    updateCargoStatus(
                                        "تم التحميل"
                                    )
                                }
                            >
                                تم التحميل
                            </button>

                            <button
                                onClick={() =>
                                    updateCargoStatus(
                                        "وصلت الوجهة"
                                    )
                                }
                            >
                                وصلت الوجهة
                            </button>

                            <button
                                onClick={() =>
                                    updateCargoStatus(
                                        "تم التسليم"
                                    )
                                }
                            >
                                تم التسليم
                            </button>

                        </div>

                    </div>

                )}

              

                
            </div>

        </div>

    );
};