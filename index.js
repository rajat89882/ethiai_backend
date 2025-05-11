const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const cors = require("cors"); // Import cors
const app = express();
const PORT = 5000;
var md5 = require("md5");
const moment = require("moment");
const nodemailer = require("nodemailer");
const multer = require("multer");
const path = require("path");
const { Console } = require("console");
const Stripe = require("stripe");
const stripe = new Stripe(
  "sk_test_51Qx4QC2Mw3LdtP6u23AIw3NrZunf7Aii1xDZZNz8KfY3vyZeMlMsmX4HunPP1gbWKlgdN61EmJpAdImOyCy2eoXa00HJvZpxIE"
);
const { link } = require("fs");


app.use("/uploads", express.static("uploads"));
// Example backend API route

// Catch-all route to serve the frontend for any other routes (for client-side routing)

const db = mysql.createPool({
  connectionLimit: 10000, // Limits the number of simultaneous connections
  host: "ethiai-database.c1wskissc0gm.eu-north-1.rds.amazonaws.com",
  user: "ethiaiadmin",
  password: "Ethiai$Db2025",
  database: "ethiai_database",
  debug: false,
  connectTimeout: 10000,
});
// Use db.promise() for promise-based queries
const dbPromise = db.promise();

// Test the database connection
db.getConnection((err, connection) => {
  if (err) {
    // Handle specific error codes
    switch (err.code) {
      case "PROTOCOL_CONNECTION_LOST":
        console.error("Database connection was closed.");
        break;
      case "ER_CON_COUNT_ERROR":
        console.error("Database has too many connections.");
        break;
      case "ECONNREFUSED":
        console.error("Database connection was refused.");
        break;
      default:
        console.error("Database connection error:", err.message);
        break;
    }
    return; // Exit if there is an error
  }

  if (connection) {
    console.log("Database is connected successfully.");
    connection.release(); // Release the connection back to the pool
  }
});

const corsOptions = {
  origin: ["http://localhost:3000", "https://frontend.ethiai.io"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

// Apply CORS globally
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "developerzone89@gmail.com",
    pass: "jfdgufvjpxaatmsz",
  },
});


app.post("/checkoutpay", async (req, res) => {
  const { days, plan, email, validate } = req.body;

  console.log(days, plan, email, validate);

  // Validate required fields
  if (!plan || !email) {
    return res.status(400).json({ error: "Plan and email are required" });
  }

  try {
    let productId;
    let priceId;

    switch (validate) {
      case "Basic-month":
        productId = "prod_SG6m3Lu64gSBg3";
        priceId = "price_1RLaYc2Mw3LdtP6uDGejy9IX";
        break;
      case "Basic-year":
        productId = "prod_SG6nfp2nb60j4e";
        priceId = "price_1RLaZW2Mw3LdtP6uH7neAumx";
        break;
      case "PRO-month":
        productId = "prod_SG6t1l0ctvaIAe";
        priceId = "price_1RLafM2Mw3LdtP6uarKYPqjs";
        break;
      case "PRO-year":
        productId = "prod_SG6tILuUsFy1s8";
        priceId = "price_1RLafr2Mw3LdtP6uuaL5LpGy";
        break;
      default:
        return res.status(400).json({ error: "Invalid plan selected" });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "ideal"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      customer_email: email,
      metadata: {
        plan: plan,
        day: days
      },
      success_url: `https://frontend.ethiai.io/subscription-success?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://frontend.ethiai.io/subscription-success?canceled=true`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Error creating checkout session", err);
    res.status(500).json({ error: err.message });
  }
});

const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"EthiAI" <developerzone89@gmail.com>`,
      to,
      subject,
      html,
    });
    console.log("Email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

// Email template for payment success
const generatePaymentSuccessEmail = ({
  user_name,
  userEmail,
  plan,
  amount,
  paymentDate,
  validityDate,
}) => {
  // Replace "Pro-Year" with "Professional-Yearly" and "Pro-month" with "Professional-month" in the plan name
  const formattedPlan = plan
    .replace("PRO-year", "Professional-Yearly")
    .replace("PRO-month", "Professional-month");

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Successful - EthiAI</title>
      <style>
        body { 
          font-family: 'Arial', sans-serif; 
          background-color: #f4f4f9; 
          margin: 0; 
          padding: 0; 
          color: #333; 
        }
        .container { 
          max-width: 600px; 
          margin: 20px auto; 
          background-color: #ffffff; 
          border-radius: 10px; 
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1); 
          overflow: hidden; 
        }
        .header { 
          background-color: #1e3a8a; 
          padding: 20px; 
          text-align: center; 
        }
        .header img { 
          max-width: 150px; 
        }
        .content { 
          padding: 30px; 
        }
        .content h1 { 
          color: #1e3a8a; 
          font-size: 24px; 
          margin-bottom: 10px; 
        }
        .content p { 
          font-size: 16px; 
          line-height: 1.6; 
          margin: 0 0 15px; 
        }
        .details { 
          background-color: #f9fafb; 
          padding: 15px; 
          border-radius: 8px; 
          margin: 20px 0; 
        }
        .details_flex { 
          display: flex; 
          align-items: center; 
          gap: 20px; 
          margin-bottom: 10px; 
        }
        .details_flex p { 
          margin: 0; 
          font-size: 15px; 
          line-height: 1.5; 
        }
        .details_flex p strong { 
          color: #1e3a8a; 
          font-weight: 600; 
        }
        .cta-button { 
          display: inline-block; 
          padding: 12px 25px; 
          background-color: #3b82f6; 
          color: #fff !important; 
          text-decoration: none; 
          border-radius: 5px; 
          font-size: 16px; 
          font-weight: bold; 
          margin: 20px 0; 
        }
        .cta-button:hover { 
          background-color: #2563eb; 
        }
        .footer { 
          background-color: #f4f4f9; 
          padding: 15px; 
          text-align: center; 
          font-size: 14px; 
          color: #666; 
        }
        .footer a { 
          color: #3b82f6; 
          text-decoration: none; 
        }
        .main_head { 
          font-size: 22px; 
          font-weight: 600; 
          color: #fff; 
          text-align: center; 
          margin: 0; 
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="main_head">EthiAI</h1>
        </div>
        <div class="content">
          <h1>Payment Successful — Welcome to EthiAI!</h1>
          <p>Hi ${user_name},</p>
          <p>Thank you for choosing EthiAI! We confirm that your payment for the ${formattedPlan} plan has been successfully processed.</p>
          <div class="details">
            <div class="details_flex">
              <p><strong>Plan:</strong></p>
              <p>${formattedPlan}</p>
            </div>
            <div class="details_flex">
              <p><strong>Amount Paid:</strong></p>
              <p>€${parseFloat(amount).toFixed(2)}</p>
            </div>
            <div class="details_flex">
              <p><strong>Payment Date:</strong></p>
              <p>${paymentDate}</p>
            </div>
            <div class="details_flex">
              <p><strong>Valid Until:</strong></p>
              <p>${validityDate}</p>
            </div>
          </div>
          <p>You can now log into your dashboard and start exploring all the features included in your plan.</p>
          <a href="https://frontend.ethiai.io/onboarding/quiz" class="cta-button">👉 Access Your Dashboard</a>
          <p>Thank you for trusting EthiAI.</p>
          <p>Warm regards,<br>The EthiAI Team</p>
        </div>
        <div class="footer">
          <p>Visit our website: <a href="https://frontend.ethiai.io/">https://frontend.ethiai.io/</a></p>
          <p>© 2025 EthiAI. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// /api/subscription endpoint with email sending
app.get("/api/subscription", async (req, res) => {
  const { session_id } = req.query;

  if (!session_id) {
    return res.status(400).json({ error: "Session ID is required." });
  }

  try {
    // Check if session_id has already been processed
    const checkSessionSql = `SELECT * FROM subscription WHERE stripe_session_id = ?`;
    db.query(checkSessionSql, [session_id], async (err, sessionResult) => {
      if (err) {
        console.error("Error checking session_id:", err);
        return res.status(500).json({ error: "Database error" });
      }

      if (sessionResult.length > 0) {
        // Session has already been processed, return existing data
        const existingRecord = sessionResult[0];
        return res.status(200).json({
          message: "Payment already processed.",
          session_id,
          plan: existingRecord.type,
          amount: existingRecord.amount_paid,
        });
      }

      // Retrieve session from Stripe
      const session = await stripe.checkout.sessions.retrieve(session_id);

      if (session.payment_status === "paid" && session.status === "complete") {
        const { amount_total, metadata, customer_email } = session;
        console.log(metadata);
        const user_id = customer_email || "1"; // Fallback user_id
        const plan = metadata?.plan || "unknown";
        const days = parseInt(metadata.day, 10) || 0; // Convert days to integer
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + days);

        const paymentDate = startDate.toLocaleDateString("en-GB");
        const validityDate = endDate.toLocaleDateString("en-GB");
        const amount = (amount_total / 100).toFixed(2);

        // Fetch user name from signup table
        const selectQuery = "SELECT * FROM `signup` WHERE `email` = ?";
        db.query(selectQuery, [user_id], async (error, userResult) => {
          if (error) {
            console.error("Error fetching user data:", error);
            return res.status(500).json({ error: "Database error" });
          }

          const user_name = userResult.length > 0 ? userResult[0].name : "User"; // Fallback to "User" if name not found

          // Function to send email and respond
          const sendResponseAndEmail = async (message) => {
            try {
              const emailHtml = generatePaymentSuccessEmail({
                user_name,
                userEmail: user_id,
                plan,
                amount,
                paymentDate,
                validityDate,
              });

              await sendEmail({
                to: user_id,
                subject: "🎉 Payment Successful - Welcome to EthiAI!",
                html: emailHtml,
              });

              console.log(message);
              res.status(200).json({
                message,
                session_id,
                plan,
                amount,
              });
            } catch (emailError) {
              console.error("Error during email sending:", emailError);
              // Proceed with response even if email fails
              res.status(200).json({
                message,
                session_id,
                plan,
                amount,
              });
            }
          };

          // Check if user_id already exists in subscription table
          const checkSql = `SELECT * FROM subscription WHERE user_id = ?`;
          db.query(checkSql, [user_id], async (err, result) => {
            if (err) {
              console.error("Error checking user:", err);
              return res.status(500).json({ error: "Database error" });
            }

            try {
              if (result.length > 0) {
                // Update existing record
                const updateSql = `
                  UPDATE subscription
                  SET stripe_session_id = ?, amount_paid = ?, days = ?, type = ?, start_date = ?, end_date = ?
                  WHERE user_id = ?
                `;
                const updateValues = [
                  session_id,
                  amount,
                  days,
                  plan,
                  startDate,
                  endDate,
                  user_id, // Added user_id to match WHERE clause
                ];

                db.query(updateSql, updateValues, async (err) => {
                  if (err) {
                    console.error("Database update error:", err);
                    return res.status(500).json({ error: "Database error" });
                  }

                  await sendResponseAndEmail("Payment updated successfully.");
                });
              } else {
                // Insert new record
                const insertSql = `
                  INSERT INTO subscription (user_id, stripe_session_id, amount_paid, days, type, start_date, end_date)
                  VALUES (?, ?, ?, ?, ?, ?, ?)
                `;
                const insertValues = [
                  user_id,
                  session_id,
                  amount,
                  days,
                  plan,
                  startDate,
                  endDate,
                ];

                db.query(insertSql, insertValues, async (err) => {
                  if (err) {
                    console.error("Database insertion error:", err);
                    return res.status(500).json({ error: "Database error" });
                  }

                  await sendResponseAndEmail("Payment verified and saved successfully.");
                });
              }
            } catch (error) {
              console.error("Error during database operation:", error);
              res.status(500).json({ error: "Internal server error" });
            }
          });
        });
      } else {
        res.status(400).json({ error: "Payment not completed." });
      }
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.post("/user/insertAttempt", async (req, res) => {
  try {
    const quizData = req.body;

    // Ensure quizData is an array and contains data
    if (!Array.isArray(quizData) || quizData.length === 0) {
      return res
        .status(400)
        .json({ error: "Invalid input format or empty array" });
    }

    // Prepare values for batch insert
    const values = quizData.map((attempt) => {
      // Validate required fields
      if (
        !attempt.userId ||
        !attempt.questionId ||
        !attempt.answerId ||
        !attempt.date
      ) {
        throw new Error("Missing required fields in request");
      }

      // Validate date format (should match YYYY-MM-DD HH:MM:SS)
      const dateRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
      if (!dateRegex.test(attempt.date)) {
        throw new Error(
          "Invalid date format. Expected format: YYYY-MM-DD HH:MM:SS"
        );
      }

      return [
        attempt.userId, // User ID
        attempt.questionId, // Question ID
        attempt.answerId, // Answer ID (e.g., 1a, 1b)
        attempt.comment || "", // Comment (if provided, otherwise "No comment")
        attempt.date, // Date
      ];
    });

    // For each quiz attempt, check if the entry already exists
    const updateQueries = values.map((value) => {
      const [userId, questionId, answerId, comment, date] = value;
      const checkQuery = `
          SELECT * FROM genralattempt 
          WHERE user_id = ? AND quation_id = ?;
        `;

      // If the record exists, update it
      const updateQuery = `
          UPDATE genralattempt 
          SET answer_id = ?, comments = ?, date = ?
          WHERE user_id = ? AND quation_id = ?;
        `;

      // If the record doesn't exist, insert it
      const insertQuery = `
          INSERT INTO genralattempt (user_id, quation_id, answer_id, comments, date) 
          VALUES (?, ?, ?, ?, ?);
        `;

      return dbPromise
        .query(checkQuery, [userId, questionId])
        .then(([existingData]) => {
          if (existingData.length > 0) {
            // Update the record if it exists
            return dbPromise.query(updateQuery, [
              answerId,
              comment,
              date,
              userId,
              questionId,
            ]);
          } else {
            // Insert a new record if it doesn't exist
            return dbPromise.query(insertQuery, [
              userId,
              questionId,
              answerId,
              comment,
              date,
            ]);
          }
        })
        .catch((error) => {
          throw new Error("Error processing quiz attempt: " + error.message);
        });
    });

    // Wait for all insert or update queries to finish
    await Promise.all(updateQueries);

    res.status(200).json({ message: "Quiz data processed successfully" });
  } catch (error) {
    console.error("Error inserting or updating quiz data:", error);
    res
      .status(200)
      .json({ error: error.message || "Failed to process quiz data" });
  }
});

app.post("/api/quizzes", async (req, res) => {
  const { name, questions } = req.body;

  try {
    // Step 1: Insert Quiz
    const quizQuery = "INSERT INTO quizzes (name) VALUES (?)";
    db.query(quizQuery, [name], (err, result) => {
      if (err) {
        console.error("Error inserting quiz:", err);
        return res.status(500).json({ message: "Failed to create quiz" });
      }
      const quizId = result.insertId; // Get the inserted quiz ID

      // Step 2: Insert Questions for the Quiz
      let questionIndex = 0;
      questions.forEach((question, index) => {
        const questionQuery =
          "INSERT INTO questions (quiz_id, text, ComplianceRequirement, Penalty, QuestionType) VALUES (?, ?, ?, ?, ?)";
        db.query(
          questionQuery,
          [
            quizId,
            question.text,
            question.ComplianceRequirement,
            question.Penalty,
            question.QuestionType,
          ],
          (err, result) => {
            if (err) {
              console.error("Error inserting question:", err);
              return res
                .status(500)
                .json({ message: "Failed to create question" });
            }

            const questionId = result.insertId; // Get the inserted question ID

            // Step 3: Insert Answers for each Question
            question.answers.forEach((answer) => {
              const answerQuery =
                "INSERT INTO answers (question_id, text, riskScore, gaps, recommendation, q_redirection) VALUES (?, ?, ?, ?, ?, ?)";
              db.query(
                answerQuery,
                [
                  questionId,
                  answer.text,
                  answer.riskScore,
                  answer.gaps,
                  answer.recommendation,
                  answer.q_redirection,
                ],
                (err, result) => {
                  if (err) {
                    console.error("Error inserting answer:", err);
                    return res
                      .status(500)
                      .json({ message: "Failed to create answer" });
                  }
                }
              );
            });

            // After inserting all questions and answers, send success response
            if (index === questions.length - 1) {
              res.status(201).json({ message: "Quiz created successfully" });
            }
          }
        );
      });
    });
  } catch (error) {
    console.error("Error creating quiz:", error);
    res.status(500).json({ message: "Error creating quiz" });
  }
});

app.post("/checkquiz", (req, res) => {
  // Check if user_id is provided in the request body
  var user_id = req.body.user_id;

  // Ensure user_id is provided before querying the database
  if (!user_id) {
    return res.status(400).json({ error: "User ID is required", status: "2" });
  }

  // Define the query to fetch subscription details for the given user_id
  const checkSubscriptionQuery =
    "SELECT COUNT(DISTINCT question_id) AS total_attempted_questions FROM quiz_attempts WHERE user_id = ?";

  // Execute the query with the user_id parameter
  db.query(checkSubscriptionQuery, [user_id], (err, rows) => {
    if (err) {
      console.error("Error fetching subscription:", err);
      return res.status(500).json({ error: "Database error", status: "2" });
    }

    // If no rows are found, send an appropriate response

    if (rows[0].total_attempted_questions >= 2) {
      var status = "2";
    } else {
      var status = "1";
    }
    // Return the subscription details
    return res.status(200).json({ result: rows[0], status: status });
  });
});

app.post("/register", (req, res) => {
  const { name, email, organization, otp, password, type, days, deviceId } =
    req.body;

  // Validate input fields
  if (!name || !email || !password || !otp || !type || !days) {
    return res
      .status(400)
      .json({ error: "All fields are required", status: "2" });
  }

  const hashedPassword = md5(password);

  // Check if the email and OTP are valid
  const checkEmailQuery = "SELECT * FROM signup WHERE email = ? AND otp = ?";
  db.query(checkEmailQuery, [email, otp], (err, result) => {
    if (err) {
      console.error("Error checking email and OTP:", err);
      return res.status(500).json({ error: "Database error", status: "2" });
    }

    if (result.length === 0) {
      return res
        .status(400)
        .json({ error: "Invalid OTP or Email.", status: "2" });
    }

    // Update user record
    const updateUserQuery = `
      UPDATE signup 
      SET name = ?, organization = ?, verify = 'yes', password = ?, device_id = ?
      WHERE email = ?
    `;
    db.query(
      updateUserQuery,
      [name, organization, hashedPassword, deviceId, email],
      (err) => {
        if (err) {
          console.error("Error updating user:", err);
          return res.status(500).json({ error: "Database error", status: "2" });
        }

        const userId = result[0].id;

        // Fetch updated user details (no subscription insertion)
        const getUserDetailsQuery = "SELECT * FROM signup WHERE id = ?";
        db.query(getUserDetailsQuery, [userId], (err, userDetails) => {
          if (err) {
            console.error("Error fetching user details:", err);
            return res
              .status(500)
              .json({ error: "Database error", status: "2" });
          }

          if (userDetails.length === 0) {
            return res.status(500).json({
              error: "User not found after registration",
              status: "2",
            });
          }

          return res.status(201).json({
            message: "User registered successfully",
            userId: userDetails[0].id,
            name: userDetails[0].name,
            email: userDetails[0].email,
            status: "1",
            result: userDetails[0],
          });
        });
      }
    );
  });
});


app.post("/login", async (req, res) => {
  const { email, password, deviceId } = req.body;
  const pass = md5(password);

  // Check if user exists
  const checkEmailQuery =
    "SELECT * FROM signup WHERE email = ? AND password = ?";
  db.query(checkEmailQuery, [email, pass], (err, result) => {
    if (err) {
      console.error("Error checking email:", err);
      return res.status(500).json({ error: "Database error", status: "2" });
    }

    if (result.length === 0) {
      return res.status(200).json({ message: "Invalid details", status: "2" });
    }

    const userId = result[0].id;
    const userEmail = result[0].email;

    if (result[0].otp_verify === "no") {
      return res.status(200).json({
        message:
          "Access Restricted: Your AI system is not eligible for this assessment. Please contact our support team for further assistance.",
        status: "3",
        data: result
      });
    }

    // Check if the device is already registered for this user
    const checkDeviceQuery =
      "SELECT * FROM active_user WHERE user_id = ? AND device_id = ?";
    db.query(
      checkDeviceQuery,
      [userId, deviceId],
      (deviceErr, deviceResult) => {
        if (deviceErr) {
          console.error("Error checking device ID:", deviceErr);
          return res
            .status(500)
            .json({ message: "Database error", status: "2" });
        }

        // If the device already exists, redirect to successful login
        if (deviceResult.length > 0) {
          return res.status(200).json({
            message: "Login successful (existing device)",
            status: "1",
            result,
          });
        }

        // Check login limits based on subscription
        const selectq = `
        SELECT s.id, s.user_id, s.days, s.type, s.selectedquiz, s.start_date, s.end_date, 
               a.email, a.device_id 
        FROM subscription s 
        INNER JOIN active_user a ON s.user_id = a.user_id 
        WHERE a.user_id = ? AND a.email = ? GROUP BY a.device_id;
      `;

        db.query(selectq, [userId, userEmail], (subError, subscriptions) => {
          if (subError) {
            console.error("Error querying subscription:", subError);
            return res
              .status(500)
              .json({ message: "Database error", status: "2" });
          }

          let loginLimit = 1; // Default login limit

          if (subscriptions.length > 0) {
            const subscriptionType = subscriptions[0].type;
            const loginLimits = { Basic: 1, Professional: 3, Enterprise: 10 };
            loginLimit = loginLimits[subscriptionType] || 1;

            if (subscriptions.length >= loginLimit) {
              return res
                .status(200)
                .json({ message: "Login limit exceeded", status: "2" });
            }
          }

          // Insert new active session for this device
          const insertQuery =
            "INSERT INTO active_user (user_id, email, device_id) VALUES (?, ?, ?)";
          db.query(
            insertQuery,
            [userId, userEmail, deviceId],
            (insertError) => {
              if (insertError) {
                console.error("Error inserting active user:", insertError);
                return res
                  .status(500)
                  .json({ message: "Error during login", status: "2" });
              }

              return res
                .status(201)
                .json({ message: "Login successfully", result, status: "1" });
            }
          );
        });
      }
    );
  });
});

app.post("/admin/login", async (req, res) => {
  const { email, password } = req.body;
  var pass = md5(password);
  const checkEmailQuery = "SELECT * FROM admin WHERE email = ? And password =?";
  db.query(checkEmailQuery, [email, pass], (err, result) => {
    if (err) {
      console.error("Error checking email:", err);
      return res.status(200).json({ error: "Database error", status: "2" });
    }

    if (result.length === 0) {
      // Email already exists
      return res.status(200).json({ message: "Invalid detail", status: "2" });
    } else {
      res
        .status(201)
        .json({ message: "Login successfully", result: result, status: "1" });
    }

    // If email does not exist, insert the new user
  });
});

app.post("/admin/quiz", (req, res) => {
  const { questions } = req.body;

  if (!questions || !Array.isArray(questions)) {
    return res.status(400).json({ error: "Invalid input data" });
  }

  let responseSent = false;

  const sendResponse = (statusCode, message) => {
    if (!responseSent) {
      responseSent = true;
      return res.status(statusCode).json(message);
    }
  };

  db.getConnection((err, connection) => {
    if (err) {
      console.error("Error getting database connection:", err);
      return sendResponse(500, { error: "Database connection error" });
    }

    connection.beginTransaction(async (err) => {
      if (err) {
        console.error("Error starting transaction:", err);
        return sendResponse(500, { error: "Transaction start error" });
      }

      try {
        // Extract unique practice_option titles
        const practiceOptions = [
          ...new Set(
            questions.flatMap((q) =>
              q.practice_option.split(",").map((opt) => opt.trim())
            )
          ),
        ];

        // Fetch quizzes in bulk
        const quizQuery = `SELECT * FROM quizzes WHERE title IN (?)`;
        const [quizResults] = await connection
          .promise()
          .query(quizQuery, [practiceOptions]);

        if (quizResults.length === 0) {
          throw new Error("No matching quizzes found");
        }

        const quizMap = Object.fromEntries(
          quizResults.map((quiz) => [quiz.title, quiz.id])
        );

        for (const question of questions) {
          const practiceTitles = question.practice_option
            .split(",")
            .map((title) => title.trim());

          for (const title of practiceTitles) {
            const quizId = quizMap[title]; // Match quiz ID for each practice title
            if (!quizId) {
              console.warn(`No quiz found for title: ${title}`);
              continue; // Skip this title if no quiz matches
            }

            // Check if question already exists for the specific quiz
            const [existingQuestions] = await connection
              .promise()
              .query(`SELECT * FROM questions WHERE quiz_id = ? AND text = ?`, [
                quizId,
                question.text,
              ]);

            if (existingQuestions.length > 0) {
              continue; // Skip if question already exists
            }

            // Insert the question
            const questionQuery = `
              INSERT INTO questions 
              (quiz_id, text, compliance_requirement, risk_level, penalty, question_type, practice, practiceheading) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const [questionResult] = await connection
              .promise()
              .query(questionQuery, [
                quizId,
                question.text,
                question.ComplianceRequirement || null,
                question.RiskLevel || null,
                question.Penalty || null,
                question.QuestionType || null,
                title, // Save the current practice title
                title,
              ]);

            const questionId = questionResult.insertId;

            // Insert answers
            for (const answer of question.answers) {
              const answerQuery = `
                INSERT INTO answers 
                (question_id, text, risk_score, gaps, recommendation, q) 
                VALUES (?, ?, ?, ?, ?, ?)
              `;
              await connection
                .promise()
                .query(answerQuery, [
                  questionId,
                  answer.text,
                  answer.riskScore || 0,
                  answer.gaps || null,
                  answer.recommendation || null,
                  answer.skip || "next",
                ]);
            }
          }
        }

        // Commit transaction
        await connection.promise().commit();
        sendResponse(201, { message: "Questions added successfully" });
      } catch (error) {
        console.error("Transaction failed:", error);
        await connection.promise().rollback();
        sendResponse(500, { error: "Transaction failed" });
      } finally {
        connection.release();
      }
    });
  });
});

