import mqtt from 'mqtt'
import * as dotenv from 'dotenv'
import Mail from 'nodemailer/lib/mailer'
import mongoose, { ConnectOptions } from 'mongoose'
import { getUserNotifications, sendGeneralEmail, sendNewBookingEmail, sendReminders } from './controllers/mail'
import { Booking } from './types/Booking'
dotenv.config()

export const client = mqtt.connect(
  (process.env.MQTT_URI as string) || 'mqtt://localhost:1883'
)

const mongoURI =
  process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/notificationDB'
mongoose.connect(
  mongoURI,
  { useNewUrlParser: true, useUnifiedTopology: true } as ConnectOptions,
  (err) => {
    // eslint-disable-next-line no-console
    if (err) console.log(err)
    // eslint-disable-next-line no-console
    console.log('Connected to MongoDB')
  }
)

client.on('connect', () => {
  client.subscribe('notifier/#')
})

client.on('message', async (topic, message) => {
  const request = await JSON.parse(message.toString())
  switch (topic) {
    case 'notifier/booking/new': {
      sendNewBookingEmail(request as Booking)
      break
    }
    case 'notifier/user/notifications': {
      const response = await getUserNotifications(request.email)
      client.publish(request.responseTopic, JSON.stringify(response), {qos: 1})
      break
    }
    case 'notifier/reminders': {
      await sendReminders(message)
    }
  }
})
