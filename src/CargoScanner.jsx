import { useEffect, useState } from "react";
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
    const [scannedCode, setScannedCode] =
        useState("");

    const [scannedCargo, setScannedCargo] =
        useState(null);

    const [scannedCargoId, setScannedCargoId] =
        useState(null);

    const updateCargoStatus = async (
        newStatus
    ) => {
        if (!scannedCargoId) return;

        try {
            await updateDoc(
                doc(
                    db,
                    "cargoItems",
                    scannedCargoId
                ),
                {
                    status: newStatus,

                    history: arrayUnion({
                        status: newStatus,
                        time:
                            new Date().toISOString(),
                    }),
                }
            );

            setScannedCargo((prev) => ({
                ...prev,
                status: newStatus,

                history: [
                    ...(prev?.history || []),
                    {
                        status: newStatus,
                        time:
                            new Date().toISOString(),
                    },
                ],
            }));
        } catch (err) {
            console.error(err);

            alert(
                "فشل تحديث الحالة"
            );
        }
    };

    useEffect(() => {
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

        scanner.render(
            async (decodedText) => {
                console.log(
                    "QR CONTENT =",
                    decodedText
                );

                setScannedCode(decodedText);

                const q = query(
                    collection(
                        db,
                        "cargoItems"
                    ),
                    where(
                        "serial",
                        "==",
                        decodedText
                    )
                );

                const snapshot =
                    await getDocs(q);

                console.log(
                    "FOUND DOCS:",
                    snapshot.size
                );

                if (!snapshot.empty) {
                    successSound.play();
                    if (navigator.vibrate) {
                        navigator.vibrate(300);
                    }
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
    }, []);

    return (
        <div className="min-h-screen p-8 bg-slate-900">

            <h1 className="text-3xl font-bold mb-6 text-white">
                ماسح الشحنات
            </h1>

            <div
                id="reader"
                className="
          text-black
          bg-white
          rounded-2xl
          overflow-hidden
        "
            />

            {scannedCargo && (
                <div
                    className="
            mt-6
            p-5
            rounded-xl
            border
            bg-slate-100
            text-black
            shadow
          "
                >
                    <h3 className="text-xl font-bold mb-4">
                        بيانات القطعة
                    </h3>

                    <p>
                        <strong>الصنف:</strong>{" "}
                        {scannedCargo.item}
                    </p>

                    <p>
                        <strong>الرقم:</strong>{" "}
                        {scannedCargo.serial}
                    </p>

                    <p>
                        <strong>التتبع:</strong>{" "}
                        {scannedCargo.trackingId}
                    </p>

                    <p>
                        <strong>الوجهة:</strong>{" "}
                        {scannedCargo.destination}
                    </p>

                    <p>
                        <strong>الحالة:</strong>{" "}
                        {scannedCargo.status}
                    </p>

                    <div className="flex flex-wrap gap-2 mt-4">

                        <button
                            onClick={() =>
                                updateCargoStatus(
                                    "تم الاستلام"
                                )
                            }
                            className="
                bg-green-600
                text-white
                px-4
                py-2
                rounded-xl
              "
                        >
                            تم الاستلام
                        </button>

                        <button
                            onClick={() =>
                                updateCargoStatus(
                                    "في المخزن"
                                )
                            }
                            className="
                bg-blue-600
                text-white
                px-4
                py-2
                rounded-xl
              "
                        >
                            في المخزن
                        </button>

                        <button
                            onClick={() =>
                                updateCargoStatus(
                                    "تم التحميل"
                                )
                            }
                            className="
                bg-yellow-600
                text-white
                px-4
                py-2
                rounded-xl
              "
                        >
                            تم التحميل
                        </button>

                        <button
                            onClick={() =>
                                updateCargoStatus(
                                    "وصلت الوجهة"
                                )
                            }
                            className="
                bg-purple-600
                text-white
                px-4
                py-2
                rounded-xl
              "
                        >
                            وصلت الوجهة
                        </button>

                        <button
                            onClick={() =>
                                updateCargoStatus(
                                    "تم التسليم"
                                )
                            }
                            className="
                bg-red-600
                text-white
                px-4
                py-2
                rounded-xl
              "
                        >
                            تم التسليم
                        </button>

                    </div>
                </div>
            )}
        </div>
    );
}