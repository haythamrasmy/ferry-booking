import { useEffect, useState } from "react";

import { db, auth } from "./firebase";

import {
 collection,
onSnapshot,
updateDoc,
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
  
 useEffect(() => {
  let unsubscribeBookings = null;



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
        }));

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

        <div className="grid md:grid-cols-4 gap-6 mb-10">
          <div className="bg-slate-800 rounded-3xl p-6">
            <p className="text-slate-400">
              الحجوزات
            </p>

            <h3 className="text-4xl font-bold mt-3">
              {bookings.length}
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

        <div className="bg-slate-800 rounded-3xl overflow-hidden">
          <table className="w-full text-right">
            <thead className="bg-slate-700">
              <tr>
                <th className="p-4">
                  الراكب
                </th>

                <th className="p-4">
                  المقعد
                </th>

               <th className="p-4">
  الحالة
</th>

<th className="p-4">
  الإجراء
</th>

              
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
  {booking.status === "confirmed"
    ? "مؤكد"
    : "قيد المراجعة"}
</td>

<td className="p-4">
  {booking.status !== "confirmed" && (
    <button
      onClick={() =>
        confirmBooking(booking.id)
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
        </div>
      </div>
    </div>
  );
}