app.post("/get3option", (req, res) => {
  const { user_id } = req.body;
  const selectQuery =
    "SELECT * FROM `genralattempt` WHERE `comments` LIKE '%According to the EU AI Act%' and quation_id = 27";

  db.query(selectQuery, [user_id], function (error, result) {
    if (error) {
      console.error("Error fetching quizzes:", error); // Corrected error message
      return res.status(500).json({ error: "Database error", status: "2" }); // Changed status to 500 for server error
    }

    return res.status(200).json({ result: result });
  });
});

app.post("/admin/getdashquiz", (req, res) => {
  const selectQuery =
    "SELECT q.*, p.* FROM quizzes q JOIN practices p ON q.practice = p.id";

  db.query(selectQuery, function (error, result) {
    if (error) {
      console.error("Error fetching quizzes:", error); // Corrected error message
      return res.status(500).json({ error: "Database error", status: "2" }); // Changed status to 500 for server error
    }

    return res.status(200).json({ result: result });
  });
});

app.post("/admin/getallquiz", (req, res) => {
  const { userId } = req.body;

  const checkEmailQuery = `
SELECT 
    q.*, 
    p.*, 
    pr.*, 
    qa.attempt_count, 
    qa.user_id, 
    qa.created_at, 
    qa.quiz_id, 
    COALESCE(qh.quizhistory_length, (
        SELECT COUNT(*) 
        FROM (
            SELECT quiz_id 
            FROM quizhistory 
            WHERE user_id = ? 
            GROUP BY created_at
        ) AS unique_attempts
    )) AS quizhistory_length 
FROM questions q 
JOIN quizzes p ON q.practiceheading = p.title 
JOIN practices pr ON p.practice = pr.id 
LEFT JOIN (
    SELECT 
        quiz_id, 
        user_id, 
        attempt_count, 
        MIN(created_at) AS created_at 
    FROM quiz_attempts 
    WHERE user_id = ? 
    GROUP BY attempt_count, quiz_id
) qa ON p.title = qa.quiz_id 
LEFT JOIN (
    SELECT 
        user_id, 
        COUNT(DISTINCT created_at) AS quizhistory_length 
    FROM quizhistory 
    WHERE user_id = ? 
    GROUP BY user_id
) qh ON qa.user_id = qh.user_id 
GROUP BY qa.attempt_count, p.practice 
ORDER BY q.id DESC 
LIMIT 25;

  `;

  db.query(checkEmailQuery, [userId, userId, userId], (err, result) => {
    if (err) {
      console.error("Error fetching quizzes:", err);
      return res.status(500).json({ error: "Database error", status: "2" });
    }
    return res.status(200).json({ result });
  });
});

app.post("/admin/getgenrateallquiz", (req, res) => {
  // Check if email already exists in the database
  const checkEmailQuery = "SELECT * FROM `quizzes` ORDER BY id desc";
  db.query(checkEmailQuery, (err, result) => {
    if (err) {
      console.error("Error checking email:", err);
      return res.status(200).json({ error: "Database error", status: "2" });
    }
    return res.status(200).json({ result: result });
  });
});

app.post("/admin/updaeassment", (req, res) => {
  const { quizid } = req.body;
  // Check if email already exists in the database
  const checkEmailQuery = "SELECT * FROM `quizzes` WHERE `title` = ?";
  db.query(checkEmailQuery, [quizid], (err, result) => {
    if (err) {
      console.error("Error checking email:", err);
      return res.status(200).json({ error: "Database error", status: "2" });
    }
    return res.status(200).json({ result: result });
  });
});

app.post("/admin/getgenrateallpratice", (req, res) => {
  // Check if email already exists in the database
  const checkEmailQuery = "SELECT * FROM `practices` ORDER BY id desc";
  db.query(checkEmailQuery, (err, result) => {
    if (err) {
      console.error("Error checking email:", err);
      return res.status(200).json({ error: "Database error", status: "2" });
    }
    return res.status(200).json({ result: result });
  });
});

app.post("/admin/getgenrateallassment", (req, res) => {
  // Check if email already exists in the database
  const checkEmailQuery = "SELECT * FROM `practices` ORDER BY id desc";
  db.query(checkEmailQuery, (err, result) => {
    if (err) {
      console.error("Error checking email:", err);
      return res.status(200).json({ error: "Database error", status: "2" });
    }
    return res.status(200).json({ result: result });
  });
});

app.post("/admin/practices", (req, res) => {
  // Check if email already exists in the database
  const checkEmailQuery = "SELECT * FROM `practices` ORDER BY id ASC";
  db.query(checkEmailQuery, (err, result) => {
    if (err) {
      console.error("Error checking email:", err);
      return res.status(200).json({ error: "Database error", status: "2" });
    }
    return res.status(200).json({ result: result });
  });
});

app.post("/updatepractices", (req, res) => {
  // Check if email already exists in the database
  const { selectedQuizzes, userId } = req.body;
  const checkEmailQuery =
    "UPDATE `subscription` SET `selectedquiz`='?' WHERE `user_id` = ?";
  db.query(checkEmailQuery, [selectedQuizzes, userId], (err, result) => {
    if (err) {
      console.error("Error checking email:", err);
      return res.status(200).json({ error: "Database error", status: "2" });
    }
    return res.status(200).json({ status: 1, result: result });
  });
});

