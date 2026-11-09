import { useMemo, useState } from "react";
import "./App.css";

const models = [
  "iPhone 16 Pro Max", "iPhone 16 Pro", "iPhone 16 Plus", "iPhone 16",
  "iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15 Plus", "iPhone 15",
  "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14 Plus", "iPhone 14",
  "iPhone 13 Pro Max", "iPhone 13 Pro", "iPhone 13", "iPhone 13 mini",
  "iPhone 12 Pro Max", "iPhone 12 Pro", "iPhone 12", "iPhone 12 mini",
  "iPhone 11 Pro Max", "iPhone 11 Pro", "iPhone 11", "iPhone SE"
];

const parts = [
  { id: "screen", name: "تغيير الشاشة", prices: [1800, 2300, 2900] },
  { id: "battery", name: "تغيير البطارية", prices: [900, 1200, 1500] },
  { id: "charging", name: "مدخل الشحن", prices: [700, 950, 1200] },
  { id: "camera", name: "الكاميرا", prices: [1000, 1400, 1800] },
  { id: "back", name: "الظهر الزجاجي", prices: [1300, 1700, 2200] },
  { id: "speaker", name: "السماعة", prices: [600, 800, 1000] }
];

function getPrice(model, part) {
  const year = Number((model.match(/\d+/) || ["13"])[0]);
  return part.prices[year >= 15 ? 2 : year >= 13 ? 1 : 0];
}

