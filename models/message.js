var findOrCreate = require("mongoose-findorcreate")

module.exports = function (mongoose) {
  var messageSchema = new mongoose.Schema({
    // platform-dependent unique message identifier
    id: { type: String, required: true, index: true },

    // conversation this message belongs to
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
    conversationID: { type: String, required: true, index: true },

    // sender of this message
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    senderID: { type: String },

    // recipient(s) of this message
    recipients: [ { type: mongoose.Schema.Types.ObjectId, ref: 'User' } ],
    recipientIDs: [ { type: String } ],

    // reference to the original message this message is in response to (optional)
    replyToMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    replyToMessageID: { type: String },

    text: { type: String },

    media: {
      url: { type: String },
      mime: { type: String },

      width: { type: Number },
      height: { type: Number },

      duration: { type: Number },
      thumbnail: { type: String }
    },

    // text
    // image
    // video
    // audio
    type: { type: String },

    created: { type: Date, index: true }
  })

  messageSchema.plugin(findOrCreate)

  return mongoose.model('Message', messageSchema)
}
