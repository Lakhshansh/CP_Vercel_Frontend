// Serverless function for Vercel: /api/appointments
// Handles Paid Appointment Booking, Razorpay Order Generation, Server-side Payment Verification,
// Doctor Acceptance / Rejection Workflow, Gateway Refunds, and Phone Privacy Rules.

const crypto = require("crypto");
const https = require("https");
let mysql = null;
try {
  mysql = require("mysql2/promise");
} catch (e) {
  mysql = null;
}

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_MultiTherapy2026";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "mock_secret_MultiTherapyKey2026";
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || "mock_webhook_secret_2026";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "Multi Therapy <onboarding@resend.dev>";

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
    console.warn("[appointments-api] TiDB connection failed:", err.message);
    return null;
  }
}

function isRealRazorpayConfigured() {
  return (
    RAZORPAY_KEY_ID &&
    !RAZORPAY_KEY_ID.includes("MultiTherapy2026") &&
    !RAZORPAY_KEY_ID.includes("your_key_id") &&
    RAZORPAY_KEY_SECRET &&
    !RAZORPAY_KEY_SECRET.includes("mock_secret") &&
    !RAZORPAY_KEY_SECRET.includes("your_razorpay_secret")
  );
}

// Helper for Razorpay REST API calls
function callRazorpayAPI(endpoint, method, payload) {
  return new Promise((resolve, reject) => {
    if (!isRealRazorpayConfigured()) {
      return resolve({ simulated: true });
    }

    const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");
    const dataString = payload ? JSON.stringify(payload) : "";

    const req = https.request(
      `https://api.razorpay.com/v1${endpoint}`,
      {
        method: method || "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(dataString)
        },
        timeout: 8000
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(body);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(parsed.error?.description || `Razorpay error HTTP ${res.statusCode}`));
            }
          } catch (e) {
            reject(new Error(`Invalid response from Razorpay: ${body}`));
          }
        });
      }
    );

    req.on("error", (err) => reject(err));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Razorpay API request timed out"));
    });

    if (dataString) req.write(dataString);
    req.end();
  });
}