app.post("/fetchplan", (req, res) => {
  // Check if user_id is provided in the request body
  var user_id = req.body.user_id;

  // Ensure user_id is provided before querying the database
  if (!user_id) {
    return res.status(200).json({ error: "User ID is required", status: "2" });
  }

  // Define the query to fetch subscription details for the given user_id
  const checkSubscriptionQuery = "SELECT * FROM subscription WHERE user_id = ?";

  // Execute the query with the user_id parameter
  db.query(checkSubscriptionQuery, [user_id], (err, rows) => {
    if (err) {
      console.error("Error fetching subscription:", err);
      return res.status(200).json({ error: "Database error", status: "2" });
    }

    // If no rows are found, send an appropriate response
    if (rows.length === 0) {
      return res
        .status(200)
        .json({ error: "No subscription found for this user", status: "2" });
    }
    var end = rows[0].end_date;
    var checDate = moment(end).format("YYYY-MM-DD");
    var current = moment().format("YYYY-MM-DD");

    if (checDate > current) {
      var status = "1";
    } else {
      var status = "2";
    }
    // Return the subscription details
    return res.status(200).json({ result: rows[0], status: status });
  });
});

app.post("/admin/getallquestions", (req, res) => {
  // Extract the practice value from the request body
  const { practice } = req.body;

  // Validate if practice is provided
  if (!practice) {
    return res.status(400).json({ error: "Practice is required", status: "2" });
  }

  // Query to fetch questions by practice
  const getQuestionsQuery =
    "SELECT * FROM questions WHERE practice = ? ORDER BY `questions`.`date` ASC";

  // Execute the query with practice as a parameter
  db.query(getQuestionsQuery, [practice], (err, result) => {
    if (err) {
      console.error("Error fetching questions:", err);
      return res.status(500).json({ error: "Database error", status: "2" });
    }

    // Return the result
    return res.status(200).json({ result });
  });
});

app.post("/admin/getallplan", (req, res) => {
  const userId = req.body.userId; // Get user_id from the request body

  const selectQuery = "SELECT * FROM `subscription` WHERE `user_id` = ?";

  db.query(selectQuery, [userId], (error, result) => {
    if (error) {
      // Corrected here, use `error` instead of `err`
      console.error("Error fetching user subscription:", error);
      return res.status(500).json({ error: "Database error", status: "2" });
    }

    return res.status(200).json({ data: result });
  });
});

app.post("/admin/getatennptpractice", (req, res) => {
  const { slectp } = req.body;
  const selectQuery = "SELECT * FROM `subscription` WHERE `selectedquiz` = ?";

  db.query(selectQuery, [slectp], (error, result) => {
    if (error) {
      // Corrected here, use `error` instead of `err`
      console.error("Error fetching user subscription:", error);
      return res.status(500).json({ error: "Database error", status: "2" });
    }
    // console.log(result[0].type);
    // const type = result[0].type;
    return res.status(200).json({ data: result });
  });
});

app.post("/dashboardtext", (req, res) => {
  const { userId, plan } = req.body;
  const selectQuery = "SELECT qa.user_id, q.quiz_id,q.practice,q.practiceheading, q.id AS question_id,qa.created_at FROM quiz_attempts qa JOIN questions q ON qa.question_id = q.id WHERE qa.user_id = ? GROUP BY q.practice ORDER BY qa.created_at DESC;";

  db.query(selectQuery, [userId], (error, result) => {
    if (error) {
      console.error("Error fetching user subscription:", error);
      return res.status(200).json({ error: "Database error", status: "2" });
    }
    const attemptquiz = result.length
    if (result.length === 0) {
      const selectQuery = "SELECT * FROM `dashboard` WHERE `plan` = ?";

      db.query(selectQuery, [plan], (error, result) => {
        if (error) {
          console.error("Error fetching user dashboard:", error);
          return res.status(200).json({ error: "Database error", status: "2" });
        }

        if (result.length > 0) {
          return res
            .status(200)
            .json({ status: 1, data: result[0].first_time });
        } else {
          return res
            .status(200)
            .json({ error: "No dashboard data found", status: "3" });
        }
      });
    } else {
      const selectQuery = "SELECT * FROM `dashboard` WHERE `plan` = ?";

      db.query(selectQuery, [plan], (error, result) => {
        if (error) {
          console.error("Error fetching user dashboard:", error);
          return res.status(200).json({ error: "Database error", status: "2" });
        }

        return res.status(200).json({ status: 2, data: result, attemptquiz });
      });
    }
  });
});

app.post("/admin/getallquizusershistory", (req, res) => {
  const userId = req.body.userId; // Get user_id from the request body

  const checkUserAttemptQuery = `WITH RankedHistory AS ( SELECT qa.id, qa.user_id, qa.question_id, qa.answer_ids, qa.created_at, qa.attempt_count, q.quiz_id, q.practice, q.practiceheading, ROW_NUMBER() OVER ( PARTITION BY qa.user_id, qa.attempt_count, q.quiz_id, q.practiceheading ORDER BY qa.created_at DESC ) AS row_num FROM quizhistory qa JOIN questions q ON qa.question_id = q.id WHERE qa.user_id = ? ) SELECT id, user_id, question_id, answer_ids, created_at, attempt_count, quiz_id, practice, practiceheading FROM RankedHistory WHERE row_num = 1 ORDER BY created_at DESC`;

  db.query(checkUserAttemptQuery, [userId], (err, result) => {
    if (err) {
      console.error("Error fetching user quiz attempts:", err);
      return res.status(500).json({ error: "Database error", status: "2" });
    }

    return res.status(200).json({ result: result });
  });
});

app.post("/admin/getallquizusers", (req, res) => {
  const userId = req.body.userId; // Get user_id from the request body

  const checkUserAttemptQuery = `
      SELECT 
        qa.user_id,
        q.quiz_id,q.practice,q.practiceheading,
        q.id AS question_id,qa.created_at
      FROM 
        quiz_attempts qa
      JOIN 
        questions q 
      ON 
        qa.question_id = q.id
      WHERE 
        qa.user_id = ?
      GROUP BY 
        q.practice
      ORDER BY 
        qa.created_at DESC
  `;

  db.query(checkUserAttemptQuery, [userId], (err, result) => {
    if (err) {
      console.error("Error fetching user quiz attempts:", err);
      return res.status(500).json({ error: "Database error", status: "2" });
    }

    return res.status(200).json({ result: result });
  });
});

app.post("/admin/getallquizuser", (req, res) => {
  const { user_id } = req.body;

  // Validate input
  if (!user_id) {
    return res.status(400).json({ error: "User ID is required", status: "1" });
  }

  // Query to fetch quizzes for a specific user
  const fetchQuizUsersQuery = `
        SELECT 
            q.id AS quiz_id, 
            q.title AS quiz_title, 
             q.id, 
            qa.user_id, 
            u.name AS user_name, 
            u.email AS user_email, 
            COUNT(qa.id) AS attempts_count
        FROM 
            quizzes q
        LEFT JOIN 
            quiz_attempts qa ON q.id = qa.quiz_id
        LEFT JOIN 
            signup u ON qa.user_id = u.id
        WHERE 
            qa.user_id = ?
        GROUP BY 
            q.id, qa.user_id
        ORDER BY 
            q.id DESC
    `;

  db.query(fetchQuizUsersQuery, [user_id], (err, result) => {
    if (err) {
      console.error("Error fetching quiz users:", err);
      return res.status(500).json({ error: "Database error", status: "2" });
    }

    if (result.length === 0) {
      return res
        .status(200)
        .json({ message: "No quizzes found for the given user", status: "0" });
    }

    return res.status(200).json({ result });
  });
});

app.post("/admin/getalluser", (req, res) => {
  // Check if email already exists in the database
  const checkEmailQuery = "SELECT * FROM signup ORDER BY id desc";
  db.query(checkEmailQuery, (err, result) => {
    if (err) {
      console.error("Error checking email:", err);
      return res.status(200).json({ error: "Database error", status: "2" });
    }
    return res.status(200).json({ result: result });
  });
});

app.post("/admin/deletequiz", (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: "Quiz ID is required" });
  }

  db.getConnection((err, connection) => {
    if (err) {
      console.error("Database connection error:", err);
      return res.status(500).json({ error: "Database connection error" });
    }

    // Begin transaction
    connection.beginTransaction((transactionError) => {
      if (transactionError) {
        connection.release();
        return res.status(500).json({ error: "Failed to start transaction" });
      }

      // Delete quiz_attempts related to the quiz
      connection.query(
        `DELETE qa FROM quiz_attempts qa
                 JOIN questions q ON qa.question_id = q.id
                 WHERE q.quiz_id = ?`,
        [id],
        (error) => {
          if (error) {
            return connection.rollback(() => {
              console.error("Failed to delete quiz_attempts:", error);
              connection.release();
              res.status(500).json({ error: "Failed to delete quiz attempts" });
            });
          }

          // Delete answers related to the quiz
          connection.query(
            `DELETE a FROM answers a
                         JOIN questions q ON a.question_id = q.id
                         WHERE q.quiz_id = ?`,
            [id],
            (error) => {
              if (error) {
                return connection.rollback(() => {
                  console.error("Failed to delete answers:", error);
                  connection.release();
                  res.status(500).json({ error: "Failed to delete answers" });
                });
              }

              // Delete questions related to the quiz
              connection.query(
                `DELETE FROM questions WHERE quiz_id = ?`,
                [id],
                (error) => {
                  if (error) {
                    return connection.rollback(() => {
                      console.error("Failed to delete questions:", error);
                      connection.release();
                      res
                        .status(500)
                        .json({ error: "Failed to delete questions" });
                    });
                  }

                  // Delete the quiz itself
                  connection.query(
                    `DELETE FROM quizzes WHERE id = ?`,
                    [id],
                    (error) => {
                      if (error) {
                        return connection.rollback(() => {
                          console.error("Failed to delete quiz:", error);
                          connection.release();
                          res
                            .status(500)
                            .json({ error: "Failed to delete quiz" });
                        });
                      }

                      // Commit transaction
                      connection.commit((commitError) => {
                        connection.release();
                        if (commitError) {
                          console.error(
                            "Failed to commit transaction:",
                            commitError
                          );
                          return res
                            .status(500)
                            .json({ error: "Failed to commit transaction" });
                        }

                        res
                          .status(200)
                          .json({ message: "Quiz deleted successfully" });
                      });
                    }
                  );
                }
              );
            }
          );
        }
      );
    });
  });
});

app.post("/admin/deletequestion", (req, res) => {
  var questionId = req.body.id;
  // Validate the input
  if (!questionId) {
    return res.status(400).json({ error: "Question ID is required" });
  }

  db.getConnection((err, connection) => {
    if (err) {
      console.error("Database connection error:", err);
      return res.status(500).json({ error: "Database connection error" });
    }

    // Begin transaction
    connection.beginTransaction((transactionError) => {
      if (transactionError) {
        connection.release();
        return res.status(500).json({ error: "Failed to start transaction" });
      }

      // Step 1: Delete related records from the `answers` table
      connection.query(
        "DELETE FROM answers WHERE question_id = ?",
        [questionId],
        (error) => {
          if (error) {
            return connection.rollback(() => {
              console.error("Failed to delete related answers:", error);
              connection.release();
              res
                .status(500)
                .json({ error: "Failed to delete related answers" });
            });
          }

          // Step 2: Delete related records from the `quiz_attempts` table
          connection.query(
            "DELETE FROM quiz_attempts WHERE question_id = ?",
            [questionId],
            (error) => {
              if (error) {
                return connection.rollback(() => {
                  console.error(
                    "Failed to delete related quiz attempts:",
                    error
                  );
                  connection.release();
                  res
                    .status(500)
                    .json({ error: "Failed to delete related quiz attempts" });
                });
              }

              // Step 3: Delete the question from the `questions` table
              connection.query(
                "DELETE FROM questions WHERE id = ?",
                [questionId],
                (error) => {
                  if (error) {
                    return connection.rollback(() => {
                      console.error("Failed to delete question:", error);
                      connection.release();
                      res
                        .status(500)
                        .json({ error: "Failed to delete question" });
                    });
                  }

                  // Commit the transaction
                  connection.commit((commitError) => {
                    connection.release();
                    if (commitError) {
                      console.error("Transaction commit failed:", commitError);
                      return res
                        .status(500)
                        .json({ error: "Failed to commit transaction" });
                    }

                    // Success
                    res.status(200).json({
                      message: "Question and related data deleted successfully",
                    });
                  });
                }
              );
            }
          );
        }
      );
    });
  });
});

app.post("/admin/deleteuser", (req, res) => {
  const { id, email } = req.body;

  if (!id || !email) {
    return res.status(400).json({ error: "User ID and Email are required" });
  }

  db.getConnection((err, connection) => {
    if (err) {
      console.error("Database connection error:", err);
      return res.status(500).json({ error: "Database connection error" });
    }

    connection.beginTransaction((transactionError) => {
      if (transactionError) {
        connection.release();
        return res.status(500).json({ error: "Failed to start transaction" });
      }

      // Step 1: Delete from `subscription` where `user_id = email`
      connection.query(`DELETE FROM subscription WHERE user_id = ?`, [email], (error) => {
        if (error) {
          return connection.rollback(() => {
            console.error("Failed to delete subscription:", error);
            connection.release();
            res.status(500).json({ error: "Failed to delete subscription data" });
          });
        }

        // Step 2: Delete from `quizhistory` where `user_id = id`
        connection.query(`DELETE FROM quizhistory WHERE user_id = ?`, [id], (error) => {
          if (error) {
            return connection.rollback(() => {
              console.error("Failed to delete quizhistory:", error);
              connection.release();
              res.status(500).json({ error: "Failed to delete quiz history" });
            });
          }

          // Step 3: Delete from `genralattempt` where `user_id = id`
          connection.query(`DELETE FROM genralattempt WHERE user_id = ?`, [id], (error) => {
            if (error) {
              return connection.rollback(() => {
                console.error("Failed to delete general attempts:", error);
                connection.release();
                res.status(500).json({ error: "Failed to delete general attempts" });
              });
            }

            // Step 4: Delete from `quiz_attempts` where `user_id = id`
            connection.query(`DELETE FROM quiz_attempts WHERE user_id = ?`, [id], (error) => {
              if (error) {
                return connection.rollback(() => {
                  console.error("Failed to delete quiz_attempts:", error);
                  connection.release();
                  res.status(500).json({ error: "Failed to delete quiz attempts" });
                });
              }

              // Step 5: Finally, delete user from `signup` table
              connection.query(`DELETE FROM signup WHERE id = ?`, [id], (error) => {
                if (error) {
                  return connection.rollback(() => {
                    console.error("Failed to delete user:", error);
                    connection.release();
                    res.status(500).json({ error: "Failed to delete user" });
                  });
                }

                // Commit transaction
                connection.commit((commitError) => {
                  connection.release();
                  if (commitError) {
                    console.error("Transaction commit failed:", commitError);
                    return res.status(500).json({ error: "Failed to commit transaction" });
                  }

                  res.status(200).json({ message: "User and related data deleted successfully" });
                });
              });
            });
          });
        });
      });
    });
  });
});


