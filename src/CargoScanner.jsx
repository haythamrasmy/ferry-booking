import { useEffect, useRef, useState } from "react";
import { db } from "./firebase";

import {
    collection,
    query,
    where,
    getDocs,
    updateDoc,
    doc,
    arrayUnion,
    onSnapshot, // 👈 أضف دي
} from "firebase/firestore";

import { Html5QrcodeScanner } from "html5-qrcode";

// ✅ جلب الموقع + المدينة والدولة
const getLocationDetails = async () => {
    return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;

                try {
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
                    );

                    const data = await res.json();

                    resolve({
                        lat: latitude,
                        lng: longitude,
                        city:
                            data.address.city ||
                            data.address.town ||
                            data.address.village ||
                            "غير معروف",
                        country: data.address.country || "غير معروف",
                    });
                } catch {
                    resolve({
                        lat: latitude,
                        lng: longitude,
                        city: "غير معروف",
                        country: "غير معروف",
                    });
                }
            },
            () => resolve(null)
        );
    });
};



const updateShipmentStatus = async (shipmentId, newStatus) => {
    const timestamp = new Date().toISOString();

    await updateDoc(doc(db, "shipments", shipmentId), {
        status: newStatus,
        history: arrayUnion({
            status: newStatus,
            time: timestamp,
        }),
    });
};



// ✅ معلومات الجهاز
const getDeviceInfo = () => {
    return navigator.userAgent;
};

const successSound = new Audio("/success.mp3");