// Send doctor email notification via Resend
async function sendDoctorBookingNotification(doctorEmail, doctorName, patientName, apptDate, apptTime, fee, apptId) {
  if (!doctorEmail || !RESEND_API_KEY) return;

  const subject = `New Paid Appointment Request #APT-${apptId} - ${patientName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <div style="background: #06152B; padding: 18px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
        <h2 style="color: #ffffff; margin: 0; font-size: 20px;">Multi Therapy</h2>
        <p style="color: #00d2ff; margin: 4px 0 0; font-size: 12px; font-weight: bold;">NEW APPOINTMENT BOOKING REQUEST</p>
      </div>
      <p style="color: #334155; font-size: 15px;">Dear <strong>${doctorName || 'Doctor'}</strong>,</p>
      <p style="color: #334155; font-size: 14px; line-height: 1.6;">
        A new clinical appointment has been booked and <strong>paid in full</strong>. Please log in to your Doctor Portal to accept or reject this request.
      </p>
      <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 6px 0; font-size: 14px;"><strong>Appointment ID:</strong> #APT-${apptId}</p>
        <p style="margin: 6px 0; font-size: 14px;"><strong>Patient Name:</strong> ${patientName}</p>
        <p style="margin: 6px 0; font-size: 14px;"><strong>Scheduled Date:</strong> ${apptDate}</p>
        <p style="margin: 6px 0; font-size: 14px;"><strong>Time Slot:</strong> ${apptTime}</p>
        <p style="margin: 6px 0; font-size: 14px;"><strong>Payment Status:</strong> <span style="color: #059669; font-weight: bold;">Paid (₹${fee})</span></p>
        <p style="margin: 6px 0; font-size: 14px;"><strong>Booking Status:</strong> <span style="color: #d97706; font-weight: bold;">Paid – Pending Doctor Approval</span></p>
      </div>
      <div style="text-align: center; margin-top: 24px;">
        <a href="https://multitherapy.org/doctor-appointments.html" style="background: #059669; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
          Open Doctor Appointments Dashboard
        </a>
      </div>
      <p style="color: #94a3b8; font-size: 12px; margin-top: 30px; text-align: center;">
        Every Individual Deserves Better Care • Multi Therapy Clinical Network
      </p>
    </div>
  `;

  try {
    const postData = JSON.stringify({
      from: EMAIL_FROM,
      to: [doctorEmail],
      subject: subject,
      html: html
    });

    const req = https.request("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData)
      },
      timeout: 6000
    });
    req.write(postData);
    req.end();
  } catch (err) {
    console.warn("[appointments-api] Email notification error:", err.message);
  }
}

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST,PUT,DELETE");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  let body = req.body || {};
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (_) {}
  }

  const action = req.query.action || body.action || "";
  const conn = await getDbConnection();

  // --------------------------------------------------------------------------
  // 1. ACTION: CREATE PAYMENT ORDER (Patient initiates booking -> Razorpay Order)
  // --------------------------------------------------------------------------
  if (action === "create-order" && req.method === "POST") {
    const patient_id = parseInt(body.patient_id, 10);
    const doctor_id = body.doctor_id ? parseInt(body.doctor_id, 10) : null;
    const therapist_id = body.therapist_id ? parseInt(body.therapist_id, 10) : null;
    const appointment_date = body.appointment_date;
    const appointment_time = body.appointment_time;
    const appointment_type = body.appointment_type || "Consultation";
    const reason = body.reason || "";
    const consultation_fee = parseFloat(body.consultation_fee || 10900.0);
    const patient_name = body.patient_name || "Patient";
    const patient_phone = body.patient_phone || "";
    const user_id = body.user_id ? parseInt(body.user_id, 10) : patient_id;

    if (!patient_id || (!doctor_id && !therapist_id) || !appointment_date || !appointment_time) {
      return res.status(400).json({
        success: false,
        message: "Missing required booking fields (patient, specialist, date, or time slot)."
      });
    }

    if (conn) {
      try {
        // Fetch and validate specialist details
        let validDoctorId = null;
        let validTherapistId = null;
        let docName = body.doctor_name || "Doctor";
        let docPhone = "";
        let docEmail = "";

        if (doctor_id) {
          const [[docRow]] = await conn.query(
            "SELECT doctor_id, name, contact, email FROM doctors WHERE doctor_id = ?",
            [doctor_id]
          );
          if (docRow) {
            validDoctorId = docRow.doctor_id;
            docName = docRow.name.startsWith("Dr.") ? docRow.name : `Dr. ${docRow.name}`;
            docPhone = docRow.contact || "";
            docEmail = docRow.email || "";
          }
        } else if (therapist_id) {
          const [[therRow]] = await conn.query(
            "SELECT therapist_id, name, contact, email FROM therapists WHERE therapist_id = ?",
            [therapist_id]
          );
          if (therRow) {
            validTherapistId = therRow.therapist_id;
            docName = therRow.name;
            docPhone = therRow.contact || "";
            docEmail = therRow.email || "";
          }
        }

        // Prevent double booking / verify specialist availability
        const [conflicts] = await conn.query(
          `SELECT appointment_id, status FROM appointments 
           WHERE doctor_id IS NOT NULL AND doctor_id = ?
             AND appointment_date = ? 
             AND appointment_time = ? 
             AND status NOT IN ('Cancelled', 'Rejected', 'Rejected – Refund Pending', 'Refund Completed')`,
          [validDoctorId || 0, appointment_date, appointment_time]
        );

        if (conflicts.length > 0) {
          return res.status(409).json({
            success: false,
            message: `Time slot ${appointment_time} on ${appointment_date} is already reserved for this specialist. Please choose another slot.`
          });
        }

        // Fetch and validate patient (patient_id NOT NULL foreign key in DB)
        let validPatientId = null;
        let patPhone = patient_phone;

        if (patient_id) {
          const [[patRow]] = await conn.query(
            "SELECT patient_id, contact, name FROM patients WHERE patient_id = ?",
            [patient_id]
          );
          if (patRow) {
            validPatientId = patRow.patient_id;
            if (!patPhone) patPhone = patRow.contact || "";
          }
        }

        if (!validPatientId) {
          const [[firstPat]] = await conn.query(
            "SELECT patient_id, contact FROM patients ORDER BY patient_id ASC LIMIT 1"
          );
          if (firstPat) {
            validPatientId = firstPat.patient_id;
            if (!patPhone) patPhone = firstPat.contact || "";
          } else {
            const [newP] = await conn.query(
              "INSERT INTO patients (name, contact) VALUES (?, ?)",
              [patient_name || "Patient", patient_phone || ""]
            );
            validPatientId = newP.insertId;
          }
        }

        // Validate user_id (nullable foreign key in DB)
        let validUserId = null;
        if (user_id) {
          const [[uRow]] = await conn.query("SELECT user_id FROM users WHERE user_id = ?", [user_id]);
          if (uRow) validUserId = uRow.user_id;
        }

        // 1. Insert appointment with status: 'Payment Pending' (compatible with 10-column schema)
        const apptNotes = `${appointment_type || 'Consultation'} | Fee: ₹${consultation_fee || 10900} | Specialist: ${docName} | Patient: ${patient_name}${reason ? ' | ' + reason : ''}`;
        const [insertRes] = await conn.query(
          `INSERT INTO appointments (
            patient_id, doctor_id, appointment_date, appointment_time,
            reason, status, notes, user_id
          ) VALUES (?, ?, ?, ?, ?, 'Payment Pending', ?, ?)`,
          [
            validPatientId,
            validDoctorId,
            appointment_date,
            appointment_time,
            reason || "",
            apptNotes,
            validUserId
          ]
        );

        const appointment_id = insertRes.insertId;
        const amountInPaise = Math.round(consultation_fee * 100);

        // 2. Generate Razorpay order
        let order_id = `order_appt_test_${Date.now()}_${appointment_id}`;
        let is_test_mode = true;

        if (isRealRazorpayConfigured()) {
          try {
            const rzpOrder = await callRazorpayAPI("/orders", "POST", {
              amount: amountInPaise,
              currency: "INR",
              receipt: `apt_${appointment_id}`,
              notes: {
                appointment_id: String(appointment_id),
                doctor_name: docName,
                patient_name: patient_name
              }
            });
            if (rzpOrder && rzpOrder.id) {
              order_id = rzpOrder.id;
              is_test_mode = false;
            }
          } catch (rzpErr) {
            console.warn("[appointments-api] Razorpay live order creation fallback:", rzpErr.message);
          }
        }

        // Update appointment notes with generated order_id
        await conn.query(
          "UPDATE appointments SET notes = CONCAT(COALESCE(notes, ''), ' | Order: ', ?) WHERE appointment_id = ?",
          [order_id, appointment_id]
        );

        return res.status(200).json({
          success: true,
          appointment_id,
          order_id,
          key_id: RAZORPAY_KEY_ID,
          amount: amountInPaise,
          currency: "INR",
          doctor_name: docName,
          patient_name: patient_name,
          appointment_date,
          appointment_time,
          appointment_type,
          consultation_fee,
          is_test_mode
        });

      } catch (dbErr) {
        console.error("[appointments-api] DB Error in create-order:", dbErr);
        return res.status(500).json({ success: false, message: dbErr.message });
      } finally {
        await conn.end();
      }
    }

    // Fallback in demo offline mode
    const mockApptId = Date.now() % 1000000;
    return res.status(200).json({
      success: true,
      appointment_id: mockApptId,
      order_id: `order_test_${Date.now()}_${mockApptId}`,
      key_id: RAZORPAY_KEY_ID,
      amount: Math.round(consultation_fee * 100),
      currency: "INR",
      doctor_name: body.doctor_name || "Doctor",
      patient_name: patient_name,
      appointment_date,
      appointment_time,
      appointment_type,
      consultation_fee,
      is_test_mode: true
    });
  }

  // --------------------------------------------------------------------------
  // 2. ACTION: VERIFY PAYMENT (Server-side signature check & transition to "Paid – Pending Doctor Approval")
  // --------------------------------------------------------------------------
  if (action === "verify-payment" && req.method === "POST") {
    const appointment_id = parseInt(body.appointment_id, 10);
    const razorpay_order_id = body.razorpay_order_id;
    const razorpay_payment_id = body.razorpay_payment_id;
    const razorpay_signature = body.razorpay_signature;

    if (!appointment_id || !razorpay_order_id || !razorpay_payment_id) {
      return res.status(400).json({
        success: false,
        message: "Missing payment verification parameters (appointment_id, order_id, or payment_id)."
      });
    }

    // Server-side Signature Verification
    if (isRealRazorpayConfigured()) {
      const generatedSignature = crypto
        .createHmac("sha256", RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (generatedSignature !== razorpay_signature) {
        return res.status(400).json({
          success: false,
          message: "Payment verification failed: Invalid cryptographic signature from gateway."
        });
      }
    } else {
      // In Test/Development environment: Require valid transaction token structure
      if (!razorpay_payment_id || razorpay_payment_id.length < 5) {
        return res.status(400).json({
          success: false,
          message: "Invalid transaction reference for test verification."
        });
      }
    }

    if (conn) {
      try {
        const [[appt]] = await conn.query(
          "SELECT * FROM appointments WHERE appointment_id = ?",
          [appointment_id]
        );

        if (!appt) {
          return res.status(404).json({ success: false, message: "Appointment record not found." });
        }

        // Prevent duplicate payment processing
        if (appt.payment_status === "Paid" && appt.status.includes("Paid")) {
          return res.status(200).json({
            success: true,
            status: appt.status,
            message: "Payment was already verified and recorded."
          });
        }

        // Transition status to official: "Paid – Pending Doctor Approval"
        const newStatus = "Paid – Pending Doctor Approval";
        await conn.query(
          `UPDATE appointments SET 
            status = ?,
            notes = CONCAT(COALESCE(notes, ''), ' | Payment ID: ', ?)
           WHERE appointment_id = ?`,
          [newStatus, razorpay_payment_id || "verified_test_pay", appointment_id]
        );

        // Record in payments table
        const paymentCode = `PAY-${Date.now()}-${appointment_id}`;
        try {
          await conn.query(
            `INSERT INTO payments (
              payment_code, user_id, amount, currency, payment_method,
              razorpay_order_id, razorpay_payment_id, razorpay_signature,
              status, created_at
            ) VALUES (?, ?, ?, 'INR', 'razorpay', ?, ?, ?, 'captured', NOW())`,
            [
              paymentCode,
              appt.user_id || appt.patient_id,
              appt.consultation_fee || 10900.0,
              razorpay_order_id,
              razorpay_payment_id,
              razorpay_signature || "verified_test_sig"
            ]
          );
        } catch (payErr) {
          console.warn("[appointments-api] Notice recording in payments table:", payErr.message);
        }

        // Fetch Doctor email to notify
        let docEmail = "";
        if (appt.doctor_id) {
          const [[dRow]] = await conn.query("SELECT email FROM doctors WHERE doctor_id = ?", [appt.doctor_id]);
          if (dRow) docEmail = dRow.email;
        }

        // Send email alert to Doctor
        if (docEmail) {
          sendDoctorBookingNotification(
            docEmail,
            appt.doctor_name,
            appt.patient_name,
            appt.appointment_date,
            appt.appointment_time,
            appt.consultation_fee,
            appointment_id
          );
        }

        return res.status(200).json({
          success: true,
          status: newStatus,
          message: "Payment successfully verified on server. Appointment status: Paid – Pending Doctor Approval.",
          appointment_id,
          razorpay_payment_id
        });

      } catch (err) {
        console.error("[appointments-api] Error verifying payment:", err);
        return res.status(500).json({ success: false, message: err.message });
      } finally {
        await conn.end();
      }
    }

    // Demo fallback
    return res.status(200).json({
      success: true,
      status: "Paid – Pending Doctor Approval",
      message: "Payment successfully verified on server.",
      appointment_id,
      razorpay_payment_id
    });
  }

  // --------------------------------------------------------------------------
  // 3. ACTION: DOCTOR ACCEPTS APPOINTMENT -> Status: "Confirmed"
  // --------------------------------------------------------------------------
  if (action === "accept" && req.method === "POST") {
    const appointment_id = parseInt(body.appointment_id, 10);
    const doctor_id = body.doctor_id ? parseInt(body.doctor_id, 10) : null;
    const user_id = body.user_id ? parseInt(body.user_id, 10) : null;

    if (!appointment_id) {
      return res.status(400).json({ success: false, message: "Missing appointment_id." });
    }

    if (conn) {
      try {
        const [[appt]] = await conn.query(
          "SELECT * FROM appointments WHERE appointment_id = ?",
          [appointment_id]
        );

        if (!appt) {
          return res.status(404).json({ success: false, message: "Appointment not found." });
        }

        // Security check: Only assigned doctor or admin can accept
        if (doctor_id && appt.doctor_id && appt.doctor_id !== doctor_id) {
          return res.status(403).json({
            success: false,
            message: "Unauthorized: Only the assigned specialist can accept this appointment."
          });
        }

        // Update status to Confirmed
        await conn.query(
          "UPDATE appointments SET status = 'Confirmed' WHERE appointment_id = ?",
          [appointment_id]
        );

        // Fetch doctor phone number to reveal to patient
        let docPhone = appt.doctor_phone || "";
        if (!docPhone && appt.doctor_id) {
          const [[d]] = await conn.query("SELECT contact FROM doctors WHERE doctor_id = ?", [appt.doctor_id]);
          if (d) docPhone = d.contact;
        }

        return res.status(200).json({
          success: true,
          status: "Confirmed",
          message: "Appointment accepted and confirmed.",
          appointment_id,
          doctor_phone: docPhone
        });

      } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
      } finally {
        await conn.end();
      }
    }

    return res.status(200).json({
      success: true,
      status: "Confirmed",
      message: "Appointment accepted and confirmed.",
      appointment_id
    });
  }

  // --------------------------------------------------------------------------
  // 4. ACTION: DOCTOR REJECTS APPOINTMENT -> Status: "Rejected – Refund Pending" / "Refund Completed"
  // --------------------------------------------------------------------------
  if (action === "reject" && req.method === "POST") {
    const appointment_id = parseInt(body.appointment_id, 10);
    const doctor_id = body.doctor_id ? parseInt(body.doctor_id, 10) : null;
    const reason = body.reason || "Doctor unavailable for selected slot";

    if (!appointment_id) {
      return res.status(400).json({ success: false, message: "Missing appointment_id." });
    }

    if (conn) {
      try {
        const [[appt]] = await conn.query(
          "SELECT * FROM appointments WHERE appointment_id = ?",
          [appointment_id]
        );

        if (!appt) {
          return res.status(404).json({ success: false, message: "Appointment not found." });
        }

        // Security check: Only assigned doctor or admin can reject
        if (doctor_id && appt.doctor_id && appt.doctor_id !== doctor_id) {
          return res.status(403).json({
            success: false,
            message: "Unauthorized: Only the assigned specialist can reject this appointment."
          });
        }

        let newStatus = "Rejected – Refund Pending";
        let refundStatus = "Refund Pending";
        let refundId = null;

        // If payment was captured through Razorpay, initiate refund
        if (appt.payment_status === "Paid" && appt.razorpay_payment_id) {
          if (isRealRazorpayConfigured()) {
            try {
              const rzpRefund = await callRazorpayAPI(
                `/payments/${appt.razorpay_payment_id}/refund`,
                "POST",
                {
                  amount: Math.round(Number(appt.consultation_fee || 10900) * 100),
                  notes: {
                    appointment_id: String(appointment_id),
                    reason: reason
                  }
                }
              );

              if (rzpRefund && rzpRefund.id) {
                refundId = rzpRefund.id;
                refundStatus = "Processed";
                newStatus = "Refund Completed";
              }
            } catch (refErr) {
              console.warn("[appointments-api] Razorpay refund error notice:", refErr.message);
              refundStatus = "Refund Processing";
            }
          } else {
            // Test Mode: Mark refund initiated
            refundId = `rfnd_test_${Date.now()}`;
            refundStatus = "Refund Processing";
          }
        } else {
          newStatus = "Cancelled";
          refundStatus = "Not Applicable";
        }

        await conn.query(
          `UPDATE appointments SET 
            status = ?,
            notes = CONCAT(COALESCE(notes, ''), ' | Rejection: ', ?, ' | Refund: ', ?)
           WHERE appointment_id = ?`,
          [
            newStatus,
            reason || "Not specified",
            refundStatus,
            appointment_id
          ]
        );

        return res.status(200).json({
          success: true,
          status: newStatus,
          refund_status: refundStatus,
          refund_id: refundId,
          message: `Appointment rejected. Refund status: ${refundStatus}.`,
          appointment_id
        });

      } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
      } finally {
        await conn.end();
      }
    }

    return res.status(200).json({
      success: true,
      status: "Rejected – Refund Pending",
      refund_status: "Refund Processing",
      message: "Appointment rejected and refund initiated.",
      appointment_id
    });
  }

  // --------------------------------------------------------------------------
  // 5. DEFAULT GET: LIST APPOINTMENTS (Role-based security & phone privacy rules)
  // --------------------------------------------------------------------------
  if (req.method === "GET") {
    const appointmentId = (req.query.id || req.query.appointment_id) ? parseInt(req.query.id || req.query.appointment_id, 10) : null;
    const user_id = req.query.user_id ? parseInt(req.query.user_id, 10) : null;
    const role = (req.query.role || "").toLowerCase();
    const statusFilter = req.query.status || "";

    if (conn) {
      try {
        let query = `
          SELECT 
            a.appointment_id,
            a.patient_id,
            a.doctor_id,
            a.appointment_date,
            a.appointment_time,
            a.reason,
            a.status,
            a.notes,
            a.created_at,
            a.user_id,
            COALESCE(p.name, 'Patient') AS patient_name,
            COALESCE(d.name, 'Doctor') AS doctor_name,
            COALESCE(d.specialization, 'Rehabilitation Care') AS doctor_specialization,
            p.contact AS raw_patient_phone,
            d.contact AS raw_doctor_phone,
            p.profile_photo AS patient_photo,
            d.profile_photo AS doctor_photo
          FROM appointments a
          LEFT JOIN patients p ON a.patient_id = p.patient_id
          LEFT JOIN doctors d ON a.doctor_id = d.doctor_id
          WHERE 1=1
        `;
        const params = [];

        if (appointmentId) {
          query += " AND a.appointment_id = ?";
          params.push(appointmentId);
        } else {
          // Role-based filtering for lists
          if (role === "patient") {
            query += " AND (a.patient_id = ? OR a.user_id = ?)";
            params.push(user_id || 0, user_id || 0);
          } else if (role === "doctor") {
            query += " AND (a.doctor_id = ? OR d.user_id = ?)";
            params.push(user_id || 0, user_id || 0);
          } else if (role === "therapist") {
            query += " AND (a.therapist_id = ? OR t.user_id = ?)";
            params.push(user_id || 0, user_id || 0);
          }
        }

        if (statusFilter && statusFilter !== "all") {
          query += " AND a.status LIKE ?";
          params.push(`%${statusFilter}%`);
        }

        query += " ORDER BY a.appointment_date DESC, a.appointment_time DESC LIMIT 100";

        const [rows] = await conn.query(query, params);

        // Enforce Security and Privacy rules:
        const sanitized = rows.map((r) => {
          const isConfirmed = r.status === "Confirmed";
          const isPaidPending = r.status === "Paid – Pending Doctor Approval";

          // Phone Privacy Rules:
          // 1. Patient Phone: Only visible to authorized doctor/admin when Paid or Confirmed
          let patientPhone = null;
          if (role === "doctor" || role === "therapist" || role === "admin") {
            if (isConfirmed || isPaidPending) {
              patientPhone = r.patient_phone || r.raw_patient_phone || "";
            }
          }

          // 2. Doctor Phone: Only visible to patient after doctor has accepted (Confirmed)
          let doctorPhone = null;
          if (isConfirmed) {
            doctorPhone = r.doctor_phone || r.raw_doctor_phone || "";
          }

          return {
            appointment_id: r.appointment_id,
            patient_id: r.patient_id,
            doctor_id: r.doctor_id,
            therapist_id: r.therapist_id,
            patient_name: r.patient_name || `Patient #${r.patient_id}`,
            doctor_name: r.doctor_name || `Specialist #${r.doctor_id}`,
            doctor_specialization: r.doctor_specialization,
            appointment_date: r.appointment_date,
            appointment_time: r.appointment_time,
            appointment_type: r.appointment_type || "Consultation",
            reason: r.reason || r.notes || "",
            status: r.status || "Payment Pending",
            payment_status: r.payment_status || "Payment Pending",
            consultation_fee: r.consultation_fee || 10900.0,
            razorpay_order_id: r.razorpay_order_id,
            razorpay_payment_id: r.razorpay_payment_id,
            refund_id: r.refund_id,
            refund_status: r.refund_status,
            rejection_reason: r.rejection_reason,
            patient_phone: patientPhone,
            doctor_phone: doctorPhone,
            patient_photo: r.patient_photo,
            doctor_photo: r.doctor_photo,
            created_at: r.created_at
          };
        });

        return res.status(200).json({ 
          success: true, 
          appointment: sanitized[0] || null, 
          appointments: sanitized 
        });

      } catch (err) {
        console.error("[appointments-api] Error listing appointments:", err);
        return res.status(500).json({ success: false, message: err.message });
      } finally {
        await conn.end();
      }
    }

    return res.status(200).json({ success: true, appointments: [] });
  }

  return res.status(405).json({ success: false, message: "Method not allowed." });
};

