const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
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
    enum: ['customer', 'restaurant_admin', 'delivery_personnel', 'super_admin'],
    required: true
  },
  restaurantId: {
    type: String,
    required: function() { return this.role === 'restaurant_admin'; }
  }
});

const User = mongoose.model("User", userSchema);

module.exports = User;
