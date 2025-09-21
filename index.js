const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// static folder for uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const PORT = 8000;

// In-memory storage
let timetable = {};
let announcements = [];
let notes = [];
let attendanceRecords = [];
let students = [
  { id: "s1", name: "Student 1" },
  { id: "s2", name: "Student 2" },
  { id: "s3", name: "Student 3" },
];
let courses = [
  { id: "c1", name: "Mathematics" },
  { id: "c2", name: "Physics" },
  { id: "c3", name: "Chemistry" },
];

// ===== FILE UPLOAD CONFIG =====
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // folder to store files
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// --- ADMIN ---
app.post("/generate_timetable", (req, res) => {
  const { timetableData } = req.body;
  if (!timetableData)
    return res.status(400).json({ error: "timetableData is required" });
  timetable = timetableData;
  res.json({ message: "Timetable generated successfully", timetable });
});

// --- FACULTY ---
app.get("/timetable", (req, res) => {
  res.json({ timetable });
});

app.post("/announcements", (req, res) => {
  const { title, message, postedBy } = req.body;
  if (!title || !message || !postedBy)
    return res
      .status(400)
      .json({ error: "title, message, postedBy required" });

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

app.get("/announcements", (req, res) => {
  res.json(announcements);
});

// ====== NEW: FACULTY SHARE NOTES WITH FILE UPLOAD ======
app.post("/notes", upload.single("file"), (req, res) => {
  const { title, description, postedBy } = req.body;
  if (!title || !postedBy)
    return res.status(400).json({ error: "title and postedBy are required" });

  let fileUrl = null;
  if (req.file) {
    fileUrl = `http://localhost:${PORT}/uploads/${req.file.filename}`;
  }

  const newNote = {
    id: Date.now(),
    title,
    description: description || "",
    fileUrl,
    postedBy,
    date: new Date().toISOString(),
  };

  notes.unshift(newNote);
  res.json({ message: "Note shared successfully", note: newNote });
});

// Students fetch notes
app.get("/notes", (req, res) => {
  res.json(notes);
});

// Attendance
app.post("/attendance", (req, res) => {
  const { course, date, presentStudents } = req.body;
  if (!course || !date || !Array.isArray(presentStudents)) {
    return res
      .status(400)
      .json({ error: "course, date, presentStudents required" });
  }

  const record = { id: Date.now(), course, date, presentStudents };
  attendanceRecords.push(record);
  res.json({ message: "Attendance recorded", record });
});

app.get("/attendance", (req, res) => {
  const summary = courses.map((c) => {
    const total =
      students.length * attendanceRecords.filter((r) => r.course === c.name).length;
    const present = attendanceRecords
      .filter((r) => r.course === c.name)
      .reduce((acc, r) => acc + r.presentStudents.length, 0);
    const percent = total === 0 ? 0 : Math.round((present / total) * 100);
    return { course: c.name, total, present, percent };
  });
  res.json(summary);
});

// Student endpoints
app.get("/student/timetable", (req, res) => {
  res.json({ timetable });
});
app.get("/student/announcements", (req, res) => {
  res.json(announcements);
});
app.get("/student/attendance", (req, res) => {
  const summary = courses.map((c) => {
    const total =
      students.length * attendanceRecords.filter((r) => r.course === c.name).length;
    const present = attendanceRecords
      .filter((r) => r.course === c.name)
      .reduce((acc, r) => acc + r.presentStudents.length, 0);
    const percent = total === 0 ? 0 : Math.round((present / total) * 100);
    return { course: c.name, total, present, percent };
  });
  res.json(summary);
});
app.get("/student/notes", (req, res) => {
  res.json(notes);
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
