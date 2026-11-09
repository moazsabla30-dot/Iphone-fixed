import { useEffect, useMemo, useState } from "react";
import "./App.css";

const models = [
  "iPhone 18 Pro Max", "iPhone 18 Pro",
  "iPhone 17 Pro Max", "iPhone 17 Pro", "iPhone Air", "iPhone 17",
  "iPhone 16 Pro Max", "iPhone 16 Pro", "iPhone 16",
  "iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15 Plus", "iPhone 15",
  "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14 Plus", "iPhone 14",
  "iPhone 13 Pro Max", "iPhone 13 Pro", "iPhone 13", "iPhone 13 mini",
  "iPhone 12 Pro Max", "iPhone 12 Pro", "iPhone 12", "iPhone 12 mini",
  "iPhone 11 Pro Max", "iPhone 11 Pro", "iPhone 11", "iPhone SE"
];

const parts = [
  { id: "screen", nameAr: "شاشة", nameEn: "Screen" },
  { id: "battery", nameAr: "بطارية", nameEn: "Battery" },
  { id: "upper_speaker", nameAr: "سماعة علوية", nameEn: "Upper Speaker" },
  { id: "lower_speaker", nameAr: "سماعة سفلية", nameEn: "Lower Speaker" },
  { id: "mic", nameAr: "مايك", nameEn: "Microphone" },
  { id: "front_camera", nameAr: "كاميرا أمامية", nameEn: "Front Camera" },
  { id: "back_cameras", nameAr: "كاميرات خلفية", nameEn: "Back Cameras" },
  { id: "back_glass", nameAr: "ظهر", nameEn: "Back Glass" },
  { id: "flash", nameAr: "فلاش", nameEn: "Flash" },
  { id: "socket", nameAr: "سوكت", nameEn: "Charging Socket" },
  { id: "other", nameAr: "عطل آخر (تحديد العطل يدوياً)", nameEn: "Other Custom Issue" }
];