export default function CargoScanner() {
    const [scannedCargo, setScannedCargo] = useState(null);
    const [scannedCargoId, setScannedCargoId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [animate, setAnimate] = useState(false);

    const [selectedStatus, setSelectedStatus] = useState("");
    const [showStatusMenu, setShowStatusMenu] = useState(false);

    const scannerRef = useRef(null);
    const scanningRef = useRef(false);
    const [locationEnabled, setLocationEnabled] = useState(false);
    const checkLocationPermission = () => {
        navigator.geolocation.getCurrentPosition(
            () => {
                setLocationEnabled(true);
            },
            () => {
                setLocationEnabled(false);
            }
        );
    };

    const [shipment, setShipment] = useState(null);
    const [shipmentItems, setShipmentItems] = useState([]);

    const [selectedWarehouse, setSelectedWarehouse] = useState("");



    const STATUS_ORDER = {
        "📋 المراجعة والاستلام من موقع العميل": 1,
        "🏬 دخول المخازن": 2,
        "🚚 التحميل على عربة النقل": 3,
        "🛣️ النقل البري إلى السد العالي": 4,
        "📦 التفريغ والاستلام بمخزن الهيئة (السد العالي)": 5,
        "⛴️ التحميل إلى الصندل": 6,
        "🚢 التحرك من ميناء السد العالي": 7,
        "📍 التفريغ في ميناء وادي حلفا": 8,
        "✅ التسليم النهائي في وادي حلفا": 9,
    };

    const STATUS_STEPS = Object.keys(STATUS_ORDER);

    const STATUS_COLORS = {
        "📋 المراجعة والاستلام من موقع العميل": "bg-green-500",
        "🏬 دخول المخازن": "bg-blue-500",
        "🚚 التحميل على عربة النقل": "bg-yellow-500",
        "🛣️ النقل البري إلى السد العالي": "bg-orange-500",
        "📦 التفريغ والاستلام بمخزن الهيئة (السد العالي)": "bg-indigo-500",
        "⛴️ التحميل إلى الصندل": "bg-cyan-500",
        "🚢 التحرك من ميناء السد العالي": "bg-teal-500",
        "📍 التفريغ في ميناء وادي حلفا": "bg-purple-500",
        "✅ التسليم النهائي في وادي حلفا": "bg-red-500",
    };

    const STATUS_TEXT_COLORS = {
        "📋 المراجعة والاستلام من موقع العميل": "bg-green-500",
        "🏬 دخول المخازن": "bg-blue-500",
        "🚚 التحميل على عربة النقل": "bg-yellow-500",
        "🛣️ النقل البري إلى السد العالي": "bg-orange-500",
        "📦 التفريغ والاستلام بمخزن الهيئة (السد العالي)": "bg-indigo-500",
        "⛴️ التحميل إلى الصندل": "bg-cyan-500",
        "🚢 التحرك من ميناء السد العالي": "bg-teal-500",
        "📍 التفريغ في ميناء وادي حلفا": "bg-purple-500",
        "✅ التسليم النهائي في وادي حلفا": "bg-red-500",
    };

    const startScanner = () => {
        if (scannerRef.current) return;

        const scanner = new Html5QrcodeScanner(
            "reader",
            {
                qrbox: { width: 250, height: 250 },
                fps: 10,
            },
            false
        );

        scanner.render(async (decodedText) => {
            if (scanningRef.current) return;
            scanningRef.current = true;

            setLoading(true);

            try {
                const q = query(
                    collection(db, "cargoItems"),
                    where("serial", "==", decodedText)
                );

                const snapshot = await getDocs(q);

                if (!snapshot.empty) {
                    const cargoDoc = snapshot.docs[0];

                    setScannedCargo(cargoDoc.data());
                    setScannedCargoId(cargoDoc.id);

                    successSound.currentTime = 0;
                    successSound.play().catch(() => { });

                    navigator.vibrate?.(300);

                    stopScanner();
                } else {
                    alert("لم يتم العثور على هذه القطعة");
                    scanningRef.current = false;

                }
            } catch (err) {
                console.error(err);
                alert("خطأ في البحث");

                // ✅ مهم جداً
                scanningRef.current = false;
            }

            setLoading(false);
        });

        scannerRef.current = scanner;
    };

    const stopScanner = () => {
        try {
            scannerRef.current?.clear();
            scannerRef.current = null;
        } catch { }
    };

    const resetScanner = () => {
        stopScanner();

        // 💥 تنظيف العنصر بالكامل
        const reader = document.getElementById("reader");
        if (reader) reader.innerHTML = "";

        scanningRef.current = false;

        setScannedCargo(null);
        setScannedCargoId(null);
        setSelectedStatus("");
        setShowStatusMenu(false);

        // ⏳ delay صغير عشان React يخلص render
        setTimeout(() => {
            startScanner();
        }, 300);
    };
    const updateCargoStatus = async (newStatus) => {



        setSelectedStatus("");
        setSelectedWarehouse("");
        if (!locationEnabled) {
            alert("يجب تفعيل الموقع قبل تحديث الحالة");
            return;
        }
        if (!newStatus || !scannedCargoId) return;

        const currentOrder = STATUS_ORDER[scannedCargo?.status] || 0;
        const newOrder = STATUS_ORDER[newStatus];

        // 🚫 منع الرجوع للخلف
        if (newOrder <= currentOrder) {
            alert("لا يمكن الرجوع لمرحلة سابقة");
            return;
        }

        if (!window.confirm("هل أنت متأكد من تحديث الحالة؟"))
            return;

        try {
            const timestamp = new Date().toISOString();

            const locationDetails = await getLocationDetails();

            const device = getDeviceInfo();

            if (newStatus === "🏬 دخول المخازن" && !selectedWarehouse) {
                alert("يجب اختيار المخزن أولاً");
                return;
            }

            await updateDoc(
                doc(db, "cargoItems", scannedCargoId),
                {
                    status: newStatus,
                    history: arrayUnion({
                        status: newStatus,
                        warehouse: selectedWarehouse || null,
                        time: timestamp,
                        location: locationDetails,
                        device: device,
                    }),
                }
            );

            setAnimate(true);

            setTimeout(() => {
                setAnimate(false);
            }, 400);

            setScannedCargo((prev) => {
                const lastStatus = prev.history?.[prev.history.length - 1]?.status;

                // 🚫 منع التكرار
                if (lastStatus === newStatus) {
                    return {
                        ...prev,
                        status: newStatus,
                    };
                }

                return {
                    ...prev,
                    status: newStatus,
                    history: [
                        ...(prev.history || []),
                        {
                            status: newStatus,
                            warehouse: selectedWarehouse || null,
                            time: timestamp,
                            location: locationDetails || {},
                            device: device || "unknown",
                        }
                    ],
                };
            });

            setSelectedStatus("");
        } catch (err) {
            console.error(err);
            alert("فشل تحديث الحالة");
        }
    };

    useEffect(() => {
        document.title = "قسم متابعة الشحنات";

        startScanner();

        return () => {
            stopScanner();
        };
    }, []);


    useEffect(() => {
        if (!scannedCargo?.shipmentId) return;

        const loadShipmentItems = async () => {

            const q = query(
                collection(db, "cargoItems"),
                where(
                    "shipmentId",
                    "==",
                    scannedCargo.shipmentId
                )
            );

            const snapshot = await getDocs(q);

            setShipmentItems(
                snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }))
            );
        };

        loadShipmentItems();

    }, [scannedCargo]);

    useEffect(() => {
        if (!scannedCargo?.shipmentId) return;

        const unsub = onSnapshot(
            doc(db, "shipments", scannedCargo.shipmentId),
            (docSnap) => {
                if (docSnap.exists()) {
                    setShipment(docSnap.data());
                }
            }
        );

        return () => unsub();
    }, [scannedCargo]);

    useEffect(() => {
        startScanner();

        checkLocationPermission(); // ✅ هنا

        return () => {
            stopScanner();
        };
    }, []);

    useEffect(() => {
        if (selectedStatus !== "🏬 دخول المخازن") {
            setSelectedWarehouse("");
        }
    }, [selectedStatus]);

    const progress =
        (((STATUS_ORDER[scannedCargo?.status] || 1) - 1) /
            (STATUS_STEPS.length - 1)) *
        100;

    const shipmentStats = STATUS_STEPS.reduce(
        (acc, step) => {

            acc[step] = shipmentItems.filter(
                item => item.status === step
            ).length;

            return acc;
        },
        {}
    );



    const shipmentProgress =
        shipmentItems.length > 0
            ? Math.round(
                (
                    shipmentItems.reduce(
                        (sum, item) =>
                            sum +
                            (STATUS_ORDER[item.status] || 1),
                        0
                    ) /
                    (shipmentItems.length *
                        STATUS_STEPS.length)
                ) *
                100
            )
            : 0;

    const maxStage = Math.max(
        ...shipmentItems.map(
            item => STATUS_ORDER[item.status] || 1
        ),
        1
    );

    const delayedItems = shipmentItems.filter(
        item =>
            (STATUS_ORDER[item.status] || 1) <
            maxStage - 1
    );

    const completedItems = shipmentItems.filter(
        item =>
            item.status ===
            "✅ التسليم النهائي في وادي حلفا"
    );

    const inTransitItems = shipmentItems.filter(
        item =>
            item.status !==
            "✅ التسليم النهائي في وادي حلفا" &&
            !delayedItems.includes(item)
    );


    return (
        <div className="min-h-screen p-5 bg-slate-900 text-white">

            {/* Header */}
            <div className="mb-6 text-center">
                <h3 className="font-bold text-lg">
                    قسم متابعة الشحنات
                </h3>
                <h1 className="text-3xl font-bold text-blue-400">
                    3A international
                </h1>

                <p className="mt-2 text-sm">
                    هيئة وادى النيل للملاحة النهرية
                </p>
            </div>

            {/* Scanner */}
            {!scannedCargo && (
                <div className="space-y-4">

                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 text-center">

                        <div className="text-4xl mb-3">
                            📷
                        </div>

                        <h3 className="font-bold text-lg">
                            تفعيل الكاميرا
                        </h3>

                        <p className="text-sm text-gray-400 mt-2">
                            قم بالسماح للتطبيق باستخدام الكاميرا
                            ثم ابدأ في مسح رمز الشحنة.
                        </p>

                        <div className="mt-3 text-cyan-400 text-sm">
                            جاهز لبدء عملية المسح
                        </div>

                    </div>

                    <div
                        id="reader"
                        className="bg-white rounded-2xl overflow-hidden"
                    />
                </div>
            )}

            {loading && (
                <p className="text-center mt-4">
                    جاري البحث...
                </p>
            )}

            {/* Cargo Details */}
            {scannedCargo && (
                <div
                    className={`mt-6 p-5 rounded-2xl bg-slate-800 border border-slate-700 transition-all duration-300 ${animate
                        ? "scale-105 shadow-blue-500/40"
                        : ""
                        }`}
                >
                    <h3 className="text-center font-bold mb-4">
                        بيانات القطعة
                    </h3>

                    {/* Data */}
                    <div className="space-y-2">

                        {[
                            ["الصنف", scannedCargo.item],
                            ["الرقم", scannedCargo.serial],
                            ["التتبع", scannedCargo.trackingId],
                            ["الوجهة", scannedCargo.destination],
                        ].map(([label, value], i) => (
                            <div
                                key={i}
                                className="flex justify-between border-b border-slate-600 py-2"
                            >
                                <span>{label}</span>
                                <span>{value}</span>
                            </div>
                        ))}

                        <div className="flex justify-between py-2">
                            <span>الحالة</span>

                            <span
                                className={`font-semibold ${STATUS_TEXT_COLORS[
                                    scannedCargo.status
                                ] || "text-white"
                                    }`}
                            >
                                {scannedCargo.status}
                            </span>
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="mt-5">

                        <div className="flex justify-between text-xs text-gray-400 mb-2">
                            <span>0%</span>

                            <span className="font-bold text-blue-400">
                                {Math.round(progress)}%
                            </span>

                            <span>100%</span>
                        </div>

                        <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-700"
                                style={{
                                    width: `${progress}%`,
                                }}
                            />
                        </div>

                    </div>


                 

                    {/* Status Selector */}
                    <div className="mt-5 relative">

                        <button
                            onClick={() => {
                                if (!locationEnabled) {
                                    alert("يجب تفعيل الموقع أولاً");
                                    checkLocationPermission();
                                    return;
                                }

                                setShowStatusMenu(!showStatusMenu);
                            }}
                            className="
w-full
rounded-2xl
bg-gradient-to-r
from-cyan-500
to-blue-600
p-4
text-center
shadow-xl
shadow-cyan-500/20
hover:scale-[1.02]
active:scale-[0.98]
transition-all
duration-300
"                        >
                            {scannedCargo?.status === "✅ تم التسليم"
                                ? "تم تسليم هذه القطعة بالفعل"
                                : "تحديث حالة القطعة"}

                                <br></br>

                            {scannedCargo?.status === "✅ تم التسليم"
                                ? "لا يمكن تعديل حالة القطعة بعد التسليم"
                                : "حدد أين موقع القطعة الآن"}


                        </button>
                        {selectedStatus === "🏬 دخول المخازن" && (
                            <select
                                value={selectedWarehouse}
                                onChange={(e) => setSelectedWarehouse(e.target.value)}
                                className="w-full p-3 rounded-xl bg-slate-700 mt-3 text-white"
                            >
                                <option value="">اختر المخزن</option>
                                <option value="مخزن 1">مخزن 1</option>
                                <option value="مخزن 2">مخزن 2</option>
                                <option value="مخزن 3">مخزن 3</option>
                                <option value="مخزن 4">مخزن 4</option>
                            </select>
                        )}

                        {showStatusMenu && (
                            <div className="mt-2 bg-slate-700 rounded-xl overflow-hidden border border-slate-600">

                                {STATUS_STEPS
                                    .filter((status) => {
                                        const currentOrder = STATUS_ORDER[scannedCargo?.status] || 0;
                                        return STATUS_ORDER[status] > currentOrder;
                                    })
                                    .map((status) => (<button
                                        key={status}
                                        onClick={() => {
                                            setSelectedStatus(status);
                                            setShowStatusMenu(false);
                                        }}
                                        className={`
            w-full
            text-right
            px-4
            py-4
            transition
            border-b
            border-slate-600
            hover:bg-slate-600
            ${selectedStatus === status
                                                ? "bg-slate-600"
                                                : ""
                                            }
        `}
                                    >
                                        <div className="font-semibold">
                                            {status}
                                        </div>

                                        <div className="text-xs text-gray-400 mt-1">
                                            اختيار هذه المرحلة للشحنة
                                        </div>
                                    </button>
                                    ))}

                            </div>
                        )}

                        {selectedStatus && (
                            <>
                                <div className="mt-3 text-center text-sm text-gray-300">
                                    الحالة المختارة
                                </div>

                                <div
                                    className={`mt-1 text-center font-bold ${STATUS_TEXT_COLORS[
                                        selectedStatus
                                    ]
                                        }`}
                                >
                                    {selectedStatus}
                                </div>

                                <button
                                    onClick={() =>
                                        updateCargoStatus(
                                            selectedStatus
                                        )
                                    }
                                    className={`mt-3 w-full py-3 rounded-xl font-bold text-white transition active:scale-95 ${STATUS_COLORS[
                                        selectedStatus
                                    ]
                                        }`}
                                >
                                    تأكيد تحديث الحالة
                                </button>
                            </>
                        )}

                    </div>

                    {/* Reset */}
                    <button
                        onClick={resetScanner}
                        className="mt-4 w-full bg-slate-700 py-3 rounded-xl"
                    >
                        مسح قطعة جديدة
                    </button>

                    {/* Timeline */}
                    <div className="mt-8">

                        <h4 className="text-center font-bold mb-4">
                            مسار القطعة
                        </h4>

                        <div className="relative border-l-2 border-blue-500/40 ml-3">

                            {STATUS_STEPS.map(
                                (step, index) => {
                                    const currentOrder =
                                        STATUS_ORDER[
                                        scannedCargo
                                            .status
                                        ] || 0;

                                    const stepOrder =
                                        STATUS_ORDER[
                                        step
                                        ];

                                    const isCompleted =
                                        stepOrder <
                                        currentOrder;

                                    const isActive =
                                        stepOrder ===
                                        currentOrder;

                                    const record =
                                        scannedCargo.history?.find(
                                            (
                                                h
                                            ) =>
                                                h.status ===
                                                step
                                        );

                                    return (
                                        <div
                                            key={
                                                index
                                            }
                                            className="mb-6 ml-6 relative"
                                        >
                                            <span
                                                className={`absolute -left-3 w-6 h-6 rounded-full ${isCompleted
                                                    ? "bg-green-500"
                                                    : isActive
                                                        ? "bg-blue-500 animate-pulse"
                                                        : "bg-slate-600"
                                                    }`}
                                            />

                                            <div
                                                className={`p-3 rounded-xl ${isActive
                                                    ? "bg-blue-500/20 border border-blue-400"
                                                    : "bg-slate-700"
                                                    }`}
                                            >
                                                <p className="font-semibold">
                                                    {
                                                        step
                                                    }
                                                </p>

                                                {record && (

                                                    <>
                                                        {record.warehouse && (
                                                            <p className="text-xs text-yellow-400">
                                                                🏬 {record.warehouse}
                                                            </p>
                                                        )}
                                                        <p className="text-xs text-gray-300 mt-1">
                                                            {new Date(record.time).toLocaleString()}
                                                        </p>

                                                        {record.location && (
                                                            <p className="text-xs text-gray-400">
                                                                📍 {record.location.city}, {record.location.country}
                                                            </p>
                                                        )}

                                                        {record.location?.lat && (
                                                            <p className="text-xs text-gray-500">
                                                                ({record.location.lat.toFixed(4)}, {record.location.lng.toFixed(4)})
                                                            </p>
                                                        )}

                                                        {record.device && (
                                                            <p className="text-xs text-gray-500">
                                                                📱 {record.device}
                                                            </p>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }
                            )}

                        </div>

                    </div>
                    {shipmentItems.length > 0 && (

                        <div className="mt-6">
                            <h3 className="text-center font-bold text-lg mb-2">
                                حالة بضائع التذكرة
                            </h3>
                            <div className="text-center mb-4">

                                <div className="text-cyan-400 font-bold">
                                    🎫 رقم التذكرة: {scannedCargo?.ticketId}
                                </div>

                                <div className="text-gray-300 mt-1">
                                    👤 صاحب التذكرة: {scannedCargo?.senderName}
                                </div>

                            </div>

                            <div className="grid grid-cols-2 gap-3">

                                {/* إجمالي القطع */}
                                <div className="bg-slate-800 rounded-2xl p-4 text-center border border-slate-700">
                                    <div className="text-3xl mb-2">📦</div>

                                    <div className="text-2xl font-bold text-cyan-400">
                                        {shipmentItems.length}
                                    </div>

                                    <div className="text-xs text-gray-400 mt-1">
                                        إجمالي القطع
                                    </div>
                                </div>

                                {/* مكتملة */}
                                <div className="bg-slate-800 rounded-2xl p-4 text-center border border-slate-700">
                                    <div className="text-3xl mb-2">✅</div>

                                    <div className="text-2xl font-bold text-green-400">
                                        {completedItems.length}
                                    </div>

                                    <div className="text-xs text-gray-400 mt-1">
                                        مكتملة
                                    </div>
                                </div>

                                {/* قيد الشحن */}
                                <div className="bg-slate-800 rounded-2xl p-4 text-center border border-slate-700">
                                    <div className="text-3xl mb-2">🚢</div>

                                    <div className="text-2xl font-bold text-blue-400">
                                        {inTransitItems.length}
                                    </div>

                                    <div className="text-xs text-gray-400 mt-1">
                                        قيد الشحن
                                    </div>
                                </div>

                                {/* متأخرة */}
                                <div className="bg-slate-800 rounded-2xl p-4 text-center border border-slate-700">
                                    <div className="text-3xl mb-2">⚠️</div>

                                    <div className="text-2xl font-bold text-yellow-400">
                                        {delayedItems.length}
                                    </div>

                                    <div className="text-xs text-gray-400 mt-1">
                                        متأخرة
                                    </div>
                                </div>

                            </div>

                               {shipmentItems.length > 0 && (

                        <div className="mt-6 mb-4">

                            <div className="
            bg-slate-800
            border
            border-slate-700
            rounded-2xl
            p-5
            text-center
        ">

                                <div className="text-3xl mb-2">
                                    🎯
                                </div>

                                <div className="text-5xl font-bold text-cyan-400">
                                    {shipmentProgress}%
                                </div>

                                <div className="text-sm text-gray-400 mt-2">
                                    نسبة شحن القطع المرتيطة بهذة التذكرة
                                </div>

                                <div className="mt-4 w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-700"
                                        style={{
                                            width: `${shipmentProgress}%`,
                                        }}
                                    />
                                </div>

                            </div>

                        </div>

                    )}

                            {delayedItems.length > 0 && (

                                <div className="mt-4">

                                    <div className="text-yellow-400 font-bold mb-2">
                                        ⚠️ القطع المتأخرة
                                    </div>

                                    <div className="space-y-2">

                                        {delayedItems.map(item => (

                                            <div
                                                key={item.id}
                                                className="
                        bg-slate-800
                        border
                        border-yellow-500/30
                        rounded-xl
                        p-3
                    "
                                            >

                                                <div className="font-semibold">
                                                    {item.item}
                                                </div>

                                                <div className="text-xs text-gray-400">
                                                    {item.serial}
                                                </div>

                                                <div className="text-sm text-yellow-400 mt-1">
                                                    {item.status}
                                                </div>

                                            </div>

                                        ))}

                                    </div>

                                </div>

                            )}

                        </div>

                    )}

                </div>
            )}
        </div>
    );
}