import transporter from "./nodemail.js";
import { generateOTPTemplate } from "./email_template.js";

export async function sendOTP(email, otp) {
  try {
    let mailOptions = {
      from: `"Facebook" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "OTP for Email Verification",
      html: generateOTPTemplate(otp),
    };

    await transporter.sendMail(mailOptions);
    console.log(`OTP sent to ${email}`);
    return true;
  } catch (error) {
    console.log("Error sending email:", error);
    return false;
  }
}
