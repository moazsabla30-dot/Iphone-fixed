import app from './index.js';
import mongoose from 'mongoose';
import { createHash, timingSafeEqual } from 'node:crypto';

// ---------- حماية لوحة الإدارة ----------

function matches(a, b) {
  const hash = value =>
    createHash('sha256').update(String(value)).digest();

  return timingSafeEqual(hash(a), hash(b));
}

function adminOnly(req, res, next) {
  res.set('Cache-Control', 'no-store');
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('Referrer-Policy', 'no-referrer');

  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    return res.status(503).send(
      'Admin login is not configured.'
    );
  }

  const authorization = req.headers.authorization || '';
  let suppliedUser = '';
  let suppliedPassword = '';

  if (authorization.startsWith('Basic ')) {
    const decoded = Buffer.from(
      authorization.slice(6),
      'base64'
    ).toString('utf8');

    const separator = decoded.indexOf(':');

    if (separator !== -1) {
      suppliedUser = decoded.slice(0, separator);
      suppliedPassword = decoded.slice(separator + 1);
    }
  }

  const validUser = matches(suppliedUser, username);
  const validPassword = matches(suppliedPassword, password);

  if (!validUser || !validPassword) {
    res.set(
      'WWW-Authenticate',
      'Basic realm="iFix Admin"'
    );
    return res.status(401).send('Login required.');
  }

  next();
}

// منع مواقع أخرى من إرسال أوامر حذف باستخدام جلسة المتصفح
function requireSameOrigin(req, res, next) {
  try {
    const origin = new URL(req.headers.origin || '');
    const host = req.headers.host;

    if (
      origin.protocol !== 'https:' ||
      origin.host !== host ||
      req.get('X-Admin-Action') !== 'delete-orders'
    ) {
      return res.status(403).json({
        success: false,
        error: 'عملية غير مسموح بها.'
      });
    }
  } catch {
    return res.status(403).json({
      success: false,
      error: 'تعذر التحقق من مصدر الطلب.'
    });
  }

  next();
}

// ---------- الاتصال بقاعدة البيانات ----------

let connectionPromise;

async function connectDatabase() {
  if (mongoose.connection.readyState === 1) return;

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(
      process.env.MONGODB_URI,
      { serverSelectionTimeoutMS: 10000 }
    ).catch(error => {
      connectionPromise = null;
      throw error;
    });
  }

  await connectionPromise;
}

// ---------- عرض اللوحة وقراءة الطلبات ----------

app.get('/api/orders', adminOnly, async (req, res) => {
  if (req.query.format !== 'json') {
    return res.type('html').send(adminPage);
  }

  try {
    await connectDatabase();

    const collection =
      mongoose.connection.collection('orders');

    const [orders, total] = await Promise.all([
      collection
        .find(
          {},
          {
            projection: {
              orderNo: 1,
              model: 1,
              selectedParts: 1,
              partNotes: 1,
              totalPrice: 1,
              details: 1,
              createdAt: 1
            }
          }
        )
        .sort({ createdAt: -1, _id: -1 })
        .limit(100)
        .toArray(),

      collection.countDocuments({})
    ]);

    return res.json({
      success: true,
      orders,
      total
    });
  } catch (error) {
    console.error('Admin orders read error:', error);

    return res.status(500).json({
      success: false,
      error: 'تعذر تحميل الطلبات. حاول مرة أخرى.'
    });
  }
});

// ---------- حذف طلب أو جميع الطلبات ----------
// استقبال طلبات العملاء POST يظل كما هو داخل index.js.

