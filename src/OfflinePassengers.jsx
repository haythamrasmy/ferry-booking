import { useState } from "react";
import { db } from "./firebase";

import {
    collection,
    addDoc,
    serverTimestamp,
} from "firebase/firestore";

export default function OfflinePassengers() {

    const [trips, setTrips] = useState([]);
    const [showAddTrip, setShowAddTrip] = useState(false);

const [tripName, setTripName] = useState("");

const [tripDate, setTripDate] = useState("");

const saveTrip = async () => {

    if (!tripName || !tripDate) {

        alert("من فضلك أكمل البيانات");

        return;

    }

    try {

        await addDoc(

            collection(db, "offlineTrips"),

            {

                tripName,

                tripDate,

                createdAt: serverTimestamp(),

            }

        );

        alert("تمت إضافة الرحلة بنجاح");

        setTripName("");
        setTripDate("");

        setShowAddTrip(false);

    } catch (error) {

        console.log(error);

        alert("حدث خطأ");

    }

};

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
    className="
bg-blue-600
hover:bg-blue-700
px-6
py-3
rounded-2xl
font-bold
"
>
    + Add Trip
</button>
                </div>

                {/* Trips */}

                {trips.length === 0 && (

                    <div
                        className="
bg-[#071427]
border
border-[#12315f]
rounded-3xl
p-20
text-center
"
                    >

                        <h2 className="text-3xl font-bold">

                            لا توجد رحلات

                        </h2>

                        <p className="text-slate-400 mt-4">

                            اضغط Add Trip لإضافة أول رحلة

                        </p>

                    </div>

                )}

            </div>
            {showAddTrip && (

    <div
        className="
fixed
inset-0
bg-black/70
flex
items-center
justify-center
z-50
"
    >

        <div
            className="
bg-[#071427]
w-full
max-w-lg
rounded-3xl
p-8
border
border-[#12315f]
"
        >

            <h2 className="text-3xl font-bold mb-6">

                إضافة رحلة جديدة

            </h2>

            <input
                type="text"
                placeholder="اسم الرحلة"
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                className="
w-full
bg-slate-700
p-4
rounded-2xl
mb-4
outline-none
"
            />

            <input
                type="date"
                value={tripDate}
                onChange={(e) => setTripDate(e.target.value)}
                className="
w-full
bg-slate-700
p-4
rounded-2xl
mb-6
outline-none
"
            />

            <div className="flex justify-end gap-3">

                <button
                    onClick={() => setShowAddTrip(false)}
                    className="
bg-gray-600
px-6
py-3
rounded-xl
"
                >
                    Cancel
                </button>

               <button
    onClick={saveTrip}
    className="
bg-blue-600
px-6
py-3
rounded-xl
"
>
    Save
</button>

            </div>

        </div>

    </div>

)}

        </div>

    );

}