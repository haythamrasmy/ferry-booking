import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { db } from "./firebase";

import {
    collection,
    addDoc,
    onSnapshot,
    serverTimestamp,
    writeBatch,
    doc,
    getDocs,
    updateDoc,
    deleteDoc,
} from "firebase/firestore";

export default function OfflinePassengers() {

    const [trips, setTrips] = useState([]);
    const [tripPassengers, setTripPassengers] = useState([]);

    const [showAddTrip, setShowAddTrip] = useState(false);

    const [tripName, setTripName] = useState("");
    const [tripDate, setTripDate] = useState("");

    const [selectedTrip, setSelectedTrip] = useState(null);

    const [expandedTrip, setExpandedTrip] = useState(null);

    const [search, setSearch] = useState("");

    const [showArchived, setShowArchived] = useState(false);


   const whatsappMessage = `السلام عليكم،

نرجو من حضرتكم مشاهدة فيديو تعليمات السفر قبل موعد الرحلة من خلال الرابط التالي:

https://youtu.be/4O34PyKWpg8

نتمنى لكم رحلة سعيدة 🌹`;

    ////////////////////////////////////////////////////////

    const saveTrip = async () => {

        if (!tripName || !tripDate) {

            alert("Please enter trip name and date.");

            return;

        }

        try {

            await addDoc(
                collection(db, "offlineTrips"),
                {
                    tripName,
                    tripDate,
                    archived: false,
                    passengerCount: 0,
                    createdAt: serverTimestamp(),
                }
            );
            setTripName("");
            setTripDate("");

            setShowAddTrip(false);

        } catch (err) {

            console.log(err);

            alert("Error saving trip.");

        }

    };

    ////////////////////////////////////////////////////////

    useEffect(() => {

        const unsubscribe = onSnapshot(

            collection(db, "offlineTrips"),

            (snapshot) => {

                const data = snapshot.docs.map(doc => ({

                    id: doc.id,

                    ...doc.data(),

                }));

                setTrips(
                    data.filter(trip =>
                        showArchived
                            ? trip.archived === true
                            : trip.archived !== true
                    )
                );
            }

        );


        return () => unsubscribe();

    }, [showArchived]);
    ////////////////////////////////////////////////////////

    const loadPassengers = async (trip) => {

        if (expandedTrip === trip.id) {

            setExpandedTrip(null);

            setTripPassengers([]);

            return;

        }

        const snapshot = await getDocs(

            collection(
                db,
                "offlineTrips",
                trip.id,
                "passengers"
            )

        );

        const data = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data(),
            }))
            .sort((a, b) => a.order - b.order);

        setTripPassengers(data);

        setExpandedTrip(trip.id);

    };

    ////////////////////////////////////////////////////////

    const clearPassengers = async (tripId) => {

        const snapshot = await getDocs(
            collection(db, "offlineTrips", tripId, "passengers")
        );

        const batch = writeBatch(db);

        snapshot.forEach((document) => {

            batch.delete(document.ref);

        });

        await batch.commit();


    };



    const importExcel = (e) => {

        const file = e.target.files[0];

        if (!file) return;

        const reader = new FileReader();

        reader.onload = async (event) => {

            const data = new Uint8Array(event.target.result);

            const workbook = XLSX.read(data, {

                type: "array",

            });

            const sheet = workbook.Sheets[workbook.SheetNames[0]];

            const passengers = XLSX.utils.sheet_to_json(sheet);

            const oldPassengers = await getDocs(
                collection(
                    db,
                    "offlineTrips",
                    selectedTrip.id,
                    "passengers"
                )
            );

            if (!oldPassengers.empty) {

                const replace = window.confirm(

                    "هذه الرحلة تحتوي بالفعل على ركاب.\n\nاضغط OK لاستبدال القائمة الحالية.\nاضغط Cancel لإلغاء العملية."

                );

                if (!replace) return;

                await clearPassengers(selectedTrip.id);

            }

            const batch = writeBatch(db);

            passengers.forEach((passenger, index) => {

                const passengerRef = doc(

                    collection(
                        db,
                        "offlineTrips",
                        selectedTrip.id,
                        "passengers"
                    )

                );

                batch.set(passengerRef, {
                    order: index + 1,

                    name: passenger["اسم الفرد"] || "",

                    documentType:
                        passenger["نوع إثبات الشخصية"] || "",

                    passport:
                        String(passenger["رقم الإثبات"] || ""),

                    phone:
                        String(passenger["الهاتف الأساسي"] || ""),

                    createdAt: serverTimestamp(),

                });

            });

            await batch.commit();

            await updateDoc(

                doc(db, "offlineTrips", selectedTrip.id),

                {
                    passengerCount: passengers.length,
                }

            );

            alert(

                `Passenger list imported successfully.

Total passengers: ${passengers.length}`

            );

            e.target.value = "";
        };

        reader.readAsArrayBuffer(file);

    };

    const archiveTrip = async (tripId) => {

        const ok = window.confirm(
            "هل تريد أرشفة هذه الرحلة؟"
        );

        if (!ok) return;

        await updateDoc(

            doc(db, "offlineTrips", tripId),

            {
                archived: true,
            }

        );

    };

    const restoreTrip = async (tripId) => {

        await updateDoc(
            doc(db, "offlineTrips", tripId),
            {
                archived: false,
            }
        );

    };

    const exportTrip = async (trip) => {

        const snapshot = await getDocs(

            collection(
                db,
                "offlineTrips",
                trip.id,
                "passengers"
            )

        );

        const passengers = snapshot.docs
            .map(doc => doc.data())
            .sort((a, b) => a.order - b.order);

        const excelData = passengers.map((p) => ({

            "اسم الفرد": p.name,

            "نوع إثبات الشخصية": p.documentType,

            "رقم الإثبات": p.passport,

            "الهاتف الأساسي": p.phone,

        }));

        const worksheet = XLSX.utils.json_to_sheet(excelData);

        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Passengers"
        );

        XLSX.writeFile(

            workbook,

            `${trip.tripName}.xlsx`

        );

    };

    const openWhatsApp = (passenger) => {

        let phone = String(passenger.phone || "").trim();

        // حذف أي مسافات أو شرطات
        phone = phone.replace(/\D/g, "");

        // تحويل 01xxxxxxxxx إلى 201xxxxxxxxx
        if (phone.startsWith("0")) {
            phone = "20" + phone.substring(1);
        }

        window.open(

            `https://wa.me/${phone}?text=${encodeURIComponent(whatsappMessage)}`,

            "_blank"

        );

    };

    ////////////////////////////////////////////////////////

    return (

        <div className="min-h-screen bg-[#020817] text-white p-10">

            <div className="max-w-7xl mx-auto">

                {/* Header */}

                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6 mb-10">

                    <div>

                        <h1 className="text-3xl md:text-5xl font-black">
                            Offline Passengers
                        </h1>

                        <p className="text-slate-400 mt-2">
                            إدارة الركاب الأوفلاين
                        </p>

                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">

                        <button
                            onClick={() => setShowAddTrip(true)}
                            className="
w-full
sm:w-auto
bg-blue-600
hover:bg-blue-700
px-6
py-3
rounded-2xl
font-bold
transition
"
                        >
                            + Add Trip
                        </button>

                        <button
                            onClick={() => setShowArchived(!showArchived)}
                            className="
w-full
sm:w-auto
bg-gray-700
hover:bg-gray-600
px-6
py-3
rounded-2xl
font-bold
transition
"
                        >
                            {showArchived
                                ? "Current Trips"
                                : "Archived Trips"}
                        </button>

                    </div>
                </div>

                {trips.length === 0 ? (

                    <div className="bg-[#071427] rounded-3xl p-20 text-center">

                        <h2 className="text-3xl font-bold">

                            لا توجد رحلات

                        </h2>

                    </div>

                ) : (

                    <div className="space-y-6">

                        {trips.map((trip) => (

                            <div
                                key={trip.id}
                                className="bg-[#071427] rounded-3xl p-6"
                            >

                                <div className="flex justify-between items-center">

                                    <div>

                                        <h2
                                            onClick={() => loadPassengers(trip)}
                                            className="text-2xl font-bold cursor-pointer"
                                        >
                                            {expandedTrip === trip.id ? "▼" : "▶"} {trip.tripName}
                                        </h2>

                                        <p className="text-slate-400 mt-2">

                                            {trip.tripDate}

                                        </p>

                                        <p className="text-emerald-400 mt-2 font-semibold">

                                            👥 Passengers:
                                            {" "}
                                            {trip.passengerCount || 0}
                                        </p>

                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-2 mt-4 lg:mt-0">

                                        <button

                                            onClick={() => {

                                                setSelectedTrip(trip);

                                                setTimeout(() => {

                                                    document
                                                        .getElementById("excelFile")
                                                        ?.click();

                                                }, 100);

                                            }}

                                            className="
w-full
sm:w-auto
bg-indigo-600
hover:bg-indigo-700
px-4
py-2
rounded-xl
transition
"
                                        >

                                            Import Excel

                                        </button>

                                        <button
                                            onClick={() => exportTrip(trip)}
                                            className="
w-full
sm:w-auto
bg-green-600
hover:bg-green-700
px-4
py-2
rounded-xl
transition
"
                                        >
                                            Export Excel
                                        </button>




                                        {showArchived ? (

                                            <button
                                                onClick={() => restoreTrip(trip.id)}
                                                className="
w-full
sm:w-auto
bg-green-700
hover:bg-green-800
px-4
py-2
rounded-xl
transition
"                                            >
                                                Restore
                                            </button>

                                        ) : (

                                            <button
                                                onClick={() => archiveTrip(trip.id)}
                                                className="
w-full
sm:w-auto
bg-orange-600
hover:bg-orange-700
px-4
py-2
rounded-xl
transition
"                                            >
                                                Archive
                                            </button>

                                        )}

                                    </div>

                                </div>

                                {expandedTrip === trip.id && (

                                    <div className="mt-8">

                                        <input

                                            type="text"

                                            placeholder="Search by Name / Phone / Passport"

                                            value={search}

                                            onChange={(e) => setSearch(e.target.value)}

                                            className="w-full p-4 rounded-xl bg-slate-800 mb-6"

                                        />

                                        <div className="hidden lg:block overflow-x-auto">

                                            <table className="w-full">

                                                <thead className="bg-slate-800">

                                                    <tr>
                                                        <th className="p-3">#</th>

                                                        <th className="p-3">
                                                            اسم الفرد
                                                        </th>

                                                        <th className="p-3">
                                                            نوع إثبات الشخصية
                                                        </th>

                                                        <th className="p-3">
                                                            رقم الإثبات
                                                        </th>

                                                        <th className="p-3">
                                                            الهاتف الأساسي
                                                        </th>

                                                        <th className="p-3">
                                                            WhatsApp
                                                        </th>

                                                    </tr>

                                                </thead>

                                                <tbody>

                                                    {tripPassengers

                                                        .filter((p) => {

                                                            const q = search.toLowerCase();

                                                            return (

                                                                p.name?.toLowerCase().includes(q) ||

                                                                p.phone?.includes(q) ||

                                                                p.passport?.includes(q)

                                                            );

                                                        })

                                                        .map((p, index) => (

                                                            <tr
                                                                key={p.id}
                                                                className="border-b border-slate-700"
                                                            >

                                                                <td className="p-3 font-bold">
                                                                    {p.order || index + 1}
                                                                </td>

                                                                <td className="p-3">
                                                                    {p.name}
                                                                </td>

                                                                <td className="p-3">
                                                                    {p.documentType}
                                                                </td>

                                                                <td className="p-3">
                                                                    {p.passport}
                                                                </td>

                                                                <td className="p-3">
                                                                    {p.phone}
                                                                </td>

                                                                <td className="p-3">

                                                                    <button
                                                                        onClick={() => openWhatsApp(p)}
                                                                        className="bg-emerald-600 hover:bg-emerald-700 px-3 py-2 rounded-lg"
                                                                    >
                                                                        💬 WhatsApp
                                                                    </button>

                                                                </td>

                                                            </tr>

                                                        ))}

                                                </tbody>

                                            </table>

                                        </div>
                                        <div className="lg:hidden space-y-4">

                                            {tripPassengers
                                                .filter((p) => {

                                                    const q = search.toLowerCase();

                                                    return (

                                                        p.name?.toLowerCase().includes(q) ||

                                                        p.phone?.includes(q) ||

                                                        p.passport?.includes(q)

                                                    );

                                                })
                                                .map((p, index) => (

                                                    <div
                                                        key={p.id}
                                                        className="bg-slate-800 rounded-2xl p-5 border border-slate-700"
                                                    >

                                                        <div className="flex justify-between">

                                                            <h3 className="font-bold text-lg">

                                                                #{p.order || index + 1}

                                                            </h3>

                                                        </div>

                                                        <div className="mt-4">

                                                            <p className="font-bold text-xl">

                                                                👤 {p.name}

                                                            </p>

                                                        </div>

                                                        <div className="mt-4">

                                                            <p className="text-slate-400">

                                                                نوع الإثبات

                                                            </p>

                                                            <p>

                                                                {p.documentType}

                                                            </p>

                                                        </div>

                                                        <div className="mt-4">

                                                            <p className="text-slate-400">

                                                                رقم الإثبات

                                                            </p>

                                                            <p className="break-all">

                                                                {p.passport}

                                                            </p>

                                                        </div>

                                                        <div className="mt-4">

                                                            <p className="text-slate-400">

                                                                الهاتف

                                                            </p>

                                                            <p>

                                                                {p.phone}

                                                            </p>

                                                        </div>

                                                        <div className="mt-6">

                                                            <button
                                                                onClick={() => openWhatsApp(p)}
                                                                className="
w-full
bg-emerald-600
hover:bg-emerald-700
py-3
rounded-xl
font-bold
transition
"
                                                            >
                                                                💬 WhatsApp
                                                            </button>

                                                        </div>

                                                    </div>

                                                ))}

                                        </div>

                                    </div>

                                )}

                            </div>

                        ))}

                    </div>

                )}

            </div>

            {/* Add Trip Modal */}

            {showAddTrip && (

                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">

                    <div className="bg-[#071427] w-full max-w-lg rounded-3xl p-8">

                        <h2 className="text-3xl font-bold mb-6">

                            إضافة رحلة جديدة

                        </h2>

                        <input
                            type="text"
                            placeholder="اسم الرحلة"
                            value={tripName}
                            onChange={(e) => setTripName(e.target.value)}
                            className="w-full bg-slate-800 rounded-xl p-4 mb-4"
                        />

                        <input
                            type="date"
                            value={tripDate}
                            onChange={(e) => setTripDate(e.target.value)}
                            className="w-full bg-slate-800 rounded-xl p-4 mb-6"
                        />

                        <div className="flex justify-end gap-3">

                            <button
                                onClick={() => setShowAddTrip(false)}
                                className="bg-gray-600 px-6 py-3 rounded-xl"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={saveTrip}
                                className="bg-blue-600 px-6 py-3 rounded-xl"
                            >
                                Save
                            </button>

                        </div>

                    </div>

                </div>

            )}

            {/* Hidden Excel Input */}

            {selectedTrip && (

                <input
                    id="excelFile"
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={importExcel}
                />

            )}


        </div>

    );
}