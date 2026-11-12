
import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import RepairComparison from "./RepairComparison";

const myWhatsAppNumber = "201097829312";

const modelImages = {
  "iPhone 18 Pro Max": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-18-pro-max-colors.png",
  "iPhone 18 Pro": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-18-pro-colors.png",
  "iPhone 17e": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-17e/iphone-17e-colors.png",
  "iPhone 17 Pro Max": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-17-pro-max-colors.png",
  "iPhone 17 Pro": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-17-pro-colors.png",
  "iPhone 17": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-17-colors.png",
  "iPhone Air": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-air-colors.png",
  "iPhone 16e": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-16e/iphone-16e-colors.png",
  "iPhone 16 Pro Max": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-16-pro-max-colors.png",
  "iPhone 16 Pro": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-16-pro-colors.png",
  "iPhone 16 Plus": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-16-plus-colors.png",
  "iPhone 16": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-16-colors.png",
  "iPhone 15 Pro Max": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/fall-2023-iphone-colors-iphone-15-pro-max.png",
  "iPhone 15 Pro": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/fall-2023-iphone-colors-iphone-15-pro.png",
  "iPhone 15 Plus": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/fall-2023-iphone-colors-iphone-15-plus.png",
  "iPhone 15": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/fall-2023-iphone-colors-iphone-15.png",
  "iPhone 14 Pro Max": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-14-pro-max-colors.png",
  "iPhone 14 Pro": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-14-pro-colors.png",
  "iPhone 14 Plus": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-14-plus-colors-spring-2023.png",
  "iPhone 14": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-14-colors-spring-2023.png",
  "iPhone SE (3rd generation)": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-se-3rd-gen-colors.png",
  "iPhone 13 Pro Max": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/2022-spring-iphone13-pro-max-colors.png",
  "iPhone 13 Pro": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/2022-spring-iphone13-pro-colors.png",
  "iPhone 13": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/2022-spring-iphone13-colors.png",
  "iPhone 13 mini": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/2022-iphone13-mini-colors.png",
  "iPhone 12 Pro Max": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-12-pro-max/iphone12-pro-max-colors.jpg",
  "iPhone 12 Pro": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-12-pro/iphone12-pro-colors.jpg",
  "iPhone 12": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/2021-iphone12-colors.png",
  "iPhone 12 mini": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/2021-iphone12-mini-colors.png",
  "iPhone SE (2nd generation)": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-se/iphone-se-2nd-gen-colors.jpg",
  "iPhone 11 Pro": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/identify-iphone-11pro.jpg",
  "iPhone 11 Pro Max": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/identify-iphone-11pro-max.jpg",
  "iPhone 11": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/identify-iphone-11-colors.jpg",
  "iPhone XS": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-xs-colors.jpg",
  "iPhone XS Max": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-xs-max-colors.jpg",
  "iPhone XR": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-xr/identify-iphone-xr-colors.jpg",
  "iPhone X": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-x-colors.jpg",
  "iPhone 8": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-8/iphone-8-colors.jpg",
  "iPhone 8 Plus": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-8-plus/iphone-8plus-colors.jpg"
};

const models = Object.keys(modelImages);

