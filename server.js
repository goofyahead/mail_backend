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
    imap.openBox('[Gmail]/All Mail', true, cb);
  });
}

openInbox(function(err, mailbox) {
  var messagesList = {};
  var conversations = []; // {title: "check this out", messages: [ "asdfasdf", "asdfasdfsdf"]}
  if (err) die(err);
  imap.search([ 'ALL' ], function(err, results) {
    if (err) die(err);
    imap.fetch(results,
      { headers: true,
        body: true,
        cb: function(fetch) {
          fetch.on('message', function(msg) {
            console.log('Saw message no. ' + msg.seqno);
            msg.on('headers', function(hdrs) {

              //check if this UID has a container related
              if (! messagesList[util.normalizeMessageId(hdrs['message-id'].toString())]) {
                var related = null;
                var references = [];
                // add in reply to to the references.
                if (hdrs['in-reply-to']) {
                  references.push(util.normalizeMessageId(hdrs['in-reply-to'][0].toString()));
                }

                //add references
                if (hdrs['references']) {
                  util.parseReferences(hdrs['references'][0]).forEach(function (elem){
                    references.push(elem);
                  });
                }

                //search for existing containers
                references.forEach(function (uid){
                    console.log(uid.green);
                    if (messagesList[uid]) {
                      related = messagesList[uid]; //there is a container related
                      return;
                    }
                });

                //container exists, fill the list and container with relations and myself
                if (related != null) {
                  // if doesnt have tittle set it.
                  if (related.title == '' && hdrs['subject']) related.title = util.normalizeSubject(hdrs['subject'].toString());

                  //iterate references and link them to this container
                  references.forEach(function (uid){
                    console.log(uid.green);
                    if (! _.contains(related.messages, uid)) related.messages.push(uid); // add refs to the container
                    if (! messagesList[uid]) messagesList[uid] = related;
                  });

                  //add this UID to the list and link to container
                  messagesList[util.normalizeMessageId(hdrs['message-id'].toString())] = related;

                } else { //there is not container for this message or any related message
                  //create a new container
                  var container = {title : '', messages : []};

                  //add myself
                  container['messages'].push(util.normalizeMessageId(hdrs['message-id'].toString()).toString());
                  //set subject
                  if (hdrs['subject']) container.title = util.normalizeSubject(hdrs['subject'].toString());
                  // link list with container
                  messagesList[util.normalizeMessageId(hdrs['message-id'].toString())] = container;
                  //add references
                  references.forEach(function (uid){ 
                    if (! _.contains(container.messages, uid)) container.messages.push(uid);
                  });
                
                  conversations.push(container);
                }
              } else {
                // do we need to add refs or check them if this message is already defined? maybe for reply-to?
                var container = messagesList[util.normalizeMessageId(hdrs['message-id'].toString())];
                var references = [];
                // add in reply to to the references.
                if (hdrs['in-reply-to']) {
                  references.push(util.normalizeMessageId(hdrs['in-reply-to'][0].toString()));
                }

                //add references
                if (hdrs['references']) {
                  util.parseReferences(hdrs['references'][0]).forEach(function (elem){
                    references.push(elem);
                  });
                }

                //search for existing containers
                //iterate references and link them to this container
                references.forEach(function (uid){
                  if (! _.contains(container.messages, uid)) container.messages.push(uid); // add refs to the container
                  if (! messagesList[uid]) messagesList[uid] = container;
                });
              }

              
            });

            msg.on('data', function(chunk) {
              body += chunk.toString('utf8');
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