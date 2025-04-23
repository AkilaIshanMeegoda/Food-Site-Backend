const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['customer', 'restaurant_admin', 'delivery_personnel'],
    required: true
  },
  restaurantId: {
    type: String,
    required: function() { return this.role === 'restaurant_admin'; }
  }
});

const User = mongoose.model("User", UserSchema);

module.exports = User;