app.post("/admin/getquiz", (req, res) => {
  const practice = req.body.practice;

  db.getConnection((err, connection) => {
    if (err) {
      console.error("Error getting database connection:", err);
      return res.status(500).json({ error: "Database connection error" });
    }

    // SQL query to filter questions based on `practice`
    const questionQuery = `
        SELECT qu.id AS questionId, qu.text AS questionText, qu.compliance_requirement, qu.practice, qu.risk_level, qu.penalty, qu.question_type, qu.practiceheading, qq.id as quiz_id, a.id AS answerId, a.text AS answerText, a.risk_score, a.gaps, a.q, a.recommendation,a.comments FROM questions qu LEFT JOIN answers a ON qu.id = a.question_id LEFT JOIN quizzes qq ON qu.quiz_id = qq.id WHERE qu.practice = ? ORDER BY questionId ASC;      `;

    // Pass the practice value as a parameter
    const queryParams = [practice];

    connection.query(questionQuery, queryParams, (err, results) => {
      connection.release();
      if (err) {
        console.error("Error fetching question data:", err);
        return res.status(500).json({ error: "Error fetching question data" });
      }

      // Structure the response
      const response = [];
      const questionMap = {};

      results.forEach((row) => {
        if (!questionMap[row.questionId]) {
          questionMap[row.questionId] = {
            id: row.questionId,
            text: row.questionText,
            complianceRequirement: row.compliance_requirement,
            practice: row.practice,
            riskLevel: row.risk_level,
            penalty: row.penalty,
            quiz_id: row.quiz_id,
            questionType: row.question_type,
            practiceheading: row.practiceheading,
            answers: [],
          };
          response.push(questionMap[row.questionId]);
        }

        if (row.answerId) {
          questionMap[row.questionId].answers.push({
            id: row.answerId,
            text: row.answerText,
            riskScore: row.risk_score,
            gaps: row.gaps,
            recommendation: row.recommendation,
            q: row.q,
            comments: row.comments,
          });
        }
      });

      res.json(response);
    });
  });
});

app.post("/admin/singlequiz", (req, res) => {
  const practice = req.body.quizname;
  const practiceId1 = req.body.id;
  const quizId = req.body.quizId;

  db.getConnection((err, connection) => {
    if (err) {
      console.error("Error getting database connection:", err);
      return res.status(500).json({ error: "Database connection error" });
    }

    // SQL query to filter questions based on `practice`
    const questionQuery = `
        SELECT qu.id AS questionId, qu.text AS questionText, qu.compliance_requirement, qu.practice, qu.risk_level, qu.penalty, qu.question_type, qu.practiceheading, qq.id AS quiz_id, a.id AS answerId, a.text AS answerText, a.risk_score, a.gaps, a.q, a.recommendation, a.comments FROM questions qu LEFT JOIN answers a ON qu.id = a.question_id LEFT JOIN quizzes qq ON qu.quiz_id = qq.id WHERE qu.practice = ? AND qq.id = ?  AND qu.id = ?  ORDER BY qu.id DESC;
      `;

    // Pass the practice value as a parameter
    const queryParams = [practice, quizId, practiceId1];

    connection.query(questionQuery, queryParams, (err, results) => {
      connection.release();
      if (err) {
        console.error("Error fetching question data:", err);
        return res.status(500).json({ error: "Error fetching question data" });
      }

      // Structure the response
      const response = [];
      const questionMap = {};

      results.forEach((row) => {
        if (!questionMap[row.questionId]) {
          questionMap[row.questionId] = {
            id: row.questionId,
            text: row.questionText,
            complianceRequirement: row.compliance_requirement,
            practice: row.practice,
            riskLevel: row.risk_level,
            penalty: row.penalty,
            quiz_id: row.quiz_id,
            questionType: row.question_type,
            practiceheading: row.practiceheading,
            answers: [],
          };
          response.push(questionMap[row.questionId]);
        }

        if (row.answerId) {
          questionMap[row.questionId].answers.push({
            id: row.answerId,
            text: row.answerText,
            riskScore: row.risk_score,
            gaps: row.gaps,
            recommendation: row.recommendation,
            q: row.q,
            comments: row.comments,
          });
        }
      });

      res.json(response);
    });
  });
});

app.post("/user/firstquation", async (req, res) => {
  const selectQuery =
    "SELECT * FROM `generalquiz` ORDER BY `generalquiz`.`id` ASC";

  db.query(selectQuery, function (error, result) {
    if (error) {
      return console.log(error);
    }
    const first_id = result[0].id;
    const selectQuery =
      "SELECT * FROM `generalquiz` ORDER BY `generalquiz`.`id` DESC";

    db.query(selectQuery, function (error, result) {
      if (error) {
        return console.log(error);
      }

      const last_id = result[0].id;

      res.status(200).json({ last_id, first_id });
    });
  });
});