const partSubOptions = {
  screen: [
    { 
      id: "pulled", 
      nameAr: "شاشة خلع أصلية مخلوعة من جهاز آخر", 
      nameEn: "Original Pulled Screen (From another device)",
      price: 2900, 
      descAr: "أصلية 100% مخلوعة من جهاز آيفون آخر مطابقة لمواصفات المصنع", 
      descEn: "100% original pulled from another iPhone, factory matching",
      image: "/WhatsApp Image 2026-11-09 at 7.19.50 PM (2).jpeg"
    },
    { 
      id: "gx3", 
      nameAr: "شاشة GX3", 
      nameEn: "GX3 Screen",
      price: 2100, 
      descAr: "أفضل وأعلى درجة بديلة للشاشة الأصلية بألوان وجودة فائقة", 
      descEn: "Best and highest grade alternative to original screen with superb colors",
      image: "/WhatsApp Image 2026-11-09 at 7.19.50 PM (1).jpeg"
    },
    { 
      id: "copy", 
      nameAr: "شاشة كوبي", 
      nameEn: "Copy Screen",
      price: 1600, 
      descAr: "جودة مقبولة وسعر اقتصادي مناسب", 
      descEn: "Acceptable quality and suitable economic price",
      image: "/WhatsApp Image 2026-11-09 at 7.19.50 PM.jpeg"
    }
  ],
  battery: [
    { id: "orig_batt", nameAr: "بطارية أصلية", nameEn: "Original Battery", price: 1500, descAr: "عمر افتراضي طويل وأداء ممتاز وبتجيب رساله قطعه اصليه من apple", descEn: "Long battery life, excellent performance, shows genuine Apple part message", image: "/WhatsApp Image 2026-11-09 at 8.08.21 PM.jpeg" },
    { id: "high_batt", nameAr: "بطارية سعة عالية", nameEn: "High Capacity Battery", price: 1300, descAr: "أداء أعلى من السعة العادية وبتجيب رساله used داخل الاعدادات", descEn: "Higher performance than standard capacity, shows 'used' message in settings", image: "/WhatsApp Image 2026-11-09 at 8.08.21 PM.jpeg" },
    { id: "copy_batt", nameAr: "بطارية درجة أولى", nameEn: "First Grade Battery", price: 900, descAr: "اقتصادية وبأداء جيد", descEn: "Economical with good performance", image: "/WhatsApp Image 2026-11-09 at 8.08.21 PM.jpeg" }
  ],
  upper_speaker: [
    { id: "orig_usp", nameAr: "سماعة أصلية علوية (اذن)", nameEn: "Original Upper Speaker (Earpiece)", price: 800, descAr: "صوت مكالمات نقي وواضح", descEn: "Pure and clear call sound", image: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=300&auto=format&fit=crop&q=60" },
    { id: "copy_usp", nameAr: "سماعة علوية تجارية", nameEn: "Commercial Upper Speaker", price: 500, descAr: "أداء قياسي", descEn: "Standard performance", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&auto=format&fit=crop&q=60" }
  ],
  lower_speaker: [
    { id: "orig_lsp", nameAr: "جرس / سماعة سفلية أصلية", nameEn: "Original Lower Speaker / Buzzer", price: 900, descAr: "صوت موسيقى قوي بدون تشويش", descEn: "Strong music sound without distortion", image: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=300&auto=format&fit=crop&q=60" }
  ],
  mic: [
    { id: "orig_mic", nameAr: "مايك المكالمات والصوت أصلي", nameEn: "Original Microphone", price: 700, descAr: "نقاء تام في تسجيل الصوت والمكالمات", descEn: "Total clarity in audio recording and calls", image: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=300&auto=format&fit=crop&q=60" }
  ],
  front_camera: [
    { id: "orig_fcam", nameAr: "كاميرا أمامية أصلية", nameEn: "Original Front Camera", price: 1400, descAr: "وضوح عالي ودعم كامل للـ Face ID", descEn: "High clarity and full Face ID support", image: "https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?w=300&auto=format&fit=crop&q=60" }
  ],
  back_cameras: [
    { id: "orig_bcam", nameAr: "مجموعة الكاميرات الخلفية أصلية", nameEn: "Original Back Cameras Module", price: 2200, descAr: "تصوير احترافي وبدون مشاكل تركيز", descEn: "Professional shooting without focus issues", image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=300&auto=format&fit=crop&q=60" }
  ],
  back_glass: [
    { id: "orig_back", nameAr: "ظهر زجاجي أصلي", nameEn: "Original Back Glass", price: 2200, descAr: "مطابق تماماً لظهر المصنع", descEn: "Exact match to factory back glass", image: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=300&auto=format&fit=crop&q=60" },
    { id: "copy_back", nameAr: "ظهر زجاجي تجاري", nameEn: "Commercial Back Glass", price: 1300, descAr: "خامة جيدة ومظهر أنيق", descEn: "Good material and elegant look", image: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=300&auto=format&fit=crop&q=60" }
  ],
  flash: [
    { id: "orig_flash", nameAr: "فلاش وكابل الإضاءة أصلي", nameEn: "Original Flash & Light Cable", price: 600, descAr: "إضاءة قوية متوافقة مع النظام", descEn: "Strong lighting compatible with system", image: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=300&auto=format&fit=crop&q=60" }
  ],
  socket: [
    { id: "orig_socket", nameAr: "سوكت شحن أصلي (فلتر شحن)", nameEn: "Original Charging Socket", price: 1100, descAr: "يدعم الشحن السريع ونقل البيانات", descEn: "Supports fast charging and data transfer", image: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=300&auto=format&fit=crop&q=60" },
    { id: "copy_socket", nameAr: "سوكت شحن تجاري", nameEn: "Commercial Charging Socket", price: 650, descAr: "شحن عادي وبكفاءة مقبولة", descEn: "Normal charging with acceptable efficiency", image: "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=300&auto=format&fit=crop&q=60" }
  ],
  other: [
    { id: "custom_issue", nameAr: "فحص عطل بالبوردة أو فيس آي دي أو غير ذلك", nameEn: "Motherboard, Face ID, or Custom Issue Check", price: 0, descAr: "يتم تحديد السعر بدقة بعد الفحص الفني الشامل", descEn: "Price is determined precisely after thorough technical inspection", image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300&auto=format&fit=crop&q=60" }
  ]
};

const translations = {
  en: {
    languageButton: "عربي",
    navServices: "Services",
    navHow: "How It Works",
    navOrder: "Book a Repair",
    startNow: "Get Started",
    heroPill: "iPhone repair at your doorstep",
    heroTitle: "Your iPhone deserves the best care.",
    heroDescription: "Choose your iPhone model and the part that needs replacement. Get an estimated price instantly.",
    trusted: "Trusted Service",
    doorstep: "Doorstep Pickup",
    orderPill: "Simple step to begin",
    orderTitle: "Book Your Repair",
    orderDescription: "Choose your device model and issue to continue.",
    bannerText: "We pick up your phone from your doorstep and return it repaired without any effort from you!",
    selectPartsLabel: "⚙️ Select the required parts or issues (You can select multiple):",
    customIssueLabel: "Describe your custom issue (Motherboard, Face ID, etc.)",
    customIssuePlaceholder: "Write details about your issue here...",
    modelLabel: "iPhone Model",
    partLabel: "Required Part / Issue",
    continue: "Continue to Quality Selection",
    selectQualityTitle: "Choose Part Type & Quality",
    backButton: "Back",
    confirmOrder: "Confirm Order",
    fullName: "Full Name",
    phone: "Phone Number",
    address: "Full Address",
    notes: "Additional Notes (Optional)",
    namePlaceholder: "Enter your full name",
    phonePlaceholder: "01xxxxxxxxx",
    addressPlaceholder: "City, area, street, building number...",
    notesPlaceholder: "Tell us more about the issue...",
    timeSlotLabel: "Preferred Pickup Time Slot",
    timeMorning: "Morning Slot (10:00 AM - 2:00 PM)",
    timeEvening: "Evening Slot (3:00 PM - 8:00 PM)",
    paymentLabel: "Payment Method",
    cashOnDelivery: "Cash on Delivery (Pay after inspection)",
    demoDisclaimer: "Demo version: Your information is not sent to any server.",
    successTitle: "Your request has been registered!",
    orderNumber: "Order Number:",
    approximate: "approximately",
    currency: "EGP",
    newOrder: "New Request",
    copyright: "All rights reserved"
  },
  ar: {
    languageButton: "English",
    navServices: "خدماتنا",
    navHow: "إزاي بنشتغل",
    navOrder: "اطلب صيانة",
    startNow: "ابدأ الآن",
    heroPill: "خدمة إصلاح الآيفون لحد باب بيتك",
    heroTitle: "موبايلك يستاهل أفضل خدمة.",
    heroDescription: "اختار موديل الآيفون والقطعة اللي محتاجة تغيير، وانتقل لاختيار الجودة والسعر المناسب.",
    trusted: "خدمة موثوقة",
    doorstep: "استلام من باب البيت",
    orderPill: "خطوة بسيطة وتكون بدأت",
    orderTitle: "اطلب صيانة جهازك",
    orderDescription: "اختار نوع جهازك والعطل للانتقال لاختيار نوع القطعة.",
    bannerText: "نستلم هاتفك من باب منزلك، ونُعيده إليك مصلحاً دون أدنى مجهود منك!",
    selectPartsLabel: "⚙️ اختر القطع أو الأعطال المطلوبة (يمكنك اختيار أكثر من عطل):",
    customIssueLabel: "اكتب تفاصيل العطل المخصص (بوردة، فيس آي دي، إلخ)",
    customIssuePlaceholder: "اكتب وصفاً مفصلاً للمشكلة هنا...",
    modelLabel: "موديل الآيفون",
    partLabel: "القطعة المطلوبة / العطل",
    continue: "اختيار نوع القطعة والسعر ←",
    selectQualityTitle: "اختر نوع القطعة المطلوبة",
    backButton: "رجوع",
    confirmOrder: "تأكيد الطلب",
    fullName: "الاسم بالكامل",
    phone: "رقم الموبايل (واتساب للتأكيد)",
    address: "العنوان بالتفصيل",
    notes: "ملاحظات (اختياري)",
    namePlaceholder: "اكتب اسمك",
    phonePlaceholder: "01xxxxxxxxx",
    addressPlaceholder: "المحافظة، المنطقة، الشارع، رقم العمارة...",
    notesPlaceholder: "أي تفاصيل إضافية عن العطل",
    timeSlotLabel: "ميعاد الاستلام المناسب لك",
    timeMorning: "الفترة الصباحية (10 صباحاً - 2 ظهراً)",
    timeEvening: "الفترة المسائية (3 عصراً - 8 مساءً)",
    paymentLabel: "طريقة الدفع",
    cashOnDelivery: "نقداً عند الاستلام (الدفع بعد فحص الجهاز)",
    demoDisclaimer: "نسخة تجريبية: البيانات لا تُرسل إلى خادم أو شركة صيانة.",
    successTitle: "تم تسجيل طلبك!",
    orderNumber: "رقم الطلب:",
    approximate: "تقريبًا",
    currency: "جنيه",
    newOrder: "طلب جديد",
    copyright: "جميع الحقوق محفوظة"
  }
};

export default function App() {
  const [language, setLanguage] = useState(() => {
    try { return localStorage.getItem("ifix-language") || "en"; } catch { return "en"; }
  });

  const [model, setModel] = useState("iPhone 15 Pro");
  
  const [selectedParts, setSelectedParts] = useState(["screen"]);
  const [partSelections, setPartSelections] = useState({
    screen: 0
  });
  
  const [step, setStep] = useState("choose");
  const [customIssueText, setCustomIssueText] = useState("");

  const [details, setDetails] = useState({
    name: "",
    phone: "",
    address: "",
    notes: "",
    timeSlot: "morning"
  });

  const [orderNo, setOrderNo] = useState("");

  const t = translations[language];
  const isArabic = language === "ar";

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isArabic ? "rtl" : "ltr";
    try { localStorage.setItem("ifix-language", language); } catch {}
  }, [language, isArabic]);

  const totalPrice = useMemo(() => {
    let total = 0;
    selectedParts.forEach(partId => {
      if (partId !== "other") {
        const options = partSubOptions[partId] || [];
        const selectedIndex = partSelections[partId] || 0;
        const opt = options[selectedIndex] || options[0];
        if (opt) total += opt.price;
      }
    });
    return total;
  }, [selectedParts, partSelections]);

  function updateDetails(e) {
    setDetails({ ...details, [e.target.name]: e.target.value });
  }

  function submitOrder(e) {
    e.preventDefault();
    setOrderNo("IFX-" + Math.floor(100000 + Math.random() * 900000));
    setStep("done");
  }

  function toggleLanguage() {
    setLanguage(current => current === "en" ? "ar" : "en");
  }

  const formatPrice = value => value.toLocaleString("en-US");

  return (
    <main dir={isArabic ? "rtl" : "ltr"}>
      {/* HEADER */}
      <header className="header">
        <a className="logo" href="#top"><b>i</b>Fix</a>
        <nav>
          <a href="#services">{t.navServices}</a>
          <a href="#how">{t.navHow}</a>
          <a href="#order">{t.navOrder}</a>
        </nav>
        <div className="header-actions">
          <button type="button" className="language-toggle" onClick={toggleLanguage}>
            {t.languageButton}
          </button>
          <a className="header-btn" href="#order">{t.startNow}</a>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="hero" id="top">
        <div className="hero-copy">
          <span className="pill">{t.heroPill}</span>
          <h1><span className="english">iPhone Repair</span><br />{t.heroTitle}</h1>
          <p>{t.heroDescription}</p>
          <a className="black-btn" href="#order">{t.startNow} <span>←</span></a>
          <div className="trust">
            <span>✓ {t.trusted}</span>
            <i></i>
            <span>✓ {t.doorstep}</span>
          </div>
        </div>
        <div className="hero-picture">
          <img src="/IMG_5564.PNG" alt="Two silver iPhones" />
        </div>
      </section>

      {/* ORDER SECTION */}
      <section className="order-section" id="order">
        <div className="section-title">
          {step !== "done" && (
            <>
              <span className="pill">🛡️ {t.orderPill}</span>
              <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#16a34a', lineHeight: '1.3', marginBottom: '10px' }}>
                {t.bannerText}
              </h2>
              <p>{t.orderDescription}</p>
            </>
          )}
        </div>

        {/* STEP 1 */}
        {step === "choose" && (
          <div className="card">
            <div className="fields">
              <label className="wide">
                <span>📱 {t.modelLabel}</span>
                <select value={model} onChange={e => setModel(e.target.value)}>
                  {models.map(m => (<option key={m}>{m}</option>))}
                </select>
              </label>
            </div>

            <div style={{ marginTop: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '12px' }}>
                {t.selectPartsLabel}
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                {parts.map(p => {
                  const isChecked = selectedParts.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        if (isChecked) {
                          if (selectedParts.length > 1) {
                            setSelectedParts(selectedParts.filter(id => id !== p.id));
                          }
                        } else {
                          setSelectedParts([...selectedParts, p.id]);
                        }
                      }}
                      style={{
                        padding: '12px 14px',
                        border: isChecked ? '2px solid black' : '1px solid #e4e4e7',
                        borderRadius: '12px',
                        backgroundColor: isChecked ? '#f4f4f5' : '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        style={{ width: '18px', height: '18px', accentColor: '#000', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '0.9rem', fontWeight: isChecked ? 'bold' : 'normal', color: '#111' }}>
                        {isArabic ? p.nameAr : p.nameEn}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedParts.includes("other") && (
              <div style={{ marginTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '6px' }}>
                  ✏️ {t.customIssueLabel}
                </label>
                <textarea
                  value={customIssueText}
                  onChange={e => setCustomIssueText(e.target.value)}
                  rows="3"
                  placeholder={t.customIssuePlaceholder}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #ccc', fontSize: '0.9rem' }}
                  required
                />
              </div>
            )}

            <button
              className="black-btn full"
              style={{ marginTop: '20px' }}
              onClick={() => {
                if (selectedParts.length === 0) {
                  alert(isArabic ? "برجاء اختيار عطل واحد على الأقل" : "Please select at least one repair part");
                  return;
                }
                if (selectedParts.includes("other") && !customIssueText.trim()) {
                  alert(isArabic ? "برجاء كتابة تفاصيل العطل أولاً" : "Please enter custom issue details");
                  return;
                }
                setStep("selectQuality");
              }}
            >
              {t.continue}
            </button>
          </div>
        )}

        {/* STEP 2 */}
        {step === "selectQuality" && (
          <div className="card">
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '6px' }}>{t.selectQualityTitle}</h3>
              <p style={{ fontSize: '0.85rem', color: '#666' }}>{model}</p>
            </div>

            {selectedParts.map(partId => {
              if (partId === "other") {
                return (
                  <div key="other" style={{ backgroundColor: '#f4f4f5', padding: '16px', borderRadius: '14px', marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '4px' }}>🔧 {isArabic ? "عطل آخر" : "Custom Issue"}: {customIssueText}</h4>
                    <p style={{ fontSize: '0.8rem', color: '#666' }}>{isArabic ? "يحدد السعر بعد الفحص الفني" : "Price determined after inspection"}</p>
                  </div>
                );
              }

              const partObj = parts.find(p => p.id === partId);
              const options = partSubOptions[partId] || [];
              const currentSelectedIndex = partSelections[partId] || 0;

              return (
                <div key={partId} style={{ marginBottom: '24px', borderBottom: '1px solid #eee', paddingBottom: '16px' }}>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '12px', color: '#111' }}>
                    ⚙️ {isArabic ? partObj?.nameAr : partObj?.nameEn}
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                    {options.map((opt, idx) => {
                      const isSelected = currentSelectedIndex === idx;
                      return (
                        <div
                          key={opt.id}
                          onClick={() => {
                            setPartSelections({
                              ...partSelections,
                              [partId]: idx
                            });
                          }}
                          style={{
                            border: isSelected ? '2px solid black' : '1px solid #e4e4e7',
                            borderRadius: '16px',
                            padding: '16px',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? '#fafafa' : '#fff',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            textAlign: 'center'
                          }}
                        >
                          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <span style={{ width: '20px', height: '20px' }}></span>
                            <img 
                              src={opt.image} 
                              alt={isArabic ? opt.nameAr : opt.nameEn} 
                              style={{ 
                                width: '120px', 
                                height: '130px', 
                                objectFit: 'cover', 
                                borderRadius: '12px', 
                                border: '1px solid #e4e4e7',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
                              }} 
                            />
                            <span style={{ width: '20px', height: '20px', borderRadius: '50%', border: isSelected ? '6px solid black' : '2px solid #ccc', display: 'inline-block' }}></span>
                          </div>

                          <h5 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px', color: '#111' }}>
                            {isArabic ? opt.nameAr : opt.nameEn}
                          </h5>
                          <p style={{ fontSize: '0.75rem', color: '#666', marginBottom: '14px', minHeight: '32px' }}>
                            {isArabic ? opt.descAr : opt.descEn}
                          </p>
                          
                          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#000', width: '100%', borderTop: '1px solid #f0f0f0', paddingTop: '10px' }}>
                            {formatPrice(opt.price)} {t.currency}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button type="button" className="light-btn" onClick={() => setStep("choose")}>
                {t.backButton}
              </button>
              <button className="black-btn full" onClick={() => setStep("details")}>
                {t.continue}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === "details" && (
          <form className="card" onSubmit={submitOrder}>
            <div className="summary" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f4f4f5', padding: '14px 18px', borderRadius: '12px', marginBottom: '20px' }}>
              <div>
                <span style={{ fontWeight: 'bold', display: 'block' }}>{model}</span>
                <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                  {selectedParts.map(id => {
                    if (id === 'other') return customIssueText;
                    const p = parts.find(item => item.id === id);
                    return isArabic ? p?.nameAr : p?.nameEn;
                  }).join(' + ')}
                </span>
              </div>
              <strong style={{ fontSize: '1.2rem' }}>
                {formatPrice(totalPrice)} {t.currency}
              </strong>
            </div>

            <div className="fields">
              <label>
                👤 {t.fullName}
                <input name="name" value={details.name} onChange={updateDetails} required placeholder={t.namePlaceholder} />
              </label>

              <label>
                📞 {t.phone}
                <input name="phone" value={details.phone} onChange={updateDetails} required type="tel" placeholder={t.phonePlaceholder} pattern="[0-9+ ]{8,16}" />
              </label>

              <label className="wide">
                📍 {t.address}
                <textarea name="address" value={details.address} onChange={updateDetails} required rows="2" placeholder={t.addressPlaceholder} />
              </label>

              <label className="wide">
                ⏰ {t.timeSlotLabel}
                <select name="timeSlot" value={details.timeSlot} onChange={updateDetails}>
                  <option value="morning">{t.timeMorning}</option>
                  <option value="evening">{t.timeEvening}</option>
                </select>
              </label>

              <label className="wide">
                📝 {t.notes}
                <textarea name="notes" value={details.notes} onChange={updateDetails} rows="2" placeholder={t.notesPlaceholder} />
              </label>

              <div className="wide" style={{ marginTop: '5px', padding: '12px 16px', border: '1px solid #e4e4e7', borderRadius: '12px', backgroundColor: '#fafafa' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>💳 {t.paymentLabel}</span>
                <span style={{ fontSize: '0.9rem', color: '#18181b', display: 'flex', alignItems: 'center', gap: '6px' }}>💵 <strong>{t.cashOnDelivery}</strong></span>
              </div>
            </div>

            <div className="actions" style={{ marginTop: '20px' }}>
              <button type="button" className="light-btn" onClick={() => setStep("selectQuality")}>
                {t.backButton}
              </button>
              <button className="black-btn" type="submit">
                {t.confirmOrder} ←
              </button>
            </div>

            <small className="disclaimer">{t.demoDisclaimer}</small>
          </form>
        )}

        {/* SUCCESS */}
        {step === "done" && (
          <div className="card done">
            <b className="check">✓</b>
            <h3>{t.successTitle}</h3>
            <p>{t.orderNumber} <strong>{orderNo}</strong></p>
            <p>{details.name} — {details.phone}</p>
            <p>{model}</p>
            <strong>{formatPrice(totalPrice)} {t.currency} {t.approximate}</strong>
            <button className="black-btn" onClick={() => { setStep("choose"); setDetails({ name: "", phone: "", address: "", notes: "", timeSlot: "morning" }); setSelectedParts(["screen"]); setCustomIssueText(""); }}>
              {t.newOrder}
            </button>
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer>
        <a className="logo" href="#top"><b>i</b> Fix</a>
        <span>© {new Date().getFullYear()} iFix — {t.copyright}</span>
      </footer>
    </main>
  );
}