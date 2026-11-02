# Multi Therapy - Vercel Frontend

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
- POST /api/auth/send-otp
- POST /api/auth/verify-otp
- POST /api/resend-signup-otp
- POST /api/verify-signup-otp

## OTP AUTH & Resend Email Configuration (Signup, Doctors, Patients & Therapists Tab OTP)
To send email OTPs for Signups, Doctors, Patients, and Therapists via **Resend.com & OTP AUTH APIs**:
1. Get an API key from [resend.com/api-keys](https://resend.com/api-keys).
2. Set the environment variables in your Vercel project settings:
   - `RESEND_API_KEY`: Your Resend API key (`re_...`)
   - `RESEND_FROM_EMAIL`: Sender address (defaults to `Multi Therapy <onboarding@resend.dev>`)
3. Alternatively, you can click **⚡ Resend API Settings** in the UI to configure and store your key in the browser.
4. When registering via **Sign Up** or in the **Verify Signup OTP** tab:
   - Clicking **Send OTP** after filling in the details sends the 6-digit OTP code directly to the email address via `OTP AUTH APIs` (`/api/auth/send-otp` / `/api/send-otp-auth`).
   - Entering the 6-digit OTP code verifies and activates the account via `/api/auth/verify-otp`.
5. In Doctors, Patients, and Therapists tabs:
   - Filling the details and clicking **📧 Send OTP & Add Therapist** generates a secure 6-digit verification code and delivers it directly to the therapist's email address via Resend.com API (`/api/send-therapist-otp`).
   - The therapist profile is verified and saved only after entering the valid OTP code.