app.delete(
  '/api/orders',
  adminOnly,
  requireSameOrigin,
  async (req, res) => {
    try {
      const body = req.body || {};

      if (body.action === 'all') {
        if (body.confirmation !== 'حذف الكل') {
          return res.status(400).json({
            success: false,
            error: 'تأكيد مسح الكل غير صحيح.'
          });
        }

        await connectDatabase();

        const result = await mongoose.connection
          .collection('orders')
          .deleteMany({});

        return res.json({
          success: true,
          deletedCount: result.deletedCount
        });
      }

      if (
        body.action !== 'one' ||
        typeof body.id !== 'string' ||
        !/^[a-fA-F0-9]{24}$/.test(body.id)
      ) {
        return res.status(400).json({
          success: false,
          error: 'معرّف الطلب غير صحيح.'
        });
      }

      await connectDatabase();

      const result = await mongoose.connection
        .collection('orders')
        .deleteOne({
          _id: new mongoose.Types.ObjectId(body.id)
        });

      if (!result.deletedCount) {
        return res.status(404).json({
          success: false,
          error: 'الطلب غير موجود؛ ربما حُذف بالفعل. اضغط تحديث.'
        });
      }

      return res.json({
        success: true,
        deletedCount: result.deletedCount
      });
    } catch (error) {
      console.error('Admin orders delete error:', error);

      return res.status(500).json({
        success: false,
        error:
          'تعذر تأكيد الحذف. حدّث القائمة للتحقق قبل المحاولة مجددًا.'
      });
    }
  }
);

// ---------- واجهة لوحة الإدارة ----------

