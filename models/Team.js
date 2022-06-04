const mongoose = require("mongoose");

const teamSchema = mongoose.Schema({
  teamID: { type: String, required: true, unique: true },
  teamMembers: [String],
  current: { type: Number, default: -1 },
  route: [
    {
      levelQuestion: String,
      qrCodeSolution: String,
      finCode: String,
      captchaQuestion: String,
      captchaAnswer: String,
      captcha: Boolean,
    },
  ],
  startQuestion: String,
  startAnswer: String,
  complete: { type: Boolean, default: false },
});

module.exports = mongoose.model("Teams", teamSchema);
