# CP Management System - Vercel Frontend

This is the first Vercel-ready frontend layer extracted from the existing Flask project.

## Important
- Do NOT upload the original `.env` file to Vercel or GitHub.
- Do NOT upload the local MariaDB/MySQL data directory.
- The frontend expects a separate Flask API backend.
- Update `API_BASE_URL` in `js/api.js` after the Flask backend is deployed.

## Current API placeholders
- POST /api/login
- POST /api/signup
- POST /api/logout
- GET /api/me
- POST /api/doctors/send-otp
- POST /api/doctors/verify-otp

## Resend Email Configuration (Doctors & Patients Tab OTP)
To send email OTPs to doctors and patients via **resend.com APIs**:
1. Get an API key from [resend.com/api-keys](https://resend.com/api-keys).
2. Set the environment variables in your Vercel project settings:
   - `RESEND_API_KEY`: Your Resend API key (`re_...`)
   - `RESEND_FROM_EMAIL`: Sender address (defaults to `CP Healthcare <onboarding@resend.dev>`)
3. Alternatively, you can click **⚡ Resend API Settings** on the Doctors or Patients page in the UI to configure and store your key in the browser.
4. When adding a doctor or patient, clicking **Send OTP & Add** generates the OTP and delivers it directly to the email inbox using Resend.
5. After entering the 6-digit code in the modal, the profile is verified and saved.