app.post("/user/generalquiz", async (req, res) => {
  try {
    const { quizId } = req.body;


    if (!quizId) {
      return res.status(400).json({ error: "quizId is required" });
    }

    const sql = `
      SELECT gq.id AS quiz_id, 
             gq.quations, 
             gq.optiontype, 
             go.optionnumber, 
             go.goption, 
             go.comment,
             go.skiping
      FROM generalquiz gq
      LEFT JOIN genraloption go ON gq.id = go.quationid
      WHERE gq.id = ?;
    `;

    // Execute the query with promise-based dbPromise
    const [rows] = await dbPromise.execute(sql, [quizId]);

    // Transform data into the desired format
    const quizData = rows.reduce((acc, row) => {
      if (!acc[row.quiz_id]) {
        acc[row.quiz_id] = {
          id: row.quiz_id,
          quations: row.quations,
          optiontype: row.optiontype,
          options: [],
        };
      }
      if (row.optionnumber) {
        acc[row.quiz_id].options.push({
          optionnumber: row.optionnumber,
          gooption: row.goption,
          comment: row.comment,
          skiping: row.skiping,
        });
      }
      return acc;
    }, {});

    res.json(Object.values(quizData));
  } catch (err) {
    console.error("Database query error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/admin/generalquiz", async (req, res) => {
  try {
    const sql = `
      SELECT gq.id AS quiz_id, gq.quations, gq.optiontype, go.optionnumber, go.goption, go.comment, go.skiping FROM generalquiz gq LEFT JOIN genraloption go ON gq.id = go.quationid
    `;

    // Execute the query
    const [rows] = await dbPromise.execute(sql);

    // Transform data into the desired format
    const quizData = rows.reduce((acc, row) => {
      if (!acc[row.quiz_id]) {
        acc[row.quiz_id] = {
          id: row.quiz_id,
          quations: row.quations,
          optiontype: row.optiontype,
          options: [],
        };
      }
      if (row.optionnumber !== null) {
        acc[row.quiz_id].options.push({
          optionnumber: row.optionnumber,
          goption: row.goption,
          comment: row.comment,
          skiping: row.skiping,
        });
      }
      return acc;
    }, {});

    // Send response
    res.json(Object.values(quizData));
  } catch (err) {
    console.error("Database query error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/admin/generaldeletequiz", async (req, res) => {
  const { id } = req.body; // Get quationid from request body

  if (!id) {
    return res.status(400).json({ error: "Question ID is required" });
  }

  try {
    // First, delete options associated with the question
    const deleteOptionsQuery = "DELETE FROM genraloption WHERE quationid = ?";
    await dbPromise.execute(deleteOptionsQuery, [id]);

    // Then, delete the question itself
    const deleteQuestionQuery = "DELETE FROM generalquiz WHERE id = ?";
    await dbPromise.execute(deleteQuestionQuery, [id]);

    res.json({ message: "Question and related options deleted successfully" });
  } catch (err) {
    console.error("Database deletion error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/submitQuiz", (req, res) => {
  const { userId, answers, practice } = req.body;

  if (!userId || !answers || !Array.isArray(answers)) {
    return res.status(200).json({ error: "Invalid request data" });
  }

  // Process each answer and check if it exists
  const queries = answers.map(({ questionId, answerIds }) => {
    // Check if answerIds is empty ("" or null or undefined)
    // if (!answerIds || answerIds === "" || answerIds.length === 0) {
    //   // Skip if the answer is empty
    //   console.log(`Skipping questionId ${questionId} due to empty answerIds`);
    //   return Promise.resolve();  // Return resolved Promise to skip processing this answer
    // }

    // Otherwise, process the answer
    const answerIdsString = Array.isArray(answerIds)
      ? answerIds.join(",")
      : answerIds;

    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM quiz_attempts WHERE user_id = ? AND question_id = ?",
        [userId, questionId],
        (err, results) => {
          if (err) return reject(err);

          if (results.length > 0) {
            // Update existing attempt
            const attemptId = results[0].id;
            const quizcount = results[0].attempt_count;
            const maincount = quizcount + 1;

            db.query(
              "INSERT INTO quizhistory (user_id, question_id, answer_ids, attempt_count, quiz_id) VALUES (?, ?, ?, ?, ?)",
              [userId, questionId, answerIdsString, maincount, practice],
              (insertErr, insertResult) => {
                if (insertErr) {
                  console.error("Error saving quiz attempt:", insertErr);
                  return reject(insertErr);
                }
                resolve(insertResult);
              }
            );

            db.query(
              "UPDATE quiz_attempts SET answer_ids = ?, attempt_count = ?, created_at = NOW(), quiz_id = ? WHERE id = ?",
              [answerIdsString, maincount, practice, attemptId],
              (updateErr, updateResult) => {
                if (updateErr) return reject(updateErr);
                resolve(updateResult);
              }
            );
          } else {
            // Insert new attempt
            const maincount1 = 0;
            db.query(
              "INSERT INTO quizhistory (user_id, question_id, answer_ids, attempt_count, quiz_id) VALUES (?, ?, ?, ?, ?)",
              [userId, questionId, answerIdsString, maincount1, practice],
              (insertErr, insertResult) => {
                if (insertErr) return reject(insertErr);
                resolve(insertResult);
              }
            );

            db.query(
              "INSERT INTO quiz_attempts (user_id, question_id, answer_ids, quiz_id) VALUES (?, ?, ?, ?)",
              [userId, questionId, answerIdsString, practice],
              (insertErr, insertResult) => {
                if (insertErr) return reject(insertErr);
                resolve(insertResult);
              }
            );
          }
        }
      );
    });
  });

  // Execute all queries
  Promise.all(queries)
    .then(() =>
      res.status(200).json({ message: "Quiz submitted successfully" })
    )
    .catch((err) => {
      console.error("Error saving quiz attempt:", err);
      res.status(200).json({ error: "Failed to save quiz attempt" });
    });
});

// app.post("/submitQuiz", (req, res) => {
//   const { userId, answers, quizName } = req.body;

//   if (!userId || !answers || !Array.isArray(answers) || !quizName) {
//     return res.status(400).json({ error: "Invalid request data" });
//   }

//   // Process each answer and check if it exists in the quiz_attempts table
//   const queries = answers.map(({ questionId, answerIds }) => {
//     const answerIdsString = Array.isArray(answerIds) ? answerIds.join(",") : answerIds;

//     return new Promise((resolve, reject) => {
//       db.query(
//         "SELECT * FROM quiz_attempts WHERE user_id = ? AND question_id = ?",
//         [userId, questionId],
//         (err, results) => {
//           if (err) return reject(err);

//           if (results.length > 0) {
//             // If attempt exists, increment attempt_count and add to the same quiz name
//             const attempt = results[0];
//             const quizCount = attempt.attempt_count;
//             const newAttemptCount = quizCount + 1;

//             // Insert a new attempt for the same question but increment the attempt count
//             db.query(
//               "INSERT INTO quiz_attempts (user_id, question_id, answer_ids, attempt_count, quiz_name, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
//               [
//                 userId,
//                 questionId,
//                 answerIdsString,
//                 newAttemptCount, // Increment attempt count
//                 `${quizName} Attempt ${newAttemptCount}`, // Unique quiz name for each attempt
//               ],
//               (insertErr, insertResult) => {
//                 if (insertErr) return reject(insertErr);
//                 resolve(insertResult);
//               }
//             );
//           } else {
//             // If no previous attempt exists, insert a new attempt with attempt_count = 1
//             db.query(
//               "INSERT INTO quiz_attempts (user_id, question_id, answer_ids, attempt_count, quiz_name, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
//               [
//                 userId,
//                 questionId,
//                 answerIdsString,
//                 1, // First attempt
//                 `${quizName} Attempt 1`, // First attempt quiz name
//               ],
//               (insertErr, insertResult) => {
//                 if (insertErr) return reject(insertErr);
//                 resolve(insertResult);
//               }
//             );
//           }
//         }
//       );
//     });
//   });

//   // Execute all queries
//   Promise.all(queries)
//     .then(() => res.status(200).json({ message: "Quiz submitted successfully" }))
//     .catch((err) => {
//       console.error("Error saving quiz attempt:", err);
//       res.status(500).json({ error: "Failed to save quiz attempt" });
//     });
// });
app.post("/getQuizResultssUser", async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "Invalid request data" });
  }

  // Query to fetch all practice headings associated with the user's quiz attempts
  const query = `SELECT qq.practiceheading, qa.question_id, qa.answer_ids,qq.question_type, qq.text AS question_text, qa.created_at, p.tittle FROM quiz_attempts qa JOIN questions qq ON qa.question_id = qq.id JOIN quizzes qw ON qq.quiz_id = qw.id JOIN practices p ON qw.practice = p.id WHERE qa.user_id = ? ORDER BY qa.question_id DESC;`;

  db.query(query, [userId], async (err, results) => {
    if (err) {
      console.error("Error fetching quiz results:", err);
      return res.status(500).json({ error: "Failed to fetch quiz results" });
    }

    if (results.length === 0) {
      return res.status(200).json({
        error: "Begin assessment to evaluate your AI system's compliance!",
      });
    }

    // Group results by practiceheading, skipping attempts with empty or null answer_ids
    const groupedByPracticeHeading = results.reduce((acc, result) => {
      const { practiceheading, created_at, answer_ids } = result;

      // Skip results with empty or null answer_ids
      if (!answer_ids || answer_ids.trim() === "") {
        return acc; // Skip if no answers are provided
      }

      if (!acc[practiceheading]) {
        acc[practiceheading] = { attempts: [], created_at };
      }
      acc[practiceheading].attempts.push(result); // Ensure attempts is an array
      return acc;
    }, {});

    // Collect all answer IDs from the results, ensuring to filter out empty or invalid IDs
    const answerIds = new Set();
    results.forEach((result) => {
      const ids = result.answer_ids.split(","); // Split the comma-separated answer_ids
      ids.forEach((id) => {
        if (id.trim()) {
          // Only add non-empty IDs
          answerIds.add(id.trim());
        }
      });
    });

    // Create the dynamic FIND_IN_SET condition for valid answer_ids
    const answerIdConditions = Array.from(answerIds)
      .map((id) => `FIND_IN_SET(${id}, qa.answer_ids) > 0`)
      .join(" OR ");

    // Query to fetch the answers corresponding to these answer_ids
    const answersQuery = `SELECT 
      a.id, 
      a.question_id, 
      a.text, 
      a.risk_score, 
      a.gaps, 
      a.recommendation, 
      a.q, 
      a.correct_answer
    FROM 
      answers a
    JOIN 
      quiz_attempts qa ON FIND_IN_SET(a.id, qa.answer_ids) > 0
    WHERE 
      qa.user_id = ? 
      AND (${answerIdConditions})`;

    db.query(answersQuery, [userId], async (err, answerResults) => {
      if (err) {
        console.error("Error fetching answers:", err);
        return res.status(500).json({ error: "Failed to fetch answers" });
      }

      if (answerResults.length === 0) {
        return res.status(200).json({ error: "No matching answers found" });
      }

      // Now calculate the scores and attach answers to attempts
      const practicesScores = {};

      for (const [practiceHeading, { attempts, created_at }] of Object.entries(
        groupedByPracticeHeading
      )) {
        // Ensure 'attempts' is an array
        if (!Array.isArray(attempts)) {
          console.error(
            `Expected attempts to be an array for practice heading: ${practiceHeading}`
          );
          continue; // Skip this practice heading if attempts is not an array
        }

        // Find matching answers for this practice heading
        const matchingAnswers = answerResults.filter((answer) =>
          attempts.some((attempt) =>
            attempt.answer_ids.split(",").includes(String(answer.id))
          )
        );

        // Calculate the score for this practice heading
        const totalScore = matchingAnswers.reduce(
          (sum, answer) => sum + answer.risk_score,
          0
        );

        // Join gaps and recommendations, remove all periods and commas
        const gaps = matchingAnswers
          .map((answer) => {
            // Remove only the '^' character, keep everything else
            const gapText = answer.gaps
              ? answer.gaps.replace(/\^/g, "") // Removes only `^`
              : null;
            return gapText;
          })
          .filter((gap) => gap !== null && gap.trim() !== ""); // Remove null or empty gaps

        const recommendations = matchingAnswers
          .map((answer) => {
            // Remove only the '^' character, keep everything else
            const recText = answer.recommendation
              ? answer.recommendation.replace(/\^/g, "") // Removes only `^`
              : null;
            return recText;
          })
          .filter((rec) => rec !== null && rec.trim() !== ""); // Remove null or empty recommendations

        const DataoutOfScore = await calculateScoreByPractice(attempts);

        // Attach the practice score details
        practicesScores[practiceHeading] = {
          score: {
            totalScore,
            // percentageScore: (
            //   (matchingAnswers.length / DataoutOfScore.outOfScore) *
            //   100
            // ).toFixed(2),
            // correctAttempts: DataoutOfScore.quation_length,
            radiobtn: DataoutOfScore.qyationtype[0].totalRadio,
            checkbox: DataoutOfScore.qyationtype[0].totalCheckbox,
            one_s_each: DataoutOfScore.qyationtype[0].totalCheckboxCorrectOptions,
            totalScores: matchingAnswers.map((a) => a.risk_score),
            outOfScore: DataoutOfScore.outOfScore,
            gaps: gaps.join(" ^ "),
            recommendations: recommendations.join(" ^ "),
            lowRisk: attempts[0]?.low_risk || 0, // Add low_risk from the first attempt
            highRisk: attempts[0]?.high_risk || 0, // Add high_risk from the first attempt
            veryHighRisk: attempts[0]?.very_high_risk || 0,
            practicename: attempts[0]?.tittle || 0, // Add very_high_risk from the first attempt
          },
          attempts: attempts.map((attempt) => {
            // Attach matching answer information to each attempt
            const associatedAnswer = matchingAnswers.find((answer) =>
              attempt.answer_ids.split(",").includes(String(answer.id))
            );
            return {
              ...attempt,
              totalScore: associatedAnswer ? associatedAnswer.risk_score : 0,
              gaps: associatedAnswer ? associatedAnswer.gaps : null,
              recommendation: associatedAnswer
                ? associatedAnswer.recommendation
                : null,
            };
          }),
        };
      }

      // Send the final response with structured results
      res.status(200).json({
        message: "Quiz results retrieved successfully",
        practicesScores,
      });
    });
  });
});

app.post("/getQuizResultssUserView", async (req, res) => {
  const { userId, id } = req.body;

  if (!userId || !id) {
    return res.status(400).json({ error: "Invalid request data" });
  }

  // Query to fetch all practice headings associated with the user's quiz attempts
  const query = `SELECT  
                 qq.practiceheading, qa.question_id, qa.answer_ids, 
                 qq.text AS question_text, qa.created_at, p.tittle
                 FROM quiz_attempts qa
                 JOIN questions qq ON qa.question_id = qq.id
                 JOIN quizzes qw ON qq.quiz_id = qw.id
                 JOIN practices p ON qw.practice = p.id
                 WHERE qa.user_id = ? AND qw.id = ? 
                 ORDER BY qa.question_id DESC`;

  db.query(query, [userId, id], async (err, results) => {
    if (err) {
      console.error("Error fetching quiz results:", err);
      return res.status(500).json({ error: "Failed to fetch quiz results" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "No attempts found for this user" });
    }

    // Group results by practiceheading and filter out any attempts where answer_ids is empty or null
    const groupedByPracticeHeading = results.reduce((acc, result) => {
      const { practiceheading, created_at, answer_ids } = result;

      // Skip this result if answer_ids is empty or null
      if (!answer_ids || answer_ids.trim() === "") {
        return acc; // Skip if no answers are provided
      }

      if (!acc[practiceheading]) {
        acc[practiceheading] = { attempts: [], created_at };
      }
      acc[practiceheading].attempts.push(result); // Ensure attempts is an array
      return acc;
    }, {});

    // Collect all answer IDs from the results
    const answerIds = new Set();
    results.forEach((result) => {
      const ids = result.answer_ids.split(","); // Split the comma-separated answer_ids
      ids.forEach((id) => answerIds.add(id.trim())); // Add each ID to the Set
    });

    // Create the dynamic FIND_IN_SET condition and filter out invalid/empty IDs
    const answerIdConditions = Array.from(answerIds)
      .filter((id) => id.trim()) // Filter out empty or invalid IDs
      .map((id) => `FIND_IN_SET(${id}, qa.answer_ids) > 0`)
      .join(" OR ");

    // Query to fetch the answers corresponding to these answer_ids
    const answersQuery = `SELECT 
      a.id, 
      a.question_id, 
      a.text, 
      a.risk_score, 
      a.gaps, 
      a.recommendation, 
      a.q, 
      a.correct_answer
    FROM 
      answers a
    JOIN 
      quiz_attempts qa ON FIND_IN_SET(a.id, qa.answer_ids) > 0
    WHERE 
      qa.user_id = ?
      AND (${answerIdConditions})`;

    db.query(answersQuery, [userId], async (err, answerResults) => {
      if (err) {
        console.error("Error fetching answers:", err);
        return res.status(500).json({ error: "Failed to fetch answers" });
      }

      if (answerResults.length === 0) {
        return res.status(404).json({ error: "No matching answers found" });
      }

      // Now calculate the scores and attach answers to attempts
      const practicesScores = {};

      for (const [practiceHeading, { attempts, created_at }] of Object.entries(
        groupedByPracticeHeading
      )) {
        // Ensure 'attempts' is an array
        if (!Array.isArray(attempts)) {
          console.error(
            `Expected attempts to be an array for practice heading: ${practiceHeading}`
          );
          continue; // skip this practice heading if attempts is not an array
        }

        // Find matching answers for this practice heading
        const matchingAnswers = answerResults.filter((answer) =>
          attempts.some((attempt) =>
            attempt.answer_ids.split(",").includes(String(answer.id))
          )
        );

        // Calculate the score for this practice heading
        const totalScore = matchingAnswers.reduce(
          (sum, answer) => sum + answer.risk_score,
          0
        );

        // Join gaps and recommendations, remove all periods and commas
        const gaps = matchingAnswers
          .map((answer) => {
            // Remove only the '^' character, keep everything else
            const gapText = answer.gaps
              ? answer.gaps.replace(/\^/g, "") // Removes only `^`
              : null;
            return gapText;
          })
          .filter((gap) => gap !== null && gap.trim() !== ""); // Remove null or empty gaps

        const recommendations = matchingAnswers
          .map((answer) => {
            // Remove only the '^' character, keep everything else
            const recText = answer.recommendation
              ? answer.recommendation.replace(/\^/g, "") // Removes only `^`
              : null;
            return recText;
          })
          .filter((rec) => rec !== null && rec.trim() !== ""); // Remove null or empty recommendations

        const DataoutOfScore = await calculateScoreByPractice(attempts);
        // Attach the practice score details
        practicesScores[practiceHeading] = {
          score: {
            totalScore,
            // percentageScore: (
            //   (totalScore / (attempts.length * 2)) *
            //   100
            // ).toFixed(2),
            // // correctAttempts: matchingAnswers.length,
            // correctAttempts: DataoutOfScore.quation_length,
            radiobtn: DataoutOfScore.qyationtype[0].totalRadio,
            one_s_each: DataoutOfScore.qyationtype[0].totalCheckboxCorrectOptions,
            checkbox: DataoutOfScore.qyationtype[0].totalCheckbox,
            totalScores: matchingAnswers.map((a) => a.risk_score),
            outOfScore: DataoutOfScore.outOfScore,
            quation_length: DataoutOfScore.quation_length,
            gaps: gaps.join("^"),
            recommendations: recommendations.join("^"),
            lowRisk: attempts[0]?.low_risk || 0, // Add low_risk from the first attempt
            highRisk: attempts[0]?.high_risk || 0, // Add high_risk from the first attempt
            veryHighRisk: attempts[0]?.very_high_risk || 0,
            practicename: attempts[0]?.tittle || 0, // Add very_high_risk from the first attempt
          },
          attempts: attempts.map((attempt) => {
            // Attach matching answer information to each attempt
            const associatedAnswer = matchingAnswers.find((answer) =>
              attempt.answer_ids.split(",").includes(String(answer.id))
            );
            return {
              ...attempt,
              totalScore: associatedAnswer ? associatedAnswer.risk_score : 0,
              gaps: associatedAnswer ? associatedAnswer.gaps : null,
              recommendation: associatedAnswer
                ? associatedAnswer.recommendation
                : null,
            };
          }),
        };
      }

      // Send the final response with structured results
      res.status(200).json({
        message: "Quiz results retrieved successfully",
        practicesScores,
      });
    });
  });
});

app.post("/getQuizResultssUserView1", async (req, res) => {
  const { userId, id, count } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "Invalid request data" });
  }

  // Query to fetch all practice headings associated with the user's quiz attempts
  const query = `SELECT  qq.practiceheading, 
                 qa.attempt_count, qa.question_id, qa.answer_ids, qq.text AS question_text, 
                 qa.created_at, p.tittle 
                 FROM quizhistory qa
                 JOIN questions qq ON qa.question_id = qq.id
                 JOIN quizzes qw ON qq.quiz_id = qw.id
                 JOIN practices p ON qw.practice = p.id
                 WHERE qa.user_id = ? AND qw.id = ? AND qa.attempt_count = ? 
                 ORDER BY qa.attempt_count ASC`;

  db.query(query, [userId, id, count], async (err, results) => {
    if (err) {
      console.error("Error fetching quiz results:", err);
      return res.status(500).json({ error: "Failed to fetch quiz results" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "No attempts found for this user" });
    }

    // Group results by practiceheading and filter out any attempts with empty answer_ids
    const groupedByPracticeHeading = results.reduce((acc, result) => {
      const { practiceheading, created_at, answer_ids } = result;

      // Skip this result if answer_ids is empty or null
      if (!answer_ids || answer_ids.trim() === "") {
        return acc; // Skip if no answers are provided
      }

      if (!acc[practiceheading]) {
        acc[practiceheading] = { attempts: [], created_at };
      }
      acc[practiceheading].attempts.push(result); // Ensure attempts is an array
      return acc;
    }, {});

    // Collect all answer IDs from the results
    const answerIds = new Set();
    results.forEach((result) => {
      const ids = result.answer_ids ? result.answer_ids.split(",") : []; // Fix applied
      ids.forEach((id) => answerIds.add(id.trim())); // Add each ID to the Set
    });

    // Create the dynamic FIND_IN_SET condition
    const answerIdConditions = Array.from(answerIds)
      .map((id) => `FIND_IN_SET(${id}, qa.answer_ids) > 0`)
      .join(" OR ");

    // Query to fetch the answers corresponding to these answer_ids
    const answersQuery = `SELECT 
      a.id, 
      a.question_id, 
      a.text, 
      a.risk_score, 
      a.gaps, 
      a.recommendation, 
      a.q, 
      a.correct_answer,
      qa.attempt_count
    FROM 
      answers a
    JOIN 
      quizhistory qa ON FIND_IN_SET(a.id, qa.answer_ids) > 0
    WHERE 
      qa.user_id = ? AND
      qa.attempt_count = ?
      AND (${answerIdConditions})`;

    db.query(answersQuery, [userId, count], async (err, answerResults) => {
      if (err) {
        console.error("Error fetching answers:", err);
        return res.status(500).json({ error: "Failed to fetch answers" });
      }

      if (answerResults.length === 0) {
        return res.status(404).json({ error: "No matching answers found" });
      }

      // Now calculate the scores and attach answers to attempts
      const practicesScores = {};

      for (const [practiceHeading, { attempts, created_at }] of Object.entries(
        groupedByPracticeHeading
      )) {
        // Ensure 'attempts' is an array
        if (!Array.isArray(attempts)) {
          console.error(
            `Expected attempts to be an array for practice heading: ${practiceHeading}`
          );
          continue; // Skip this practice heading if attempts is not an array
        }

        // Find matching answers for this practice heading
        const matchingAnswers = answerResults.filter((answer) =>
          attempts.some((attempt) =>
            attempt.answer_ids.split(",").includes(String(answer.id))
          )
        );

        // Calculate the score for this practice heading
        const totalScore = matchingAnswers.reduce(
          (sum, answer) => sum + answer.risk_score,
          0
        );

        // Join gaps and recommendations, remove all periods and commas
        const gaps = matchingAnswers
          .map((answer) => {
            // Remove only the '^' character, keep everything else
            const gapText = answer.gaps
              ? answer.gaps.replace(/\^/g, "") // Removes only `^`
              : null;
            return gapText;
          })
          .filter((gap) => gap !== null && gap.trim() !== ""); // Remove null or empty gaps

        const recommendations = matchingAnswers
          .map((answer) => {
            // Remove only the '^' character, keep everything else
            const recText = answer.recommendation
              ? answer.recommendation.replace(/\^/g, "") // Removes only `^`
              : null;
            return recText;
          })
          .filter((rec) => rec !== null && rec.trim() !== ""); // Remove null or empty recommendations

        const DataoutOfScore = await calculateScoreByPractice(attempts);

        // Attach the practice score details
        practicesScores[practiceHeading] = {
          score: {
            totalScore,
            // percentageScore: (
            //   (totalScore / (attempts.length * 2)) *
            //   100
            // ).toFixed(2),
            // correctAttempts: DataoutOfScore.quation_length,
            radiobtn: DataoutOfScore.qyationtype[0].totalRadio,
            checkbox: DataoutOfScore.qyationtype[0].totalCheckbox,
            one_s_each: DataoutOfScore.qyationtype[0].totalCheckboxCorrectOptions,
            totalScores: matchingAnswers.map((a) => a.risk_score),
            outOfScore: DataoutOfScore.outOfScore,
            quation_length: DataoutOfScore.quation_length,
            gaps: gaps.join("^"),
            recommendations: recommendations.join("^"),
            lowRisk: attempts[0]?.low_risk || 0, // Add low_risk from the first attempt
            highRisk: attempts[0]?.high_risk || 0, // Add high_risk from the first attempt
            veryHighRisk: attempts[0]?.very_high_risk || 0,
            practicename: attempts[0]?.tittle || 0, // Add very_high_risk from the first attempt
          },
          attempts: attempts.map((attempt) => {
            // Ensure answer_ids is not null
            const answerIdsArray = attempt.answer_ids
              ? attempt.answer_ids.split(",")
              : [];

            // Attach matching answer information to each attempt
            const associatedAnswer = matchingAnswers.find((answer) =>
              answerIdsArray.includes(String(answer.id))
            );

            return {
              ...attempt,
              totalScore: associatedAnswer ? associatedAnswer.risk_score : 0,
              gaps: associatedAnswer ? associatedAnswer.gaps : null,
              recommendation: associatedAnswer
                ? associatedAnswer.recommendation
                : null,
            };
          }),
        };
      }

      // Send the final response with structured results
      res.status(200).json({
        message: "Quiz results retrieved successfully",
        practicesScores,
      });
    });
  });
});

