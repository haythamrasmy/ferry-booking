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

    const importExcel = (e) => {

        const file = e.target.files[0];

        if (!file) return;

        const reader = new FileReader();

        reader.onload = (event) => {

            const data = new Uint8Array(event.target.result);

            const workbook = XLSX.read(data, {

                type: "array",

            });

            const sheet = workbook.Sheets[workbook.SheetNames[0]];

            const passengers = XLSX.utils.sheet_to_json(sheet);

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

            batch.commit()

                .then(() => {

                    alert(
                        `Imported ${passengers.length} passengers successfully`
                    );

                })

                .catch(console.error);

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

    ////////////////////////////////////////////////////////

    return (

        <div className="min-h-screen bg-[#020817] text-white p-10">

            <div className="max-w-7xl mx-auto">

                {/* Header */}

                <div className="flex justify-between items-center mb-10">

                    <div>

                        <h1 className="text-5xl font-black">
                            Offline Passengers
                        </h1>

                        <p className="text-slate-400 mt-2">
                            إدارة الركاب الأوفلاين
                        </p>

                    </div>

                    <button
                        onClick={() => setShowAddTrip(true)}
                        className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-2xl font-bold"
                    >
                        + Add Trip
                    </button>

                    <button
    onClick={() => setShowArchived(!showArchived)}
    className="bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-2xl font-bold"
>
    {showArchived ? "Current Trips" : "Archived Trips"}
</button>


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

                                    </div>

                                    <div className="flex gap-3">

                                        <button

                                            onClick={() => {

                                                setSelectedTrip(trip);

                                                setTimeout(() => {

                                                    document
                                                        .getElementById("excelFile")
                                                        ?.click();

                                                }, 100);

                                            }}

                                            className="bg-indigo-600 px-4 py-2 rounded-xl"

                                        >

                                            Import Excel

                                        </button>

                                        <button
                                            className="bg-green-600 px-4 py-2 rounded-xl"
                                        >

                                            Export

                                        </button>

                                       {showArchived ? (

    <button
        onClick={() => restoreTrip(trip.id)}
        className="bg-green-700 hover:bg-green-800 px-4 py-2 rounded-xl"
    >
        Restore
    </button>

) : (

    <button
        onClick={() => archiveTrip(trip.id)}
        className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-xl"
    >
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

                                        <div className="overflow-x-auto">

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

                                                            </tr>

                                                        ))}

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