const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const User = require('./models/user'); // Ensure you have a User model defined

const app = express();
const PORT = 3000;

// Connect to MongoDB
mongoose.connect('mongodb://localhost/file-sharing-app', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // Serve static files (CSS, etc.)

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Store uploaded files in memory
let uploadedFiles = [];

// Serve the login page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Serve the registration page
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

// Handle registration
app.post('/register', async (req, res) => {
    const { username, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.redirect('/register?error=Password%20and%20Confirm%20Password%20do%20not%20match');
    }

    if (password.length < 6 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[!@#$%^&*]/.test(password)) {
        return res.redirect('/register?error=Password%20must%20be%20at%20least%206%20characters%20long%20with%20one%20uppercase,%20one%20lowercase,%20and%20one%20special%20symbol');
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
        return res.redirect('/register?error=Username%20already%20exists');
    }

    const newUser = new User({ username, password });
    await newUser.save();
    res.redirect('/');
});

// Handle login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user || user.password !== password) {
        return res.redirect('/?error=Invalid%20username%20or%20password');
    }

    res.redirect(`/upload?username=${encodeURIComponent(username)}`);
});

// Serve the upload page
app.get('/upload', (req, res) => {
    const username = req.query.username;
    if (username) {
        let fileLinks = uploadedFiles.map(file => {
            const fileUrl = `http://localhost:${PORT}/download/${file.filename}`;
            return `
                <li>
                    ${file.originalname} 
                    <a href="${fileUrl}" class="download-button">Download</a>
                    <br>
                    <span>Link: <code>${fileUrl}</code></span>
                </li>`;
        }).join('');

        res.send(`
            <div>
                <link rel="stylesheet" type="text/css" href="/styles.css">
                <h1>Easy File Share</h1>
                <blockquote>"Sharing is the essence of collaboration."</blockquote>
                <h2>Upload File</h2>
                <form action="/upload" method="POST" enctype="multipart/form-data">
                    <input type="file" name="file" required><br><br>
                    <button type="submit">Upload File</button>
                </form>
                <h2>Uploaded Files</h2>
                <ul>${fileLinks}</ul>
                <form action="/logout" method="POST" onsubmit="return confirmLogout();">
                    <button type="submit">Logout ${username}</button>
                </form>
            </div>
            <script>
                function confirmLogout() {
                    alert('Thank you for using Easy File Share');
                    return true; // Allow form submission
                }
            </script>
        `);
    } else {
        res.redirect('/');
    }
});

// Handle file upload
app.post('/upload', upload.single('file'), (req, res) => {
    const file = req.file;

    if (!file) {
        return res.redirect('/upload?error=Please%20upload%20a%20file');
    }

    // Store uploaded file information
    uploadedFiles.push({ filename: file.filename, originalname: file.originalname });
    res.redirect(`/upload?username=${encodeURIComponent(req.query.username)}`);
});

// Download file route
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const file = path.join(__dirname, 'uploads', filename);
    res.download(file); // Set disposition and send it
});

// Handle logout
app.post('/logout', (req, res) => {
    // Optionally, clear any session data here if needed
    res.redirect('/'); // Redirect to login page
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
