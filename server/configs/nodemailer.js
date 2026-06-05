import nodemailer from 'nodemailer';

// SMTP-транспортер (Brevo). Для продакшену використовуйте змінні середовища.
const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false, // true для порту 465, false для порту 587
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const sendEmail = async ({to, subject, body}) => {
    const response = await transporter.sendMail({
        from: process.env.SENDER_EMAIL,
        to,
        subject,
        html: body,
    });
    return response
}

export default sendEmail
