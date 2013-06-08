//retrieve conversations from an account with received config and params
var colors = require('colors');
var _ = require('underscore');
var Imap = require('imap');
var inspect = require('util').inspect;
var configs = require('./configs');
var mail = require('./../lib/jwz');
var util = mail.helpers;
var async = require('async');


function show(obj) {
  return inspect(obj, false, Infinity);
}

function die(err) {
  console.log('Uh oh: ' + err);
  process.exit(1);
}

exports.retrieveConversations = function (req, res){
	var credentials = {};
	// obtain from headers credentials
	credentials['user'] = req.get('X-username');
	credentials['pass'] = req.get('X-password');

	// from domain obtain configuration
	var config = configs.getConfig(credentials['user']);

	var imap = new Imap({
      user: credentials.user,
      password: credentials.pass,
      host: config.host,
      port: config.port,
      secure: config.secure
    });

    var messagesList = {};
	var conversations = []; // {title: "check this out", messages: [ "asdfasdf", "asdfasdfsdf"]}

    configs.getBoxes(imap, credentials['user'], config, function () {
    
    var size = config.box.length;

	imap.connect(function(err) {
	    if (err) die(err);
	    async.eachSeries( config.box, function (box, cb) {
	    	imap.openBox(box, true, function (err, mailbox) {
	    		console.log('opening ');
				console.log(mailbox);

				if (mailbox.messages.total == 0){
					console.log('should skip'.red);
					cb(null);
				} 
				if (err) die(err);
				imap.search([ 'ALL' ], function(err, results) {
					if (err) die(err);
					imap.fetch(results, { headers: true,
						body: false,
						cb: function(fetch) {
						fetch.on('message', function(msg) {

							msg.on('headers', function(hdrs) {

								if (! messagesList[util.normalizeMessageId(hdrs['message-id'].toString())]) {
				                var related = null;
				                var references = [];
				                // add in reply to to the references.
				                if (hdrs['in-reply-to']) {
				                  references.push(util.normalizeMessageId(hdrs['in-reply-to'][0].toString()));
				                }

				                //add references
				                if (hdrs['references'] && util.parseReferences(hdrs['references'][0])) {
				                  util.parseReferences(hdrs['references'][0]).forEach(function (elem){
				                    references.push(elem);
				                  });
				                }

				                //search for existing containers
				                references.forEach(function (uid){
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
				                    if (! _.contains(related.messages, uid)) related.messages.push(uid); // add refs to the container
				                    if (! messagesList[uid]) messagesList[uid] = related;
				                  });

				                  //add this UID to the list and link to container
				                  related.messages.push(util.normalizeMessageId(hdrs['message-id'].toString()));
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

							}); //headers

				            msg.on('end', function() {
				              console.log('Finished message no. ' + msg.seqno);
				            });

		    			});
	    		}}, function(err) {
	    			cb(null);
	    		});
			});
			});
	    }, function (err) {
	    	console.log('Done fetching all messages!');
	        imap.logout();
	        console.log(conversations);
	        res.send('OK');
	    });

	    });//imap connect
    });
}