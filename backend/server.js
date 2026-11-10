const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// الاتصال بقاعدة البيانات المحلية
const dbURI = 'mongodb+srv://moazsabla30_db_user:الباسوورد_بتاعك@cluster0.bpzg4hf.mongodb.net/ifix-db?retryWrites=true&w=majority';

mongoose.connect(dbURI)
  .then(() => console.log('✅ Connected to Local MongoDB Successfully!'))
  .catch((err) => console.log('❌ Connection Error:', err));

// تعريف شكل بيانات الطلب
const orderSchema = new mongoose.Schema({
  orderNo: String,
  model: String,
  selectedParts: Array,
  partNotes: Object,
  totalPrice: Number,
  details: Object,
  createdAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

// مسار استقبال الطلبات
app.post('/api/orders', async (req, res) => {
  try {
    const newOrder = new Order(req.body);
    await newOrder.save();
    console.log('📥 تم استلام طلب جديد وحفظه في MongoDB:', req.body.orderNo);
    res.status(200).send('Success');
  } catch (error) {
    console.error('❌ Error saving order:', error);
    res.status(500).send('Error');
  }
});

app.get('/', (req, res) => {
  res.send('Backend is running offline!');
});

app.listen(5000, () => {
  console.log('🚀 Server is running on port 5000');
});