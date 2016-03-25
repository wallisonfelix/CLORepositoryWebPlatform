var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');

module.exports = nodemailer.createTransport(smtpTransport({
    service:  'Mailgun',
    auth: {
	user: 'postmaster@sandboxXXXXXXX.mailgun.org',
        pass: 'XXXXXXXXXXX'  
    }
}));
