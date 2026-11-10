import app from './index.js';
import mongoose from 'mongoose';
import { createHash, timingSafeEqual } from 'node:crypto';

function matches(a, b) {
  const hash = value =>
    createHash('sha256').update(String(value)).digest();

  return timingSafeEqual(hash(a), hash(b));
}

function adminOnly(req, res, next) {
  res.set('Cache-Control', 'no-store');

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

// عرض لوحة الإدارة والطلبات بعد تسجيل الدخول فقط.
// استقبال طلبات العملاء يظل موجودًا في index.js.
app.get('/api/orders', adminOnly, async (req, res) => {
  if (req.query.format !== 'json') {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('Referrer-Policy', 'no-referrer');
    return res.type('html').send(adminPage);
  }

  try {
    await connectDatabase();

    const orders = await mongoose.connection
      .collection('orders')
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
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    res.json({ success: true, orders });
  } catch (error) {
    console.error('Admin orders error:', error);
    res.status(500).json({
      success: false,
      error: 'تعذر تحميل الطلبات.'
    });
  }
});

const adminPage = `
<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport"
        content="width=device-width,initial-scale=1">
  <title>طلبات iFix</title>
  <style>
    * { box-sizing: border-box; }

    body {
      margin: 0;
      background: #f3f5f8;
      color: #172033;
      font-family: Arial, sans-serif;
      line-height: 1.7;
    }

    main {
      max-width: 1000px;
      margin: auto;
      padding: 24px 16px;
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    h1 { font-size: 26px; margin-bottom: 0; }
    .muted { color: #657084; }

    button {
      border: 0;
      border-radius: 10px;
      padding: 12px 20px;
      background: #172033;
      color: white;
      cursor: pointer;
      font-size: 16px;
    }

    button:disabled {
      opacity: .5;
      cursor: wait;
    }

    input {
      width: 100%;
      padding: 14px;
      margin: 16px 0;
      border: 1px solid #d6dce5;
      border-radius: 10px;
      font-size: 16px;
    }

    article {
      background: white;
      border: 1px solid #e1e6ed;
      border-radius: 16px;
      padding: 20px;
      margin: 16px 0;
      overflow-wrap: anywhere;
    }

    h2 {
      margin: 0 0 12px;
      font-size: 20px;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(2,minmax(0,1fr));
      gap: 12px 24px;
    }

    .field { white-space: pre-wrap; }

    .label {
      display: block;
      color: #657084;
      font-size: 14px;
    }

    .actions {
      display: flex;
      gap: 16px;
      margin-top: 16px;
    }

    a {
      color: #086f45;
      font-weight: bold;
      text-decoration: none;
    }

    #message { padding: 8px 0; }

    @media(max-width:600px) {
      .grid { grid-template-columns: 1fr; }
      h1 { font-size: 22px; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>طلبات iFix</h1>
        <div class="muted">
          آخر 100 طلب — الأحدث أولًا
        </div>
      </div>
      <button id="refresh">تحديث</button>
    </header>

    <input
      id="search"
      placeholder="ابحث بالاسم أو الهاتف أو رقم الطلب"
      aria-label="البحث في الطلبات"
    >

    <div id="message" role="status"></div>
    <section id="orders"></section>
  </main>

  <script>
    let orders = [];

    const container = document.getElementById('orders');
    const message = document.getElementById('message');
    const search = document.getElementById('search');
    const refresh = document.getElementById('refresh');

    function field(grid, label, value) {
      const box = document.createElement('div');
      box.className = 'field';

      const title = document.createElement('span');
      title.className = 'label';
      title.textContent = label;

      const content = document.createElement('div');
      content.textContent =
        value === undefined || value === null || value === ''
          ? '—'
          : String(value);

      box.append(title, content);
      grid.append(box);
    }

    function phoneDigits(value) {
      return String(value || '').replace(/[^0-9]/g, '');
    }

    function render() {
      container.replaceChildren();

      const query = search.value.trim().toLowerCase();

      const visible = orders.filter(order => {
        const d = order.details || {};

        return [
          order.orderNo,
          d.name,
          d.phone,
          d.whatsapp,
          d.address,
          order.model
        ].join(' ').toLowerCase().includes(query);
      });

      message.textContent = visible.length
        ? 'عدد الطلبات المعروضة: ' + visible.length
        : 'لا توجد طلبات مطابقة.';

      for (const order of visible) {
        const d = order.details || {};
        const card = document.createElement('article');

        const heading = document.createElement('h2');
        heading.textContent =
          order.orderNo || 'طلب بدون رقم';

        const grid = document.createElement('div');
        grid.className = 'grid';

        field(grid, 'اسم العميل', d.name);
        field(grid, 'رقم الهاتف', d.phone);
        field(grid, 'واتساب', d.whatsapp);
        field(grid, 'العنوان', d.address);
        field(grid, 'الجهاز', order.model);

        const parts = Array.isArray(order.selectedParts)
          ? order.selectedParts.join('، ')
          : '';

        field(grid, 'الإصلاحات المطلوبة', parts);

        const notes = Object.entries(order.partNotes || {})
          .map(([part, note]) =>
            part + ': ' + String(note)
          )
          .join('\\n');

        field(grid, 'ملاحظات الإصلاح', notes);
        field(grid, 'ملاحظات العميل', d.notes);
        field(grid, 'الإجمالي بالجنيه', order.totalPrice);

        const date = new Date(order.createdAt);

        field(
          grid,
          'تاريخ الطلب بتوقيت القاهرة',
          Number.isNaN(date.getTime())
            ? '—'
            : date.toLocaleString('ar-EG', {
                timeZone: 'Africa/Cairo'
              })
        );

        const actions = document.createElement('div');
        actions.className = 'actions';

        const phone = phoneDigits(d.phone);

        if (phone) {
          const call = document.createElement('a');
          call.href = 'tel:' + phone;
          call.textContent = 'اتصال بالعميل';
          actions.append(call);
        }

        let whatsapp = phoneDigits(
          d.whatsapp || d.phone
        );

        if (whatsapp.startsWith('00')) {
          whatsapp = whatsapp.slice(2);
        }

        if (
          whatsapp.length === 11 &&
          whatsapp.startsWith('01')
        ) {
          whatsapp = '2' + whatsapp;
        }

        if (whatsapp) {
          const link = document.createElement('a');
          link.href = 'https://wa.me/' + whatsapp;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = 'فتح واتساب';
          actions.append(link);
        }

        card.append(heading, grid, actions);
        container.append(card);
      }
    }

    async function loadOrders() {
      refresh.disabled = true;
      container.replaceChildren();
      message.textContent = 'جاري تحميل الطلبات…';

      try {
        const response = await fetch(
          '/api/orders?format=json',
          {
            cache: 'no-store',
            credentials: 'same-origin'
          }
        );

        if (!response.ok) {
          throw new Error(
            'تعذر تحميل الطلبات أو انتهى تسجيل الدخول.'
          );
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error('تعذر تحميل الطلبات.');
        }

        orders = data.orders;
        render();
      } catch (error) {
        message.textContent = error.message;
      } finally {
        refresh.disabled = false;
      }
    }

    search.addEventListener('input', render);
    refresh.addEventListener('click', loadOrders);

    loadOrders();
  </script>
</body>
</html>
`;

export default app;