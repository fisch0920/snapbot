module.exports = function (mongoose) {
  var MessageSchema = new mongoose.Schema({
    id: { type: String, required: true, index: true },

    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    senderID: { type: String },

    recipients: [ { type: mongoose.Schema.Types.ObjectId, ref: 'User' } ],
    recipientIDs: [ { type: String } ],

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

  return mongoose.model('Message', MessageSchema)
}
