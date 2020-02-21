const nodemailer = require('nodemailer');
const sgTransport = require('nodemailer-sendgrid-transport');

var options = {
  auth: {
    api_key: process.env.SENDGRID_API_KEY
  }
}

var transporter = nodemailer.createTransport(sgTransport(options));

async function sendEmail(from, to, subject, text, html) {

    // Test transporter
    // let testAccount = await nodemailer.createTestAccount();
    // let transporter = nodemailer.createTransport({
    //     host: 'smtp.ethereal.email',
    //     port: 587,
    //     secure: false,
    //     auth: {
    //         user: testAccount.user,
    //         pass: testAccount.pass
    //     }
    // });

    let info = await transporter.sendMail({
        from: from, // '"Fred Foo 👻" <foo@example.com>'
        to: to, // list of receivers
        subject: subject, // Subject line
        text: text, // plain text body
        html: html // html body
    });
    if (process.env.NODE_ENV != 'production') {
        console.log('Message sent: %s', info.messageId);
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));        
    }
}

module.exports = {
    sendEmail: sendEmail
}