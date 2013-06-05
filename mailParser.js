var MailParser = require("mailparser").MailParser,
    mailparser = new MailParser();
var colors = require('colors');
var _ = require('underscore');
var Imap = require('imap');
var inspect = require('util').inspect;
var mail = require('./lib/jwz');
var util = mail.helpers;


var imap = new Imap({
      user: 'alex@ark.com',
      password: '4L3j4ndr0',
      host: 'imap.gmail.com',
      port: 993,
      secure: true
    });

function show(obj) {
  return inspect(obj, false, Infinity);
}

function die(err) {
  console.log('Uh oh: ' + err);
  process.exit(1);
}

function openInbox(cb) {
  imap.connect(function(err) {
    if (err) die(err);
    imap.getBoxes(function (err, boxes){
      console.log(boxes);
    });
    imap.openBox('[Gmail]/All Mail', true, cb);
  });
}

openInbox(function(err, mailbox) {
  var messagesList = {};
  var conversations = []; // {title: "check this out", messages: [ "asdfasdf", "asdfasdfsdf"]}
  var thread;
  if (err) die(err);
  imap.search([ 'UNSEEN' ], function(err, results) {
    if (err) die(err);
    imap.fetch(results,
      { headers: true,
        cb: function(fetch) {
          fetch.on('message', function(msg) {
            
            msg.on('end', function() {
              // setup an event listener when the parsing finishes
				mailparser.on("end", function(mail_object){
				    console.log("From:", mail_object.from); //[{address:'sender@example.com',name:'Sender Name'}]
				    console.log("Subject:", mail_object.subject); // Hello world!
				    console.log("Text body:", mail_object.text); // How are you today?
				});

				// send the email source to the parser
				mailparser.write(msg);
				mailparser.end();
            });
          });
        }
      }, function(err) {
        if (err) throw err;
        console.log('Done fetching all messages!'); 
        console.log(messagesList);      
        imap.logout();
      }
    );
  });
});