export default function App() {
  const [model, setModel] = useState("iPhone 15 Pro");
  const [partId, setPartId] = useState("screen");
  const [step, setStep] = useState("choose");

  const [details, setDetails] = useState({
    name: "",
    phone: "",
    address: "",
    notes: ""
  });

  const [orderNo, setOrderNo] = useState("");

  const part = parts.find(p => p.id === partId) || parts[0];

  const price = useMemo(
    () => getPrice(model, part),
    [model, part]
  );

  function updateDetails(e) {
    setDetails({
      ...details,
      [e.target.name]: e.target.value
    });
  }

  function submitOrder(e) {
    e.preventDefault();

    setOrderNo(
      "IFX-" + Math.floor(100000 + Math.random() * 900000)
    );

    setStep("done");
  }

  return (
    <main dir="rtl">

      {/* HEADER */}

      <header className="header">

        <a className="logo" href="#top">
          <b>i</b> iFix
        </a>

        <nav>
          <a href="#services">خدماتنا</a>
          <a href="#how">إزاي بنشتغل</a>
          <a href="#order">اطلب صيانة</a>
        </nav>

        <a className="header-btn" href="#order">
          ابدأ الآن
        </a>

      </header>


      {/* HERO SECTION */}

      <section className="hero" id="top">

        <div className="hero-copy">

          <span className="pill">
            خدمة إصلاح الآيفون لحد باب بيتك
          </span>

          <h1>
            <span className="english">iPhone Repair</span>
            <br />
            موبايلك يستاهل أفضل خدمة.
          </h1>

          <p>
            اختار موديل الآيفون والقطعة اللي محتاجة تغيير،
            واعرف التكلفة بكل سهولة.
            إحنا هنتولى الباقي ونوصلك لحد باب بيتك.
          </p>

          <a className="black-btn" href="#order">
            ابدأ الآن <span>←</span>
          </a>

          <div className="trust">
            <span>✓ خدمة موثوقة</span>
            <i></i>
            <span>✓ استلام من باب البيت</span>
          </div>

        </div>


        <div className="hero-picture">

          <img
            src="/IMG_5564.PNG"
            alt="هاتفان آيفون باللون الفضي"
          />

        </div>

      </section>


      {/* SERVICES */}

      <section className="features" id="services">

        <article>
          <b>◇</b>
          <h3>قطع غيار مختارة</h3>
          <p>
            نهتم بجودة القطع المستخدمة في الصيانة.
          </p>
        </article>

        <article>
          <b>✓</b>
          <h3>فنيون متخصصون</h3>
          <p>
            اهتمام بكل تفاصيل جهازك أثناء الصيانة.
          </p>
        </article>

        <article>
          <b>⌂</b>
          <h3>خدمة لحد البيت</h3>
          <p>
            اطلب الصيانة بسهولة من مكانك.
          </p>
        </article>

      </section>


      {/* ORDER SECTION */}

      <section className="order-section" id="order">

        <div className="section-title">

          <span className="pill">
            خطوة بسيطة وتكون بدأت
          </span>

          <h2>اطلب صيانة جهازك</h2>

          <p>
            اختار نوع جهازك والعطل وشوف السعر التقديري.
          </p>

        </div>


        {/* STEP 1 */}

        {step === "choose" && (

          <div className="card">

            <div className="fields">

              <label>
                موديل الآيفون

                <select
                  value={model}
                  onChange={e => setModel(e.target.value)}
                >

                  {models.map(m => (
                    <option key={m}>{m}</option>
                  ))}

                </select>

              </label>


              <label>
                القطعة المطلوبة

                <select
                  value={partId}
                  onChange={e => setPartId(e.target.value)}
                >

                  {parts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}

                </select>

              </label>

            </div>


            <div className="price-box">

              <div>
                <small>السعر التقديري</small>

                <strong>
                  {price.toLocaleString("en-US")} جنيه
                </strong>
              </div>

              <small>
                السعر النهائي بيتحدد بعد فحص الجهاز.
              </small>

            </div>


            <button
              className="black-btn full"
              onClick={() => setStep("details")}
            >
              استكمال الطلب <span>←</span>
            </button>

          </div>

        )}


        {/* STEP 2 */}

        {step === "details" && (

          <form className="card" onSubmit={submitOrder}>

            <div className="summary">

              {model} — {part.name}

              <strong>
                {price.toLocaleString("en-US")} جنيه تقريبًا
              </strong>

            </div>


            <div className="fields">

              <label>
                الاسم بالكامل

                <input
                  name="name"
                  value={details.name}
                  onChange={updateDetails}
                  required
                  placeholder="اكتب اسمك"
                />

              </label>


              <label>
                رقم الموبايل

                <input
                  name="phone"
                  value={details.phone}
                  onChange={updateDetails}
                  required
                  type="tel"
                  placeholder="01xxxxxxxxx"
                  pattern="[0-9+ ]{8,16}"
                />

              </label>


              <label className="wide">
                العنوان بالتفصيل

                <textarea
                  name="address"
                  value={details.address}
                  onChange={updateDetails}
                  required
                  rows="3"
                  placeholder="المحافظة، المنطقة، الشارع، رقم العمارة..."
                />

              </label>


              <label className="wide">
                ملاحظات (اختياري)

                <textarea
                  name="notes"
                  value={details.notes}
                  onChange={updateDetails}
                  rows="2"
                  placeholder="أي تفاصيل إضافية عن العطل"
                />

              </label>

            </div>


            <div className="actions">

              <button
                type="button"
                className="light-btn"
                onClick={() => setStep("choose")}
              >
                رجوع
              </button>

              <button
                className="black-btn"
                type="submit"
              >
                تأكيد الطلب ←
              </button>

            </div>

            <small className="disclaimer">
              نسخة تجريبية: البيانات لا تُرسل إلى خادم أو شركة صيانة.
            </small>

          </form>

        )}


        {/* SUCCESS */}

        {step === "done" && (

          <div className="card done">

            <b className="check">✓</b>

            <h3>تم تسجيل طلبك التجريبي!</h3>

            <p>
              رقم الطلب: <strong>{orderNo}</strong>
            </p>

            <p>
              {details.name} — {details.phone}
            </p>

            <p>
              {model} / {part.name}
            </p>

            <strong>
              {price.toLocaleString("en-US")} جنيه تقريبًا
            </strong>

            <button
              className="black-btn"
              onClick={() => {
                setStep("choose");
                setDetails({
                  name: "",
                  phone: "",
                  address: "",
                  notes: ""
                });
              }}
            >
              طلب جديد
            </button>

          </div>

        )}

      </section>


      {/* HOW IT WORKS */}

      <section className="how" id="how">

        <div className="section-title">

          <span className="pill">من غير تعقيد</span>

          <h2>إزاي بنشتغل؟</h2>

        </div>


        <div className="steps">

          <article>
            <b>01</b>
            <h3>اختار جهازك</h3>
            <p>حدد موديل الآيفون والقطعة المطلوبة.</p>
          </article>

          <article>
            <b>02</b>
            <h3>سجّل بياناتك</h3>
            <p>اكتب رقمك وعنوانك للتواصل.</p>
          </article>

          <article>
            <b>03</b>
            <h3>تأكيد الطلب</h3>
            <p>راجع بياناتك وسجّل طلبك التجريبي.</p>
          </article>

        </div>

      </section>


      {/* FOOTER */}

      <footer>

        <a className="logo" href="#top">
          <b>i</b> iFix
        </a>

        <span>
          © {new Date().getFullYear()} iFix — جميع الحقوق محفوظة
        </span>

      </footer>

    </main>
  );
}