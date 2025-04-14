const RestaurantService = require('../services/restaurantService');
const MenuItemService = require('../services/menuItemService');

// Controller for fetching all active restaurants
exports.getRestaurants = async (req, res) => {
    try {
        const restaurants = await RestaurantService.getActiveRestaurants();
        res.status(200).json(restaurants);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch restaurants" });
    }
};

// Controller for fetching menu items of a specific restaurant
exports.getMenuItemsByRestaurant = async (req, res) => {
    try {
        const menuItems = await MenuItemService.getMenuItemsByRestaurant(req.params.id);
        res.status(200).json(menuItems);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch menu items" });
    }
};

// Controller for fetching a specific restaurant's details
exports.getRestaurantById = async (req, res) => {
    try {
        const restaurant = await RestaurantService.getRestaurantById(req.params.id);
        res.status(200).json(restaurant);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch restaurant" });
    }
};

// Controller for fetching menu items by category
exports.getMenuItemsByCategory = async (req, res) => {
    try {
        const { id, category } = req.params;
        const menuItems = await MenuItemService.getMenuItemsByCategory(id, category);
        res.status(200).json(menuItems);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch menu items by category" });
    }
};

exports.getAllMenuItemsByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const menuItems = await MenuItemService.getAllMenuItemsByCategory(category);
        res.status(200).json(menuItems);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch menu items by category" });
    }
};

exports.getAllAvailableMenuItems = async (req, res) => {
    try {
        const menuItems = await MenuItemService.getAllAvailableMenuItems();
        console.log("check all items v", menuItems);
        res.status(200).json(menuItems);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch menu items" });
    }
};

exports.viewItemDetail = async (req, res) => {
    try {
        console.log("check details", req.params.id);
        const menuItem = await MenuItemService.viewItemDetail(req.params.id);
        res.status(200).json(menuItem);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch menu item" });
    }
}

