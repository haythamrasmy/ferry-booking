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

    const scannerRef = useRef(null);
    const scanningRef = useRef(false);

    const STATUS_ORDER = {
        "تم الاستلام": 1,
        "في المخزن": 2,
        "تم التحميل": 3,
        "وصلت الوجهة": 4,
        "تم التسليم": 5,
    };

    const STATUS_STEPS = Object.keys(STATUS_ORDER);

    const STATUS_COLORS = {
        "تم الاستلام": "bg-green-500",
        "في المخزن": "bg-blue-500",
        "تم التحميل": "bg-yellow-500",
        "وصلت الوجهة": "bg-purple-500",
        "تم التسليم": "bg-red-500",
    };

    const STATUS_TEXT_COLORS = {
        "تم الاستلام": "text-green-400",
        "في المخزن": "text-blue-400",
        "تم التحميل": "text-yellow-400",
        "وصلت الوجهة": "text-purple-400",
        "تم التسليم": "text-red-400",
    };

    const startScanner = () => {
        if (scannerRef.current) return;

        const scanner = new Html5QrcodeScanner(
            "reader",
            { qrbox: { width: 250, height: 250 }, fps: 10 },
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
        startScanner();
    };

    const getNextStatus = () => {
        if (!scannedCargo) return null;

        const currentOrder = STATUS_ORDER[scannedCargo.status] || 0;

        return Object.keys(STATUS_ORDER).find(
            (key) => STATUS_ORDER[key] === currentOrder + 1
        );
    };

    const updateCargoStatus = async () => {
        const newStatus = getNextStatus();
        if (!newStatus || !scannedCargoId) return;

        if (!window.confirm("هل أنت متأكد من تحديث الحالة؟")) return;

        try {
            const timestamp = new Date().toISOString();

            await updateDoc(doc(db, "cargoItems", scannedCargoId), {
                status: newStatus,
                history: arrayUnion({
                    status: newStatus,
                    time: timestamp,
                }),
            });

            setAnimate(true);
            setTimeout(() => setAnimate(false), 400);

            setScannedCargo((prev) => ({
                ...prev,
                status: newStatus,
                history: [
                    ...(prev.history || []),
                    { status: newStatus, time: timestamp },
                ],
            }));
        } catch (err) {
            console.error(err);
            alert("فشل تحديث الحالة");
        }
    };

    useEffect(() => {
        startScanner();
        return () => stopScanner();
    }, []);

    const progress =
        ((STATUS_ORDER[scannedCargo?.status] || 0) /
            STATUS_STEPS.length) *
        100;

    return (
        <div className="min-h-screen p-5 bg-slate-900 text-white">

            {/* 🔷 Header */}
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
                <div
                    id="reader"
                    className="bg-white rounded-2xl overflow-hidden"
                />
            )}

            {loading && (
                <p className="text-center mt-4">
                    جاري البحث...
                </p>
            )}

            {/* Cargo */}
            {scannedCargo && (
                <div
                    className={`mt-6 p-5 rounded-2xl bg-slate-800 border border-slate-700 transition-all duration-300 ${
                        animate ? "scale-105 shadow-blue-500/40" : ""
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
                                    ]
                                }`}
                            >
                                {scannedCargo.status}
                            </span>
                        </div>
                    </div>

                    {/* 📊 Progress */}
                    <div className="mt-4">
                        <div className="w-full bg-slate-700 rounded-full h-2">
                            <div
                                className="h-2 rounded-full bg-blue-500 transition-all"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    {/* ✅ Next Button */}
                    {getNextStatus() && (
                        <button
                            onClick={updateCargoStatus}
                            className={`mt-5 w-full py-3 rounded-xl text-lg font-semibold text-white transition active:scale-95 ${
                                STATUS_COLORS[getNextStatus()]
                            }`}
                        >
                            {getNextStatus()}
                        </button>
                    )}

                    {/* Reset */}
                    <button
                        onClick={resetScanner}
                        className="mt-4 w-full bg-slate-700 py-3 rounded-xl"
                    >
                        مسح قطعة جديدة
                    </button>

                    {/* 🚚 Timeline */}
                    <div className="mt-8">
                        <h4 className="text-center font-bold mb-4">
                            مسار الشحنة
                        </h4>

                        <div className="relative border-l-2 border-slate-600 ml-3">
                            {STATUS_STEPS.map((step, index) => {
                                const currentOrder =
                                    STATUS_ORDER[
                                        scannedCargo.status
                                    ] || 0;

                                const stepOrder =
                                    STATUS_ORDER[step];

                                const isCompleted =
                                    stepOrder < currentOrder;
                                const isActive =
                                    stepOrder === currentOrder;

                                const record =
                                    scannedCargo.history?.find(
                                        (h) =>
                                            h.status === step
                                    );

                                return (
                                    <div
                                        key={index}
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
                                                {step}
                                            </p>

                                            {record && (
                                                <p className="text-xs text-gray-300 mt-1">
                                                    {new Date(
                                                        record.time
                                                    ).toLocaleString()
                                                    }
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}