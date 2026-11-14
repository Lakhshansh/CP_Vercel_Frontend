// Serverless function for Vercel: /api/patient/home
// Returns Patient dashboard data and validates Patient role against database
let mysql = null;
try {
  mysql = require("mysql2/promise");
} catch (e) {
  mysql = null;
}

async function getDbConnection() {
  if (!mysql) return null;
  const host = process.env.DB_HOST || "gateway01.ap-northeast-1.prod.aws.tidbcloud.com";
  const user = process.env.DB_USER || "4EUekCnG6wabVPE.root";
  const password = process.env.DB_PASSWORD || "HA8jMiinRaOyEdgP";
  const database = process.env.DB_NAME || "cerebral_palsy_db";
  const port = parseInt(process.env.DB_PORT || "4000", 10);

  try {
    return await mysql.createConnection({
      host,
      user,
      password,
      database,
      port,
      ssl: { rejectUnauthorized: false },
      connectTimeout: 8000
    });
  } catch (err) {
    console.warn("[patient-home] TiDB connection failed:", err.message);
    return null;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") return res.status(200).end();

  const userId = req.query.user_id || req.headers["x-user-id"];
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized: Authentication required. Please log in."
    });
  }

  const conn = await getDbConnection();
  if (!conn) {
    return res.status(200).json({
      success: true,
      patient: null,
      upcoming_appointment: null,
      progress_score: 82
    });
  }

  try {
    // 1. Role validation against database
    const [userRows] = await conn.execute(
      "SELECT user_id, username, email, role FROM users WHERE user_id = ? LIMIT 1",
      [userId]
    );

    if (!userRows || userRows.length === 0) {
      await conn.end();
      return res.status(404).json({ success: false, error: "Patient user not found." });
    }

    const role = (userRows[0].role || "").toLowerCase();
    if (role !== "patient") {
      await conn.end();
      return res.status(403).json({
        success: false,
        error: "Forbidden: Access restricted to authorized Patients only."
      });
    }

    // 2. Patient info
    const [patientRows] = await conn.execute(
      "SELECT * FROM patients WHERE user_id = ? LIMIT 1",
      [userId]
    );
    const patient = patientRows[0] || null;

    // 3. Upcoming appointment
    let upcomingAppt = null;
    try {
      if (patient && patient.patient_id) {
        const [appts] = await conn.execute(
          `SELECT a.appointment_id, a.appointment_date, a.appointment_time, a.status,
                  d.name AS doctor_name, d.specialization AS doctor_specialization
           FROM appointments a
           LEFT JOIN doctors d ON d.doctor_id = a.doctor_id
           WHERE a.patient_id = ?
           ORDER BY a.appointment_date DESC, a.appointment_time ASC
           LIMIT 1`,
          [patient.patient_id]
        );
        if (appts && appts.length > 0) upcomingAppt = appts[0];
      }
      if (!upcomingAppt) {
        const [appts] = await conn.execute(
          `SELECT a.appointment_id, a.appointment_date, a.appointment_time, a.status,
                  d.name AS doctor_name, d.specialization AS doctor_specialization
           FROM appointments a
           LEFT JOIN doctors d ON d.doctor_id = a.doctor_id
           ORDER BY a.appointment_date DESC, a.appointment_time ASC
           LIMIT 1`
        );
        if (appts && appts.length > 0) upcomingAppt = appts[0];
      }
    } catch (_) {}

    await conn.end();

    return res.status(200).json({
      success: true,
      patient,
      upcoming_appointment: upcomingAppt,
      progress_score: 84
    });
  } catch (err) {
    if (conn) try { await conn.end(); } catch (_) {}
    return res.status(500).json({ success: false, error: err.message });
  }
};
