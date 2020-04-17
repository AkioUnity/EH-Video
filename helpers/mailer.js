const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendEmail(from, to, subject, text, html) {

    const msg = {
        to: to,
        from: from,
        subject: subject,
        text: text,
        html:html,
    };
    sgMail.send(msg);
    console.log(msg);
}

module.exports = {
    sendEmail: sendEmail
}
