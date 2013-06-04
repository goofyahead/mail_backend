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
  console.log(util.normalizeSubject("Fwd: Fwd: Subject for me").red);
  var messagesList = {};
  var conversations = []; // {title: "check this out", messages: [ "asdfasdf", "asdfasdfsdf"]}
  if (err) die(err);
  imap.search([ 'ALL' ], function(err, results) {
    if (err) die(err);
    imap.fetch(results,
      { headers: true,
        cb: function(fetch) {
          fetch.on('message', function(msg) {
            console.log('Saw message no. ' + msg.seqno);
            msg.on('headers', function(hdrs) {
              
              if (! messagesList[util.normalizeMessageId(hdrs['message-id'].toString())]) { //check if this UID has a container related
                related = null;
                
                if (hdrs['references']) {
                  util.parseReferences(hdrs['references'][0]).forEach(function (uid){
                    if (messagesList[uid]) {
                      related = messagesList[uid]; //there is a container related
                    }
                  });
                }

                if (related != null) { //fill the list and container with relations and myself
                  if (related.title == '' && hdrs['subject']) related.title = util.normalizeSubject(hdrs['subject'].toString());
                  util.parseReferences(hdrs['references'][0]).forEach(function (uid){
                    if (! _.contains(related.messages, uid)) related.messages.push(uid); // add refs to the container
                    if (! messagesList[uid]) messagesList[uid] = related;
                  });
                  messagesList[util.normalizeMessageId(hdrs['message-id'].toString())] = related;

                } else { //create a new one
                  var container = {title : '', messages : []};
                  container['messages'].push(util.normalizeMessageId(hdrs['message-id'].toString()).toString());
                  if (hdrs['subject']) container.title = util.normalizeSubject(hdrs['subject'].toString());
                  // link list with container
                  messagesList[util.normalizeMessageId(hdrs['message-id'].toString())] = container;
                  // add this container to conversations
                   if (hdrs['references']) {
                    util.parseReferences(hdrs['references'][0]).forEach(function (uid){ //add references
                    if (! _.contains(container.messages, uid)) container.messages.push(uid); // add refs to the container
                  });
                }
                  conversations.push(container);
                }
              }

              
            });
            msg.on('end', function() {
              console.log('Finished message no. ' + msg.seqno);
            });
          });
        }
      }, function(err) {
        if (err) throw err;
        console.log('Done fetching all messages!');
        console.log(conversations);
        imap.logout();
      }
    );
  });
});