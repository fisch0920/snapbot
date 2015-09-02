module.exports = TelegramClient

var debug = require('debug')('snapbot:telegram-client')
var inherits = require('inherits')
var url = require('url')
var path = require('path')
var mime = require('mime')
var request = require('request')
var Telegram = require('node-telegram-bot')
var ChatClient = require('../lib/chat-client')
var utils = require('../lib/utils')

inherits(TelegramClient, ChatClient)

/**
 * TelegramClient
 *
 * @class
 * @param {Object} opts
 */
function TelegramClient (opts) {
  var self = this
  if (!(self instanceof TelegramClient)) return new TelegramClient(opts)
  ChatClient.call(self, opts)

  self.client = null
}

Object.defineProperty(TelegramClient.prototype, 'platform', {
  get: function () { return 'telegram' }
})

Object.defineProperty(TelegramClient.prototype, 'isSignedIn', {
  get: function () { return this.client && this._user }
})

Object.defineProperty(TelegramClient.prototype, 'username', {
  get: function () { return this._user && this._user.username }
})

Object.defineProperty(TelegramClient.prototype, 'user', {
  get: function () { return this._user }
})

Object.defineProperty(TelegramClient.prototype, 'lastMessageReceived', {
  get: function () { return this._lastMessageReceived }
})

Object.defineProperty(TelegramClient.prototype, 'lastMessageSent', {
  get: function () { return this._lastMessageSent }
})

TelegramClient.prototype.signIn = function (opts, cb) {
  var self = this

  if (!opts.token) {
    throw new Error('telegram bot token required')
  }

  utils.validateArgumentsCB(arguments, [
    {
      name: 'opts',
      fields: {
        token: String
      }
    }
  ])

  self.client = new Telegram(opts)
  self.getMe(null, cb)
}

TelegramClient.prototype._listenForUpdates = function () {
  var self = this

  if (!self.isSignedIn) {
    return cb('auth error; requires signIn')
  }

  self.client.on('
}

TelegramClient.prototype.getUpdatesPoll = function (opts, cb) {
  var self = this

}

TelegramClient.prototype.getUpdatesWebhook = function (opts, cb) {
  throw new Error('TODO: support telegram webhooks', opts, cb)
}

TelegramClient.prototype.stopUpdates = function (opts, cb) {
  var self = this

}

TelegramClient.prototype.getMe = function (opts, cb) {
  var self = this

  if (!self.client) {
    return cb('auth error; requires signIn')
  }

  self.client.getMe(function (err, result) {
    if (err) {
      return cb(err)
    }

    self.User.findOrCreate({
      id: result.id,
      username: result.username
    }, function (err, user) {
      self._user = user
      return cb(err, user)
    })
  })
}

TelegramClient.prototype.getUser = function (opts, cb) {
  var self = this

  // telegram bots can only interact with users they've encountered so far, so
  // if the desired user isn't in the database, we don't have any way of
  // querying the API for a user which may exist elsewhere.
  ChatClient.prototype.getUser.call(self, opts, cb)
}

TelegramClient.prototype.sendMessage = function (opts, cb) {
  var self = this

  utils.validateArgumentsCB(arguments, [
    {
      name: 'opts',
      fields: {
        recipient: self.User,
        replyToMessage: {
          type: self.Message,
          required: false
        },
        text: String
      }
    }
  ])

  self._sendMessage(self.client.sendPhoto, {
    'chat_id': opts.recipient.id,
    'reply_to_message_id': opts.replyToMessage && opts.replyToMessage.id,
    'text': opts.text
  }, opts, cb)
}

TelegramClient.prototype.sendPhoto = function (opts, cb) {
  var self = this

  utils.validateArgumentsCB(arguments, [
    {
      name: 'opts',
      fields: {
        recipient: self.User,
        replyToMessage: {
          type: self.Message,
          required: false
        },
        caption: {
          type: String,
          required: false
        },
        mediaURL: {
          type: String,
          required: false
        },
        mediaID: {
          type: String,
          required: false
        }
      }
    }
  ])

  var params = {
    'chat_id': opts.recipient.id,
    'reply_to_message_id': opts.replyToMessage && opts.replyToMessage.id,
    'caption': opts.caption,
    'file_id': opts.mediaID
  }

  function _sendMessage () {
    self._sendMessage(self.client.sendPhoto, params, opts, cb)
  }

  if (opts.mediaURL && !opts.mediaID) {
    var parsed = url.parse(opts.mediaURL)
    var filename = path.basename(parsed.pathname)

    params.files = {
      filename: filename,
      contentType: mime.lookup(filename),
      stream: request(opts.mediaURL, { encoding: null })
    }

    // send message with media stream attached as multipart/form-data
    _sendMessage()
  } else if (opts.mediaID) {
    // send message with pre-existing media
    _sendMessage()
  } else {
    throw new Error('TelegramClient.sendMessage requires either opts.mediaURL or opts.mediaID')
  }
}

TelegramClient.prototype._sendMessage = function (method, params, opts, cb) {
  var self = this

  if (!self.isSignedIn) {
    return cb('auth error; requires signIn')
  }

  var replyToMessage = opts.replyToMessage || { }

  method.call(self.client, params, function (err, result) {
    if (err) return cb(err)

    self.assert.equal(result.from.id, self._user.id)
    self.assert.equal(result.chat.id, opts.recipient.id)
    self.assert.equal(result.text, opts.text)

    if (replyToMessage.id) {
      self.assert.equal(result['reply_to_message'].id, replyToMessage.id)
    }

    self.Conversation.findOrCreate({
      id: result.chat.id,

      sender: self._user._id,
      senderID: self._user.id,

      recipients: [ opts.recipient._id ],
      recipientIDs: [ opts.recipient.id ]
    }, function (err, conversation) {
      if (err) return cb(err)

      if (replyToMessage.id) {
        self.assert.equal(replyToMessage.conversation, conversation._id)
      }

      var messageParams = {
        id: result['message_id'],

        conversation: conversation._id,
        conversationID: conversation.id,

        sender: self._user._id,
        senderID: result.from.id,

        replyToMessage: replyToMessage._id,
        replyToMessageID: replyToMessage.id,

        text: result.text,

        created: new Date(result.date)
      }

      if (method === self.client.sendPhoto) {
        self.assert(result.photo.length)

        messageParams.media = result.photo.map(function (photo) {
          self.assert(photo['file_id'])

          return {
            id: photo['file_id'],
            url: opts.mediaURL,
            type: 'image',
            width: photo.width,
            height: photo.height
          }
        })
      }

      self.Message.create(messageParams, function (err, message) {
        if (!err) {
          self._lastMessageSent = message
        }

        return cb(err, message)
      })
    })
  })
}
