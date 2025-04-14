const restaurantService = require("../services/restaurantService");

exports.createRestaurant = async (req, res) => {
    const restaurantData = {name, address, phone, email} = req.body;
    try {
        const restaurant = await restaurantService.createRestaurant(req.user.userId, restaurantData);
        res.status(201).json(restaurant);
    } catch (err) {
        res.status(500).json({ error: "Failed to create restaurant" });
    }
};

exports.getRestaurant = async (req, res) => {
    try {
        const restaurant = await restaurantService.getRestaurant(req.user.userId);
        res.status(200).json(restaurant);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch restaurant" });
    }
};

exports.updateRestaurant = async (req, res) => {
    try {
        const restaurant = await restaurantService.updateRestaurant(req.params.id, req.user.userId, req.body);
        res.status(200).json(restaurant);
    } catch (err) {
        res.status(500).json({ error: "Failed to update restaurant" });
    }
};