const standardParts = [
  { id: "screen", nameAr: "شاشة", nameEn: "Screen" },
  { id: "battery", nameAr: "بطارية", nameEn: "Battery" },
  { id: "upper_speaker", nameAr: "سماعة علوية", nameEn: "Upper Speaker" },
  { id: "lower_speaker", nameAr: "سماعة سفلية", nameEn: "Lower Speaker" },
  { id: "mic", nameAr: "مايك", nameEn: "Microphone" },
  { id: "front_camera", nameAr: "كاميرا أمامية", nameEn: "Front Camera" },
  { id: "back_cameras", nameAr: "كاميرات خلفية", nameEn: "Back Cameras" },
  { id: "back_glass", nameAr: "ظهر", nameEn: "Back Glass" },
  { id: "flash", nameAr: "فلاش", nameEn: "Flash" },
  { id: "socket", nameAr: "سوكت", nameEn: "Charging Socket" }
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
    {
      id: "orig_batt",
      nameAr: "بطارية أصلية",
      nameEn: "Original Battery",
      price: 1500,
      descAr: "عمر افتراضي طويل وأداء ممتاز وبتجيب رساله قطعه اصليه من apple",
      descEn: "Long battery life, excellent performance, shows genuine Apple part message",
      image: "/WhatsApp Image 2026-11-09 at 8.08.21 PM.jpeg"
    },
    {
      id: "high_batt",
      nameAr: "بطارية سعة عالية",
      nameEn: "High Capacity Battery",
      price: 1300,
      descAr: "أداء أعلى من السعة العادية وبتجيب رساله used داخل الاعدادات",
      descEn: "Higher performance than standard capacity, shows 'used' message in settings",
      image: "/WhatsApp Image 2026-11-09 at 8.08.21 PM.jpeg"
    },
    {
      id: "copy_batt",
      nameAr: "بطارية درجة أولى",
      nameEn: "First Grade Battery",
      price: 900,
      descAr: "اقتصادية وبأداء جيد",
      descEn: "Economical with good performance",
      image: "/WhatsApp Image 2026-11-09 at 8.08.21 PM.jpeg"
    }
  ],
  upper_speaker: [
    {
      id: "orig_usp",
      nameAr: "سماعة أصلية علوية (اذن)",
      nameEn: "Original Upper Speaker (Earpiece)",
      price: 800,
      descAr: "صوت مكالمات نقي وواضح",
      descEn: "Pure and clear call sound",
      image: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=300&auto=format&fit=crop&q=60"
    },
    {
      id: "copy_usp",
      nameAr: "سماعة علوية تجارية",
      nameEn: "Commercial Upper Speaker",
      price: 500,
      descAr: "أداء قياسي",
      descEn: "Standard performance",
      image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&auto=format&fit=crop&q=60"
    }
  ],
  lower_speaker: [
    {
      id: "orig_lsp",
      nameAr: "جرس / سماعة سفلية أصلية",
      nameEn: "Original Lower Speaker / Buzzer",
      price: 900,
      descAr: "صوت موسيقى قوي بدون تشويش",
      descEn: "Strong music sound without distortion",
      image: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=300&auto=format&fit=crop&q=60"
    }
  ],
  mic: [
    {
      id: "orig_mic",
      nameAr: "مايك المكالمات والصوت أصلي",
      nameEn: "Original Microphone",
      price: 700,
      descAr: "نقاء تام في تسجيل الصوت والمكالمات",
      descEn: "Total clarity in audio recording and calls",
      image: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=300&auto=format&fit=crop&q=60"
    }
  ],
  front_camera: [
    {
      id: "orig_fcam",
      nameAr: "كاميرا أمامية أصلية",
      nameEn: "Original Front Camera",
      price: 1400,
      descAr: "وضوح عالي ودعم كامل للـ Face ID",
      descEn: "High clarity and full Face ID support",
      image: "https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?w=300&auto=format&fit=crop&q=60"
    }
  ],
  back_cameras: [
    {
      id: "orig_bcam",
      nameAr: "مجموعة الكاميرات الخلفية أصلية",
      nameEn: "Original Back Cameras Module",
      price: 2200,
      descAr: "تصوير احترافي وبدون مشاكل تركيز",
      descEn: "Professional shooting without focus issues",
      image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=300&auto=format&fit=crop&q=60"
    }
  ],
  back_glass: [
    {
      id: "orig_back",
      nameAr: "ظهر زجاجي أصلي",
      nameEn: "Original Back Glass",
      price: 2200,
      descAr: "مطابق تماماً لظهر المصنع",
      descEn: "Exact match to factory back glass",
      image: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=300&auto=format&fit=crop&q=60"
    },
    {
      id: "copy_back",
      nameAr: "ظهر زجاجي تجاري",
      nameEn: "Commercial Back Glass",
      price: 1300,
      descAr: "خامة جيدة ومظهر أنيق",
      descEn: "Good material and elegant look",
      image: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=300&auto=format&fit=crop&q=60"
    }
  ],
  flash: [
    {
      id: "orig_flash",
      nameAr: "فلاش وكابل الإضاءة أصلي",
      nameEn: "Original Flash & Light Cable",
      price: 600,
      descAr: "إضاءة قوية متوافقة مع النظام",
      descEn: "Strong lighting compatible with system",
      image: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=300&auto=format&fit=crop&q=60"
    }
  ],
  socket: [
    {
      id: "orig_socket",
      nameAr: "سوكت شحن أصلي (فلتر شحن)",
      nameEn: "Original Charging Socket",
      price: 1100,
      descAr: "يدعم الشحن السريع ونقل البيانات",
      descEn: "Supports fast charging and data transfer",
      image: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=300&auto=format&fit=crop&q=60"
    },
    {
      id: "copy_socket",
      nameAr: "سوكت شحن تجاري",
      nameEn: "Commercial Charging Socket",
      price: 650,
      descAr: "شحن عادي وبكفاءة مقبولة",
      descEn: "Normal charging with acceptable efficiency",
      image: "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=300&auto=format&fit=crop&q=60"
    }
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
    otherIssueLabel: "Other Issue (Manual specification)",
    issueDetailsPlaceholder: "Please write details for this issue (Required)...",
    nextStep: "Next",
    confirmOrderBtn: "Confirm Order",
    selectQualityTitle: "Choose Part Type & Quality",
    backButton: "Back",
    fullName: "Full Name",
    phone: "Phone Number",
    whatsappNumber: "WhatsApp Number",
    address: "Full Address",
    notes: "Additional Notes (Optional)",
    namePlaceholder: "Enter your full name",
    phonePlaceholder: "01xxxxxxxxx",
    whatsappPlaceholder: "01xxxxxxxxx (WhatsApp)",
    addressPlaceholder: "City, area, street, building number...",
    notesPlaceholder: "Tell us more about the issue...",
    invoiceTitle: "Order Review & Invoice",
    deliveryLabel: "Delivery",
    deliveryFree: "Free (0 EGP)",
    paymentLabel: "Payment Method",
    cashOnDelivery: "Cash on Delivery",
    successTitle: "Your request has been registered!",
    courierDispatchText: "A courier will be dispatched to pick up your device as soon as possible.",
    customSuccessMessage: "Your inquiry has been received successfully! For faster service, you can send photos and details directly via WhatsApp.",
    fasterWhatsAppTip: "💡 Faster communication: Send us photos of the issue and device details directly on WhatsApp for immediate support.",
    whatsappContactBtn: "Chat via WhatsApp",
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
    otherIssueLabel: "عطل آخر (تحديد العطل يدوياً)",
    issueDetailsPlaceholder: "اكتب تفاصيل هذه المشكلة هنا (مطلوب)...",
    nextStep: "التالي ←",
    confirmOrderBtn: "تأكيد الطلب ←",
    selectQualityTitle: "اختر نوع القطعة المطلوبة",
    backButton: "رجوع",
    fullName: "الاسم بالكامل",
    phone: "رقم الموبايل",
    whatsappNumber: "رقم الواتساب",
    address: "العنوان بالتفصيل",
    notes: "ملاحظات (اختياري)",
    namePlaceholder: "اكتب اسمك",
    phonePlaceholder: "01xxxxxxxxx",
    whatsappPlaceholder: "01xxxxxxxxx (رقم الواتساب)",
    addressPlaceholder: "المحافظة، المنطقة، الشارع، رقم العمارة...",
    notesPlaceholder: "أي تفاصيل إضافية عن العطل",
    invoiceTitle: "فاتورة ومراجعة الطلب",
    deliveryLabel: "التوصيل",
    deliveryFree: "مجاني (0 جنيه)",
    paymentLabel: "طريقة الدفع",
    cashOnDelivery: "نقداً عند الاستلام",
    successTitle: "تم استلام استفسارك بنجاح!",
    courierDispatchText: "سيتم تحرك المندوب في أسرع وقت لاستلام جهازك.",
    customSuccessMessage: "سيتم التواصل مع حضرتك بخصوص العطل الخاص بك.",
    fasterWhatsAppTip: "💡 تواصل أسرع: أرسل لنا صور المشكلة وتفاصيل جهازك مباشرة عبر واتساب لخدمة أسرع وأدق!",
    whatsappContactBtn: "تواصل عبر واتساب",
    orderNumber: "رقم الطلب:",
    approximate: "تقريبًا",
    currency: "جنيه",
    newOrder: "طلب جديد",
    copyright: "جميع الحقوق محفوظة"
  }
};