app.post("/getQuizResultss", async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "Invalid request data" });
  }

  // Query to fetch all practice headings associated with the user's quiz attempts
  const query = `SELECT qw.id as quiz_id, qq.practiceheading, qa.question_id, qa.answer_ids, qq.text AS question_text, qa.created_at 
  FROM quiz_attempts qa 
  JOIN questions qq 
  ON qa.question_id = qq.id 
  join quizzes qw ON qq.quiz_id = qw.id
  WHERE qa.user_id = ? group by qq.practiceheading
  ORDER BY qa.question_id DESC`;

  db.query(query, [userId], async (err, results) => {
    if (err) {
      console.error("Error fetching quiz results:", err);
      return res.status(500).json({ error: "Failed to fetch quiz results" });
    }

    if (results.length === 0) {
      return res.status(200).json({ error: "No attempts found for this user" });
    }

    // Group results by practiceheading
    const groupedByPracticeHeading = results.reduce((acc, result) => {
      const { practiceheading, created_at } = result;
      if (!acc[practiceheading]) {
        acc[practiceheading] = { attempts: [], created_at };
      }
      acc[practiceheading].attempts.push(result); // Ensure attempts is an array
      return acc;
    }, {});

    // Collect all answer IDs from the results
    const answerIds = new Set();
    results.forEach((result) => {
      const ids = result.answer_ids.split(","); // Split the comma-separated answer_ids
      ids.forEach((id) => answerIds.add(id.trim())); // Add each ID to the Set
    });

    // Create the dynamic FIND_IN_SET condition

    const answerIdConditions = Array.from(answerIds)
      // Filter out empty strings from the answerIds before mapping
      .filter((id) => id.trim() !== "") // Ensure empty IDs are excluded
      .map((id) => `FIND_IN_SET(${id}, qa.answer_ids) > 0`)
      .join(" OR ");

    // Ensure you handle the case when all answerIds are empty
    if (answerIdConditions.length === 0) {
      return res.status(400).json({ error: "No valid answer IDs provided" });
    }

    // Query to fetch the answers corresponding to these answer_ids
    const answersQuery = `
  SELECT 
    a.id, 
    a.question_id, 
    a.text, 
    a.risk_score, 
    a.gaps, 
    a.recommendation, 
    a.q, 
    a.correct_answer
  FROM 
    answers a
  JOIN 
    quiz_attempts qa ON (FIND_IN_SET(a.id, qa.answer_ids) > 0)
  WHERE 
    qa.user_id = ?
    AND (${answerIdConditions})
`;

    db.query(answersQuery, [userId], async (err, answerResults) => {
      if (err) {
        console.error("Error fetching answers:", err);
        return res.status(500).json({ error: "Failed to fetch answers" });
      }

      if (answerResults.length === 0) {
        return res.status(404).json({ error: "No matching answers found" });
      }

      // Now calculate the scores and attach answers to attempts
      const practicesScores = {};

      for (const [practiceHeading, { attempts, created_at }] of Object.entries(
        groupedByPracticeHeading
      )) {
        // Ensure 'attempts' is an array
        if (!Array.isArray(attempts)) {
          console.error(
            `Expected attempts to be an array for practice heading: ${practiceHeading}`
          );
          continue; // skip this practice heading if attempts is not an array
        }

        // Find matching answers for this practice heading
        const matchingAnswers = answerResults.filter((answer) =>
          attempts.some((attempt) =>
            attempt.answer_ids.split(",").includes(String(answer.id))
          )
        );

        // Calculate the score for this practice heading
        const totalScore = matchingAnswers.reduce(
          (sum, answer) => sum + answer.risk_score,
          0
        );

        // Join gaps and recommendations, remove all periods and commas
        const gaps = matchingAnswers
          .map((answer) => {
            // Remove periods and commas from gaps, exclude null or empty
            const gapText = answer.gaps
              ? answer.gaps.replace(/[.,]/g, "")
              : null;
            return gapText;
          })
          .filter((gap) => gap !== null && gap !== ""); // Remove null or empty gaps

        const recommendations = matchingAnswers
          .map((answer) => {
            // Remove periods and commas from recommendations, exclude null or empty
            const recText = answer.recommendation
              ? answer.recommendation.replace(/[.,]/g, "")
              : null;
            return recText;
          })
          .filter((rec) => rec !== null && rec !== ""); // Remove null or empty recommendations
        const DataoutOfScore = await calculateScoreByPractice(attempts);

        // Attach the practice score details
        practicesScores[practiceHeading] = {
          score: {
            totalScore,
            // percentageScore: (
            //   (totalScore / (attempts.length * 2)) *
            //   100
            // ).toFixed(2),
            // correctAttempts: matchingAnswers.length,
            totalScores: matchingAnswers.map((a) => a.risk_score),
            outOfScore: DataoutOfScore.outOfScore,
            gaps: gaps.join(" , "),
            recommendations: recommendations.join(" , "),
            date: created_at,
          },
          attempts: attempts.map((attempt) => {
            // Attach matching answer information to each attempt
            const associatedAnswer = matchingAnswers.find((answer) =>
              attempt.answer_ids.split(",").includes(String(answer.id))
            );
            return {
              ...attempt,
              totalScore: associatedAnswer ? associatedAnswer.risk_score : 0,
              gaps: associatedAnswer ? associatedAnswer.gaps : null,
              recommendation: associatedAnswer
                ? associatedAnswer.recommendation
                : null,
            };
          }),
        };
      }

      // Send the final response with structured results
      res.status(200).json({
        message: "Quiz results retrieved successfully",
        practicesScores,
      });
    });
  });
});

app.post("/getQuizResulteval", async (req, res) => {
  const { userId, quizname } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "Invalid request data" });
  }

  // Query to fetch all practice headings associated with the user's quiz attempts
  const query = `SELECT qq.practiceheading, qa.question_id, qa.answer_ids, qq.text AS question_text, qa.created_at FROM quiz_attempts qa JOIN questions qq ON qa.question_id = qq.id WHERE qa.user_id = ? and qq.practiceheading = ?`;

  db.query(query, [userId, quizname], async (err, results) => {
    if (err) {
      console.error("Error fetching quiz results:", err);
      return res.status(500).json({ error: "Failed to fetch quiz results" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "No attempts found for this user" });
    }

    // Group results by practiceheading
    const groupedByPracticeHeading = results.reduce((acc, attempt) => {
      const { practiceheading } = attempt;
      if (!acc[practiceheading]) {
        acc[practiceheading] = [];
      }
      acc[practiceheading].push(attempt);
      return acc;
    }, {});

    try {
      const practicesScores = {};

      for (const [practiceHeading, attempts] of Object.entries(
        groupedByPracticeHeading
      )) {
        // Calculate scores for each practice heading
        const scoreData = await calculateScoreByPractice(attempts);

        // Store the score data for this practice heading
        practicesScores[practiceHeading] = {
          score: scoreData,
          gaps: scoreData.gaps, // Gaps as a string
          recommendations: scoreData.recommendations, // Recommendations as a string
          attempts: attempts.map((attempt, index) => ({
            ...attempt,
            totalScore: scoreData.totalScores[index],
          })),
        };
      }

      res.status(200).json({
        message: "Quiz results retrieved successfully",
        practicesScores,
      });
    } catch (err) {
      console.error("Error calculating score:", err);
      res.status(500).json({ error: "Failed to calculate scores" });
    }
  });
});

