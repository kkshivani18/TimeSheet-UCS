const express = require('express')
const router = express.Router();
const Holiday = require('../models/paidHolidays');

// add a new holiday
router.post('/', async (req, res) => {
  try {
    const { createdBy, date, description, year } = req.body;
    const holiday = new Holiday({ createdBy, date, description, year });
    await holiday.save();
    res.status(201).json(holiday);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const holidays = await Holiday.find({ year: currentYear });
    res.json(holidays);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// get all holidays of a year
router.get('/:year', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const holidays = await Holiday.find({ year });
    res.json(holidays);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;