import app from './index.js';
import mongoose from 'mongoose';
import { createHash, timingSafeEqual } from 'node:crypto';

const COURIER_ID = 'primary';
const LIMIT = 50;

let connectionPromise;

// ---------- الاتصال بقاعدة البيانات ----------

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

// ---------- حماية حساب المندوب ----------

function same(a, b) {
  const hash = value =>
    createHash('sha256').update(String(value)).digest();

  return timingSafeEqual(hash(a), hash(b));
}

function courierOnly(req, res, next) {
  res.set('Cache-Control', 'no-store');
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('Referrer-Policy', 'no-referrer');

  const user = process.env.COURIER_USERNAME;
  const pass = process.env.COURIER_PASSWORD;

  if (
    !user ||
    !pass ||
    user === process.env.ADMIN_USERNAME
  ) {
    return res.status(503).send(
      'Configure a separate courier username and password.'
    );
  }

  const header = req.headers.authorization || '';

  const decoded = header.startsWith('Basic ')
    ? Buffer.from(header.slice(6), 'base64').toString('utf8')
    : '';

  const separator = decoded.indexOf(':');

  const validUser = same(
    separator < 0 ? '' : decoded.slice(0, separator),
    user
  );

  const validPass = same(
    separator < 0 ? '' : decoded.slice(separator + 1),
    pass
  );

  if (!validUser || !validPass) {
    res.set(
      'WWW-Authenticate',
      'Basic realm="iFix Courier"'
    );

    return res.status(401).send('Login required.');
  }

  next();
}

function sameOrigin(req, res, next) {
  try {
    const origin = new URL(req.headers.origin || '');

    if (
      origin.protocol !== 'https:' ||
      origin.host !== req.headers.host ||
      req.get('X-Admin-Action') !== 'courier-handoff'
    ) {
      throw new Error();
    }

    next();
  } catch {
    res.status(403).json({
      success: false,
      error: 'عملية غير مسموح بها.'
    });
  }
}

// ---------- الحالات المعروضة للمندوب ----------

const activeFilter = {
  $or: [
    { workflowStatus: 'new' },
    {
      workflowStatus: 'repair',
      courierStage: { $ne: 'in_center' }
    },
    { workflowStatus: 'delivery' }
  ]
};

function todayFilter() {
  const day = date => ({
    $dateToString: {
      date,
      format: '%Y-%m-%d',
      timezone: 'Africa/Cairo',
      onNull: ''
    }
  });

  return {
    workflowStatus: 'completed',
    $expr: {
      $eq: [
        day({
          $ifNull: ['$deliveredAt', '$workflowUpdatedAt']
        }),
        day('$$NOW')
      ]
    }
  };
}

function taskOf(order) {
  if (order.workflowStatus === 'new') {
    return 'pickup_client';
  }

  if (
    order.workflowStatus === 'repair' &&
    order.courierStage !== 'in_center'
  ) {
    return 'drop_center';
  }

  if (order.workflowStatus === 'delivery') {
    return order.courierStage === 'to_customer'
      ? 'deliver_client'
      : 'pickup_center';
  }

  return '';
}

function transition(order, action, at) {
  if (
    order.assignedCourier !== COURIER_ID ||
    taskOf(order) !== action
  ) {
    return null;
  }

  if (action === 'pickup_client') {
    return {
      workflowStatus: 'repair',
      courierStage: 'to_center',
      pickedUpAt: at
    };
  }

  if (action === 'drop_center') {
    return {
      workflowStatus: 'repair',
      courierStage: 'in_center',
      centerReceivedAt: at
    };
  }

  if (action === 'pickup_center') {
    return {
      workflowStatus: 'delivery',
      courierStage: 'to_customer',
      centerPickedUpAt: at
    };
  }

  if (action === 'deliver_client') {
    return {
      workflowStatus: 'completed',
      courierStage: 'delivered',
      deliveredAt: at
    };
  }

  return null;
}

// ---------- قراءة المهام ----------

