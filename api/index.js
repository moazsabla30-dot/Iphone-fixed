import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { sendPushToAdmins } from './push.js';

const app = express();

app.use(express.json());
app.use(cors());

const dbURI = process.env.MONGODB_URI;

let connectionPromise;

async function connectDB() {
  if (mongoose.connection.readyState === 1) return;

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(dbURI, {
      serverSelectionTimeoutMS: 10000
    }).catch(error => {
      connectionPromise = null;
      throw error;
    });
  }

  await connectionPromise;
}

const orderSchema = new mongoose.Schema({
  orderNo: String,
  model: String,
  selectedParts: Array,
  partNotes: Object,
  totalPrice: Number,
  details: Object,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Order =
  mongoose.models.Order ||
  mongoose.model('Order', orderSchema);

app.post('/api/orders', async (req, res) => {
  try {
    await connectDB();

    const newOrder = new Order(req.body);
    await newOrder.save();

    console.log(
      '📥 تم حفظ طلب جديد:',
      newOrder.orderNo
    );

    // إرسال الإشعار دون التأثير على حفظ الطلب
    try {
      await sendPushToAdmins({
        title: 'طلب جديد على Reset 📱',
        body: `تم استلام طلب جديد رقم ${newOrder.orderNo || ''}`,
        url: '/api/orders'
      });
    } catch (pushError) {
      console.error('New order push error:', pushError);
    }

    res.status(200).json({
      success: true,
      message: 'Success'
    });

  } catch (error) {
    console.error('❌ Error saving order:', error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api', (req, res) => {
  res.send('Backend is running on Vercel Serverless!');
});

export default app;