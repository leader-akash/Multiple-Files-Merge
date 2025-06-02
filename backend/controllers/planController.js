const { Plan } = require('../modal/models');

const getPlans = async (req, res) => {
  try {
    const plans = await Plan.find();
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch plans: ${error.message}` });
  }
};

module.exports = { getPlans };