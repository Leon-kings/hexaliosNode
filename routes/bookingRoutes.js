const express = require("express");
const bookingController = require("../controllers/bookingController");

const router = express.Router();

router
  .route("/")
  .get(bookingController.getAllBookings)
  .post(bookingController.createBooking);

router
  .route("/:id")
  .get(bookingController.getBooking)
  .patch(bookingController.updateBooking)
  .delete(bookingController.deleteBooking);

router.route("/:id/status").patch(bookingController.updateBookingStatus);

router.route("/status/:status").get(bookingController.getBookingsByStatus);

router.route("/stats").get(bookingController.getBookingStats);

router.route("/upcoming").get(bookingController.getUpcomingBookings);

module.exports = router;