const getquationtype = (questionIds) => {
  console.log(questionIds);
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT SUM(CASE WHEN q.question_type = 'Radio button' THEN 1 ELSE 0 END) AS totalRadio, SUM(CASE WHEN q.question_type = 'Check Box' THEN 1 ELSE 0 END) AS totalCheckbox, ( SELECT COUNT(*) FROM answers a WHERE a.risk_score = 1 AND a.question_id IN ( SELECT id FROM questions WHERE question_type = 'Check Box' AND id IN (?) ) ) AS totalCheckboxCorrectOptions FROM questions q WHERE q.id IN (?);`,
      [questionIds, questionIds],
      (err, results) => {
        if (err) {
          return reject(err);
        }
        const totalRiskScore = results || 0;
        resolve(totalRiskScore);
      }
    );
  });
}

const calculateScoreByPractice = async (attempts) => {
  let totalScore = 0;
  let correctAttempts = 0;
  let quation_length = 0;
  let totalScores = [];
  let allGaps = [];
  let allRecommendations = [];

  // Fetch the sum of all possible risk scores for the provided question IDs
  const outOfScore = await getSumOfAllRiskScoresByPractice(
    attempts.map((attempt) => attempt.question_id)
  );
  const qyationtype = await getquationtype(attempts.map((attempt) => attempt.question_id));

  quation_length = attempts.length;

  for (const attempt of attempts) {
    const { question_id, answer_ids } = attempt;

    // Split `answer_ids` into an array
    const answerIdsArray = answer_ids
      ? answer_ids.split(",").map((id) => id.trim())
      : [];

    // Get correctness, riskScore, recommendations, and gaps
    const { isCorrect, riskScore, recommendations, gaps } =
      await isAnswerCorrectByPractice(question_id, answerIdsArray);

    if (isCorrect) correctAttempts++;

    totalScore += riskScore;
    totalScores.push(riskScore);

    // Collect all gaps and recommendations as strings
    if (recommendations.length > 0) {
      allRecommendations.push(recommendations.join(", "));
    }
    if (gaps.length > 0) {
      allGaps.push(gaps.join(", "));
    }
  }

  const percentageScore = ((totalScore / outOfScore) * 100).toFixed(2);

  return {
    totalScore,
    percentageScore,
    correctAttempts,
    qyationtype,
    totalScores,
    quation_length,
    outOfScore,
    gaps: allGaps.join(", "), // Join gaps into a single string
    recommendations: allRecommendations.join(", "), // Join recommendations into a single string
  };
};


// Check if the answer is correct by practice, and get recommendations and gaps
const isAnswerCorrectByPractice = (question_id, answer_ids) => {
  return new Promise((resolve, reject) => {
    // If answer_ids is empty, return a default response
    if (!Array.isArray(answer_ids) || answer_ids.length === 0) {
      return resolve({
        isCorrect: false,
        riskScore: 0,
        recommendations: [],
        gaps: [],
      });
    }

    db.query(
      `SELECT id, risk_score, recommendation, gaps
       FROM answers 
       WHERE question_id = ? AND id IN (?)`,
      [question_id, answer_ids],
      (err, results) => {
        if (err) {
          return reject(err);
        }

        const totalRiskScore = results.reduce(
          (sum, answer) => sum + answer.risk_score,
          0
        );

        const isCorrect = totalRiskScore > 0;

        // Extract recommendations and gaps from the results
        const recommendations = results
          .map((answer) => answer.recommendation)
          .filter(Boolean);
        const gaps = results.map((answer) => answer.gaps).filter(Boolean);

        resolve({
          isCorrect,
          riskScore: totalRiskScore,
          recommendations,
          gaps,
        });
      }
    );
  });
};

// Utility function to get the sum of all risk scores for a practice
const getSumOfAllRiskScoresByPractice = (questionIds) => {

  return new Promise((resolve, reject) => {
    db.query(
      `SELECT SUM(risk_score) AS totalRiskScore 
       FROM answers 
       WHERE question_id IN (?)`,
      [questionIds],
      (err, results) => {
        if (err) {
          return reject(err);
        }

        const totalRiskScore = results[0].totalRiskScore || 0;
        resolve(totalRiskScore);
      }
    );
  });
};

app.post("/getQuizResults", async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "Invalid request data" });
  }

  const query = `
    SELECT 
      qq.practice, 
      qa.question_id, 
      qa.answer_ids, 
      qq.text AS question_text 
    FROM 
      quiz_attempts qa
    JOIN 
      questions qq 
    ON 
      qa.question_id = qq.id
    WHERE 
      qa.user_id = ?
  `;

  db.query(query, [userId], async (err, results) => {
    if (err) {
      console.error("Error fetching quiz results:", err);
      return res.status(500).json({ error: "Failed to fetch quiz results" });
    }

    if (results.length === 0) {
      return res.status(200).json({ error: "No attempts found for this user" });
    }

    // Group results by practice
    const groupedByPractice = results.reduce((acc, attempt) => {
      const { practice } = attempt;
      if (!acc[practice]) {
        acc[practice] = [];
      }
      acc[practice].push(attempt);
      return acc;
    }, {});

    try {
      const practicesScores = {};
      let totalScore = 0;
      let totalOutOfScore = 0;

      for (const [practice, attempts] of Object.entries(groupedByPractice)) {
        // Calculate scores for each practice
        const scoreData = await calculateScoreByPractice(attempts);

        // Store the score data for this practice
        practicesScores[practice] = {
          score: scoreData,
          attempts: attempts.map((attempt, index) => ({
            ...attempt,
            totalScore: scoreData.totalScores[index],
          })),
        };

        // Accumulate total score and out-of-score
        totalScore += scoreData.totalScore;
        totalOutOfScore += scoreData.outOfScore;
      }

      // Calculate total percentage across all practices
      const totalPercentage = ((totalScore / totalOutOfScore) * 100).toFixed(2);

      res.status(200).json({
        message: "Quiz results retrieved successfully",
        practicesScores,
        totalScore,
        totalOutOfScore,
        totalPercentage,
      });
    } catch (err) {
      console.error("Error calculating score:", err);
      res.status(500).json({ error: "Failed to calculate scores" });
    }
  });
});

app.post("/getQuiztotal", async (req, res) => {
  const { id } = req.body;

  const selectQuery =
    "SELECT q.id AS quiz_id, q.title AS quiz_title, COALESCE(SUM(a.risk_score), 0) AS total_risk_score FROM quizzes q LEFT JOIN questions ques ON q.id = ques.quiz_id LEFT JOIN answers a ON ques.id = a.question_id GROUP BY q.id, q.title HAVING quiz_id= ? ORDER BY q.id ASC";

  db.query(selectQuery, [id], function (error, result) {
    if (error) {
      return console.log("error in total Api");
    }
    return res
      .status(200)
      .json({ status: 1, data: result[0].total_risk_score });
  });
});

app.post("/admin/handledeleteQuiz", (req, res) => {
  const { id } = req.body;

  // Queries to delete related data
  const deleteQuizHistoryQuery = "DELETE FROM quizhistory WHERE quiz_id = ?";
  const deleteQuizAttemptsQuery = "DELETE FROM quiz_attempts WHERE quiz_id = ?";
  const deleteQuestionsQuery = "DELETE FROM questions WHERE practice = ?";
  const deleteQuizQuery = "DELETE FROM quizzes WHERE title = ?";

  db.getConnection((err, connection) => {
    if (err) {
      console.error("Error getting connection from pool:", err);
      return res
        .status(500)
        .json({ status: 0, message: "Database connection error" });
    }

    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        console.error("Error starting transaction:", err);
        return res
          .status(500)
          .json({ status: 0, message: "Transaction error" });
      }

      // Delete from `quizhistory`
      connection.query(deleteQuizHistoryQuery, [id], (err) => {
        if (err) {
          connection.rollback(() => connection.release());
          console.error("Error deleting from quizhistory:", err);
          return res
            .status(500)
            .json({ status: 0, message: "Error deleting quiz history" });
        }

        // Delete from `quiz_attempts`
        connection.query(deleteQuizAttemptsQuery, [id], (err) => {
          if (err) {
            connection.rollback(() => connection.release());
            console.error("Error deleting from quiz_attempts:", err);
            return res
              .status(500)
              .json({ status: 0, message: "Error deleting quiz attempts" });
          }

          // Delete from `questions`
          connection.query(deleteQuestionsQuery, [id], (err) => {
            if (err) {
              connection.rollback(() => connection.release());
              console.error("Error deleting from questions:", err);
              return res
                .status(500)
                .json({ status: 0, message: "Error deleting questions" });
            }

            // Finally, delete the quiz itself
            connection.query(deleteQuizQuery, [id], (err) => {
              if (err) {
                connection.rollback(() => connection.release());
                console.error("Error deleting quiz:", err);
                return res
                  .status(500)
                  .json({ status: 0, message: "Error deleting quiz" });
              }

              // Commit transaction
              connection.commit((err) => {
                if (err) {
                  connection.rollback(() => connection.release());
                  console.error("Error committing transaction:", err);
                  return res
                    .status(500)
                    .json({ status: 0, message: "Transaction commit error" });
                }

                connection.release();
                res.status(200).json({
                  status: 1,
                  message: "Assessment deleted successfully, including history",
                });
              });
            });
          });
        });
      });
    });
  });
});

app.post("/admin/handledeleteQuiz1", (req, res) => {
  const { quizid } = req.body;

  const selectquery =
    "SELECT practices.*, quizzes.* FROM practices INNER JOIN quizzes ON practices.id = quizzes.practice WHERE practices.id = ?";

  db.query(selectquery, [quizid], function (error, result) {
    if (error) {
      return console.log("error in total Api");
    }

    const id = result[0]?.title;

    const deletepractice = "DELETE FROM `practices` WHERE `id` = ?";
    const deleteQuizHistoryQuery = "DELETE FROM quizhistory WHERE quiz_id = ?";
    const deleteQuizAttemptsQuery =
      "DELETE FROM quiz_attempts WHERE quiz_id = ?";
    const deleteQuestionsQuery = "DELETE FROM questions WHERE practice = ?";
    const deleteQuizQuery = "DELETE FROM quizzes WHERE title = ?";

    db.getConnection((err, connection) => {
      if (err) {
        console.error("Error getting connection from pool:", err);
        return res
          .status(500)
          .json({ status: 0, message: "Database connection error" });
      }

      connection.beginTransaction((err) => {
        if (err) {
          connection.release();
          console.error("Error starting transaction:", err);
          return res
            .status(500)
            .json({ status: 0, message: "Transaction error" });
        }
        connection.query(deletepractice, [quizid], (err) => {
          if (err) {
            connection.rollback(() => connection.release());
            console.error("Error deleting from quizhistory:", err);
            return res
              .status(500)
              .json({ status: 0, message: "Error deleting quiz history" });
          }
          // Delete from `quizhistory`
          connection.query(deleteQuizHistoryQuery, [id], (err) => {
            if (err) {
              connection.rollback(() => connection.release());
              console.error("Error deleting from quizhistory:", err);
              return res
                .status(500)
                .json({ status: 0, message: "Error deleting quiz history" });
            }

            // Delete from `quiz_attempts`
            connection.query(deleteQuizAttemptsQuery, [id], (err) => {
              if (err) {
                connection.rollback(() => connection.release());
                console.error("Error deleting from quiz_attempts:", err);
                return res
                  .status(500)
                  .json({ status: 0, message: "Error deleting quiz attempts" });
              }

              // Delete from `questions`
              connection.query(deleteQuestionsQuery, [id], (err) => {
                if (err) {
                  connection.rollback(() => connection.release());
                  console.error("Error deleting from questions:", err);
                  return res
                    .status(500)
                    .json({ status: 0, message: "Error deleting questions" });
                }

                // Finally, delete the quiz itself
                connection.query(deleteQuizQuery, [id], (err) => {
                  if (err) {
                    connection.rollback(() => connection.release());
                    console.error("Error deleting quiz:", err);
                    return res
                      .status(500)
                      .json({ status: 0, message: "Error deleting quiz" });
                  }

                  // Commit transaction
                  connection.commit((err) => {
                    if (err) {
                      connection.rollback(() => connection.release());
                      console.error("Error committing transaction:", err);
                      return res.status(500).json({
                        status: 0,
                        message: "Transaction commit error",
                      });
                    }

                    connection.release();
                    res.status(200).json({
                      status: 1,
                      message:
                        "Assessment deleted successfully, including history",
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});

app.post("/admin/getsinglequiz", async (req, res) => {
  const { documentId } = req.body;

  const insertQuery = `
  SELECT id, title, practice, description, date 
  FROM quizzes
  WHERE practice  IN (?);
`;

  // Execute the query
  db.query(insertQuery, [documentId], function (error, result) {
    if (error) {
      console.error("Error in SQL query:", error.message);
      return res
        .status(500)
        .json({ status: 0, message: "Failed to create practice" });
    }

    // Success response
    return res.status(200).json({ status: 1, data: result });
  });
});

app.post("/createpractice", async (req, res) => {
  const { p_name, p_descriptions } = req.body;

  // Validate input
  if (!p_name || !p_descriptions) {
    return res
      .status(400)
      .json({ status: 0, message: "All fields are required" });
  }

  // SQL Query with corrected syntax
  const insertQuery =
    "INSERT INTO `practices` (`tittle`, `discription`) VALUES (?, ?)";

  // Execute the query
  db.query(insertQuery, [p_name, p_descriptions], function (error, result) {
    if (error) {
      console.error("Error in SQL query:", error.message);
      return res
        .status(500)
        .json({ status: 0, message: "Failed to create practice" });
    }

    // Success response
    return res
      .status(200)
      .json({ status: 1, message: "Practice created successfully" });
  });
});

app.post("/admin/rangetext", async (req, res) => {
  const { plan } = req.body;

  const insertQuery = "SELECT * FROM `dashboard` WHERE `plan` =?";

  // Execute the query
  db.query(insertQuery, [plan], function (error, result) {
    if (error) {
      console.error("Error in SQL query:", error.message);
      return res
        .status(500)
        .json({ status: 0, message: "Failed to create practice" });
    }

    return res.status(200).json({ status: 1, data: result });
  });
});

app.post("/admin/update_rangetext", async (req, res) => {
  const { plan, low_risk_score, high_risk_score, very_risk_score } = req.body;

  if (!plan) {
    return res.status(400).json({ status: 0, message: "Plan is required" });
  }

  // Query to check if the plan exists
  const checkQuery = "SELECT * FROM `dashboard` WHERE `plan` = ?";

  db.query(checkQuery, [plan], (error, results) => {
    if (error) {
      console.error("Error in SQL query:", error.message);
      return res.status(500).json({ status: 0, message: "Database error" });
    }

    if (results.length > 0) {
      // If entry exists, update only the required fields
      const updateQuery = `
        UPDATE dashboard 
        SET 
          low_risk_score = ?, 
          high_risk_score = ?, 
          very_risk_score = ? 
        WHERE plan = ?
      `;

      db.query(
        updateQuery,
        [low_risk_score, high_risk_score, very_risk_score, plan],
        (updateError) => {
          if (updateError) {
            console.error("Error updating record:", updateError.message);
            return res
              .status(500)
              .json({ status: 0, message: "Failed to update record" });
          }

          return res
            .status(200)
            .json({ status: 1, message: "Record updated successfully" });
        }
      );
    } else {
      return res.status(404).json({ status: 0, message: "Plan not found" });
    }
  });
});

app.post("/createquiz", async (req, res) => {
  const { p_name, p_descriptions, selectedPractice } = req.body;

  // Validate input
  if (!p_name || !p_descriptions) {
    return res
      .status(400)
      .json({ status: 0, message: "All fields are required" });
  }

  const selectQuery = "SELECT * FROM `quizzes` WHERE `practice` = ?";

  db.query(selectQuery, [selectedPractice], function (error, result) {
    if (error) {
      console.error("Error in SQL query:", error.message);
      return res
        .status(500)
        .json({ status: 0, message: "Failed to check existing Assessments" });
    }

    // If quiz already exists
    if (result.length > 0) {
      return res
        .status(200)
        .json({ status: 1, message: "Assessments already exists" });
    }

    // If quiz does not exist, proceed to insert the new quiz
    const insertQuery =
      "INSERT INTO `quizzes`(`title`, `practice`, `description`) VALUES (?, ?, ?)";

    db.query(
      insertQuery,
      [p_name, selectedPractice, p_descriptions],
      function (error, result) {
        if (error) {
          console.error("Error in SQL query:", error.message);
          return res
            .status(500)
            .json({ status: 0, message: "Failed to create Assessments." });
        }

        // Success response
        return res
          .status(200)
          .json({ status: 1, message: "Assessments created successfully." });
      }
    );
  });
});

app.post("/getQuiztotaluser", async (req, res) => {
  const { practice } = req.body;

  const selectQuery = `
    SELECT 
      COALESCE(SUM(a.risk_score), 0) AS total_risk_score
    FROM 
      questions ques
    LEFT JOIN 
      answers a 
    ON 
      ques.id = a.question_id
    WHERE 
      ques.practice = ?
  `;

  db.query(selectQuery, [practice], function (error, result) {
    if (error) {
      console.error("Error in total API:", error);
      return res.status(500).json({ status: 0, error: "Database error" });
    }

    return res.status(200).json({
      status: 1,
      total_risk_score: result[0]?.total_risk_score || 0,
    });
  });
});

// Function to calculate the score based on the user's answers and correct answers from the database
const calculateScore = async (attempts) => {
  let totalScore = 0; // Total risk score from user's selected answers
  let correctAttempts = 0; // Count of attempts with non-zero risk score
  let totalScores = []; // Array to store total score for each attempt

  // Fetch the sum of all possible risk scores for the quiz questions
  const questionIds = attempts.map((attempt) => attempt.question_id);
  const outOfScore = await getSumOfAllRiskScores(questionIds);

  // Iterate through each attempt (each question answered by the user)
  for (const attempt of attempts) {
    const { question_id, answer_ids } = attempt;

    // Ensure answer_ids is an array (split by commas in case of multiple answers)
    const answerIdsArray = answer_ids
      ? answer_ids.split(",").map((id) => id.trim())
      : [];

    // Check if the user's answers are correct (compare with correct answers in the database)
    const { isCorrect, riskScore } = await isAnswerCorrect(
      question_id,
      answerIdsArray
    );

    if (isCorrect) {
      correctAttempts++;
    }

    // Add the risk score for the current attempt
    totalScore += riskScore;

    // Store the score for the individual attempt
    totalScores.push(riskScore);
  }

  // Calculate percentage score based on correct attempts
  //const percentageScore = (correctAttempts / attempts.length) * 100;
  const percentageScore = ((totalScore / outOfScore) * 100).toFixed(2);

  return {
    totalScore, // Total risk score from the user's answers
    percentageScore, // Percentage of questions answered correctly
    correctAttempts, // Number of questions with non-zero risk score
    totalScores, // Array of total scores for each attempt
    outOfScore, // Total of all possible risk scores
  };
};

// Helper function to fetch the maximum possible risk score for a question
const getSumOfAllRiskScores = (questionIds) => {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT SUM(risk_score) AS totalRiskScore 
             FROM answers 
             WHERE question_id IN (?)`,
      [questionIds],
      (err, results) => {
        if (err) {
          return reject(err);
        }

        // Return the total sum of all risk scores
        const totalRiskScore = results[0]?.totalRiskScore || 0;
        resolve(totalRiskScore);
      }
    );
  });
};

