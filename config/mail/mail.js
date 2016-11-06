var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');

module.exports = nodemailer.createTransport(smtpTransport({
    service:  'Mailgun',
    auth: {
		user: 'postmaster@sandboxae8ce01cd04b4d5f822e351064b8436e.mailgun.org',
        pass: '4ed25a8b51b5a735aaf5a1dc301cd317'  
    }
}));
