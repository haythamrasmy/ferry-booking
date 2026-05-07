export default function FerryBookingWebsite() {
  const companyName = "هيئة وادي النيل للملاحة النهرية";

  const trips = [
    {
      id: 1,
      route: "أسوان ← وادي حلفا",
      date: "10 مايو 2026",
      time: "07:00 صباحًا",
      seats: 24,
      price: "2500 جنيه",
    },
    {
      id: 2,
      route: "أسوان ← وادي حلفا",
      date: "14 مايو 2026",
      time: "09:00 صباحًا",
      seats: 12,
      price: "2500 جنيه",
    },
  ];

  const seats = [
    "A1",
    "A2",
    "A3",
    "A4",
    "B1",
    "B2",
    "B3",
    "B4",
    "C1",
    "C2",
    "C3",
    "C4",
  ];

  // Fixed invalid variable names
  const bookedSeats = ["A2", "B3"];
  const lockedSeats = ["C1"];

  return (
    <div dir="rtl" className="min-h-screen bg-slate-100 text-slate-900">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-slate-900 to-blue-900 text-white py-20 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-5xl font-bold leading-tight mb-6">
              {companyName}
            </h1>

            <p className="text-lg text-slate-200 mb-8">
             
            </p>

            <button className="bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-3 rounded-2xl font-semibold shadow-lg transition">
              احجز الآن
            </button>
          </div>

          <div>
            <img
              src="/hero.jpg"
              alt="Nile Ferry"
              className="rounded-3xl shadow-2xl w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="max-w-6xl mx-auto px-6 -mt-10">
        <div className="bg-white rounded-3xl shadow-xl p-6 grid md:grid-cols-4 gap-4">
          <input
            type="date"
            className="border rounded-xl p-3 outline-none"
          />

          <select className="border rounded-xl p-3 outline-none">
            <option>راكب واحد</option>
            <option>راكبين</option>
            <option>3 ركاب</option>
          </select>

          <select className="border rounded-xl p-3 outline-none">
            <option>اقتصادي</option>
            <option>VIP</option>
          </select>

          <button className="bg-blue-700 hover:bg-blue-800 text-white rounded-xl p-3 font-semibold transition">
            بحث عن الرحلات
          </button>
        </div>
      </section>

      {/* Trips */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold">الرحلات المتاحة</h2>
          <span className="text-slate-500">الحالة المباشرة</span>
        </div>

        <div className="grid gap-6">
          {trips.map((trip) => (
            <div
              key={trip.id}
              className="bg-white rounded-3xl shadow-md p-6 grid md:grid-cols-5 gap-6 items-center"
            >
              <div>
                <p className="text-slate-500 text-sm">الرحلة</p>
                <h3 className="font-bold text-xl">{trip.route}</h3>
              </div>

              <div>
                <p className="text-slate-500 text-sm">التاريخ</p>
                <h3 className="font-semibold">{trip.date}</h3>
              </div>

              <div>
                <p className="text-slate-500 text-sm">موعد التحرك</p>
                <h3 className="font-semibold">{trip.time}</h3>
              </div>

              <div>
                <p className="text-slate-500 text-sm">المقاعد المتبقية</p>
                <h3 className="font-semibold text-green-600">
                  {trip.seats}
                </h3>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-4">
                <div>
                  <p className="text-slate-500 text-sm">السعر</p>
                  <h3 className="font-bold text-lg">{trip.price}</h3>
                </div>

                <button className="bg-yellow-500 hover:bg-yellow-400 px-5 py-3 rounded-xl font-semibold transition">
                  اختيار
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Seat Selection */}
      <section className="bg-white py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold">اختر مقعدك</h2>

            <div className="flex gap-4 text-sm flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span>متاح</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-400 rounded"></div>
                <span>مقفول مؤقتًا</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span>محجوز</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-100 rounded-3xl p-8 shadow-inner">
            <div className="grid grid-cols-4 gap-4">
              {seats.map((seat) => {
                const isBooked = bookedSeats.includes(seat);
                const isLocked = lockedSeats.includes(seat);

                return (
                  <button
                    key={seat}
                    disabled={isBooked || isLocked}
                    className={`rounded-2xl py-5 font-bold transition ${
                      isBooked
                        ? "bg-red-500 text-white cursor-not-allowed"
                        : isLocked
                        ? "bg-yellow-400 text-black cursor-not-allowed"
                        : "bg-green-500 hover:scale-105 text-white"
                    }`}
                  >
                    {seat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Booking Form */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <h2 className="text-3xl font-bold mb-8">بيانات الراكب</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <input
              type="text"
              placeholder="الاسم بالكامل"
              className="border rounded-2xl p-4 outline-none"
            />

            <input
              type="text"
              placeholder="رقم جواز السفر"
              className="border rounded-2xl p-4 outline-none"
            />

            <input
              type="text"
              placeholder="رقم الهاتف"
              className="border rounded-2xl p-4 outline-none"
            />

            <input
              type="email"
              placeholder="البريد الإلكتروني"
              className="border rounded-2xl p-4 outline-none"
            />
          </div>

          <div className="mt-8">
            <label className="block mb-3 font-semibold">
              ارفع صورة التحويل أو الدفع
            </label>

            <input
              type="file"
              className="border rounded-2xl p-4 w-full"
            />
          </div>

          <div className="mt-10 flex items-center justify-between flex-wrap gap-6">
            <div>
              <p className="text-slate-500">طريقة الدفع</p>
              <h3 className="font-bold text-xl">InstaPay / Paymob</h3>
            </div>

            <button className="bg-blue-700 hover:bg-blue-800 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-lg transition">
              تأكيد الحجز
            </button>
          </div>
        </div>
      </section>

      {/* Admin Section */}
      <section className="bg-slate-900 text-white py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl font-bold">لوحة التحكم</h2>
            <span className="text-slate-400">إدارة الحجوزات المباشرة</span>
          </div>

          <div className="grid md:grid-cols-4 gap-6 mb-10">
            <div className="bg-slate-800 rounded-3xl p-6">
              <p className="text-slate-400">إجمالي الرحلات</p>
              <h3 className="text-4xl font-bold mt-3">12</h3>
            </div>

            <div className="bg-slate-800 rounded-3xl p-6">
              <p className="text-slate-400">الحجوزات</p>
              <h3 className="text-4xl font-bold mt-3">248</h3>
            </div>

            <div className="bg-slate-800 rounded-3xl p-6">
              <p className="text-slate-400">الإيرادات</p>
              <h3 className="text-4xl font-bold mt-3">620K</h3>
            </div>

            <div className="bg-slate-800 rounded-3xl p-6">
              <p className="text-slate-400">المقاعد المقفولة</p>
              <h3 className="text-4xl font-bold mt-3">4</h3>
            </div>
          </div>

          <div className="bg-slate-800 rounded-3xl overflow-hidden">
            <table className="w-full text-right">
              <thead className="bg-slate-700">
                <tr>
                  <th className="p-4">الراكب</th>
                  <th className="p-4">المقعد</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4">الدفع</th>
                </tr>
              </thead>

              <tbody>
                <tr className="border-t border-slate-700">
                  <td className="p-4">Ahmed Hassan</td>
                  <td className="p-4">A1</td>
                  <td className="p-4 text-green-400">مؤكد</td>
                  <td className="p-4">مدفوع</td>
                </tr>

                <tr className="border-t border-slate-700">
                  <td className="p-4">Mohamed Ali</td>
                  <td className="p-4">C1</td>
                  <td className="p-4 text-yellow-400">مقفول مؤقتًا</td>
                  <td className="p-4">قيد المراجعة</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-slate-400 py-8 px-6 text-center">
        <p>© 2026 هيئة وادي النيل للملاحة النهرية</p>
      </footer>
    </div>
  );
}
