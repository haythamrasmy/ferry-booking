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
} from "firebase/firestore";

import { Html5QrcodeScanner } from "html5-qrcode";

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

    const STATUS_ORDER = {
        "📦 تم استلام طلب الشحن": 1,
        "🏬 في المخزن": 2,
        "🚚 تم التحميل": 3,
        "📍 وصلت الوجهة": 4,
        "✅ تم التسليم": 5,
    };

    const STATUS_STEPS = Object.keys(STATUS_ORDER);

    const STATUS_COLORS = {
        "📦 تم استلام طلب الشحن": "bg-green-500",
        "🏬 في المخزن": "bg-blue-500",
        "🚚 تم التحميل": "bg-yellow-500",
        "📍 وصلت الوجهة": "bg-purple-500",
        "✅ تم التسليم": "bg-red-500",
    };

    const STATUS_TEXT_COLORS = {
        "📦 تم استلام طلب الشحن": "text-green-400",
        "🏬 في المخزن": "text-blue-400",
        "🚚 تم التحميل": "text-yellow-400",
        "📍 وصلت الوجهة": "text-purple-400",
        "✅ تم التسليم": "text-red-400",
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
                    successSound.play().catch(() => {});

                    navigator.vibrate?.(300);

                    stopScanner();
                } else {
                    alert("لم يتم العثور على هذه القطعة");
                }
            } catch (err) {
                console.error(err);
                alert("خطأ في البحث");
            }

            setLoading(false);
        });

        scannerRef.current = scanner;
    };

    const stopScanner = () => {
        try {
            scannerRef.current?.clear();
            scannerRef.current = null;
        } catch {}
    };

    const resetScanner = () => {
        stopScanner();

        scanningRef.current = false;

        setScannedCargo(null);
        setScannedCargoId(null);
        setSelectedStatus("");
        setShowStatusMenu(false);

        startScanner();
    };

    const updateCargoStatus = async (newStatus) => {
        if (!newStatus || !scannedCargoId) return;

        if (!window.confirm("هل أنت متأكد من تحديث الحالة؟"))
            return;

        try {
            const timestamp = new Date().toISOString();

            await updateDoc(
                doc(db, "cargoItems", scannedCargoId),
                {
                    status: newStatus,
                    history: arrayUnion({
                        status: newStatus,
                        time: timestamp,
                    }),
                }
            );

            setAnimate(true);

            setTimeout(() => {
                setAnimate(false);
            }, 400);

            setScannedCargo((prev) => ({
                ...prev,
                status: newStatus,
                history: [
                    ...(prev.history || []),
                    {
                        status: newStatus,
                        time: timestamp,
                    },
                ],
            }));

            setSelectedStatus("");
        } catch (err) {
            console.error(err);
            alert("فشل تحديث الحالة");
        }
    };

    useEffect(() => {
        startScanner();

        return () => {
            stopScanner();
        };
    }, []);

    const progress =
        (((STATUS_ORDER[scannedCargo?.status] || 1) - 1) /
            (STATUS_STEPS.length - 1)) *
        100;

    return (
        <div className="min-h-screen p-5 bg-slate-900 text-white">

            {/* Header */}
            <div className="mb-6 text-center">
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
                    className={`mt-6 p-5 rounded-2xl bg-slate-800 border border-slate-700 transition-all duration-300 ${
                        animate
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
                                className={`font-semibold ${
                                    STATUS_TEXT_COLORS[
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
                            onClick={() =>
                                setShowStatusMenu(
                                    !showStatusMenu
                                )
                            }
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
                            <div className="font-bold text-lg">
                                تحديث حالة الشحنة
                            </div>

                            <div className="text-xs text-blue-100 mt-1">
                                حدد أين موقع الشحنة الآن
                            </div>
                        </button>

                        {showStatusMenu && (
                            <div className="mt-2 bg-slate-700 rounded-xl overflow-hidden border border-slate-600">

                               {STATUS_STEPS.map((status) => (
    <button
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
            ${
                selectedStatus === status
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
                                    className={`mt-1 text-center font-bold ${
                                        STATUS_TEXT_COLORS[
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
                                    className={`mt-3 w-full py-3 rounded-xl font-bold text-white transition active:scale-95 ${
                                        STATUS_COLORS[
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
                            مسار الشحنة
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
                                                className={`absolute -left-3 w-6 h-6 rounded-full ${
                                                    isCompleted
                                                        ? "bg-green-500"
                                                        : isActive
                                                        ? "bg-blue-500 animate-pulse"
                                                        : "bg-slate-600"
                                                }`}
                                            />

                                            <div
                                                className={`p-3 rounded-xl ${
                                                    isActive
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
                                                    <p className="text-xs text-gray-300 mt-1">
                                                        {new Date(
                                                            record.time
                                                        ).toLocaleString()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }
                            )}

                     </div>

</div>

{/* Analysis */}
<div className="mt-10">

    <h4 className="text-center font-bold text-lg mb-4">
        سجل العمليات
    </h4>

    <div className="space-y-3">

        {(scannedCargo.history || [])
            .sort(
                (a, b) =>
                    new Date(b.time) -
                    new Date(a.time)
            )
            .map((record, index) => (
                <div
                    key={index}
                    className="
                        bg-slate-800
                        border
                        border-slate-700
                        rounded-2xl
                        p-4
                        hover:border-cyan-500
                        transition
                    "
                >

                    <div className="flex justify-between items-start">

                        <div>

                            <div className="text-cyan-400 text-xs">
                                عملية رقم #{index + 1}
                            </div>

                            <div className="font-semibold mt-1">
                                {record.status}
                            </div>

                        </div>

                        <div className="text-right">

                            <div className="text-xs text-gray-400">
                                {new Date(
                                    record.time
                                ).toLocaleDateString()}
                            </div>

                            <div className="text-xs text-gray-500">
                                {new Date(
                                    record.time
                                ).toLocaleTimeString()}
                            </div>

                        </div>

                    </div>

                </div>
            ))}

    </div>

</div>
</div>
)}
        </div>
    );
}