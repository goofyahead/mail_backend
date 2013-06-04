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
    imap.openBox('INBOX', true, cb);
  });
}

openInbox(function(err, mailbox) {
  var messagesList = {};
  var conversations = []; // {title: "check this out", messages: [ "asdfasdf", "asdfasdfsdf"]}
  var thread;
  if (err) die(err);
  imap.search([ 'ALL' ], function(err, results) {
    if (err) die(err);
    imap.fetch(results,
      { headers: true,
        cb: function(fetch) {
          fetch.on('message', function(msg) {
            console.log('Saw message no. ' + msg.seqno);
            msg.on('headers', function(hdrs) {
              console.log(msg.uid.toString().green);  
              if (hdrs['references']){
              conversations.push({subjet : hdrs['subject'] ? hdrs['subject'][0] : '', 
                messageId: util.normalizeMessageId(hdrs['message-id'][0].toString()),
                  references: util.parseReferences(hdrs['references'][0])});
            } else {
              conversations.push({subjet : hdrs['subject'] ? hdrs['subject'][0] : '', 
                messageId: util.normalizeMessageId(hdrs['message-id'][0].toString()),
                  references: []});
            }
              // console.log('Headers for no. ' + msg.seqno + ': ' + show(hdrs));
              console.log('Message ID '.red + hdrs['message-id'].toString().red);
            });
            msg.on('end', function() {

              console.log('Finished message no. ' + msg.seqno);
            });
          });
        }
      }, function(err) {
        if (err) throw err;
        console.log('Done fetching all messages!');

        var thread = mail.messageThread();
        var messages = conversations.map(
              function(message) {
                return mail.message(message.subject, message.messageId, message.references);
              });
        var root = thread.thread(messages);
        console.log(thread.groupBySubject(root));

        // var thread = mail.messageThread();
        // var messages = [
        //   mail.message("subject", "g", ["a", "b", "c"]),
        //   mail.message("subject", "h", ["a", "b", "c", "d"]),
        //   mail.message("subject", "i", ["a", "b", "c", "e", "f"])
        // ];
        // var root = thread.thread(messages);
        // console.log(root);
        // thread.groupBySubject(root);

        // var thread = mail.messageThread();
        // var root = thread.thread(conversations.map(
        //       function(message) {
        //         return mail.message(message.subject, message.messageId, message.references);
        //       }));
        // thread.groupBySubject(root);

        // var thread = mail.messageThread();
        // var idTable = thread.createIdTable(conversations.map(
        // function(message) {
        //   return mail.message(message.subject, message.messageId, message.references);
        // }));
        // thread.groupBySubject();

        // thread = mail.messageThread().thread(conversations.map(
        // function(message) {
        //   return mail.message(message.subject, message.messageId, message.references);
        // }));

        // console.log(thread);
        
        imap.logout();
      }
    );
  });
});