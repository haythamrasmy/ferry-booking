import { useEffect, useState } from "react";

import { db } from "./firebase";

import {
    collection,
    getDocs,
    addDoc,
    serverTimestamp,
} from "firebase/firestore";

export default function VoluntaryReturnCargo() {

    const [showCargo, setShowCargo] = useState(false);

    const [trips, setTrips] = useState([]);

    const [selectedTrip, setSelectedTrip] = useState("");

    const [fullName, setFullName] = useState("");

    const [passport, setPassport] = useState("");

    const [phone, setPhone] = useState("");

    const [passportImage, setPassportImage] = useState("");

    const [cargo, setCargo] = useState({});

    const cargoTypes = [
    "شنطة كبيرة",
    "شنطة صغيرة",
    "كرتونة",
    "ثلاجة",
    "غسالة",
    "تلفزيون",
    "بوتاجاز",
    "مكيف",
    "دراجة",
    "كرسي متحرك",
];

    useEffect(() => {

        loadTrips();

    }, []);

    const loadTrips = async () => {

        const snapshot = await getDocs(
            collection(db, "offlineTrips")
        );

        const data = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data(),
            }))
            .filter(
                trip => trip.archived !== true
            );

        setTrips(data);

    };

    const saveRequest = async () => {

        if (!selectedTrip) {

            alert("اختر الرحلة");

            return;

        }

        if (!fullName.trim()) {

            alert("ادخل الاسم");

            return;

        }

        if (!passport.trim()) {

            alert("ادخل رقم الجواز");

            return;

        }

        if (!phone.trim()) {

            alert("ادخل رقم الهاتف");

            return;

        }

      

        if (!passportImage) {

            alert("ارفع صورة الجواز");

            return;

        }

        await addDoc(

            collection(
                db,
                "offlineTrips",
                selectedTrip,
                "cargoRequests"
            ),

            {

                fullName,

                passport,

                phone,

                passportImage,

                cargo,

                createdAt: serverTimestamp(),

                printed: false,

            }
        );

        alert("تم إرسال الطلب");

        setFullName("");

        setPassport("");

        setPhone("");

        setPassportImage("");

    };

    const uploadPassport = (e) => {

        const file = e.target.files[0];

        if (!file) return;

        const reader = new FileReader();

        reader.onload = () => {

            setPassportImage(reader.result);

        };

        reader.readAsDataURL(file);

    };


  const updateCargo = (item, change) => {

    setCargo(prev => {

        const current = prev[item] || 0;

        const updated = Math.max(0, current + change);

        return {

            ...prev,

            [item]: updated,

        };

    });

};

    //////////////////////////////////

    return (

       <div
    className="
        min-h-screen
        bg-slate-900
        text-white
        max-w-xl
        mx-auto
        p-6
        space-y-5
    "
>

            <h1 className="text-3xl font-bold">

                تسجيل بضائع العودة الطوعية

            </h1>

            <select

                value={selectedTrip}

                onChange={(e) =>
                    setSelectedTrip(e.target.value)
                }

                className="w-full p-3 rounded-xl"

            >

                <option value="">

                    اختر الرحلة

                </option>

                {

                    trips.map(trip => (

                        <option

                            key={trip.id}

                            value={trip.id}

                        >

                            {trip.route}

                        </option>

                    ))

                }

            </select>

            <input

                className="w-full p-3 rounded-xl"

                placeholder="الاسم الرباعي"

                value={fullName}

                onChange={(e) =>
                    setFullName(e.target.value)
                }

            />

            <input

                className="w-full p-3 rounded-xl"

                placeholder="رقم الجواز"

                value={passport}

                onChange={(e) =>
                    setPassport(e.target.value)
                }

            />

            <input

                className="w-full p-3 rounded-xl"

                placeholder="رقم الهاتف"

                value={phone}

                onChange={(e) =>
                    setPhone(e.target.value)
                }

            />


<div className="bg-slate-800 rounded-xl overflow-hidden">

    <button
        type="button"
        onClick={() => setShowCargo(!showCargo)}
        className="
            w-full
            flex
            justify-between
            items-center
            p-4
            text-white
            font-bold
        "
    >

        <span>

            📦 البضائع

        </span>

        <span>

            {showCargo ? "▲" : "▼"}

        </span>

    </button>

    {

        showCargo && (

            <div className="p-4 space-y-3">

                {

                    cargoTypes.map(item => (

                        <div

                            key={item}

                            className="
                                flex
                                justify-between
                                items-center
                                bg-slate-700
                                rounded-xl
                                p-3
                            "

                        >

                            <span className="text-white">

                                {item}

                            </span>

                            <div className="flex items-center gap-3">

                                <button

                                    type="button"

                                    onClick={() =>
                                        updateCargo(item, -1)
                                    }

                                    className="
                                        w-9
                                        h-9
                                        rounded-lg
                                        bg-red-600
                                        text-white
                                        font-bold
                                    "

                                >

                                    -

                                </button>

                                <span className="text-white text-lg w-6 text-center">

                                    {cargo[item] || 0}

                                </span>

                                <button

                                    type="button"

                                    onClick={() =>
                                        updateCargo(item, 1)
                                    }

                                    className="
                                        w-9
                                        h-9
                                        rounded-lg
                                        bg-green-600
                                        text-white
                                        font-bold
                                    "

                                >

                                    +

                                </button>

                            </div>

                        </div>

                    ))

                }

            </div>

        )

    }

</div>
        

           <input

    id="passportImage"

    type="file"

    accept="image/*"

    className="hidden"

    onChange={uploadPassport}

/>

<label

    htmlFor="passportImage"

    className="
        block
        cursor-pointer
        bg-indigo-600
        hover:bg-indigo-700
        text-white
        text-center
        p-4
        rounded-xl
    "

>

    📷 رفع صورة جواز السفر

</label>

            {

                passportImage &&

                <img

                    src={passportImage}

                    className="w-48 rounded-xl"

                />

            }

            <button

                onClick={saveRequest}

                className="bg-green-600 text-white w-full p-4 rounded-xl"

            >

                إرسال

            </button>

        </div>

    );

}