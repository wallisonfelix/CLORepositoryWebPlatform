var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');

module.exports = nodemailer.createTransport(smtpTransport({
    service:  'Mailgun',
    auth: {
		user: 'postmaster@sandboxXXXXXXXX.mailgun.org',
        pass: 'XXXXXXXXXXX'  
    }
}));
