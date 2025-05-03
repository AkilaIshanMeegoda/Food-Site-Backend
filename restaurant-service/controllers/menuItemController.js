const menuItemService = require("../services/menuItemService");
// controller for create a menu item
exports.createMenuItem = async (req, res) => {
    try {
        const menuItem = await menuItemService.createMenuItem(req.user.userId, req.body);
        res.status(201).json(menuItem);
    } catch (err) {
        res.status(500).json({ error: "Failed to create menu item" });
    }
};
// controller for get all menu items
exports.getMenuItems = async (req, res) => {
    try {
        const menuItems = await menuItemService.getMenuItems(req.user.userId);
        res.status(200).json(menuItems);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch menu items" });
    }
};
// controller for update a menu item
exports.updateMenuItem = async (req, res) => {
    try {
        const menuItem = await menuItemService.updateMenuItem(req.params.id, req.user.userId, req.body);
        res.status(200).json(menuItem);
    } catch (err) {
        res.status(500).json({ error: "Failed to update menu item" });
    }
};
// controller for delete a menu item
exports.deleteMenuItem = async (req, res) => {
    try {
        await menuItemService.deleteMenuItem(req.params.id, req.user.userId);
        res.status(200).json({ message: "Menu item deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete menu item" });
    }
};
// cotroller for view a menu item 
exports.viewMenuItem = async (req, res) => {
    try {
        console.log("check details", req.params.id, req.user.userId);
        const menuItem = await menuItemService.getMenuItem(req.params.id, req.user.userId);
        res.status(200).json(menuItem);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch menu item" });
    }
}