const adminPage = `
<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport"
        content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>iFix | إدارة الطلبات</title>

  <style>
    :root {
      --bg: #f4f6fa;
      --card: #ffffff;
      --ink: #172338;
      --muted: #738096;
      --line: #e5eaf1;
      --blue: #275df2;
      --green: #087f55;
      --red: #bd3044;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: Tahoma, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.8;
    }

    button, input, a {
      -webkit-tap-highlight-color: transparent;
    }

    button, input { font: inherit; }

    button, a { touch-action: manipulation; }

    button:focus-visible,
    a:focus-visible,
    input:focus-visible {
      outline: 3px solid #93b4ff;
      outline-offset: 3px;
    }

    .topbar {
      background: #132039;
      color: white;
      border-bottom: 4px solid #497bff;
    }

    .topbar-inner {
      max-width: 1160px;
      margin: auto;
      padding: 20px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }

    .brand {
      display: flex;
      gap: 13px;
      align-items: center;
    }

    .brand-mark {
      background: #ffffff;
      color: #132039;
      border-radius: 14px;
      width: 54px;
      height: 54px;
      display: grid;
      place-items: center;
      font-size: 21px;
      font-weight: bold;
      direction: ltr;
    }

    .brand-title { font-weight: bold; font-size: 17px; }

    .brand-subtitle {
      font-size: 12px;
      color: #bdc9df;
      margin-top: 2px;
    }

    .private-label {
      padding: 6px 13px;
      border: 1px solid #43516a;
      border-radius: 30px;
      color: #dce5f4;
      font-size: 12px;
    }

    main {
      max-width: 1160px;
      margin: auto;
      padding: 32px 24px 60px;
    }

    .page-heading {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 18px;
      margin-bottom: 24px;
    }

    h1 {
      margin: 0 0 5px;
      font-size: 28px;
      letter-spacing: -.7px;
    }

    .muted { color: var(--muted); }

    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 44px;
      padding: 10px 17px;
      border: 1px solid transparent;
      border-radius: 11px;
      cursor: pointer;
      text-decoration: none;
      font-weight: bold;
      font-size: 13px;
      line-height: 1.5;
      transition:
        background .15s,
        border-color .15s,
        transform .15s;
    }

    .btn:hover { transform: translateY(-1px); }

    .btn:disabled {
      opacity: .45;
      cursor: not-allowed;
      transform: none;
    }

    .btn-primary {
      color: white;
      background: var(--blue);
    }

    .btn-primary:hover { background: #174bd5; }

    .btn-clear, .btn-delete {
      background: #fff4f5;
      border-color: #f1d3d8;
      color: var(--red);
    }

    .btn-clear:hover, .btn-delete:hover {
      background: #ffe7eb;
    }

    .btn-call {
      color: #234eae;
      background: #eef4ff;
      border-color: #d3e1ff;
    }

    .btn-call:hover { background: #dfeaff; }

    .btn-whatsapp {
      color: var(--green);
      background: #eaf8f1;
      border-color: #bfe6d2;
    }

    .btn-whatsapp:hover { background: #d7f2e4; }

    .stats {
      display: grid;
      grid-template-columns: repeat(3,minmax(0,1fr));
      gap: 16px;
      margin-bottom: 22px;
    }

    .stat {
      background: white;
      border: 1px solid var(--line);
      padding: 18px 21px;
      border-radius: 15px;
    }

    .stat-label { color: var(--muted); font-size: 12px; }

    .stat-value {
      margin-top: 3px;
      font-size: 28px;
      font-weight: bold;
      color: var(--ink);
    }

    .stat-value.small { font-size: 17px; padding-top: 9px; }

    .search-box {
      background: white;
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 7px 17px;
    }

    #search {
      width: 100%;
      border: 0;
      background: transparent;
      padding: 11px 0;
      color: var(--ink);
      font-size: 14px;
    }

    .list-meta {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
      margin: 17px 2px;
      color: var(--muted);
      font-size: 12px;
    }

    #notice {
      margin: 0 0 18px;
      padding: 13px 16px;
      border-radius: 11px;
      white-space: pre-wrap;
    }

    #notice:empty { display: none; }

    #notice.success {
      background: #eaf8f1;
      color: #086942;
      border: 1px solid #c5e8d6;
    }

    #notice.error {
      background: #fff0f2;
      color: #a8273b;
      border: 1px solid #f0ced5;
    }

    .order-card {
      margin-bottom: 20px;
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 5px 20px rgba(20,35,60,.035);
    }

    .card-head {
      padding: 18px 22px;
      border-bottom: 1px solid var(--line);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      background: #fcfdff;
    }

    .order-number {
      display: block;
      direction: ltr;
      text-align: right;
      font-size: 17px;
      font-weight: bold;
      color: #254b96;
    }

    .order-date {
      margin-top: 3px;
      color: var(--muted);
      font-size: 11px;
    }

    .model-badge {
      background: #edf1f7;
      color: #41516c;
      border-radius: 8px;
      padding: 6px 11px;
      font-size: 12px;
      direction: ltr;
    }

    .card-body { padding: 22px; }

    .customer-name {
      margin: 0 0 19px;
      font-size: 20px;
      overflow-wrap: anywhere;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(3,minmax(0,1fr));
      gap: 19px 24px;
    }

    .field {
      min-width: 0;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }

    .field.wide { grid-column: 1 / -1; }

    .field-label {
      display: block;
      margin-bottom: 4px;
      color: var(--muted);
      font-size: 11px;
    }

    .field-value { font-size: 14px; }

    .notes {
      margin-top: 20px;
      padding: 15px;
      border-radius: 11px;
      background: #f7f9fc;
      display: grid;
      grid-template-columns: repeat(2,minmax(0,1fr));
      gap: 18px;
    }

    /* ---------- عرض الإصلاحات المطلوبة ---------- */

    .repairs-section {
      margin-top: 22px;
    }

    .repairs-title {
      display: block;
      margin-bottom: 11px;
      color: var(--muted);
      font-size: 12px;
      font-weight: bold;
    }

    .repairs-list {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
    }

    .repair-item {
      display: flex;
      align-items: flex-start;
      gap: 11px;
      padding: 13px 15px;
      border: 1px solid #d9e9e1;
      border-radius: 11px;
      background: #f7fcf9;
      min-width: 0;
    }

    .repair-number {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 27px;
      height: 27px;
      border-radius: 8px;
      background: #e0f4e9;
      color: #087f55;
      font-size: 13px;
      font-weight: bold;
    }

    .repair-content {
      flex: 1;
      min-width: 0;
    }

    .repair-name {
      display: block;
      color: #087f55;
      font-size: 14px;
      font-weight: bold;
      overflow-wrap: anywhere;
    }

    .repair-note-label {
      display: block;
      margin-top: 7px;
      color: var(--muted);
      font-size: 11px;
    }

    .repair-note-value {
      margin-top: 2px;
      color: var(--ink);
      font-size: 13px;
      font-weight: normal;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    .extra-notes {
      margin-top: 18px;
      padding: 15px;
      border-radius: 11px;
      background: #f7f9fc;
      display: grid;
      grid-template-columns: repeat(2,minmax(0,1fr));
      gap: 18px;
    }

    .extra-note-box {
      min-width: 0;
      overflow-wrap: anywhere;
    }

    .device-color-value {
      color: var(--ink);
      font-size: 14px;
      font-weight: bold;
      white-space: pre-wrap;
    }

    .card-foot {
      padding: 17px 22px;
      border-top: 1px solid var(--line);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    .total-label { color: var(--muted); font-size: 11px; }

    .total-value {
      font-size: 21px;
      font-weight: bold;
      color: #172e57;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .empty {
      text-align: center;
      padding: 55px 20px;
      border: 1px dashed #cbd5e4;
      background: white;
      border-radius: 16px;
      color: var(--muted);
    }

    .footnote {
      margin-top: 25px;
      text-align: center;
      color: var(--muted);
      font-size: 11px;
    }

    @media(max-width:700px) {
      main { padding: 23px 14px 40px; }
      .topbar-inner { padding: 16px; }
      h1 { font-size: 24px; }
      .stats { gap: 8px; }
      .stat { padding: 13px 10px; }
      .stat-value { font-size: 23px; }
      .stat-value.small { font-size: 13px; }
      .grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
      .notes { grid-template-columns: 1fr; }
      .extra-notes { grid-template-columns: 1fr; }
      .card-head, .card-body, .card-foot { padding: 17px; }
      .card-foot { align-items: stretch; }
      .actions { width: 100%; }
      .actions .btn { flex: 1; }
      .private-label { display: none; }
    }

    @media(prefers-reduced-motion:reduce) {
      .btn { transition: none; }
      .btn:hover { transform: none; }
    }
  </style>
</head>

<body>
  <div class="topbar">
    <div class="topbar-inner">
      <div class="brand">
        <div class="brand-mark">iFix</div>
        <div>
          <div class="brand-title">لوحة إدارة الطلبات</div>
          <div class="brand-subtitle">
            بيانات العملاء وطلبات الصيانة
          </div>
        </div>
      </div>
      <span class="private-label">دخول خاص بالإدارة</span>
    </div>
  </div>

  <main>
    <div class="page-heading">
      <div>
        <h1>الطلبات</h1>
        <div class="muted">راجع بيانات العملاء وتواصل معهم بسهولة.</div>
      </div>

      <div class="toolbar">
        <button id="refresh" class="btn btn-primary">
          تحديث الطلبات
        </button>
        <button id="clearAll" class="btn btn-clear" disabled>
          مسح الكل · Clear all
        </button>
      </div>
    </div>

    <div class="stats">
      <div class="stat">
        <div class="stat-label">كل الطلبات المحفوظة</div>
        <div id="totalCount" class="stat-value">—</div>
      </div>
      <div class="stat">
        <div class="stat-label">نتائج العرض</div>
        <div id="visibleCount" class="stat-value">—</div>
      </div>
      <div class="stat">
        <div class="stat-label">آخر تحديث · القاهرة</div>
        <div id="lastUpdated" class="stat-value small">—</div>
      </div>
    </div>

    <div id="notice" role="status" aria-live="polite"></div>

    <div class="search-box">
      <input
        id="search"
        type="search"
        autocomplete="off"
        placeholder="ابحث باسم العميل، الهاتف، العنوان أو رقم الطلب…"
        aria-label="البحث في آخر 100 طلب"
      >
    </div>

    <div class="list-meta">
      <span>الأحدث أولًا · البحث داخل آخر 100 طلب</span>
      <span id="listStatus">جاري التحميل…</span>
    </div>

    <section id="orders" aria-label="قائمة الطلبات"></section>

    <div class="footnote">
      الحذف نهائي من قاعدة البيانات.
      زر مسح الكل يحذف جميع الطلبات، وليس نتائج البحث فقط.
    </div>
  </main>

  <script>
    let orders = [];
    let total = 0;
    let busy = false;
    let loaded = false;

    const container = document.getElementById('orders');
    const search = document.getElementById('search');
    const refresh = document.getElementById('refresh');
    const clearAll = document.getElementById('clearAll');
    const notice = document.getElementById('notice');
    const totalCount = document.getElementById('totalCount');
    const visibleCount = document.getElementById('visibleCount');
    const lastUpdated = document.getElementById('lastUpdated');
    const listStatus = document.getElementById('listStatus');

    // ---------- أسماء قطع الغيار بالعربي والإنجليزي ----------

    const partNames = {
      screen: {
        ar: 'الشاشة',
        en: 'Display'
      },
      display: {
        ar: 'الشاشة',
        en: 'Display'
      },
      battery: {
        ar: 'البطارية',
        en: 'Battery'
      },
      socket: {
        ar: 'سوكت الشحن',
        en: 'Charging Port'
      },
      charging_port: {
        ar: 'سوكت الشحن',
        en: 'Charging Port'
      },
      usp: {
        ar: 'سماعة المكالمات',
        en: 'Earpiece Speaker'
      },
      upper_speaker: {
        ar: 'السماعة العلوية',
        en: 'Upper Speaker'
      },
      lsp: {
        ar: 'السماعة الخارجية',
        en: 'Loudspeaker'
      },
      lower_speaker: {
        ar: 'السماعة السفلية',
        en: 'Lower Speaker'
      },
      mic: {
        ar: 'الميكروفون',
        en: 'Microphone'
      },
      microphone: {
        ar: 'الميكروفون',
        en: 'Microphone'
      },
      fcam: {
        ar: 'الكاميرا الأمامية',
        en: 'Front Camera'
      },
      front_camera: {
        ar: 'الكاميرا الأمامية',
        en: 'Front Camera'
      },
      bcam: {
        ar: 'الكاميرا الخلفية',
        en: 'Back Camera'
      },
      back_camera: {
        ar: 'الكاميرا الخلفية',
        en: 'Back Camera'
      },
      back: {
        ar: 'الظهر',
        en: 'Back Glass'
      },
      flash: {
        ar: 'الفلاش',
        en: 'Flash'
      },
      other: {
        ar: 'عطل آخر',
        en: 'Other Repair'
      }
    };

    function currentLanguage() {
      const lang = String(
        document.documentElement.lang || 'ar'
      ).toLowerCase();

      return lang.startsWith('en') ? 'en' : 'ar';
    }

    function translate(ar, en) {
      return currentLanguage() === 'en' ? en : ar;
    }

    function normalizePart(value) {
      return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[\\s-]+/g, '_');
    }

    function partLabel(value) {
      const key = normalizePart(value);
      const item = partNames[key];

      if (item) {
        return item[currentLanguage()];
      }

      return String(value || '').replace(/_/g, ' ');
    }

    // ---------- أدوات إنشاء العناصر ----------

    function element(tag, className, text) {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    }

    function notify(text, type) {
      notice.textContent = text || '';
      notice.className = text ? (type || 'success') : '';
    }

    function setBusy(value) {
      busy = value;
      refresh.disabled = value;
      clearAll.disabled = value || !loaded || total === 0;

      container.querySelectorAll('button').forEach(button => {
        button.disabled = value;
      });
    }

    function phoneDigits(value) {
      return String(value || '').replace(/[^0-9]/g, '');
    }

    function field(parent, label, value, wide) {
      const box = element('div', 'field' + (wide ? ' wide' : ''));
      const title = element('span', 'field-label', label);

      const content = element(
        'div',
        'field-value',
        value === undefined || value === null || value === ''
          ? '—'
          : String(value)
      );

      box.append(title, content);
      parent.append(box);
    }

    function dateText(value) {
      const date = new Date(value);

      if (Number.isNaN(date.getTime())) return 'تاريخ غير متاح';

      return date.toLocaleString('ar-EG', {
        timeZone: 'Africa/Cairo',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    function money(value) {
      if (value === null || value === undefined || value === '') {
        return '—';
      }

      const amount = Number(value);

      return Number.isFinite(amount)
        ? new Intl.NumberFormat('ar-EG', {
            maximumFractionDigits: 2
          }).format(amount) + ' ج.م'
        : '—';
    }

    // ---------- فصل لون الجهاز عن ملاحظات العميل ----------

    function extractDeviceColor(details) {
      const d = details || {};

      const directColor =
        d.deviceColor ||
        d.device_color ||
        d.color ||
        d.phoneColor ||
        '';

      let customerNotes = String(d.notes || '');
      let deviceColor = String(directColor || '').trim();

      const lines = customerNotes.split(/\\r?\\n/);
      const remainingLines = [];

      for (const line of lines) {
        const match = line.match(
          /^\\s*(?:لون\\s*الجهاز|device[\\s_-]*colou?r|phone[\\s_-]*colou?r)\\s*[:：=-]\\s*(.*?)\\s*$/i
        );

        if (match) {
          if (!deviceColor) {
            deviceColor = match[1].trim();
          }
        } else {
          remainingLines.push(line);
        }
      }

      customerNotes = remainingLines
        .join('\\n')
        .trim();

      return {
        deviceColor,
        customerNotes
      };
    }

    // ---------- عرض الإصلاحات وملاحظات كل إصلاح ----------

    function createRepairItem(part, index, note) {
      const item = element('div', 'repair-item');

      const number = element(
        'span',
        'repair-number',
        String(index + 1)
      );

      const content = element('div', 'repair-content');

      const name = element(
        'span',
        'repair-name',
        partLabel(part)
      );

      content.append(name);

      if (
        note !== undefined &&
        note !== null &&
        String(note).trim() !== ''
      ) {
        const noteLabel = element(
          'span',
          'repair-note-label',
          translate('ملاحظات الإصلاح', 'Repair Notes')
        );

        const noteValue = element(
          'div',
          'repair-note-value',
          String(note)
        );

        content.append(noteLabel, noteValue);
      }

      item.append(number, content);

      return item;
    }

    function createRepairsSection(order) {
      const selectedParts = Array.isArray(order.selectedParts)
        ? order.selectedParts
        : [];

      const partNotes = order.partNotes || {};

      const section = element('div', 'repairs-section');

      const title = element(
        'span',
        'repairs-title',
        translate('الإصلاحات المطلوبة', 'Required Repairs')
      );

      section.append(title);

      if (!selectedParts.length) {
        section.append(
          element('div', 'field-value', '—')
        );

        return section;
      }

      const list = element('div', 'repairs-list');

      selectedParts.forEach((part, index) => {
        const key = normalizePart(part);

        let note = partNotes[part];

        if (note === undefined) {
          note = partNotes[key];
        }

        if (note === undefined) {
          const matchingKey = Object.keys(partNotes).find(
            noteKey => normalizePart(noteKey) === key
          );

          if (matchingKey !== undefined) {
            note = partNotes[matchingKey];
          }
        }

        list.append(
          createRepairItem(part, index, note)
        );
      });

      section.append(list);

      return section;
    }

    // ---------- عرض ملاحظات العميل ولون الجهاز ----------

    function createExtraNotes(details) {
      const extracted = extractDeviceColor(details);

      const customerNotes = extracted.customerNotes;
      const deviceColor = extracted.deviceColor;

      if (!customerNotes && !deviceColor) {
        return null;
      }

      const notes = element('div', 'extra-notes');

      if (customerNotes) {
        const customerBox = element(
          'div',
          'extra-note-box'
        );

        customerBox.append(
          element(
            'span',
            'field-label',
            translate('ملاحظات العميل', 'Customer Notes')
          ),
          element(
            'div',
            'field-value',
            customerNotes
          )
        );

        notes.append(customerBox);
      }

      if (deviceColor) {
        const colorBox = element(
          'div',
          'extra-note-box'
        );

        colorBox.append(
          element(
            'span',
            'field-label',
            translate('لون الجهاز', 'Device Color')
          ),
          element(
            'div',
            'device-color-value',
            deviceColor
          )
        );

        notes.append(colorBox);
      }

      return notes;
    }

    // ---------- عرض الطلبات ----------

    function render() {
      container.replaceChildren();

      const query = search.value.trim().toLowerCase();

      const visible = orders.filter(order => {
        const d = order.details || {};

        return [
          order.orderNo,
          order.model,
          d.name,
          d.phone,
          d.whatsapp,
          d.address
        ].join(' ').toLowerCase().includes(query);
      });

      totalCount.textContent = total;
      visibleCount.textContent = visible.length;

      listStatus.textContent =
        'عرض ' + visible.length + ' من ' + orders.length +
        ' طلب محمّل';

      if (!visible.length) {
        container.append(
          element(
            'div',
            'empty',
            query
              ? 'لا توجد نتائج مطابقة. جرّب كلمة بحث أخرى.'
              : 'لا توجد طلبات لعرضها حاليًا.'
          )
        );
      }

      for (const order of visible) {
        const d = order.details || {};
        const card = element('article', 'order-card');

        const head = element('div', 'card-head');
        const identity = element('div');

        identity.append(
          element(
            'span',
            'order-number',
            order.orderNo || 'طلب بدون رقم'
          ),
          element(
            'div',
            'order-date',
            dateText(order.createdAt)
          )
        );

        head.append(
          identity,
          element('span', 'model-badge', order.model || 'جهاز غير محدد')
        );

        const body = element('div', 'card-body');

        body.append(
          element('h2', 'customer-name', d.name || 'عميل بدون اسم')
        );

        const grid = element('div', 'grid');

        field(grid, 'رقم الهاتف', d.phone);
        field(grid, 'رقم واتساب', d.whatsapp);
        field(grid, 'العنوان', d.address, true);

        body.append(grid);

        // الإصلاحات المطلوبة مرقمة، وكل ملاحظة تحت إصلاحها
        const repairsSection = createRepairsSection(order);
        body.append(repairsSection);

        // ملاحظات العميل ولون الجهاز في خانات مستقلة
        const extraNotes = createExtraNotes(d);

        if (extraNotes) {
          body.append(extraNotes);
        }

        const foot = element('div', 'card-foot');
        const amount = element('div');

        amount.append(
          element('div', 'total-label', 'إجمالي الطلب'),
          element('div', 'total-value', money(order.totalPrice))
        );

        const actions = element('div', 'actions');
        const phone = phoneDigits(d.phone);

        if (phone) {
          const call = element('a', 'btn btn-call', 'اتصال بالعميل');
          call.href = 'tel:' + phone;
          actions.append(call);
        }

        let whatsapp = phoneDigits(d.whatsapp || d.phone);

        if (whatsapp.startsWith('00')) {
          whatsapp = whatsapp.slice(2);
        }

        if (whatsapp.length === 11 && whatsapp.startsWith('01')) {
          whatsapp = '2' + whatsapp;
        }

        if (whatsapp) {
          const link = element('a', 'btn btn-whatsapp', 'فتح واتساب');
          link.href = 'https://wa.me/' + whatsapp;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          actions.append(link);
        }

        const remove = element('button', 'btn btn-delete', 'حذف الطلب');
        remove.type = 'button';
        remove.disabled = busy;
        remove.addEventListener('click', () => deleteOne(order));
        actions.append(remove);

        foot.append(amount, actions);
        card.append(head, body, foot);
        container.append(card);
      }

      clearAll.disabled = busy || !loaded || total === 0;
    }

    // ---------- الاتصال بالسيرفر ----------

    async function api(options) {
      const response = await fetch('/api/orders?format=json', {
        cache: 'no-store',
        credentials: 'same-origin',
        ...options
      });

      const contentType = response.headers.get('content-type') || '';

      if (!contentType.includes('application/json')) {
        if (response.status === 401) {
          throw new Error('يلزم تسجيل الدخول. أعد فتح لوحة الإدارة.');
        }

        throw new Error('رد غير متوقع من السيرفر. حدّث الصفحة للتحقق.');
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'تعذر إتمام العملية.');
      }

      return data;
    }

    async function readOrders() {
      const data = await api({ method: 'GET' });

      orders = data.orders;
      total = data.total;
      loaded = true;

      lastUpdated.textContent = new Date().toLocaleTimeString('ar-EG', {
        timeZone: 'Africa/Cairo',
        hour: '2-digit',
        minute: '2-digit'
      });

      render();
    }

    async function loadOrders() {
      if (busy) return;

      setBusy(true);
      notify('');
      listStatus.textContent = 'جاري تحديث الطلبات…';

      try {
        await readOrders();
      } catch (error) {
        listStatus.textContent = 'تعذر التحديث';
        notify(error.message, 'error');
      } finally {
        setBusy(false);
      }
    }

    // ---------- حذف الطلبات ----------

    async function performDelete(payload) {
      if (busy) return;

      setBusy(true);
      notify('');

      try {
        const result = await api({
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Action': 'delete-orders'
          },
          body: JSON.stringify(payload)
        });

        // إزالة العناصر المحذوفة من العرض بعد تأكيد السيرفر فقط
        if (payload.action === 'all') {
          orders = [];
        } else {
          orders = orders.filter(order => order._id !== payload.id);
        }

        total = Math.max(0, total - result.deletedCount);
        render();

        const successText =
          'تم حذف ' + result.deletedCount + ' طلب نهائيًا.';

        try {
          await readOrders();
          notify(successText, 'success');
        } catch {
          notify(
            successText +
            ' تعذر تحديث بقية القائمة؛ اضغط تحديث الطلبات.',
            'error'
          );
        }
      } catch (error) {
        notify(
          error.message +
          ' لو النتيجة غير واضحة، اضغط تحديث قبل تكرار الحذف.',
          'error'
        );
      } finally {
        setBusy(false);
      }
    }

    function deleteOne(order) {
      if (busy) return;

      const name = (order.details || {}).name || 'بدون اسم';

      const approved = window.confirm(
        'حذف الطلب ' + (order.orderNo || '') +
        ' الخاص بالعميل ' + name +
        ' نهائيًا من قاعدة البيانات؟ لا يمكن التراجع.'
      );

      if (!approved) return;

      performDelete({
        action: 'one',
        id: order._id
      });
    }

    function deleteAll() {
      if (busy || !loaded || total === 0) return;

      const confirmation = window.prompt(
        'سيتم حذف جميع الطلبات الموجودة في قاعدة البيانات وقت التنفيذ،' +
        ' بما فيها الطلبات غير المعروضة وأي طلبات جديدة وصلت.' +
        '\\nهذا الحذف نهائي ولا يقتصر على نتائج البحث.' +
        '\\nللتأكيد اكتب: حذف الكل'
      );

      if (confirmation !== 'حذف الكل') {
        if (confirmation !== null) {
          notify('لم يحدث حذف؛ عبارة التأكيد غير مطابقة.', 'error');
        }
        return;
      }

      performDelete({
        action: 'all',
        confirmation
      });
    }

    // ---------- تشغيل الصفحة ----------

    search.addEventListener('input', render);
    refresh.addEventListener('click', loadOrders);
    clearAll.addEventListener('click', deleteAll);

    loadOrders();
  </script>
</body>
</html>
`;

export default app;