function DevicePicture({ name, isArabic }) {
  const [failed, setFailed] = useState(false);

  return (
    <span className="ifix-device-image">
      {failed ? (
        <span className="ifix-image-fallback">
          {isArabic ? "الصورة غير متاحة" : "Image unavailable"}
        </span>
      ) : (
        <img
          src={modelImages[name]}
          alt={name}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}

const wizardStyles = `
.ifix-progress{
  display:flex;justify-content:center;gap:24px;list-style:none;
  padding:0;margin:0 auto 24px;max-width:700px;font-family:inherit
}
.ifix-progress li{
  display:flex;align-items:center;gap:8px;color:#737780;
  font-size:14px;font-weight:700
}
.ifix-progress li>span{
  display:grid;place-items:center;width:31px;height:31px;
  border-radius:50%;background:#eeeef0;color:#747780
}
.ifix-progress li.active{color:#111}
.ifix-progress li.active>span{background:#111;color:white}
#order .ifix-wizard{
  width:100%;max-width:1120px;margin:0 auto;
  padding:clamp(18px,4vw,38px);box-sizing:border-box
}
.ifix-step-heading{margin-bottom:26px}
.ifix-step-heading h3{
  font-size:clamp(22px,3vw,30px);line-height:1.4;
  color:#171719;margin:6px 0 8px;font-weight:800
}
.ifix-step-heading p{
  color:#71717a;line-height:1.7;margin:0;font-size:14px
}
.ifix-eyebrow{
  color:#87878e;font-size:11px;font-weight:700;letter-spacing:.08em
}
.ifix-search-label{
  display:block;margin-bottom:24px;font-size:13px;
  font-weight:700;color:#52525b
}
#order .ifix-search,#order .ifix-color-input{
  display:block;width:100%;box-sizing:border-box;
  background:#fafafa;border:1px solid #dedee3;border-radius:12px;
  padding:14px 16px;font:inherit;color:#18181b;
  margin-top:9px;min-height:50px
}
.ifix-device-grid{
  display:grid;grid-template-columns:repeat(4,minmax(0,1fr));
  gap:20px 16px;border:0;margin:0;padding:0;min-width:0
}
.ifix-device-card{
  position:relative;display:flex;flex-direction:column;
  align-items:stretch;min-width:0;border:2px solid transparent;
  background:#fff;border-radius:12px;overflow:hidden;cursor:pointer;
  transition:border-color .15s,box-shadow .15s
}
.ifix-device-card:hover{
  border-color:#d1d1d6;box-shadow:0 4px 18px #00000008
}
.ifix-device-card.selected{border-color:#ff962b}
.ifix-device-card>input{
  position:absolute;width:1px;height:1px;opacity:0;
  margin:0;inset-inline-start:0;top:0
}
.ifix-device-card:focus-within{
  outline:3px solid #2f6ce7;outline-offset:3px
}
.ifix-device-image{
  display:grid;place-items:center;width:100%;height:190px;
  padding:18px 12px;background:#fff;box-sizing:border-box
}
#order .ifix-device-image img{
  display:block;max-width:100%;width:100%;height:100%;
  max-height:154px;object-fit:contain;mix-blend-mode:multiply
}
.ifix-device-name{
  display:block;text-align:center;padding:12px 4px;min-height:46px;
  font-size:13px;font-weight:600;background:#f4f5f7;color:#525b6b
}
.selected .ifix-device-name{background:#ff962b;color:#181818}
.ifix-device-check{
  position:absolute;z-index:1;top:8px;inset-inline-end:8px;
  width:23px;height:23px;border-radius:50%;font-size:14px;
  display:grid;place-items:center;color:#fff;background:transparent
}
.selected .ifix-device-check{background:#111}
.ifix-device-footer{
  display:flex;justify-content:space-between;align-items:center;
  gap:14px;padding-top:22px;margin-top:22px;
  border-top:1px solid #eee;flex-wrap:wrap
}
.ifix-device-footer>div{font-weight:700;color:#404049;font-size:14px}
.ifix-device-footer .black-btn{min-width:150px}
#order button:disabled{opacity:.45;cursor:not-allowed}
.ifix-back{
  display:inline-flex;justify-content:center;align-items:center;
  min-height:46px;padding:11px 23px;background:#fff;color:#34343a;
  border:1px solid #dadade;border-radius:12px;
  font:inherit;cursor:pointer;margin-top:10px
}
.ifix-device-footer .ifix-back{margin-top:0}
#order .ifix-color-card{max-width:650px}
.ifix-color-label{font-weight:700;font-size:15px;display:block}
.ifix-color-help{color:#767680;font-size:13px;margin-top:12px}
.ifix-color-summary{
  display:flex;justify-content:space-between;gap:18px;
  padding:12px 0;margin-bottom:12px;
  border-bottom:1px solid #e4e4e7;overflow-wrap:anywhere
}
.ifix-color-summary span{color:#71717a}
.ifix-color-summary strong{max-width:65%}
.ifix-image-fallback{font-size:12px;color:#767680;text-align:center}
.ifix-sr-only{
  position:absolute;width:1px;height:1px;overflow:hidden;
  clip:rect(0,0,0,0);white-space:nowrap
}
@media(max-width:850px){
  .ifix-device-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
}
@media(max-width:560px){
  .ifix-device-grid{
    grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 10px
  }
  .ifix-device-image{height:150px;padding:15px 7px}
  #order .ifix-device-image img{max-height:120px}
  .ifix-device-name{font-size:11px;padding:11px 3px}
  .ifix-progress{gap:14px}
  .ifix-progress li{font-size:12px;gap:6px}
  .ifix-device-footer .black-btn{min-width:120px}
}
@media(prefers-reduced-motion:reduce){
  .ifix-device-card{transition:none}
}
`;

export default function App() {
  const [language, setLanguage] = useState(() => {
    try {
      return localStorage.getItem("ifix-language") === "ar" ? "ar" : "en";
    } catch {
      return "en";
    }
  });

  const [model, setModel] = useState("");
  const [selectedParts, setSelectedParts] = useState([]);
  const [partSelections, setPartSelections] = useState({});
  const [partNotes, setPartNotes] = useState({});
  const [step, setStep] = useState("device");
  const [devicePickerOpen, setDevicePickerOpen] = useState(false);
  const [modelSearch, setModelSearch] = useState("");
  const [deviceColor, setDeviceColor] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderNo, setOrderNo] = useState("");

  const [details, setDetails] = useState({
    name: "",
    phone: "",
    whatsapp: "",
    address: "",
    notes: ""
  });

  const submitLock = useRef(false);
  const wizardRef = useRef(null);

  const t = translations[language];
  const isArabic = language === "ar";

  useEffect(() => {
    if (step !== "device") {
      wizardRef.current?.scrollIntoView({
        block: "start",
        behavior: "auto"
      });
    }
  }, [step]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isArabic ? "rtl" : "ltr";

    try {
      localStorage.setItem("ifix-language", language);
    } catch {}
  }, [language, isArabic]);

  const isOnlyCustomIssue = useMemo(() => {
    return selectedParts.length === 1 && selectedParts[0] === "other";
  }, [selectedParts]);

  const totalPrice = useMemo(() => {
    if (isOnlyCustomIssue || selectedParts.length === 0) return 0;

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
  }, [selectedParts, partSelections, isOnlyCustomIssue]);

  function updateDetails(e) {
    setDetails({
      ...details,
      [e.target.name]: e.target.value
    });
  }

  async function submitOrder(e) {
    e.preventDefault();

    if (submitLock.current) return;

    if (!model || !deviceColor.trim() || selectedParts.length === 0) {
      setStep(
        !model
          ? "device"
          : selectedParts.length === 0
            ? "choose"
            : "color"
      );
      return;
    }

    submitLock.current = true;
    setSubmitting(true);

    const generatedOrderNo =
      "IFX-" + Math.floor(100000 + Math.random() * 900000);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          orderNo: generatedOrderNo,
          model,
          selectedParts,
          partNotes,
          totalPrice,
          details: {
            ...details,
            deviceColor: deviceColor.trim(),
            notes: [
              (isArabic ? "لون الجهاز: " : "Device color: ") +
                deviceColor.trim(),
              details.notes.trim()
            ]
              .filter(Boolean)
              .join("\n")
          }
        })
      });

      const data = await response.json();

      if (!response.ok || data.success !== true) {
        throw new Error(data.error || "Order saving failed");
      }

      setOrderNo(generatedOrderNo);
      setStep(isOnlyCustomIssue ? "customDone" : "done");
    } catch (error) {
      console.error("Error submitting order:", error);

      alert(
        "لم نتمكن من تأكيد حفظ الطلب. احتفظ ببياناتك وتواصل معنا للتأكد قبل إعادة الإرسال."
      );
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }

  function toggleLanguage() {
    setLanguage(current => current === "en" ? "ar" : "en");
  }

  function resetOrder() {
    setStep("device");
    setDeviceColor("");
    setDevicePickerOpen(false);
    setModelSearch("");
    setModel("");
    setSelectedParts([]);
    setPartNotes({});
    setPartSelections({});
    setOrderNo("");
    setDetails({
      name: "",
      phone: "",
      whatsapp: "",
      address: "",
      notes: ""
    });
  }

  const formatPrice = value => value.toLocaleString("en-US");

  return (
    <main dir={isArabic ? "rtl" : "ltr"}>
      <style>{wizardStyles}</style>

      <header className="header">
        <a className="logo" href="#top">
          <b>i</b> Fix
        </a>

        <nav>
          <a href="#services">{t.navServices}</a>
          <a href="#how">{t.navHow}</a>
          <a href="#order">{t.navOrder}</a>
        </nav>

        <div className="header-actions">
          <button
            type="button"
            className="language-toggle"
            onClick={toggleLanguage}
          >
            {t.languageButton}
          </button>

          <a className="header-btn" href="#order">
            {t.startNow}
          </a>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <span className="pill">{t.heroPill}</span>

          <h1>
            <span className="english">
  {isArabic ? "صيانة الآيفون" : "iPhone Repair"}
</span>
            <br />
            {t.heroTitle}
          </h1>

          <p>{t.heroDescription}</p>

          <a className="black-btn" href="#order">
            {t.startNow} <span>←</span>
          </a>

          <div className="trust">
            <span>✓ {t.trusted}</span>
            <i></i>
            <span>✓ {t.doorstep}</span>
          </div>
        </div>

       <RepairComparison isArabic={isArabic} />
      </section>

      <section
        className="order-section"
        id="order"
        ref={wizardRef}
        style={{ scrollMarginTop: 24 }}
      >
        <div className="section-title">
          {step !== "done" &&
            step !== "review" &&
            step !== "customDone" && (
              <>
                <span className="pill">🛡️ {t.orderPill}</span>

                <h2
                  style={{
                    fontSize: "2rem",
                    fontWeight: 900,
                    color: "#16a34a",
                    lineHeight: "1.3",
                    marginBottom: "10px"
                  }}
                >
                  {t.bannerText}
                </h2>

                <p>{t.orderDescription}</p>
              </>
            )}
        </div>

        {["device", "choose", "color"].includes(step) && (
          <ol
            className="ifix-progress"
            aria-label={
              isArabic ? "خطوات اختيار الجهاز" : "Device selection steps"
            }
          >
            {[
              ["device", isArabic ? "الجهاز" : "Device"],
              ["choose", isArabic ? "الأعطال" : "Repairs"],
              ["color", isArabic ? "اللون" : "Color"]
            ].map(([key, label], index) => (
              <li
                key={key}
                className={step === key ? "active" : ""}
                aria-current={step === key ? "step" : undefined}
              >
                <span>{index + 1}</span>
                {label}
              </li>
            ))}
          </ol>
        )}

        {/* الخطوة الأولى: اختيار الجهاز */}
        {step === "device" && (
          <div className="card ifix-wizard">
            <div className="ifix-step-heading">
              <span className="ifix-eyebrow">
                {isArabic ? "الخطوة ١ / ٣" : "STEP 1 / 3"}
              </span>

              <h3>{isArabic ? "اختر جهازك" : "Choose your device"}</h3>

              <p>
                {isArabic
                  ? "اختار موديل آيفون واحد عشان نكمّل طلب الصيانة."
                  : "Select one iPhone model to start your repair request."}
              </p>
            </div>

            {!devicePickerOpen ? (
              <button
                type="button"
                className="black-btn full"
                onClick={() => setDevicePickerOpen(true)}
              >
                {isArabic ? "اختر جهازك" : "Choose your device"}
              </button>
            ) : (
              <>
                <label className="ifix-search-label">
                  <span>
                    {isArabic ? "ابحث عن موديل جهازك" : "Find your model"}
                  </span>

                  <input
                    className="ifix-search"
                    type="search"
                    placeholder={
                      isArabic ? "مثال: iPhone 13 Pro" : "e.g. iPhone 13 Pro"
                    }
                    value={modelSearch}
                    onChange={e => setModelSearch(e.target.value)}
                  />
                </label>

                <fieldset className="ifix-device-grid">
                  <legend className="ifix-sr-only">
                    {isArabic ? "اختار موديل واحد" : "Select one model"}
                  </legend>

                  {models
                    .filter(m =>
                      m.toLowerCase().includes(modelSearch.trim().toLowerCase())
                    )
                    .map(m => (
                      <label
                        key={m}
                        className={`ifix-device-card ${
                          model === m ? "selected" : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="iphone-model"
                          value={m}
                          checked={model === m}
                          onChange={() => setModel(m)}
                        />

                        <span className="ifix-device-check" aria-hidden="true">
                          {model === m ? "✓" : ""}
                        </span>

                        <DevicePicture name={m} isArabic={isArabic} />

                        <span className="ifix-device-name" dir="ltr">
  {m}
</span>

{model === m && (
  <button
    type="button"
    className="black-btn"
    style={{
      margin: "10px",
      width: "calc(100% - 20px)",
      minHeight: "44px",
      padding: "10px 12px",
      borderRadius: "10px",
      fontSize: "13px"
    }}
    onClick={event => {
      event.preventDefault();
      event.stopPropagation();
      setStep("choose");
    }}
  >
    {isArabic ? "التالي ←" : "Next →"}
  </button>
)}
                      </label>
                    ))}
                </fieldset>

                {!models.some(m =>
                  m.toLowerCase().includes(modelSearch.trim().toLowerCase())
                ) && (
                  <p role="status">
                    {isArabic
                      ? "لا يوجد موديل مطابق. جرّب اسمًا آخر."
                      : "No matching model. Try another name."}
                  </p>
                )}

                <div className="ifix-device-footer">
                  <div role="status">
                    {model ||
                      (isArabic
                        ? "لم تختَر جهازًا بعد"
                        : "No device selected")}
                  </div>

                  <button
                    type="button"
                    className="black-btn"
                    disabled={!model}
                    onClick={() => setStep("choose")}
                  >
                    {t.nextStep}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* الخطوة الثانية: اختيار الأعطال */}
        {step === "choose" && (
          <div className="card ifix-wizard">
            <div className="ifix-step-heading">
              <span className="ifix-eyebrow">
                {isArabic ? "الخطوة ٢ / ٣" : "STEP 2 / 3"}
              </span>

              <h3>
                {isArabic
                  ? "اختر القطع أو الأعطال المطلوبة"
                  : "Choose parts or repairs"}
              </h3>

              <p dir="ltr">{model}</p>
            </div>

            <div style={{ marginTop: "20px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.95rem",
                  fontWeight: "bold",
                  marginBottom: "12px"
                }}
              >
                {t.selectPartsLabel}
              </label>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "10px",
                  marginBottom: "16px"
                }}
              >
                {standardParts.map(p => {
                  const isChecked = selectedParts.includes(p.id);

                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        if (isChecked) {
                          setSelectedParts(
                            selectedParts.filter(id => id !== p.id)
                          );
                        } else {
                          setSelectedParts([...selectedParts, p.id]);
                        }
                      }}
                      style={{
                        padding: "12px 14px",
                        border: isChecked
                          ? "2px solid black"
                          : "1px solid #e4e4e7",
                        borderRadius: "12px",
                        backgroundColor: isChecked ? "#f4f4f5" : "#fff",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        style={{
                          width: "18px",
                          height: "18px",
                          accentColor: "#000",
                          cursor: "pointer"
                        }}
                      />

                      <span
                        style={{
                          fontSize: "0.9rem",
                          fontWeight: isChecked ? "bold" : "normal",
                          color: "#111"
                        }}
                      >
                        {isArabic ? p.nameAr : p.nameEn}
                      </span>
                    </div>
                  );
                })}
              </div>

              {(() => {
                const isCheckedOther = selectedParts.includes("other");

                return (
                  <div
                    onClick={() => {
                      if (isCheckedOther) {
                        setSelectedParts(
                          selectedParts.filter(id => id !== "other")
                        );
                      } else {
                        setSelectedParts([...selectedParts, "other"]);
                      }
                    }}
                    style={{
                      padding: "12px 14px",
                      border: isCheckedOther
                        ? "2px solid black"
                        : "1px solid #e4e4e7",
                      borderRadius: "12px",
                      backgroundColor: isCheckedOther ? "#f4f4f5" : "#fff",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      transition: "all 0.2s ease",
                      width: "100%"
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isCheckedOther}
                      onChange={() => {}}
                      style={{
                        width: "18px",
                        height: "18px",
                        accentColor: "#000",
                        cursor: "pointer"
                      }}
                    />

                    <span
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: isCheckedOther ? "bold" : "normal",
                        color: "#111"
                      }}
                    >
                      {t.otherIssueLabel}
                    </span>
                  </div>
                );
              })()}
            </div>

            {selectedParts.length > 0 && (
              <div style={{ marginTop: "20px" }}>
                <h4
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 800,
                    marginBottom: "10px"
                  }}
                >
                  {isArabic
                    ? "تفاصيل الأعطال المختارة (إلزامي):"
                    : "Selected Issues Details (Required):"}
                </h4>

                {selectedParts.map(partId => {
                  const pObj = standardParts.find(item => item.id === partId);
                  const partName =
                    partId === "other"
                      ? t.otherIssueLabel
                      : isArabic
                        ? pObj?.nameAr
                        : pObj?.nameEn;

                  return (
                    <div
                      key={partId}
                      style={{
                        marginBottom: "12px",
                        backgroundColor: "#fafafa",
                        padding: "12px",
                        borderRadius: "10px",
                        border: "1px solid #e4e4e7"
                      }}
                    >
                      <label
                        style={{
                          display: "block",
                          fontSize: "0.85rem",
                          fontWeight: "bold",
                          marginBottom: "6px",
                          color: "#333"
                        }}
                      >
                        ✏️ {isArabic ? "تفاصيل عطل:" : "Issue details for:"}{" "}
                        <span style={{ color: "#16a34a" }}>{partName}</span>
                      </label>

                      <textarea
                        value={partNotes[partId] || ""}
                        onChange={e =>
                          setPartNotes({
                            ...partNotes,
                            [partId]: e.target.value
                          })
                        }
                        rows="2"
                        placeholder={t.issueDetailsPlaceholder}
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          borderRadius: "8px",
                          border: "1px solid #ccc",
                          fontSize: "0.85rem"
                        }}
                        required
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              className="black-btn full"
              style={{ marginTop: "20px" }}
              onClick={() => {
                if (!model) {
                  alert(
                    isArabic
                      ? "برجاء اختيار موديل الآيفون أولاً"
                      : "Please select your iPhone model first"
                  );
                  return;
                }

                if (selectedParts.length === 0) {
                  alert(
                    isArabic
                      ? "برجاء اختيار عطل واحد على الأقل"
                      : "Please select at least one repair part"
                  );
                  return;
                }

                for (const partId of selectedParts) {
                  if (!partNotes[partId] || !partNotes[partId].trim()) {
                    const pObj = standardParts.find(
                      item => item.id === partId
                    );

                    const name =
                      partId === "other"
                        ? isArabic
                          ? "عطل آخر"
                          : "Other Issue"
                        : isArabic
                          ? pObj?.nameAr
                          : pObj?.nameEn;

                    alert(
                      isArabic
                        ? `برجاء كتابة تفاصيل العطل لقطعة: ${name}`
                        : `Please enter details for: ${name}`
                    );
                    return;
                  }
                }

                setStep(isOnlyCustomIssue ? "color" : "selectQuality");
              }}
            >
              {isOnlyCustomIssue
  ? (isArabic ? "التالي: لون الجهاز ←" : "Next: device color →")
  : (isArabic ? "التالي: نوع القطعة ←" : "Next: part quality →")}
            </button>

            <button
              type="button"
              className="ifix-back"
              onClick={() => setStep("device")}
            >
              {t.backButton}
            </button>
          </div>
        )}

        {/* الخطوة الثالثة: لون الجهاز */}
        {step === "color" && (
          <form
            className="card ifix-wizard ifix-color-card"
            onSubmit={e => {
              e.preventDefault();

              if (!deviceColor.trim()) return;

              setDeviceColor(deviceColor.trim());
              setStep("details");
            }}
          >
            <div className="ifix-step-heading">
              <span className="ifix-eyebrow">
                {isArabic ? "الخطوة ٣ / ٣" : "STEP 3 / 3"}
              </span>

              <h3>
                {isArabic ? "ما لون جهازك؟" : "What color is your device?"}
              </h3>

              <p dir="ltr">{model}</p>
            </div>

            <label className="ifix-color-label" htmlFor="device-color">
              {isArabic ? "اكتب لون الجهاز" : "Enter your device color"}
            </label>

            <input
              id="device-color"
              className="ifix-color-input"
              value={deviceColor}
              onChange={e => setDeviceColor(e.target.value)}
              required
              maxLength={60}
              placeholder={
                isArabic
                  ? "مثال: أسود، أبيض، أزرق…"
                  : "e.g. Black, White, Blue…"
              }
            />

            <p className="ifix-color-help">
              {isArabic
                ? "اكتب لون الموبايل نفسه، مش لون الجراب."
                : "Enter the phone’s color, not the case color."}
            </p>

            <div className="ifix-device-footer">
  <button
    type="button"
    className="ifix-back"
    onClick={() =>
      setStep(isOnlyCustomIssue ? "choose" : "selectQuality")
    }
  >
    {t.backButton}
  </button>

  <button
    className="black-btn"
    type="submit"
    disabled={!deviceColor.trim()}
  >
    {t.nextStep}
  </button>
</div>
          </form>
        )}

        {/* اختيار نوع القطعة والجودة */}
        {step === "selectQuality" && (
          <div className="card">
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <h3
                style={{
                  fontSize: "1.3rem",
                  fontWeight: 800,
                  marginBottom: "6px"
                }}
              >
                {t.selectQualityTitle}
              </h3>

              <p style={{ fontSize: "0.85rem", color: "#666" }}>
                {model}
              </p>
            </div>

            {selectedParts.map(partId => {
              if (partId === "other") return null;

              const partObj = standardParts.find(p => p.id === partId);
              const options = partSubOptions[partId] || [];
              const currentSelectedIndex = partSelections[partId] || 0;

              return (
                <div
                  key={partId}
                  style={{
                    marginBottom: "24px",
                    borderBottom: "1px solid #eee",
                    paddingBottom: "16px"
                  }}
                >
                  <h4
                    style={{
                      fontSize: "1.05rem",
                      fontWeight: 800,
                      marginBottom: "4px",
                      color: "#111"
                    }}
                  >
                    ⚙️ {isArabic ? partObj?.nameAr : partObj?.nameEn}
                  </h4>

                  <p
                    style={{
                      fontSize: "0.8rem",
                      color: "#666",
                      marginBottom: "12px"
                    }}
                  >
                    <strong>
                      {isArabic ? "التفاصيل:" : "Details:"}
                    </strong>{" "}
                    {partNotes[partId]}
                  </p>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(240px, 1fr))",
                      gap: "16px"
                    }}
                  >
                    {options.map((opt, idx) => {
                      const isSelected = currentSelectedIndex === idx;

                      return (
                        <div
                          key={opt.id}
                          onClick={() =>
                            setPartSelections({
                              ...partSelections,
                              [partId]: idx
                            })
                          }
                          style={{
                            border: isSelected
                              ? "2px solid black"
                              : "1px solid #e4e4e7",
                            borderRadius: "16px",
                            padding: "16px",
                            cursor: "pointer",
                            backgroundColor: isSelected ? "#fafafa" : "#fff",
                            transition: "all 0.2s ease",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            alignItems: "center",
                            textAlign: "center"
                          }}
                        >
                          <div
                            style={{
                              width: "100%",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: "12px"
                            }}
                          >
                            <span
                              style={{ width: "20px", height: "20px" }}
                            ></span>

                            <img
                              src={opt.image}
                              alt={isArabic ? opt.nameAr : opt.nameEn}
                              style={{
                                width: "120px",
                                height: "130px",
                                objectFit: "cover",
                                borderRadius: "12px",
                                border: "1px solid #e4e4e7",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.06)"
                              }}
                            />

                            <span
                              style={{
                                width: "20px",
                                height: "20px",
                                borderRadius: "50%",
                                border: isSelected
                                  ? "6px solid black"
                                  : "2px solid #ccc",
                                display: "inline-block"
                              }}
                            ></span>
                          </div>

                          <h5
                            style={{
                              fontSize: "1rem",
                              fontWeight: 700,
                              marginBottom: "6px",
                              color: "#111"
                            }}
                          >
                            {isArabic ? opt.nameAr : opt.nameEn}
                          </h5>

                          <p
                            style={{
                              fontSize: "0.75rem",
                              color: "#666",
                              marginBottom: "14px",
                              minHeight: "32px"
                            }}
                          >
                            {isArabic ? opt.descAr : opt.descEn}
                          </p>

                          <div
                            style={{
                              fontSize: "1.2rem",
                              fontWeight: 900,
                              color: "#000",
                              width: "100%",
                              borderTop: "1px solid #f0f0f0",
                              paddingTop: "10px"
                            }}
                          >
                            {formatPrice(opt.price)} {t.currency}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div
              style={{
                display: "flex",
                gap: "10px",
                marginTop: "20px"
              }}
            >
              <button
  type="button"
  className="light-btn"
  onClick={() => setStep("choose")}
>
  {t.backButton}
</button>

<button
  type="button"
  className="black-btn full"
  onClick={() => setStep("color")}
>
  {isArabic ? "التالي: لون الجهاز ←" : "Next: device color →"}
</button>
            </div>
          </div>
        )}

        {/* بيانات العميل */}
        {step === "details" && (
          <form
            className="card"
            onSubmit={e => {
              e.preventDefault();

              if (isOnlyCustomIssue) {
                submitOrder(e);
              } else {
                setStep("review");
              }
            }}
          >
            <div className="fields">
              <label>
                👤 {t.fullName}
                <input
                  name="name"
                  value={details.name}
                  onChange={updateDetails}
                  required
                  placeholder={t.namePlaceholder}
                />
              </label>

              <label>
                📞 {t.phone}
                <input
                  name="phone"
                  value={details.phone}
                  onChange={updateDetails}
                  required
                  type="tel"
                  placeholder={t.phonePlaceholder}
                  pattern="[0-9+ ]{8,16}"
                />
              </label>

              <label className="wide">
                💬 {t.whatsappNumber}
                <input
                  name="whatsapp"
                  value={details.whatsapp}
                  onChange={updateDetails}
                  required
                  type="tel"
                  placeholder={t.whatsappPlaceholder}
                  pattern="[0-9+ ]{8,16}"
                />
              </label>

              {!isOnlyCustomIssue && (
                <label className="wide">
                  📍 {t.address}
                  <textarea
                    name="address"
                    value={details.address}
                    onChange={updateDetails}
                    required
                    rows="2"
                    placeholder={t.addressPlaceholder}
                  />
                </label>
              )}

              <label className="wide">
                📝 {t.notes}
                <textarea
                  name="notes"
                  value={details.notes}
                  onChange={updateDetails}
                  rows="2"
                  placeholder={t.notesPlaceholder}
                />
              </label>
            </div>

            <div className="actions" style={{ marginTop: "20px" }}>
              <button
                type="button"
                className="light-btn"
                onClick={() => setStep("color")}
              >
                {t.backButton}
              </button>

              <button
                className="black-btn"
                type="submit"
                disabled={submitting}
              >
                {submitting
                  ? isArabic
                    ? "جاري إرسال الطلب…"
                    : "Sending…"
                  : t.nextStep}
              </button>
            </div>

            <small className="disclaimer">
              {isArabic
                ? "تُستخدم بياناتك للتواصل معك بشأن طلب الصيانة."
                : "Your details are used to contact you about your repair request."}
            </small>
          </form>
        )}

        {/* مراجعة الطلب والفاتورة */}
        {step === "review" && (
          <form
            className="card"
            onSubmit={submitOrder}
            style={{
              maxWidth: "650px",
              margin: "0 auto",
              padding: "30px"
            }}
          >
            <div
              style={{
                textAlign: "center",
                marginBottom: "24px",
                borderBottom: "2px solid #f0f0f0",
                paddingBottom: "16px"
              }}
            >
              <h3
                style={{
                  fontSize: "1.4rem",
                  fontWeight: 900,
                  color: "#111",
                  marginBottom: "4px"
                }}
              >
                {t.invoiceTitle}
              </h3>

              <p style={{ fontSize: "0.85rem", color: "#71717a" }}>
                iFix Repair Invoice & Summary
              </p>
            </div>

            <div
              style={{
                backgroundColor: "#fafafa",
                border: "1px solid #e4e4e7",
                borderRadius: "16px",
                padding: "20px",
                marginBottom: "20px"
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                  borderBottom: "1px solid #e4e4e7",
                  paddingBottom: "12px"
                }}
              >
                <span
                  style={{
                    fontSize: "0.9rem",
                    color: "#71717a",
                    fontWeight: "bold"
                  }}
                >
                  {isArabic ? "الموديل الأساسي" : "Device Model"}
                </span>

                <span
                  style={{
                    fontSize: "1.05rem",
                    fontWeight: 900,
                    color: "#111"
                  }}
                >
                  {model}
                </span>
              </div>

              <div className="ifix-color-summary">
                <span>{isArabic ? "لون الجهاز" : "Device color"}</span>
                <strong>{deviceColor}</strong>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <span
                  style={{
                    fontSize: "0.85rem",
                    color: "#71717a",
                    fontWeight: "bold",
                    display: "block",
                    marginBottom: "10px"
                  }}
                >
                  {isArabic
                    ? "قطع الغيار المطلوبة:"
                    : "Selected Parts & Repairs:"}
                </span>

                {selectedParts.map(partId => {
                  if (partId === "other") {
                    return (
                      <div
                        key="other"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 0",
                          borderBottom: "1px dashed #e4e4e7"
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.95rem",
                            fontWeight: "bold",
                            color: "#111"
                          }}
                        >
                          {t.otherIssueLabel} ({partNotes.other})
                        </span>

                        <span
                          style={{ fontSize: "0.9rem", color: "#666" }}
                        >
                          {isArabic ? "يحدد بعد الفحص" : "Inspection"}
                        </span>
                      </div>
                    );
                  }

                  const pObj = standardParts.find(
                    item => item.id === partId
                  );
                  const options = partSubOptions[partId] || [];
                  const selectedIndex = partSelections[partId] || 0;
                  const opt = options[selectedIndex] || options[0];

                  return (
                    <div
                      key={partId}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 0",
                        borderBottom: "1px dashed #e4e4e7"
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "2px"
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.95rem",
                            fontWeight: "bold",
                            color: "#111"
                          }}
                        >
                          {isArabic ? pObj?.nameAr : pObj?.nameEn}
                        </span>

                        <span
                          style={{ fontSize: "0.78rem", color: "#666" }}
                        >
                          ({isArabic ? opt.nameAr : opt.nameEn})
                        </span>
                      </div>

                      <span
                        style={{
                          fontSize: "1rem",
                          fontWeight: 900,
                          color: "#111"
                        }}
                      >
                        {formatPrice(opt.price)} {t.currency}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 0",
                  borderBottom: "1px solid #e4e4e7"
                }}
              >
                <span
                  style={{
                    fontSize: "0.9rem",
                    color: "#16a34a",
                    fontWeight: "bold"
                  }}
                >
                  🚚 {t.deliveryLabel}
                </span>

                <span
                  style={{
                    fontSize: "0.9rem",
                    color: "#16a34a",
                    fontWeight: "bold"
                  }}
                >
                  {t.deliveryFree}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "16px",
                  paddingTop: "12px",
                  borderTop: "2px solid #111"
                }}
              >
                <span
                  style={{
                    fontSize: "1rem",
                    fontWeight: 900,
                    color: "#111"
                  }}
                >
                  {isArabic ? "الإجمالي النهائي" : "Total Amount"}
                </span>

                <span
                  style={{
                    fontSize: "1.4rem",
                    fontWeight: 900,
                    color: "#16a34a"
                  }}
                >
                  {formatPrice(totalPrice)} {t.currency}
                </span>
              </div>
            </div>

            <div
              style={{
                padding: "16px",
                border: "1px solid #e4e4e7",
                borderRadius: "14px",
                backgroundColor: "#fff",
                marginBottom: "24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "0.78rem",
                    color: "#71717a",
                    display: "block",
                    marginBottom: "2px"
                  }}
                >
                  💳 {t.paymentLabel}
                </span>

                <span
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: "bold",
                    color: "#111"
                  }}
                >
                  {t.cashOnDelivery}
                </span>
              </div>

              <span style={{ fontSize: "1.2rem" }}>💵</span>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="button"
                className="light-btn"
                style={{
                  flex: 1,
                  padding: "14px",
                  borderRadius: "12px",
                  border: "1px solid #ccc",
                  backgroundColor: "#fff",
                  cursor: "pointer",
                  fontWeight: "bold"
                }}
                onClick={() => setStep("details")}
              >
                {t.backButton}
              </button>

              <button
                className="black-btn"
                type="submit"
                disabled={submitting}
                style={{
                  flex: 2,
                  padding: "14px",
                  borderRadius: "12px",
                  backgroundColor: "#000",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: "bold",
                  border: "none"
                }}
              >
                {submitting
                  ? isArabic
                    ? "جاري إرسال الطلب…"
                    : "Sending…"
                  : t.confirmOrderBtn}
              </button>
            </div>
          </form>
        )}

        {/* نجاح الطلب */}
        {step === "done" && (
          <div
            className="card done"
            style={{
              textAlign: "center",
              maxWidth: "550px",
              margin: "0 auto",
              padding: "40px 20px"
            }}
          >
            <b
              className="check"
              style={{
                fontSize: "2.5rem",
                display: "inline-block",
                marginBottom: "10px"
              }}
            >
              ✓
            </b>

            <h3
              style={{
                fontSize: "1.6rem",
                fontWeight: 900,
                marginBottom: "10px",
                color: "#111"
              }}
            >
              {t.successTitle}
            </h3>

            <p
              style={{
                fontSize: "1rem",
                fontWeight: "bold",
                color: "#16a34a",
                margin: "10px 0 20px",
                lineHeight: "1.6"
              }}
            >
              {t.courierDispatchText}
            </p>

            <div
              style={{
                backgroundColor: "#f4f4f5",
                padding: "16px",
                borderRadius: "14px",
                margin: "20px 0",
                textAlign: "right",
                display: "flex",
                flexDirection: "column",
                gap: "8px"
              }}
            >
              <div
                style={{ display: "flex", justifyContent: "space-between" }}
              >
                <span style={{ color: "#71717a", fontSize: "0.85rem" }}>
                  {t.orderNumber}
                </span>
                <strong style={{ color: "#111" }}>{orderNo}</strong>
              </div>

              <div
                style={{ display: "flex", justifyContent: "space-between" }}
              >
                <span style={{ color: "#71717a", fontSize: "0.85rem" }}>
                  {isArabic ? "العميل:" : "Customer:"}
                </span>
                <strong style={{ color: "#111" }}>{details.name}</strong>
              </div>

              <div
                style={{ display: "flex", justifyContent: "space-between" }}
              >
                <span style={{ color: "#71717a", fontSize: "0.85rem" }}>
                  {isArabic ? "الهاتف:" : "Phone:"}
                </span>
                <strong style={{ color: "#111" }}>{details.phone}</strong>
              </div>

              <div
                style={{ display: "flex", justifyContent: "space-between" }}
              >
                <span style={{ color: "#71717a", fontSize: "0.85rem" }}>
                  {isArabic ? "واتساب:" : "WhatsApp:"}
                </span>
                <strong style={{ color: "#111" }}>
                  {details.whatsapp}
                </strong>
              </div>

              <div
                style={{ display: "flex", justifyContent: "space-between" }}
              >
                <span style={{ color: "#71717a", fontSize: "0.85rem" }}>
                  {isArabic ? "الموديل:" : "Model:"}
                </span>
                <strong style={{ color: "#111" }}>{model}</strong>
              </div>

              <div className="ifix-color-summary">
                <span>{isArabic ? "لون الجهاز" : "Device color"}</span>
                <strong>{deviceColor}</strong>
              </div>
            </div>

            <div
              style={{
                fontSize: "1.2rem",
                fontWeight: 900,
                marginBottom: "24px",
                color: "#111"
              }}
            >
              {formatPrice(totalPrice)} {t.currency}{" "}
              <span
                style={{
                  fontSize: "0.85rem",
                  color: "#666",
                  fontWeight: "normal"
                }}
              >
                ({t.approximate})
              </span>
            </div>

            <button
              type="button"
              className="black-btn full"
              style={{
                padding: "14px",
                borderRadius: "12px",
                backgroundColor: "#000",
                color: "#fff",
                fontWeight: "bold",
                border: "none",
                cursor: "pointer"
              }}
              onClick={resetOrder}
            >
              {t.newOrder}
            </button>
          </div>
        )}

        {/* نجاح تسجيل عطل آخر */}
        {step === "customDone" && (
          <div
            className="card done"
            style={{
              textAlign: "center",
              maxWidth: "550px",
              margin: "0 auto",
              padding: "40px 20px"
            }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>
              💬
            </div>

            <h3
              style={{
                fontSize: "1.5rem",
                fontWeight: 900,
                marginBottom: "10px",
                color: "#111"
              }}
            >
              {t.successTitle}
            </h3>

            <p
              style={{
                fontSize: "0.95rem",
                color: "#444",
                margin: "0 auto 16px",
                lineHeight: "1.6",
                maxWidth: "440px"
              }}
            >
              {t.customSuccessMessage}
            </p>

            <div
              style={{
                backgroundColor: "#f0fdf4",
                border: "1px solid #bbf7d0",
                padding: "12px 16px",
                borderRadius: "12px",
                marginBottom: "22px",
                fontSize: "0.9rem",
                color: "#166534",
                lineHeight: "1.5",
                textAlign: "center"
              }}
            >
              {t.fasterWhatsAppTip}
            </div>

            <a
              href={`https://wa.me/${myWhatsAppNumber}?text=${encodeURIComponent(
                isArabic
                  ? `مرحباً، أنا ${details.name} (رقمي: ${details.phone} - واتساب: ${details.whatsapp})، وموديل جهازي ${model} ولونه ${deviceColor} وعطل جهازي هو: ${partNotes.other}`
                  : `Hello, I am ${details.name} (Phone: ${details.phone} - WA: ${details.whatsapp}), my device is ${model}, color: ${deviceColor}, and issue is: ${partNotes.other}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                backgroundColor: "#25D366",
                color: "#fff",
                padding: "14px 28px",
                borderRadius: "50px",
                fontSize: "1.05rem",
                fontWeight: "bold",
                textDecoration: "none",
                boxShadow: "0 4px 14px rgba(37,211,102,0.4)",
                transition: "all 0.2s ease",
                marginBottom: "24px"
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>

              {t.whatsappContactBtn}
            </a>

            <div style={{ display: "block" }}>
              <button
                type="button"
                className="light-btn"
                style={{
                  padding: "10px 20px",
                  borderRadius: "10px",
                  border: "1px solid #ccc",
                  backgroundColor: "#fff",
                  cursor: "pointer",
                  fontWeight: "bold"
                }}
                onClick={resetOrder}
              >
                {t.newOrder}
              </button>
            </div>
          </div>
        )}
      </section>

      <footer>
        <a className="logo" href="#top">
          <b>i</b> Fix
        </a>

        <span>
          © {new Date().getFullYear()} iFix — {t.copyright}
        </span>
      </footer>
    </main>
  );
}