// Function to check if the user's answers are correct (dynamic version)
const isAnswerCorrect = (question_id, answer_ids) => {
  // Fetch correct answers and their risk scores dynamically from the database
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT id, risk_score FROM answers WHERE question_id = ? AND id IN (?)`,
      [question_id, answer_ids],
      (err, results) => {
        if (err) {
          return reject(err);
        }

        // Calculate the total risk score based on selected answers
        const totalRiskScore = results.reduce(
          (sum, answer) => sum + answer.risk_score,
          0
        );

        // Determine if the answer is correct (total risk score > 0)
        const isCorrect = totalRiskScore > 0;

        resolve({
          isCorrect,
          riskScore: totalRiskScore, // Return total risk score for this attempt
        });
      }
    );
  });
};

app.post("/admin/quizupdate", (req, res) => {
  const { questions, anserData } = req.body;

  if (!questions || !anserData) {
    return res.status(400).json({ error: "Invalid request data" });
  }

  db.getConnection((err, connection) => {
    if (err) {
      console.error("Error getting database connection:", err);
      return res.status(500).json({ error: "Database connection error" });
    }

    connection.beginTransaction(async (err) => {
      if (err) {
        console.error("Error starting transaction:", err);
        connection.release();
        return res.status(500).json({ error: "Transaction start error" });
      }

      try {
        // Update questions
        for (const question of questions) {
          const questionQuery = `
            UPDATE questions 
            SET text=?, compliance_requirement=?, risk_level=?, penalty=?,  practiceheading=?, q=? 
            WHERE id=?
          `;

          await connection.promise().query(questionQuery, [
            question.text,
            question.ComplianceRequirement || null,
            question.RiskLevel || null,
            question.Penalty || null,
            question.practiceheading || question.text, // Ensure correct practice title
            0,
            question.id,
          ]);
        }

        // Update answers
        for (const answer of anserData) {
          const answerQuery = `
            UPDATE answers 
            SET text=?, risk_score=?, gaps=?, recommendation=?, q=?, comments=? 
            WHERE id=?
          `;

          await connection
            .promise()
            .query(answerQuery, [
              answer.text,
              answer.riskScore || 0,
              answer.gaps || null,
              answer.recommendation || null,
              answer.q || null,
              answer.comments || "",
              answer.id,
            ]);
        }

        // Commit transaction
        await connection.promise().commit();
        res
          .status(200)
          .json({ message: "Questions and answers updated successfully" });
      } catch (error) {
        console.error("Transaction failed:", error);
        await connection.promise().rollback();
        res.status(500).json({ message: "Update failed" });
      } finally {
        connection.release();
      }
    });
  });
});

app.post("/getretake", (req, res) => {
  const { userId } = req.body;
  const selectQuery =
    "SELECT * FROM `quizhistory` WHERE `attempt_count` > 0 AND `user_id` = ? GROUP BY `created_at`";
  db.query(selectQuery, [userId], function (error, result) {
    if (error) {
      return console.log(error);
    }
    return res.status(200).json({ status: 1, data: result });
  });
});

app.post("/getdevicelogin", (req, res) => {
  const { useremail } = req.body;
  const selectQuery =
    "SELECT * FROM `active_user` WHERE `email` = ? GROUP BY `device_id`;";
  db.query(selectQuery, [useremail], function (error, result) {
    if (error) {
      return console.log(error);
    }
    return res.status(200).json({ status: 1, data: result });
  });
});

app.post("/logout", (req, res) => {
  const { useremail, deviceId } = req.body;
  const selectQuery =
    "DELETE FROM `active_user` WHERE `email` = ? AND `device_id` = ?;";
  db.query(selectQuery, [useremail, deviceId], function (error, result) {
    if (error) {
      return console.log(error);
    }
    return res.status(200).json({ status: 1, data: result });
  });
});

app.post("/save-support-data", (req, res) => {
  const { plan, mainSubHeading, features, faqs } = req.body;
  // Check if the plan exists in `support_main`
  const selectQuery = "SELECT * FROM `support_main` WHERE `plan` = ?";
  db.query(selectQuery, [plan], (error, result) => {
    if (error) {
      console.error("Database error:", error);
      return res.status(500).json({ error: "Database error" });
    }

    if (result.length > 0) {
      // Update existing plan
      const updateMainQuery =
        "UPDATE `support_main` SET `main_heading`= ? WHERE `plan` = ?";
      db.query(updateMainQuery, [mainSubHeading, plan], (error) => {
        if (error) {
          console.error("Error updating main heading:", error);
          return res.status(500).json({ error: "Error updating main heading" });
        }
      });
    } else {
      // Insert new plan if not exists
      const insertMainQuery =
        "INSERT INTO support_main (main_heading, plan) VALUES (?, ?)";
      db.query(insertMainQuery, [mainSubHeading, plan], (err) => {
        if (err) {
          console.error("Error inserting main data:", err);
          return res.status(500).json({ error: "Error saving main data" });
        }
      });
    }

    // Process Features
    features.forEach(({ id, feature, subheading, link, btnname }) => {
      // Ensure all fields are saved as empty strings if they are null or undefined
      feature = feature ? feature : "";
      subheading = subheading ? subheading : "";
      link = link ? link : "";
      btnname = btnname ? btnname : "";

      const checkFeatureQuery = "SELECT * FROM `support_features` WHERE id = ?";
      db.query(checkFeatureQuery, [id], (error, result) => {
        if (error) {
          console.error("Database error:", error);
          return;
        }

        if (result.length > 0) {
          // Update existing feature
          const updateFeatureQuery =
            "UPDATE support_features SET feature = ?, subheading = ?, link = ?, btnname = ? WHERE id = ?";
          db.query(
            updateFeatureQuery,
            [feature, subheading, link, btnname, id],
            (error) => {
              if (error) console.error("Error updating feature:", error);
            }
          );
        } else {
          // Insert new feature
          const insertFeatureQuery =
            "INSERT INTO support_features (plan, feature, subheading, link, btnname) VALUES (?, ?, ?, ?, ?)";
          db.query(
            insertFeatureQuery,
            [plan, feature, subheading, link, btnname],
            (error) => {
              if (error) console.error("Error inserting feature:", error);
            }
          );
        }
      });
    });

    // Process FAQs
    faqs.forEach(({ id, question, answer }) => {
      if (question && answer) {
        const checkFAQQuery = "SELECT * FROM `faqs` WHERE id = ?";
        db.query(checkFAQQuery, [id], (error, result) => {
          if (error) {
            console.error("Database error:", error);
            return;
          }

          if (result.length > 0) {
            // Update existing FAQ
            const updateFAQQuery =
              "UPDATE faqs SET question = ?, answer = ? WHERE id = ?";
            db.query(updateFAQQuery, [question, answer, id], (error) => {
              if (error) console.error("Error updating FAQ:", error);
            });
          } else {
            // Insert new FAQ
            const insertFAQQuery =
              "INSERT INTO faqs (plan, question, answer) VALUES (?, ?, ?)";
            db.query(insertFAQQuery, [plan, question, answer], (error) => {
              if (error) console.error("Error inserting FAQ:", error);
            });
          }
        });
      }
    });

    res.json({ message: "✅ Data saved successfully!" });
  });
});

app.post("/admin/get-support-data", (req, res) => {
  const { plan } = req.body;

  if (!plan) {
    console.log("Plan is missing in request.");
    return res.status(200).json({ error: "Plan is required" });
  }

  // Fetch main heading
  const mainQuery = "SELECT id, main_heading FROM support_main WHERE plan = ?";
  db.query(mainQuery, [plan], (err, mainResult) => {
    if (err) {
      console.error("Error fetching main data:", err);
      return res.status(500).json({ error: "Error fetching main data" });
    }

    if (mainResult.length === 0) {
      console.log("No data found for plan:", plan);

      return res
        .status(200)
        .json({ status: 1, error: "No data found for this plan" });
    }

    const mainSubHeading = mainResult[0].main_heading;

    // Fetch features
    const featuresQuery =
      "SELECT id, feature, subheading,link , btnname FROM support_features WHERE plan = ?";
    db.query(featuresQuery, [plan], (err, featuresResult) => {
      if (err) {
        console.error("Error fetching features:", err);
        return res.status(500).json({ error: "Error fetching features" });
      }

      // Fetch FAQs
      const faqsQuery = "SELECT id, question, answer FROM faqs WHERE plan = ?";
      db.query(faqsQuery, [plan], (err, faqsResult) => {
        if (err) {
          console.error("Error fetching FAQs:", err);
          return res.status(500).json({ error: "Error fetching FAQs" });
        }

        res.json({
          status: 1,
          mainSubHeading,
          features: featuresResult,
          faqs: faqsResult,
        });
      });
    });
  });
});

app.post("/admin/delte-support-data", (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: "Feature ID is required" });
  }

  const deleteQuery = "DELETE FROM support_features WHERE id = ?";

  db.query(deleteQuery, [id], (err, result) => {
    if (err) {
      console.error("Error deleting feature:", err);
      return res.status(500).json({ error: "Error deleting feature" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Feature not found" });
    }

    res.json({ message: "✅ Feature deleted successfully!" });
  });
});

app.post("/admin/delte-faq-data", (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: "Feature ID is required" });
  }

  const deleteQuery = "DELETE FROM faqs WHERE id = ?";

  db.query(deleteQuery, [id], (err, result) => {
    if (err) {
      console.error("Error deleting feature:", err);
      return res.status(500).json({ error: "Error deleting feature" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Feature not found" });
    }

    res.json({ message: "✅ faqs deleted successfully!" });
  });
});

app.post("/create-quiz", (req, res) => {
  const { question, type, options } = req.body;

  const insertQuestionQuery =
    "INSERT INTO generalquiz (quations, optiontype) VALUES (?, ?)";
  db.query(insertQuestionQuery, [question, type], (err, result) => {
    if (err) {
      console.error("Error inserting question:", err);
      return res.status(500).json({ error: "Database error" });
    }

    const questionId = result.insertId;
    const insertOptionsQuery =
      "INSERT INTO genraloption (quationid, optionnumber, goption, comment, skiping) VALUES ?";
    const optionValues = options.map((opt, i) => [
      questionId,
      `${questionId}${String.fromCharCode(97 + i)}`,
      opt.text,
      opt.comment || "",
      opt.skip || "",
    ]);

    db.query(insertOptionsQuery, [optionValues], (err) => {
      if (err) {
        console.error("Error inserting options:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.status(201).json({ message: "Quiz created successfully" });
    });
  });
});
app.post("/update-quiz", (req, res) => {
  const { quizId, question, type, options } = req.body;


  if (!quizId || !question || !type || !options || options.length === 0) {
    return res.status(400).json({ error: "Invalid data provided!" });
  }

  // Update question in generalquiz table
  const updateQuestionQuery =
    "UPDATE generalquiz SET quations = ?, optiontype = ? WHERE id = ?";
  db.query(updateQuestionQuery, [question, type, quizId], (err, result) => {
    if (err) {
      console.error("Error updating question:", err);
      return res.status(200).json({ error: "Database error" });
    }

    // Delete existing options before inserting new ones
    const deleteOptionsQuery = "DELETE FROM genraloption WHERE quationid = ?";
    db.query(deleteOptionsQuery, [quizId], (err) => {
      if (err) {
        console.error("Error deleting existing options:", err);
        return res.status(200).json({ error: "Database error" });
      }

      // Insert updated options
      const insertOptionsQuery =
        "INSERT INTO genraloption (quationid, optionnumber, goption, comment, skiping) VALUES ?";
      const optionValues = options.map((opt, i) => [
        quizId,
        `${quizId}${String.fromCharCode(97 + i)}`,
        opt.text,
        opt.comment || "",
        opt.skip || "",
      ]);

      db.query(insertOptionsQuery, [optionValues], (err) => {
        if (err) {
          console.error("Error inserting new options:", err);
          return res.status(200).json({ error: "Database error" });
        }

        res.status(200).json({ message: "Quiz updated successfully!" });
      });
    });
  });
});

// ✅ API to Fetch All Quiz Questions and Options
app.get("/get-quizzes", (req, res) => {
  const query = `
      SELECT g.id AS question_id, g.questions, g.optiontype, 
             o.id AS option_id, o.optionnumber, o.goption, o.comment, o.skiping
      FROM generalquiz g
      LEFT JOIN genraloption o ON g.id = o.quationid
      ORDER BY g.id, o.optionnumber;
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    const quizzes = {};
    results.forEach((row) => {
      if (!quizzes[row.question_id]) {
        quizzes[row.question_id] = {
          question: row.question,
          type: row.optiontype,
          options: [],
        };
      }
      quizzes[row.question_id].options.push({
        optionnumber: row.optionnumber,
        text: row.goption,
        comment: row.comment,
        skiping: row.skiping,
      });
    });

    res.json({ data: Object.values(quizzes) });
  });
});

// ✅ API to Delete a Quiz Question
app.delete("/delete-quiz/:id", (req, res) => {
  const quizId = req.params.id;
  const deleteQuery = "DELETE FROM generalquiz WHERE id = ?";

  db.query(deleteQuery, [quizId], (err) => {
    if (err) {
      console.error("Error deleting question:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json({ message: "Quiz deleted successfully" });
  });
});

app.post("/admin/genralquation", (req, res) => {
  const { useremail } = req.body;
  const selectQuery = "SELECT * FROM `generalquiz` ;";
  db.query(selectQuery, function (error, result) {
    if (error) {
      return console.log(error);
    }
    return res.status(200).json({ status: 1, data: result });
  });
});

app.post("/updateverify", (req, res) => {
  const { userId } = req.body;
  const selectQuery = "SELECT * FROM `signup` WHERE `email` = ? ;";
  db.query(selectQuery, [userId], function (error, result) {
    if (error) {
      return console.log(error);
    }
    const updateQuery =
      "UPDATE `signup` SET `otp_verify`= 'yes' WHERE `email` = ?";

    db.query(updateQuery, [userId], function (error, result) {
      if (error) {
        return console.log(error);
      }
      return res.status(200).json({ status: 1, data: result });
    });
  });
});

app.post("/getFormDetail", (req, res) => {
  const { usermail } = req.body;
  const selectQuery = "SELECT * FROM `signup` WHERE `email` = ? ;";
  db.query(selectQuery, [usermail], function (error, result) {
    if (error) {
      return console.log(error);
    }
    return res.status(200).json({ status: 1, data: result });
  });
});

const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
  },
});
const upload = multer({ storage });

// Update user profile
app.post("/updateProfile", upload.single("image"), (req, res) => {
  const { fullName, email, phone, gender } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : null;

  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  const updateQuery = `
    UPDATE signup 
    SET name = ?, phone_number = ?, gender = ?, image = ? 
    WHERE email = ?
  `;

  const values = [fullName, phone, gender, image, email];

  db.query(updateQuery, values, (err, result) => {
    if (err) {
      console.error("Error updating profile:", err);
      return res.status(500).json({ error: "Internal server error." });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    res.status(200).json({ message: "Profile updated successfully!" });
  });
});


const generateOTP = () => Math.floor(100000 + Math.random() * 900000);

app.post("/verifyEmail", async (req, res) => {
  const { user_email, usename } = req.body;

  if (!user_email) {
    return res
      .status(400)
      .json({ success: false, message: "Email is required" });
  }

  const otp = generateOTP();

  // Email options
  const mailOptions = {
    from: "developerzone89@gmail.com",
    to: user_email,
    subject: "OTP for EthiAI Account setup",
    html: `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">

      <h2>Dear ${usename}</h2>

      <p>To finish setting up your account, please use the following One-Time Password (OTP):</p>

      <h1 style="color: #F89635; text-align: start;">🔐 ${otp}</h1>

      <p><strong>This OTP is valid for only 5 minutes.</strong></p>

      <p>Please do not share this One-Time Password with anyone.</p>

      <p>Best regards,<br>
      The EthiAI Team</p>

      <hr style="border: 1px solid #ddd;">

      <p>📧 <a href="mailto:marketing@ethiai.io">marketing@ethiai.io</a> | 🌐 <a href="https://ethiai.io">ethiai.io</a></p>
    </div>
  `,
  };
  try {
    // Check if the email already exists
    const selectQuery = "SELECT * FROM `signup` WHERE `email` = ?";
    db.query(selectQuery, [user_email], async (error, result) => {
      if (error) {
        console.error("DB Select Error:", error);
        return res
          .status(500)
          .json({ success: false, message: "Database error" });
      }

      if (result.length > 0) {
        // If email exists and verify is 'no', update OTP
        if (result[0].verify === "No") {
          const updateQuery = "UPDATE `signup` SET `otp` = ? WHERE `email` = ?";
          db.query(updateQuery, [otp, user_email], async (updateError) => {
            if (updateError) {
              console.error("DB Update Error:", updateError);
              return res
                .status(500)
                .json({ success: false, message: "Error updating OTP" });
            }

            // Send OTP after updating
            try {
              await transporter.sendMail(mailOptions);
              return res.status(200).json({
                success: true,
                message: "OTP has been sent to your registered email address.",
              });
            } catch (mailError) {
              console.error("Email Error:", mailError);
              return res
                .status(500)
                .json({ success: false, message: "Error sending OTP" });
            }
          });
        } else {
          return res
            .status(200)
            .json({ success: false, message: "Email already exists" });
        }
      } else {
        // If email does not exist, insert new record
        const insertQuery =
          "INSERT INTO `signup` (`email`, `otp`) VALUES (?, ?)";
        db.query(insertQuery, [user_email, otp], async (insertError) => {
          if (insertError) {
            console.error("DB Insert Error:", insertError);
            return res
              .status(500)
              .json({ success: false, message: "Error saving OTP" });
          }

          try {
            await transporter.sendMail(mailOptions);
            return res.status(200).json({
              success: true,
              message: "OTP has been sent to your registered email address.",
            });
          } catch (mailError) {
            console.error("Email Error:", mailError);
            return res
              .status(500)
              .json({ success: false, message: "Error sending OTP" });
          }
        });
      }
    });
  } catch (err) {
    console.error("Unexpected Error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Unexpected error occurred" });
  }
});

app.post("/api/getSelectedPractices", (req, res) => {
  const { userId } = req.body;

  const selectQuery = `
  SELECT 
    s.*, 
    CONCAT('[', GROUP_CONCAT(
        JSON_OBJECT('id', p.id, 'title', p.tittle, 'description', p.discription)
        SEPARATOR ','  
    ), ']') AS practices
  FROM subscription s
  LEFT JOIN practices p ON FIND_IN_SET(p.id, REPLACE(s.selectedquiz, ' ', ''))
  WHERE s.user_id = ?
  GROUP BY s.id
`;

  db.query(selectQuery, [userId], function (error, result) {
    if (error) {
      console.error(error);
      return res.status(500).json({ status: 0, message: "Database error" });
    }

    // JSON format fix
    result.forEach((row) => {
      row.practices = row.practices ? JSON.parse(row.practices) : [];
    });

    return res.status(200).json({ status: 1, data: result });
  });
});

app.post("/DetectPlan", (req, res) => {
  const { useremail } = req.body;

  const selectQuery = "SELECT * FROM `subscription` WHERE `user_id` = ?;";
  db.query(selectQuery, [useremail], function (error, result) {
    if (error) {
      console.log("Error fetching subscription:", error);
      return res.status(500).json({ status: 0, message: "Database error" });
    }

    if (result.length === 0) {
      return res
        .status(404)
        .json({ status: 0, message: "No subscription found" });
    }

    const endDate = new Date(result[0].end_date); // Database date
    const currentDate = new Date(); // Current system date

    if (endDate <= currentDate) {
      const query = `
      UPDATE subscription 
      SET type = 'Basic', 
          selectedquiz = '', 
          days = '30', 
          start_date = ?, 
          end_date = DATE_ADD(?, INTERVAL 30 DAY) 
      WHERE user_id = ?;
    `;

      const startDate = new Date().toISOString().slice(0, 19).replace("T", " "); // Format: YYYY-MM-DD HH:MM:SS

      db.query(query, [startDate, startDate, useremail], (err, result) => {
        if (err) {
          console.error("Error updating subscription:", err);
        } else {
          console.log("Subscription updated successfully!", result);
        }
      });
    } else {
      return res
        .status(200)
        .json({ status: 1, message: "Plan is still active" });
    }
  });
});

app.post("/checkOtp", (req, res) => {
  const { useremail, newval } = req.body;
  const selectQuery = "SELECT * FROM `signup` WHERE `email` = ? AND `otp` = ?;";
  db.query(selectQuery, [useremail, newval], function (error, result) {
    if (error) {
      return console.log(error);
    }
    if (result.length > 0) {
      return res.status(200).json({ status: 1, data: result, newval });
    } else {
      return res.status(200).json({ status: 2, data: result, newval });
    }
  });
});

// Start Server
app.get("/", (req, res) => {
  res.json({ message: "Hello from backend API!" });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
