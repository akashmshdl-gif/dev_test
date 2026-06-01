const epicPatientService = require("../services/epicPatientService");

const getPatientDataById = async (req, res) => {
  try {
    const response = await epicPatientService.getPatientDataById(req.query.patientId);
    return res.status(response?.status?.code || 200).json(response);
  } catch (error) {
    console.error("Error fetching patient data by id:", error.message);
    return res.status(error.statusCode || 500).json({
      status: {
        code: error.statusCode || 500,
        message: error.message || "Internal server error"
      }
    });
  }
};

const getPatientPrefetchData = async (req, res) => {
  try {
    const response = await epicPatientService.getPatientPrefetchData(req.query);
    return res.status(response?.status?.code || 200).json(response);
  } catch (error) {
    console.error("Error fetching patient prefetch data:", error.message);
    return res.status(error.statusCode || 500).json({
      status: {
        code: error.statusCode || 500,
        message: error.message || "Internal server error"
      }
    });
  }
};

const getAllPatientList = async (req, res) => {
  try {
    const response = await epicPatientService.getAllPatientList(req.query);
    
    // Allow downloading as a file to prevent Swagger UI from crashing on large data
    if (req.query.download === 'true') {
      res.setHeader('Content-Disposition', 'attachment; filename=patient_list.txt');
      res.setHeader('Content-Type', 'text/plain');
      return res.status(response?.status?.code || 200).send(JSON.stringify(response, null, 2));
    }
    
    return res.status(response?.status?.code || 200).json(response);
  } catch (error) {
    console.error("Error fetching patient list:", error.message);
    return res.status(error.statusCode || 500).json({
      status: {
        code: error.statusCode || 500,
        message: error.message || "Internal server error"
      }
    });
  }
};

module.exports = { getAllPatientList, getPatientDataById, getPatientPrefetchData };
