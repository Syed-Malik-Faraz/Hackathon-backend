const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const PORT = 8000;

// --- Multer setup ---
const uploadFolder = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadFolder)) fs.mkdirSync(uploadFolder);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadFolder),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// --- In-memory storage ---
let timetable = {};
let announcements = [];
let attendanceRecords = [];
let students = [];
let teachers = [];
let classrooms = [];
let assignments = [];

// --- LOGIN ---
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Missing username/password" });

  const user =
    students.find((s) => s.username === username && s.password === password) ||
    teachers.find((t) => t.username === username && t.password === password) ||
    (username === "admin" && password === "admin123" ? { username: "admin" } : null);

  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  let role = "student";
  if (teachers.find((t) => t.username === username)) role = "teacher";
  if (username === "admin") role = "admin";

  res.json({ username: user.username, role });
});

// --- TIMETABLE ---
app.post("/generate_timetable", (req, res) => {
  const { timetableData } = req.body;
  if (!timetableData)
    return res.status(400).json({ error: "Missing timetableData" });
  timetable = timetableData;
  res.json({ message: "Timetable generated", timetable });
});

// --- TIMETABLE ENDPOINTS ---
app.get("/timetable", (req, res) => res.json(timetable)); // faculty dashboard
app.get("/student/timetable", (req, res) => res.json(timetable)); // student dashboard

// --- ANNOUNCEMENTS ---
app.post("/announcements", (req, res) => {
  const { title, message, postedBy } = req.body;
  if (!title || !message || !postedBy)
    return res.status(400).json({ error: "Missing fields" });

  const newAnnouncement = {
    id: Date.now(),
    title,
    message,
    postedBy,
    date: new Date().toISOString(),
  };
  announcements.unshift(newAnnouncement);
  res.json({ message: "Announcement posted", announcement: newAnnouncement });
});

// --- ANNOUNCEMENTS ENDPOINTS ---
app.get("/announcements", (req, res) => res.json(announcements)); // faculty dashboard
app.get("/student/announcements", (req, res) => res.json(announcements)); // student dashboard

// --- ATTENDANCE ---
app.post("/attendance", (req, res) => {
  const { course, date, presentStudents } = req.body;
  if (!course || !date || !Array.isArray(presentStudents))
    return res.status(400).json({ error: "Missing fields" });

  const record = { course, date, presentStudents };
  attendanceRecords.push(record);
  res.json({ message: "Attendance recorded", record });
});

app.get("/student/attendance", (req, res) => {
  const summary = students
    .map((s) =>
      attendanceRecords.map((r) => ({
        student: s.username,
        course: r.course,
        present: r.presentStudents.includes(s.username) ? 1 : 0,
      }))
    )
    .flat();
  res.json(summary);
});

// --- ASSIGNMENTS ---
app.post("/assignments", upload.single("file"), (req, res) => {
  const { title, description, postedBy } = req.body;
  if (!title || !description || !postedBy)
    return res.status(400).json({ error: "Missing fields" });

  const file = req.file ? `uploads/${req.file.filename}` : null;
  const newAssignment = {
    id: Date.now(),
    title,
    description,
    file,
    postedBy,
    date: new Date().toISOString(),
    submissions: [],
  };
  assignments.unshift(newAssignment);
  res.json({ message: "Assignment posted", assignment: newAssignment });
});

// --- ASSIGNMENTS ENDPOINTS ---
app.get("/student/assignments", (req, res) => res.json(assignments));
app.get("/teacher/assignments", (req, res) => res.json(assignments));

// --- ASSIGNMENT SUBMISSION ---
app.post("/assignments/:id/submit", upload.single("file"), (req, res) => {
  const assignmentId = parseInt(req.params.id);
  const { studentId } = req.body;
  if (!studentId || !req.file)
    return res.status(400).json({ error: "Missing studentId or file" });

  const assignment = assignments.find((a) => a.id === assignmentId);
  if (!assignment)
    return res.status(404).json({ error: "Assignment not found" });

  const submission = {
    studentId,
    file: `uploads/${req.file.filename}`,
    date: new Date().toISOString(),
  };
  assignment.submissions.push(submission);
  res.json({ message: "Assignment submitted", submission });
});

// --- ADD STUDENT / TEACHER / CLASSROOM ---
app.post("/add-student", (req, res) => {
  const { name, email, username, password } = req.body;
  if (!name || !email || !username || !password)
    return res.status(400).json({ error: "Missing fields" });
  if (students.some((s) => s.username === username))
    return res.status(400).json({ error: "Username already exists" });
  students.push({ name, email, username, password });
  res.json({ message: "Student added" });
});

app.post("/add-teacher", (req, res) => {
  const { name, email, username, password } = req.body;
  if (!name || !email || !username || !password)
    return res.status(400).json({ error: "Missing fields" });
  if (teachers.some((t) => t.username === username))
    return res.status(400).json({ error: "Username already exists" });
  teachers.push({ name, email, username, password });
  res.json({ message: "Teacher added" });
});

app.post("/add-classroom", (req, res) => {
  const { name, capacity } = req.body;
  if (!name || !capacity)
    return res.status(400).json({ error: "Missing fields" });
  classrooms.push({ name, capacity });
  res.json({ message: "Classroom added" });
});

// --- GET STUDENTS / TEACHERS / CLASSROOMS ---
app.get("/students", (req, res) => res.json(students));
app.get("/teachers", (req, res) => res.json(teachers));
app.get("/classrooms", (req, res) => res.json(classrooms));

// --- START SERVER ---
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
