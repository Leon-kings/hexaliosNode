const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Public routes
router.post("/register", authController.register);
router.post("/login", authController.login);

// Protected routes (require authentication)
// router.use(authController.protect);

// User self-management
router.get("/24624", authController.getMe);
router.put("/24762", authController.updateMe);
router.delete("/24762", authController.deleteMe);

// Admin-only routes
// router.use(authController.restrictTo("admin"));

// User management
router.route("/")
  .get(authController.getAllUsers);

router.route("/:id")
  .get(authController.getUser)
  .put(authController.updateUser)
  .delete(authController.deleteUser);

// Admin specific actions
router.put("/:id/make-admin", authController.updateUserToAdmin);
router.get("/stats", authController.getUserStats);

module.exports = router;