app.get('/api/courier', courierOnly, async (req, res) => {
  if (req.query.format !== 'json') {
    return res.type('html').send(courierPage);
  }

  try {
    await connectDatabase();

    const collection = mongoose.connection.collection('orders');
    const scope = { assignedCourier: COURIER_ID };

    const view = req.query.view === 'today'
      ? 'today'
      : 'active';

    const filters = [
      scope,
      view === 'today' ? todayFilter() : activeFilter
    ];

    const q = String(req.query.q || '').trim().slice(0, 120);

    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      filters.push({
        $or: [
          'orderNo',
          'model',
          'details.name',
          'details.phone',
          'details.whatsapp',
          'details.address'
        ].map(key => ({
          [key]: {
            $regex: escaped,
            $options: 'i'
          }
        }))
      });
    }

    const filter = { $and: filters };

    const [active, today, total] = await Promise.all([
      collection.countDocuments({
        $and: [scope, activeFilter]
      }),
      collection.countDocuments({
        $and: [scope, todayFilter()]
      }),
      collection.countDocuments(filter)
    ]);

    const pages = Math.max(1, Math.ceil(total / LIMIT));

    const page = Math.min(
      pages,
      Math.max(1, parseInt(req.query.page, 10) || 1)
    );

    const rows = await collection.find(filter, {
      projection: {
        orderNo: 1,
        model: 1,
        details: 1,
        totalPrice: 1,
        workflowStatus: 1,
        courierStage: 1,
        workflowVersion: 1,
        workflowUpdatedAt: 1,
        deliveredAt: 1
      }
    })
      .sort(
        view === 'today'
          ? { workflowUpdatedAt: -1, _id: -1 }
          : { createdAt: 1, _id: 1 }
      )
      .skip((page - 1) * LIMIT)
      .limit(LIMIT)
      .toArray();

    res.json({
      success: true,
      rows,
      active,
      today,
      total,
      page,
      pages
    });
  } catch (error) {
    console.error('Courier read error:', error);

    res.status(500).json({
      success: false,
      error: 'تعذر تحميل المهام. حاول التحديث مرة أخرى.'
    });
  }
});

// ---------- تسجيل الاستلام والتسليم ----------

