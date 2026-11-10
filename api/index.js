const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// الاتصال بقاعدة البيانات على MongoDB Atlas
const dbURI = 'mongodb+srv://moazsabla30_db_user:moaz197197@cluster0.bpzg4hf.mongodb.net/ifix-db?retryWrites=true&w=majority';

// منع إعادة فتح اتصال جديد مع كل طلب (تخزين مؤقت للاتصال لسرعة الأداء)
let cachedDb = null;
async function connectDB() {
  if (cachedDb) return;
  const opts = { serverSelectionTimeoutMS: 5000 };
  cachedDb = await mongoose.connect(dbURI, opts);
  console.log('✅ Connected to MongoDB Successfully!');
}

// مسار استقبال الطلبات
app.post('/api/orders', async (req, res) => {
  try {
    await connectDB();
    const orderSchema = new mongoose.Schema({
      orderNo: String,
      model: String,
      selectedParts: Array,
      partNotes: Object,
      totalPrice: Number,
      details: Object,
      createdAt: { type: Date, default: Date.now }
    });
    
    // تجنب إعادة تعريف الـ Model لو موجود مسبقاً
    const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

    const newOrder = new Order(req.body);
    await newOrder.save();
    console.log('📥 تم استلام طلب جديد وحفظه في MongoDB:', req.body.orderNo);
    res.status(200).json({ success: true, message: 'Success' });
  } catch (error) {
    console.error('❌ Error saving order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api', (req, res) => {
  res.send('Backend is running on Vercel Serverless!');
});

// تصدير التطبيق ليعمل مع Vercel
module.exports = app;