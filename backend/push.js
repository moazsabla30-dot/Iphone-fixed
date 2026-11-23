/*import mongoose from 'mongoose';
import webpush from 'web-push';*/

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// قاعدة بيانات اشتراكات الأجهزة
const subscriptionSchema = new mongoose.Schema({
  endpoint: {
    type: String,
    required: true,
    unique: true
  },
  subscription: {
    type: Object,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const PushSubscription =
  mongoose.models.PushSubscription ||
  mongoose.model('PushSubscription', subscriptionSchema);


// حفظ اشتراك جهاز جديد
export async function savePushSubscription(subscription) {
  await PushSubscription.findOneAndUpdate(
    { endpoint: subscription.endpoint },
    { subscription },
    { upsert: true, new: true }
  );
}


// حذف اشتراك جهاز
export async function deletePushSubscription(endpoint) {
  await PushSubscription.deleteOne({ endpoint });
}


// إرسال إشعار لكل الأجهزة المسجلة
export async function sendPushToAdmins(data) {
  try {
    const subscriptions = await PushSubscription.find();

    const results = await Promise.allSettled(
      subscriptions.map(async item => {
        try {
          await webpush.sendNotification(
            item.subscription,
            JSON.stringify(data)
          );
        } catch (error) {
          if (error.statusCode === 404 || error.statusCode === 410) {
            await PushSubscription.deleteOne({
              endpoint: item.endpoint
            });
          }

          throw error;
        }
      })
    );

    console.log(
      `Push notifications: ${results.filter(r => r.status === 'fulfilled').length} sent`
    );

  } catch (error) {
    console.error('Push notification error:', error);
  }
}