app.patch(
  '/api/courier',
  courierOnly,
  sameOrigin,
  async (req, res) => {
    const { id, version, action } = req.body || {};

    if (
      typeof id !== 'string' ||
      !/^[a-f\d]{24}$/i.test(id) ||
      !Number.isSafeInteger(version) ||
      version < 0 ||
      ![
        'pickup_client',
        'drop_center',
        'pickup_center',
        'deliver_client'
      ].includes(action)
    ) {
      return res.status(400).json({
        success: false,
        error: 'بيانات غير صحيحة.'
      });
    }

    try {
      await connectDatabase();

      const collection = mongoose.connection.collection('orders');

      const scope = {
        _id: new mongoose.Types.ObjectId(id),
        assignedCourier: COURIER_ID
      };

      const order = await collection.findOne(scope);
      const at = new Date();
      const change = order && transition(order, action, at);

      if (
        !change ||
        (order.workflowVersion || 0) !== version
      ) {
        return res.status(409).json({
          success: false,
          error:
            'حالة الطلب تغيّرت أو المهمة غير متاحة لك. حدّث القائمة.'
        });
      }

      const filter = { ...scope };

      if (version === 0) {
        filter.$or = [
          { workflowVersion: 0 },
          { workflowVersion: { $exists: false } }
        ];
      } else {
        filter.workflowVersion = version;
      }

      const result = await collection.updateOne(filter, {
        $set: {
          ...change,
          workflowUpdatedAt: at
        },
        $inc: {
          workflowVersion: 1
        },
        $push: {
          workflowHistory: {
            $each: [{
              action,
              role: 'courier',
              at,
              from: order.workflowStatus,
              to: change.workflowStatus,
              stage: change.courierStage
            }],
            $slice: -100
          }
        }
      });

      if (!result.modifiedCount) {
        return res.status(409).json({
          success: false,
          error: 'تم تحديث الطلب بالفعل. حدّث القائمة.'
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Courier update error:', error);

      res.status(500).json({
        success: false,
        error:
          'تعذر تأكيد الحفظ. حدّث القائمة قبل إعادة المحاولة.'
      });
    }
  }
);

// ---------- واجهة المندوب المستقلة ----------

const courierPage = String.raw`
<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>iFix | رحلات المندوب</title>

<style>
:root {
  font-family: Tahoma, Arial, sans-serif;
  color: #17322d;
  background: #f3f6f3;
  font-synthesis: none;
}

* { box-sizing: border-box; }
body { margin: 0; }

button, input, a {
  font: inherit;
  touch-action: manipulation;
}

button, a {
  -webkit-tap-highlight-color: transparent;
}

button { cursor: pointer; }

button:disabled {
  opacity: .5;
  cursor: wait;
}

a {
  text-decoration: none;
  color: inherit;
}

[hidden] { display: none !important; }

button:focus-visible,
a:focus-visible,
input:focus-visible {
  outline: 3px solid #56bba2;
  outline-offset: 3px;
}

.shell {
  max-width: 1050px;
  margin: auto;
  padding: 24px 20px 50px;
}

.brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.logo {
  font-size: 24px;
  font-weight: bold;
  direction: ltr;
}

.badge {
  font-size: 12px;
  background: white;
  border: 1px solid #dce5de;
  border-radius: 30px;
  padding: 8px 13px;
  color: #5b7169;
}

.hero {
  background: #133e35;
  color: white;
  padding: 28px;
  border-radius: 24px;
  display: flex;
  gap: 24px;
  justify-content: space-between;
  align-items: center;
}

.hero small { color: #b7dacb; }

.hero h1 {
  font-size: 28px;
  margin: 8px 0;
}

.hero p {
  font-size: 13px;
  line-height: 1.9;
  color: #d3e5de;
  margin: 0;
}

.refresh {
  border: 1px solid #70998b;
  background: #ffffff12;
  color: white;
  border-radius: 12px;
  padding: 12px 16px;
  white-space: nowrap;
}

.summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin: 18px 0;
}

.stat {
  background: white;
  padding: 18px 22px;
  border: 1px solid #dfe7e1;
  border-radius: 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.stat span {
  font-size: 13px;
  color: #61776d;
}

.stat strong { font-size: 30px; }

.stat.done {
  background: #e6f4eb;
  color: #187246;
  border-color: #c9e5d3;
}

.search {
  width: 100%;
  border: 1px solid #dae4dc;
  background: white;
  border-radius: 14px;
  padding: 16px;
  color: #17322d;
}

.tabs {
  display: flex;
  gap: 8px;
  margin: 18px 0;
}

.tabs button {
  flex: 1;
  min-height: 48px;
  border: 1px solid #d8e3dc;
  background: #fff;
  border-radius: 13px;
  color: #50675d;
  font-weight: bold;
}

.tabs button.active {
  background: #133e35;
  color: #fff;
  border-color: #133e35;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  color: #6d8076;
  font-size: 11px;
  margin: 14px 2px;
}

.notice {
  padding: 13px 16px;
  border-radius: 12px;
  white-space: pre-wrap;
  font-size: 13px;
  line-height: 1.8;
  margin: 15px 0;
  background: #e5f2e9;
  color: #155c3b;
}

.notice:empty { display: none; }

.notice.error {
  background: #fff0e7;
  color: #8b4318;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 25px 0 12px;
  font-size: 17px;
}

.step-number {
  display: grid;
  place-items: center;
  background: #e1eae3;
  color: #375d4c;
  width: 28px;
  height: 28px;
  border-radius: 9px;
  font-size: 13px;
}

.card {
  background: white;
  border: 1px solid #dce5df;
  border-radius: 19px;
  overflow: hidden;
  margin-bottom: 14px;
  box-shadow: 0 5px 18px #173b2910;
}

.card.delivered {
  background: #e8f6ec;
  border-color: #b9ddc5;
}

.card-head {
  padding: 15px 20px;
  border-bottom: 1px solid #e3eae5;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
}

.order-no {
  font-size: 14px;
  font-weight: bold;
  direction: ltr;
}

.tag {
  font-size: 11px;
  padding: 6px 10px;
  border-radius: 8px;
  background: #edf3ef;
  color: #3c6352;
}

.card.delivered .tag {
  background: #ccecd7;
  color: #116337;
}

.card-body { padding: 20px; }

.customer {
  margin: 0 0 16px;
  font-size: 20px;
  overflow-wrap: anywhere;
}

.details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 20px;
}

.field {
  min-width: 0;
  overflow-wrap: anywhere;
}

.field.wide { grid-column: 1 / -1; }

.field small {
  display: block;
  color: #718278;
  font-size: 11px;
  margin-bottom: 5px;
}

.field div {
  font-size: 14px;
  white-space: pre-wrap;
  line-height: 1.8;
}

.contact {
  display: flex;
  gap: 9px;
  margin-top: 18px;
}

.contact a {
  flex: 1;
  text-align: center;
  padding: 11px;
  border: 1px solid #d9e6dd;
  border-radius: 11px;
  background: #f5f9f6;
  font-size: 13px;
  font-weight: bold;
}

.contact a.wa {
  color: #12734d;
  background: #edf8f0;
}

.card-foot { padding: 0 20px 20px; }

.action {
  border: 0;
  background: #174d40;
  color: white;
  border-radius: 12px;
  padding: 15px;
  width: 100%;
  font-weight: bold;
  font-size: 14px;
}

.hint {
  font-size: 11px;
  line-height: 1.8;
  color: #718278;
  margin: 10px 0 0;
}

.done-line {
  font-size: 13px;
  font-weight: bold;
  color: #16703f;
  padding-top: 2px;
}

.empty {
  padding: 36px 20px;
  text-align: center;
  border: 1px dashed #c8d8cd;
  border-radius: 18px;
  background: #fff;
  color: #688070;
  line-height: 2;
}

.pager {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 14px;
  margin: 22px 0;
}

.pager button {
  border: 1px solid #d5e1d8;
  border-radius: 10px;
  background: white;
  padding: 10px 16px;
  color: #2c5140;
}

.pager span { font-size: 12px; }

.footer {
  text-align: center;
  font-size: 11px;
  color: #7b8b80;
  line-height: 1.9;
  margin-top: 26px;
}

@media(max-width:600px) {
  .shell { padding: 16px 12px 35px; }

  .hero {
    padding: 22px 18px;
    align-items: flex-start;
    flex-direction: column;
    gap: 15px;
  }

  .hero h1 { font-size: 25px; }
  .refresh { width: 100%; }

  .stat {
    padding: 15px;
    align-items: flex-start;
  }

  .stat span {
    font-size: 11px;
    line-height: 1.8;
  }

  .stat strong { font-size: 26px; }

  .card-head, .card-body { padding: 16px; }
  .card-foot { padding: 0 16px 16px; }
  .details { gap: 14px; }
  .tabs button { font-size: 12px; }
  .badge { font-size: 10px; }
}
</style>
</head>

<body>
<main class="shell">
  <header class="brand">
    <div class="logo">
      iFix
      <span style="font-weight:normal;font-size:13px">
        Courier
      </span>
    </div>

    <span class="badge">مساحة المندوب الخاصة</span>
  </header>

  <section class="hero">
    <div>
      <small>كل جهاز في مكانه، وكل خطوة مسجّلة</small>
      <h1>رحلاتك، خطوة بخطوة.</h1>
      <p>
        استلم الجهاز، سلّمه للصيانة، ثم أعده للعميل بعد تجهيزه.
      </p>
    </div>

    <button id="refresh" class="refresh">
      تحديث المهام ↻
    </button>
  </section>

  <section class="summary">
    <div class="stat">
      <span>المهام الحالية</span>
      <strong id="activeCount">—</strong>
    </div>

    <div class="stat done">
      <span>تم تسليمها للعميل اليوم</span>
      <strong id="todayCount">—</strong>
    </div>
  </section>

  <input
    id="search"
    class="search"
    type="search"
    autocomplete="off"
    placeholder="ابحث بالاسم، رقم الطلب أو الهاتف…"
    aria-label="البحث في القسم الحالي"
  >

  <nav class="tabs" aria-label="أقسام المندوب">
    <button id="activeTab" class="active" aria-pressed="true">
      مهامي الحالية
    </button>

    <button id="todayTab" aria-pressed="false">
      تم تسليمها اليوم ✓
    </button>
  </nav>

  <div class="meta">
    <span id="status">جاري التحميل…</span>
    <span id="updated">التوقيت: القاهرة</span>
  </div>

  <div
    id="notice"
    class="notice"
    role="status"
    aria-live="polite"
  ></div>

  <section id="list" aria-label="المهام"></section>

  <div class="pager">
    <button id="prev" disabled>السابق</button>
    <span id="pageLabel"></span>
    <button id="next" disabled>التالي</button>
  </div>

  <div class="footer">
    بعد تسليم الجهاز للصيانة يختفي من مهامك حتى تعيد الإدارة إسناده إليك.
    <br>
    لو فيه مشكلة في تنفيذ المهمة، تواصل مع الإدارة قبل تأكيد أي خطوة.
  </div>
</main>

<script>
const el = id => document.getElementById(id);

const stages = {
  pickup_client: {
    title: 'استلام من العميل',
    button: 'تم استلام الجهاز من العميل',
    hint: 'أكد الخطوة بعد استلام الجهاز فعليًا من العميل.'
  },

  drop_center: {
    title: 'معي — للتسليم للصيانة',
    button: 'تم تسليم الجهاز لمركز الصيانة',
    hint:
      'الجهاز معك الآن. بعد تسليمه للمركز وتأكيد الخطوة سيختفي من مهامك.'
  },

  pickup_center: {
    title: 'جاهز — للاستلام من الصيانة',
    button: 'تم استلام الجهاز من مركز الصيانة',
    hint:
      'الجهاز ما زال في المركز. أكد الاستلام بعد أخذه فعليًا.'
  },

  deliver_client: {
    title: 'جاري التوصيل للعميل',
    button: 'تم تسليم الجهاز للعميل',
    hint:
      'أكد التسليم بعد استلام العميل جهازه فعليًا.'
  }
};

let view = 'active';
let page = 1;
let pages = 1;
let busy = false;
let rows = [];
let pending = false;
let timer;

function node(tag, cls, text) {
  const n = document.createElement(tag);

  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;

  return n;
}

function tell(text, error = false) {
  el('notice').textContent = text;
  el('notice').className = 'notice' + (error ? ' error' : '');
}

function task(order) {
  if (order.workflowStatus === 'new') {
    return 'pickup_client';
  }

  if (
    order.workflowStatus === 'repair' &&
    order.courierStage !== 'in_center'
  ) {
    return 'drop_center';
  }

  if (order.workflowStatus === 'delivery') {
    return order.courierStage === 'to_customer'
      ? 'deliver_client'
      : 'pickup_center';
  }

  return '';
}

function controls() {
  el('refresh').disabled = busy;
  el('activeTab').disabled = busy;
  el('todayTab').disabled = busy;

  el('prev').disabled = busy || page <= 1;
  el('next').disabled = busy || page >= pages;

  el('list').querySelectorAll('button').forEach(button => {
    button.disabled = busy;
  });
}

function finish() {
  busy = false;
  controls();

  if (pending) {
    pending = false;
    page = 1;
    load();
  }
}

function digits(value) {
  return String(value || '').replace(/[^0-9]/g, '');
}

function time(value) {
  const d = new Date(value);

  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('ar-EG', {
        timeZone: 'Africa/Cairo',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
}

function colorAndNotes(details) {
  let color = String(
    details.deviceColor ||
    details.device_color ||
    details.color ||
    details.phoneColor ||
    ''
  ).trim();

  const notes = [];

  for (const line of String(details.notes || '').split(/\r?\n/)) {
    const match = line.match(
      /^\s*(?:لون\s*الجهاز|device[\s_-]*colou?r|phone[\s_-]*colou?r)\s*[:：=-]\s*(.*?)\s*$/i
    );

    if (match) {
      if (!color) color = match[1].trim();
    } else {
      notes.push(line);
    }
  }

  return {
    color,
    notes: notes.join('\n').trim()
  };
}

function field(parent, label, value, wide = false) {
  const box = node('div', 'field' + (wide ? ' wide' : ''));

  box.append(
    node('small', '', label),
    node(
      'div',
      '',
      value === undefined || value === null || value === ''
        ? '—'
        : String(value)
    )
  );

  parent.append(box);
}

function card(order) {
  const done = order.workflowStatus === 'completed';
  const stage = task(order);
  const info = stages[stage];

  const d = order.details || {};
  const extra = colorAndNotes(d);

  const article = node(
    'article',
    'card' + (done ? ' delivered' : '')
  );

  const head = node('div', 'card-head');

  head.append(
    node('span', 'order-no', order.orderNo || 'طلب بدون رقم'),
    node(
      'span',
      'tag',
      done ? '✓ تم التسليم للعميل' : info.title
    )
  );

  const body = node('div', 'card-body');

  body.append(
    node('h2', 'customer', d.name || 'عميل بدون اسم')
  );

  const grid = node('div', 'details');

  field(grid, 'الجهاز', order.model);
  field(grid, 'لون الجهاز', extra.color);
  field(grid, 'الهاتف', d.phone);
  field(grid, 'واتساب', d.whatsapp || d.phone);
  field(grid, 'عنوان العميل', d.address, true);

  if (extra.notes) {
    field(grid, 'ملاحظات العميل', extra.notes, true);
  }

  if (
    order.totalPrice !== undefined &&
    order.totalPrice !== null &&
    order.totalPrice !== ''
  ) {
    const amount = Number(order.totalPrice);

    if (Number.isFinite(amount)) {
      field(
        grid,
        'قيمة الطلب المسجّلة',
        new Intl.NumberFormat('ar-EG').format(amount) + ' ج.م'
      );
    }
  }

  body.append(grid);

  const contact = node('div', 'contact');
  const phone = digits(d.phone);

  if (phone) {
    const a = node('a', '', 'اتصال بالعميل');
    a.href = 'tel:' + phone;
    contact.append(a);
  }

  let wa = digits(d.whatsapp || d.phone);

  if (wa.startsWith('00')) {
    wa = wa.slice(2);
  }

  if (wa.length === 11 && wa.startsWith('01')) {
    wa = '2' + wa;
  }

  if (wa) {
    const a = node('a', 'wa', 'فتح واتساب');
    a.href = 'https://wa.me/' + wa;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    contact.append(a);
  }

  body.append(contact);

  const foot = node('div', 'card-foot');

  if (done) {
    foot.append(
      node(
        'div',
        'done-line',
        '✓ تم التسليم: ' +
        time(order.deliveredAt || order.workflowUpdatedAt)
      )
    );
  } else {
    const button = node('button', 'action', info.button);

    button.type = 'button';
    button.disabled = busy;

    button.addEventListener('click', () => {
      confirmStep(order, stage);
    });

    foot.append(
      button,
      node('p', 'hint', info.hint)
    );
  }

  article.append(head, body, foot);

  return article;
}

function render(data) {
  rows = data.rows;
  page = data.page;
  pages = data.pages;

  el('activeCount').textContent = data.active;
  el('todayCount').textContent = data.today;

  el('activeTab').classList.toggle(
    'active',
    view === 'active'
  );

  el('todayTab').classList.toggle(
    'active',
    view === 'today'
  );

  el('activeTab').setAttribute(
    'aria-pressed',
    String(view === 'active')
  );

  el('todayTab').setAttribute(
    'aria-pressed',
    String(view === 'today')
  );

  el('status').textContent =
    'عرض ' + rows.length + ' من ' + data.total +
    ' · تحديث تلقائي كل 15 ثانية';

  el('updated').textContent =
    'آخر تحديث: ' +
    new Date().toLocaleTimeString('ar-EG', {
      timeZone: 'Africa/Cairo',
      hour: '2-digit',
      minute: '2-digit'
    });

  el('pageLabel').textContent =
    'صفحة ' + page + ' من ' + pages;

  const list = el('list');
  list.replaceChildren();

  if (!rows.length) {
    list.append(
      node(
        'div',
        'empty',
        el('search').value.trim()
          ? 'لا توجد نتائج مطابقة للبحث.'
          : view === 'today'
            ? 'لم يتم تسجيل تسليمات للعملاء اليوم بعد.'
            : 'لا توجد مهام حالية. ستظهر هنا الطلبات التي تسندها الإدارة إليك.'
      )
    );
  }

  if (view === 'today') {
    rows.forEach(order => list.append(card(order)));
  } else {
    Object.entries(stages).forEach(([key, info], index) => {
      const group = rows.filter(order => task(order) === key);

      if (!group.length) return;

      const title = node('h2', 'group-title');

      title.append(
        node('span', 'step-number', index + 1),
        document.createTextNode(
          info.title + ' · ' + group.length
        )
      );

      list.append(title);

      group.forEach(order => list.append(card(order)));
    });
  }

  controls();
}

async function api(options = {}) {
  const params = new URLSearchParams({
    format: 'json',
    view,
    page: String(page),
    q: el('search').value.trim()
  });

  const response = await fetch('/api/courier?' + params, {
    cache: 'no-store',
    credentials: 'same-origin',
    ...options
  });

  const contentType =
    response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    throw new Error(
      response.status === 401
        ? 'أعد فتح الصفحة وسجّل الدخول بحساب المندوب.'
        : 'تعذر قراءة رد السيرفر. حدّث الصفحة.'
    );
  }

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'تعذر تنفيذ العملية.');
  }

  return data;
}

async function load(silent = false) {
  if (busy) return;

  busy = true;
  controls();

  if (!silent) tell('');

  try {
    render(await api());
  } catch (error) {
    tell(error.message, true);

    el('status').textContent =
      'تعذر التحديث؛ البيانات الظاهرة قديمة.';
  } finally {
    finish();
  }
}

async function confirmStep(order, action) {
  if (
    busy ||
    !window.confirm(
      stages[action].button +
      '؟\nأكد فقط بعد تنفيذ الخطوة فعليًا.'
    )
  ) {
    return;
  }

  busy = true;
  controls();
  tell('');

  let saved = false;

  try {
    await api({
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Action': 'courier-handoff'
      },
      body: JSON.stringify({
        id: order._id,
        version: order.workflowVersion || 0,
        action
      })
    });

    saved = true;

    render(await api());

    tell(
      action === 'drop_center'
        ? 'تم تسليم الجهاز للصيانة. اختفى من مهامك حتى تعيد الإدارة إسناده إليك.'
        : action === 'deliver_client'
          ? 'تم التسليم بنجاح. ستجد الطلب في «تم تسليمها اليوم».'
          : 'تم تسجيل الخطوة، وظهر زر المرحلة التالية.'
    );
  } catch (error) {
    tell(
      (
        saved
          ? 'تم حفظ الخطوة، لكن تعذّر تحديث العرض. '
          : ''
      ) + error.message,
      true
    );
  } finally {
    finish();
  }
}

el('refresh').addEventListener('click', () => load());

for (const name of ['active', 'today']) {
  el(name + 'Tab').addEventListener('click', () => {
    if (busy) return;

    view = name;
    page = 1;
    load();
  });
}

el('search').addEventListener('input', () => {
  clearTimeout(timer);

  timer = setTimeout(() => {
    if (busy) {
      pending = true;
      return;
    }

    page = 1;
    load();
  }, 350);
});

el('prev').addEventListener('click', () => {
  if (!busy && page > 1) {
    page--;
    load();
  }
});

el('next').addEventListener('click', () => {
  if (!busy && page < pages) {
    page++;
    load();
  }
});

setInterval(() => {
  if (
    !busy &&
    !document.hidden &&
    document.activeElement !== el('search')
  ) {
    load(true);
  }
}, 15000);

load();
</script>
</body>
</html>
`;

export default app;