import dotenv from 'dotenv';
import { open } from 'sqlite';
import express from 'express';
import sqlite3 from 'sqlite3';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;
const API_PREFIX = process.env.API_PREFIX || '/api';
const SECRET_KEY = process.env.SECRET_KEY || 'your-fallback-secret-key';
const ACCESS_TOKEN_EXPIRE_MINUTES = parseInt(process.env.ACCESS_TOKEN_EXPIRE_MINUTES || '30', 10);

app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

const DOC_UPLOAD_DIR = path.join(__dirname, 'static', 'registrations');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const enrollmentId = req.params.enrollmentId || 'temp';
        const uploadPath = path.join(DOC_UPLOAD_DIR, enrollmentId);
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${req.body.type || 'doc'}-${Date.now()}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Apenas JPEG, PNG ou PDF são permitidos.'));
        }
    }
});

const dbPath = process.env.DB_PATH || path.join(__dirname, 'unipass.sqlite3');

let db = null;

async function openDb() {
    if (db) return db;
    db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });
    return db;
}

async function dbRun(sql, params = []) {
    const instance = await openDb();
    return instance.run(sql, params);
}

async function dbGet(sql, params = []) {
    const instance = await openDb();
    return instance.get(sql, params);
}

async function dbAll(sql, params = []) {
    const instance = await openDb();
    return instance.all(sql, params);
}

async function initializeDb() {
    await dbRun('BEGIN TRANSACTION');
    await dbRun('PRAGMA foreign_keys = ON');

    await dbRun(`CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`);

    await dbRun(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        hashed_password TEXT,
        role TEXT NOT NULL CHECK(role IN ('admin', 'staff', 'candidate')),
        phone TEXT,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`);

    await dbRun(`CREATE TABLE IF NOT EXISTS enrollments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        course_id INTEGER NOT NULL,
        code TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected')),
        enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    )`);

    await dbRun(`CREATE TABLE IF NOT EXISTS enrollment_docs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        enrollment_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        file_path TEXT NOT NULL,
        validation_status TEXT CHECK(validation_status IN ('pending', 'approved', 'rejected')),
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE
    )`);

    await dbRun(`CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        enrollment_id INTEGER NOT NULL,
        amount REAL NOT NULL CHECK(amount > 0),
        status TEXT NOT NULL CHECK(status IN ('pending', 'paid', 'failed')),
        payment_date DATETIME,
        reference TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE
    )`);

    await dbRun(`CREATE TABLE IF NOT EXISTS exams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        exam_date DATETIME NOT NULL,
        duration_minutes INTEGER NOT NULL CHECK(duration_minutes > 0),
        type TEXT NOT NULL CHECK(type IN ('objective', 'discursive', 'mixed')),
        max_score INTEGER NOT NULL CHECK(max_score > 0),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    )`);

    await dbRun(`CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exam_id INTEGER NOT NULL,
        text TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('multiple_choice', 'true_false', 'essay')),
        options TEXT,
        correct_answer TEXT,
        score INTEGER NOT NULL CHECK(score > 0),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
    )`);

    await dbRun(`CREATE TABLE IF NOT EXISTS student_answers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        enrollment_id INTEGER NOT NULL,
        exam_id INTEGER NOT NULL,
        question_id INTEGER NOT NULL,
        answer TEXT,
        is_correct BOOLEAN,
        score_awarded REAL DEFAULT 0 CHECK(score_awarded >= 0),
        answered_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
        FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
        UNIQUE (enrollment_id, exam_id, question_id)
    )`);

    await dbRun(`CREATE TABLE IF NOT EXISTS exam_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        enrollment_id INTEGER NOT NULL,
        exam_id INTEGER NOT NULL,
        total_score_obtained REAL NOT NULL CHECK(total_score_obtained >= 0),
        max_score_possible INTEGER NOT NULL CHECK(max_score_possible > 0),
        grade TEXT CHECK(grade IN ('approved', 'second_call', 'failed')),
        graded_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
        FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
        UNIQUE (enrollment_id, exam_id)
    )`);

    await dbRun('COMMIT');
}

async function insertInitialData() {
    await dbRun(
        `INSERT OR IGNORE INTO users (email, first_name, last_name, hashed_password, role, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['admin@test.com', 'António', 'dos Santos', '$2b$10$eMf6plagHGJXIPCgjXNIyOZ0DNB3nHnaNHLvT9IWY7o2X6IIUX5Lu', 'admin', 'active']
    );

    await dbRun(
        `INSERT OR IGNORE INTO courses (name) VALUES (?)`,
        ['Engenharia Informática']
    );
}

async function setupAndSeedDatabase() {
    await openDb();
    await initializeDb();
    await insertInitialData();
}

setupAndSeedDatabase();

async function hashPassword(password) {
    return bcrypt.hash(password, 10);
}

async function verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
}

function createAccessToken(user) {
    const payload = { sub: user.email, userId: user.id, role: user.role };
    return jwt.sign(payload, SECRET_KEY, { expiresIn: `${ACCESS_TOKEN_EXPIRE_MINUTES}m` });
}

async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Token não fornecido.' });

    jwt.verify(token, SECRET_KEY, async (err, decoded) => {
        if (err) return res.status(403).json({ message: 'Token inválido ou expirado.' });
        const user = await dbGet('SELECT id, first_name, last_name, email, role FROM users WHERE email = ?', [decoded.sub]);
        if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });
        req.user = user;
        next();
    });
}

function authorizeRole(roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Acesso negado. Permissões insuficientes." });
        }
        next();
    };
}

// **Rotas de Autenticação**
app.post(`${API_PREFIX}/auth/login`, async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
    if (!user || !user.hashed_password) return res.status(401).json({ message: 'Credenciais inválidas.' });
    const isValid = await verifyPassword(password, user.hashed_password);
    if (!isValid) return res.status(401).json({ message: 'Credenciais inválidas.' });
    const accessToken = createAccessToken(user);
    res.json({ access_token: accessToken, token_type: 'bearer' });
});

app.post(`${API_PREFIX}/auth/register`, upload.fields([
    { name: 'comprovativo', maxCount: 1 },
    { name: 'bilhete', maxCount: 1 }
]), async (req, res) => {
    const { first_name, last_name, email, password, course_id } = req.body;

    if (!first_name || !last_name || !email || !password || !course_id || Object.keys(req.files).length !== 2) {
        if (req.files) Object.values(req.files).forEach(fileArray => fileArray.forEach(f => fs.unlinkSync(f.path)));
        return res.status(400).json({ message: 'Todos os campos e documentos são obrigatórios.' });
    }

    await dbRun('BEGIN TRANSACTION');

    const existingUser = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
        await dbRun('ROLLBACK');
        if (req.files) Object.values(req.files).forEach(fileArray => fileArray.forEach(f => fs.unlinkSync(f.path)));
        return res.status(409).json({ message: 'Email já registrado.' });
    }

    const hashedPassword = await hashPassword(password);
    const userResult = await dbRun(
        'INSERT INTO users (first_name, last_name, email, hashed_password, role) VALUES (?, ?, ?, ?, ?)',
        [first_name, last_name, email, hashedPassword, 'candidate']
    );
    const userId = userResult.lastID;

    const currentYear = new Date().getFullYear();
    const codPrefix = `${course_id}-${currentYear}`;
    const lastCod = await dbGet('SELECT code FROM enrollments WHERE code LIKE ? ORDER BY code DESC LIMIT 1', [`${codPrefix}%`]);
    let newSeq = 1;
    if (lastCod && lastCod.code) newSeq = parseInt(lastCod.code.split('-').pop(), 10) + 1;
    const generatedCode = `${codPrefix}-${String(newSeq).padStart(4, '0')}`;

    const enrollmentResult = await dbRun(
        'INSERT INTO enrollments (user_id, course_id, code, status) VALUES (?, ?, ?, ?)',
        [userId, course_id, generatedCode, 'pending']
    );
    const enrollmentId = enrollmentResult.lastID;

    const finalUploadPath = path.join(DOC_UPLOAD_DIR, String(enrollmentId));
    fs.mkdirSync(finalUploadPath, { recursive: true });

    for (const fieldName in req.files) {
        const file = req.files[fieldName][0];
        const finalFilePath = path.join(finalUploadPath, file.filename);
        fs.renameSync(file.path, finalFilePath);
        const relativeFilePath = path.relative(path.join(__dirname, 'static'), finalFilePath).replace(/\\/g, '/');
        await dbRun(
            'INSERT INTO enrollment_docs (enrollment_id, type, file_path, validation_status) VALUES (?, ?, ?, ?)',
            [enrollmentId, fieldName, relativeFilePath, 'pending']
        );
    }

    await dbRun('COMMIT');
    res.status(201).json({ code: generatedCode, message: 'Registro bem-sucedido.' });
});

app.get(`${API_PREFIX}/users/me`, authenticateToken, async (req, res) => {
    const user = await dbGet(
        'SELECT id, first_name, last_name, email, role, phone, status FROM users WHERE id = ?',
        [req.user.id]
    );
    res.json(user);
});

// **Rotas para Courses**
const coursesRouter = express.Router();

coursesRouter.post('/', authenticateToken, authorizeRole(['admin', 'staff']), async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Nome do curso é obrigatório." });
    try {
        const result = await dbRun('INSERT INTO courses (name) VALUES (?)', [name]);
        res.status(201).json({ id: result.lastID, name });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao criar curso.', error: error.message });
    }
});

coursesRouter.get('/', async (req, res) => {
    const courses = await dbAll('SELECT * FROM courses ORDER BY name');
    res.json(courses);
});

coursesRouter.get('/:id', async (req, res) => {
    try {
        const course = await dbGet('SELECT * FROM courses WHERE id = ?', [req.params.id]);
        if (!course) return res.status(404).json({ message: 'Curso não encontrado.' });
        res.json(course);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar curso.', error: error.message });
    }
});

coursesRouter.put('/:id', authenticateToken, authorizeRole(['admin', 'staff']), async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Nome do curso é obrigatório.' });
    try {
        const result = await dbRun('UPDATE courses SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [name, req.params.id]);
        if (result.changes === 0) return res.status(404).json({ message: 'Curso não encontrado.' });
        res.json({ message: 'Curso atualizado com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar curso.', error: error.message });
    }
});

coursesRouter.delete('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try {
        const enrollments = await dbGet('SELECT COUNT(*) as count FROM enrollments WHERE course_id = ?', [req.params.id]);
        const exams = await dbGet('SELECT COUNT(*) as count FROM exams WHERE course_id = ?', [req.params.id]);
        if (enrollments.count > 0 || exams.count > 0) {
            return res.status(400).json({ message: 'Não é possível deletar curso com matrículas ou exames associados.' });
        }
        const result = await dbRun('DELETE FROM courses WHERE id = ?', [req.params.id]);
        if (result.changes === 0) return res.status(404).json({ message: 'Curso não encontrado.' });
        res.json({ message: 'Curso deletado com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao deletar curso.', error: error.message });
    }
});

app.use(`${API_PREFIX}/courses`, coursesRouter);

// **Rotas para Users**
const usersRouter = express.Router();

usersRouter.post('/', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const { first_name, last_name, email, password, role, phone } = req.body;
    if (!first_name || !last_name || !email || !password || !role) {
        return res.status(400).json({ message: 'Todos os campos obrigatórios devem ser preenchidos.' });
    }
    try {
        const hashedPassword = await hashPassword(password);
        const result = await dbRun(
            'INSERT INTO users (first_name, last_name, email, hashed_password, role, phone, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [first_name, last_name, email, hashedPassword, role, phone || null, 'active']
        );
        res.status(201).json({ id: result.lastID, message: 'Usuário criado com sucesso.' });
    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ message: 'Email já registrado.' });
        }
        res.status(500).json({ message: 'Erro ao criar usuário.', error: error.message });
    }
});

usersRouter.get('/', authenticateToken, authorizeRole(['admin', 'staff']), async (req, res) => {
    const { search } = req.query;
    let query = `
        SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.role, u.status, u.created_at,
               GROUP_CONCAT(c.name) as courses_applied,
               e.status as latest_enrollment_status,
               MAX(e.enrolled_at) as latest_enrollment_date
        FROM users u
        LEFT JOIN enrollments e ON u.id = e.user_id
        LEFT JOIN courses c ON e.course_id = c.id
    `;
    const params = [];
    if (search) {
        query += ' WHERE u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }
    query += ' GROUP BY u.id ORDER BY u.last_name, u.first_name';
    const users = await dbAll(query, params);
    res.json(users.map(user => ({
        ...user,
        courses_applied: user.courses_applied ? user.courses_applied.split(',') : []
    })));
});

usersRouter.get('/:id', authenticateToken, authorizeRole(['admin', 'staff']), async (req, res) => {
    try {
        const user = await dbGet('SELECT id, first_name, last_name, email, role, phone, status FROM users WHERE id = ?', [req.params.id]);
        if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar usuário.', error: error.message });
    }
});

usersRouter.put('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const { first_name, last_name, email, role, phone, status } = req.body;
    if (!first_name || !last_name || !email || !role || !status) {
        return res.status(400).json({ message: 'Todos os campos obrigatórios devem ser preenchidos.' });
    }
    try {
        const result = await dbRun(
            'UPDATE users SET first_name = ?, last_name = ?, email = ?, role = ?, phone = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [first_name, last_name, email, role, phone || null, status, req.params.id]
        );
        if (result.changes === 0) return res.status(404).json({ message: 'Usuário não encontrado.' });
        res.json({ message: 'Usuário atualizado com sucesso.' });
    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ message: 'Email já registrado.' });
        }
        res.status(500).json({ message: 'Erro ao atualizar usuário.', error: error.message });
    }
});

usersRouter.delete('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try {
        const result = await dbRun('DELETE FROM users WHERE id = ?', [req.params.id]);
        if (result.changes === 0) return res.status(404).json({ message: 'Usuário não encontrado.' });
        res.json({ message: 'Usuário deletado com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao deletar usuário.', error: error.message });
    }
});

app.use(`${API_PREFIX}/users`, usersRouter);

// **Rotas para Enrollments**
const enrollmentsRouter = express.Router();

enrollmentsRouter.post('/', authenticateToken, authorizeRole(['admin', 'staff']), async (req, res) => {
    const { user_id, course_id, status } = req.body;
    if (!user_id || !course_id || !status) {
        return res.status(400).json({ message: 'user_id, course_id e status são obrigatórios.' });
    }
    try {
        const user = await dbGet('SELECT id FROM users WHERE id = ?', [user_id]);
        const course = await dbGet('SELECT id FROM courses WHERE id = ?', [course_id]);
        if (!user || !course) {
            return res.status(404).json({ message: 'Usuário ou curso não encontrado.' });
        }
        const currentYear = new Date().getFullYear();
        const codPrefix = `${course_id}-${currentYear}`;
        const lastCod = await dbGet('SELECT code FROM enrollments WHERE code LIKE ? ORDER BY code DESC LIMIT 1', [`${codPrefix}%`]);
        let newSeq = 1;
        if (lastCod && lastCod.code) newSeq = parseInt(lastCod.code.split('-').pop(), 10) + 1;
        const code = `${codPrefix}-${String(newSeq).padStart(4, '0')}`;
        const result = await dbRun(
            'INSERT INTO enrollments (user_id, course_id, code, status) VALUES (?, ?, ?, ?)',
            [user_id, course_id, code, status]
        );
        res.status(201).json({ id: result.lastID, code, message: 'Matrícula criada com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao criar matrícula.', error: error.message });
    }
});

enrollmentsRouter.get('/', authenticateToken, authorizeRole(['admin', 'staff']), async (req, res) => {
    try {
        const enrollments = await dbAll(
            'SELECT e.id, e.code, e.status, e.enrolled_at, u.first_name, u.last_name, c.name as course_name FROM enrollments e JOIN users u ON e.user_id = u.id JOIN courses c ON e.course_id = c.id'
        );
        res.json(enrollments);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao listar matrículas.', error: error.message });
    }
});

enrollmentsRouter.get('/:id', authenticateToken, async (req, res) => {
    const enrollment = await dbGet(
        'SELECT e.*, u.first_name, u.last_name, u.email, c.name as course_name FROM enrollments e JOIN users u ON e.user_id = u.id JOIN courses c ON e.course_id = c.id WHERE e.id = ?',
        [req.params.id]
    );
    if (!enrollment) return res.status(404).json({ message: 'Matrícula não encontrada.' });
    if (req.user.role === 'candidate' && req.user.id !== enrollment.user_id) return res.status(403).json({ message: 'Acesso negado.' });
    res.json(enrollment);
});

enrollmentsRouter.put('/:id', authenticateToken, authorizeRole(['admin', 'staff']), async (req, res) => {
    const { status } = req.body;
    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Status inválido.' });
    }
    try {
        const result = await dbRun('UPDATE enrollments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, req.params.id]);
        if (result.changes === 0) return res.status(404).json({ message: 'Matrícula não encontrada.' });
        res.json({ message: 'Matrícula atualizada com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar matrícula.', error: error.message });
    }
});

enrollmentsRouter.delete('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try {
        const result = await dbRun('DELETE FROM enrollments WHERE id = ?', [req.params.id]);
        if (result.changes === 0) return res.status(404).json({ message: 'Matrícula não encontrada.' });
        res.json({ message: 'Matrícula deletada com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao deletar matrícula.', error: error.message });
    }
});

enrollmentsRouter.get('/:enrollmentId/documents', authenticateToken, async (req, res) => {
    const enrollment = await dbGet('SELECT user_id FROM enrollments WHERE id = ?', [req.params.enrollmentId]);
    if (!enrollment) return res.status(404).json({ message: 'Matrícula não encontrada.' });
    if (req.user.role === 'candidate' && req.user.id !== enrollment.user_id) return res.status(403).json({ message: 'Acesso negado.' });
    const docs = await dbAll('SELECT id, type, file_path, validation_status, uploaded_at FROM enrollment_docs WHERE enrollment_id = ?', [req.params.enrollmentId]);
    res.json(docs.map(d => ({ ...d, file_url: `/static/${d.file_path}` })));
});

app.use(`${API_PREFIX}/enrollments`, enrollmentsRouter);

// **Rotas para Enrollment Docs**
const enrollmentDocsRouter = express.Router();

enrollmentDocsRouter.post('/:enrollmentId', upload.single('file'), authenticateToken, async (req, res) => {
    const { type } = req.body;
    if (!type || !req.file) return res.status(400).json({ message: 'Tipo de documento e arquivo são obrigatórios.' });
    try {
        const enrollment = await dbGet('SELECT user_id FROM enrollments WHERE id = ?', [req.params.enrollmentId]);
        if (!enrollment) return res.status(404).json({ message: 'Matrícula não encontrada.' });
        if (req.user.role === 'candidate' && req.user.id !== enrollment.user_id) return res.status(403).json({ message: 'Acesso negado.' });
        const relativeFilePath = path.relative(path.join(__dirname, 'static'), req.file.path).replace(/\\/g, '/');
        const result = await dbRun(
            'INSERT INTO enrollment_docs (enrollment_id, type, file_path, validation_status) VALUES (?, ?, ?, ?)',
            [req.params.enrollmentId, type, relativeFilePath, 'pending']
        );
        res.status(201).json({ id: result.lastID, message: 'Documento enviado com sucesso.' });
    } catch (error) {
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ message: 'Erro ao enviar documento.', error: error.message });
    }
});

enrollmentsRouter.get('/:enrollmentId/documents', authenticateToken, async (req, res) => {
    const enrollment = await dbGet('SELECT user_id FROM enrollments WHERE id = ?', [req.params.enrollmentId]);
    if (!enrollment) return res.status(404).json({ message: 'Matrícula não encontrada.' });
    if (req.user.role === 'candidate' && req.user.id !== enrollment.user_id) return res.status(403).json({ message: 'Acesso negado.' });
    const docs = await dbAll('SELECT id, type, file_path, validation_status, uploaded_at FROM enrollment_docs WHERE enrollment_id = ?', [req.params.enrollmentId]);
    res.json(docs.map(d => ({ ...d, file_url: `/static/${d.file_path}` })));
});

enrollmentDocsRouter.put('/:id', authenticateToken, authorizeRole(['admin', 'staff']), async (req, res) => {
    const { validation_status } = req.body;
    if (!validation_status || !['pending', 'approved', 'rejected'].includes(validation_status)) {
        return res.status(400).json({ message: 'Status de validação inválido.' });
    }
    try {
        const result = await dbRun('UPDATE enrollment_docs SET validation_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [validation_status, req.params.id]);
        if (result.changes === 0) return res.status(404).json({ message: 'Documento não encontrado.' });
        res.json({ message: 'Documento atualizado com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar documento.', error: error.message });
    }
});

enrollmentDocsRouter.delete('/:id', authenticateToken, authorizeRole(['admin', 'staff']), async (req, res) => {
    try {
        const doc = await dbGet('SELECT file_path FROM enrollment_docs WHERE id = ?', [req.params.id]);
        if (!doc) return res.status(404).json({ message: 'Documento não encontrado.' });
        const result = await dbRun('DELETE FROM enrollment_docs WHERE id = ?', [req.params.id]);
        if (result.changes > 0) {
            const fullFilePath = path.join(__dirname, 'static', doc.file_path);
            if (fs.existsSync(fullFilePath)) fs.unlinkSync(fullFilePath);
            res.json({ message: 'Documento deletado com sucesso.' });
        } else {
            res.status(404).json({ message: 'Documento não encontrado.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Erro ao deletar documento.', error: error.message });
    }
});

app.use(`${API_PREFIX}/enrollment_docs`, enrollmentDocsRouter);

// **Rotas para Payments**
const paymentsRouter = express.Router();

paymentsRouter.post('/:enrollmentId', authenticateToken, async (req, res) => {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Valor inválido.' });
    const enrollment = await dbGet('SELECT user_id FROM enrollments WHERE id = ?', [req.params.enrollmentId]);
    if (!enrollment) return res.status(404).json({ message: 'Matrícula não encontrada.' });
    if (req.user.role === 'candidate' && req.user.id !== enrollment.user_id) return res.status(403).json({ message: 'Acesso negado.' });
    const reference = `PAY-${req.params.enrollmentId}-${Date.now()}`;
    const result = await dbRun(
        'INSERT INTO payments (enrollment_id, amount, status, reference) VALUES (?, ?, ?, ?)',
        [req.params.enrollmentId, amount, 'pending', reference]
    );
    res.status(201).json({ id: result.lastID, reference });
});

paymentsRouter.get('/', authenticateToken, authorizeRole(['admin', 'staff']), async (req, res) => {
    try {
        const payments = await dbAll('SELECT p.*, e.code as enrollment_code FROM payments p JOIN enrollments e ON p.enrollment_id = e.id');
        res.json(payments);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao listar pagamentos.', error: error.message });
    }
});

paymentsRouter.get('/:id', authenticateToken, authorizeRole(['admin', 'staff']), async (req, res) => {
    try {
        const payment = await dbGet('SELECT * FROM payments WHERE id = ?', [req.params.id]);
        if (!payment) return res.status(404).json({ message: 'Pagamento não encontrado.' });
        res.json(payment);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar pagamento.', error: error.message });
    }
});

paymentsRouter.put('/:id', authenticateToken, authorizeRole(['admin', 'staff']), async (req, res) => {
    const { amount, status } = req.body;
    if (!amount || !status) return res.status(400).json({ message: 'Amount e status são obrigatórios.' });
    try {
        const result = await dbRun(
            'UPDATE payments SET amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [amount, status, req.params.id]
        );
        if (result.changes === 0) return res.status(404).json({ message: 'Pagamento não encontrado.' });
        res.json({ message: 'Pagamento atualizado com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar pagamento.', error: error.message });
    }
});

paymentsRouter.delete('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try {
        const result = await dbRun('DELETE FROM payments WHERE id = ?', [req.params.id]);
        if (result.changes === 0) return res.status(404).json({ message: 'Pagamento não encontrado.' });
        res.json({ message: 'Pagamento deletado com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao deletar pagamento.', error: error.message });
    }
});

app.use(`${API_PREFIX}/payments`, paymentsRouter);

// **Rotas para Exams**
const examsRouter = express.Router();

examsRouter.post('/', authenticateToken, authorizeRole(['admin', 'staff']), async (req, res) => {
    const { course_id, name, exam_date, duration_minutes, type, max_score, questions } = req.body;
    if (!course_id || !name || !exam_date || !duration_minutes || !type || !max_score || !questions) return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    await dbRun('BEGIN TRANSACTION');
    const examResult = await dbRun(
        'INSERT INTO exams (course_id, name, exam_date, duration_minutes, type, max_score) VALUES (?, ?, ?, ?, ?, ?)',
        [course_id, name, exam_date, duration_minutes, type, max_score]
    );
    const examId = examResult.lastID;
    for (const q of questions) {
        await dbRun(
            'INSERT INTO questions (exam_id, text, type, options, correct_answer, score) VALUES (?, ?, ?, ?, ?, ?)',
            [examId, q.text, q.type, q.options ? JSON.stringify(q.options) : null, q.correct_answer, q.score]
        );
    }
    await dbRun('COMMIT');
    const exam = await dbGet('SELECT * FROM exams WHERE id = ?', [examId]);
    res.status(201).json(exam);
});

examsRouter.get('/', authenticateToken, authorizeRole(['admin', 'staff']), async (req, res) => {
    try {
        const exams = await dbAll('SELECT e.*, c.name as course_name FROM exams e JOIN courses c ON e.course_id = c.id');
        res.json(exams);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao listar exames.', error: error.message });
    }
});

examsRouter.get('/:id', authenticateToken, async (req, res) => {
    const exam = await dbGet('SELECT e.*, c.name as course_name FROM exams e JOIN courses c ON e.course_id = c.id WHERE e.id = ?', [req.params.id]);
    if (!exam) return res.status(404).json({ message: 'Exame não encontrado.' });
    const questions = await dbAll('SELECT id, text, type, options, score FROM questions WHERE exam_id = ?', [req.params.id]);
    res.json({ ...exam, questions: questions.map(q => ({ ...q, options: q.options ? JSON.parse(q.options) : null })) });
});

examsRouter.put('/:id', authenticateToken, authorizeRole(['admin', 'staff']), async (req, res) => {
    const { name, exam_date, duration_minutes, type, max_score } = req.body;
    if (!name || !exam_date || !duration_minutes || !type || !max_score) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }
    try {
        const result = await dbRun(
            'UPDATE exams SET name = ?, exam_date = ?, duration_minutes = ?, type = ?, max_score = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [name, exam_date, duration_minutes, type, max_score, req.params.id]
        );
        if (result.changes === 0) return res.status(404).json({ message: 'Exame não encontrado.' });
        res.json({ message: 'Exame atualizado com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar exame.', error: error.message });
    }
});

examsRouter.delete('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try {
        const result = await dbRun('DELETE FROM exams WHERE id = ?', [req.params.id]);
        if (result.changes === 0) return res.status(404).json({ message: 'Exame não encontrado.' });
        res.json({ message: 'Exame deletado com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao deletar exame.', error: error.message });
    }
});

examsRouter.post('/submit-answers', authenticateToken, async (req, res) => {
    const { enrollment_id, exam_id, answers } = req.body;
    if (!enrollment_id || !exam_id || !Array.isArray(answers)) return res.status(400).json({ message: 'Dados inválidos.' });
    const enrollment = await dbGet('SELECT status, user_id FROM enrollments WHERE id = ?', [enrollment_id]);
    if (!enrollment) return res.status(404).json({ message: 'Matrícula não encontrada.' });
    if (enrollment.status !== 'approved') return res.status(403).json({ message: 'Matrícula não aprovada para exame.' });
    if (req.user.role === 'candidate' && req.user.id !== enrollment.user_id) return res.status(403).json({ message: 'Acesso negado.' });
    const examExists = await dbGet('SELECT id FROM exams WHERE id = ?', [exam_id]);
    if (!examExists) return res.status(404).json({ message: 'Exame não encontrado.' });
    await dbRun('BEGIN TRANSACTION');
    for (const ans of answers) {
        const question = await dbGet('SELECT correct_answer, score FROM questions WHERE id = ?', [ans.question_id]);
        if (!question) continue;
        const isCorrect = ans.answer === question.correct_answer;
        const scoreAwarded = isCorrect ? question.score : 0;
        await dbRun(
            'INSERT INTO student_answers (enrollment_id, exam_id, question_id, answer, is_correct, score_awarded) VALUES (?, ?, ?, ?, ?, ?)',
            [enrollment_id, exam_id, ans.question_id, ans.answer, isCorrect, scoreAwarded]
        );
    }
    await dbRun('COMMIT');
    res.status(201).json({ message: 'Respostas submetidas com sucesso.' });
});

app.use(`${API_PREFIX}/exams`, examsRouter);

// **Rotas para Questions**
const questionsRouter = express.Router();

questionsRouter.post('/', authenticateToken, authorizeRole(['admin', 'staff']), async (req, res) => {
    const { exam_id, text, type, options, correct_answer, score } = req.body;
    if (!exam_id || !text || !type || !correct_answer || !score) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }
    try {
        const exam = await dbGet('SELECT id FROM exams WHERE id = ?', [exam_id]);
        if (!exam) return res.status(404).json({ message: 'Exame não encontrado.' });
        const result = await dbRun(
            'INSERT INTO questions (exam_id, text, type, options, correct_answer, score) VALUES (?, ?, ?, ?, ?, ?)',
            [exam_id, text, type, options ? JSON.stringify(options) : null, correct_answer, score]
        );
        res.status(201).json({ id: result.lastID, message: 'Questão criada com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao criar questão.', error: error.message });
    }
});

questionsRouter.get('/', authenticateToken, authorizeRole(['admin', 'staff']), async (req, res) => {
    try {
        const questions = await dbAll('SELECT q.*, e.name as exam_name FROM questions q JOIN exams e ON q.exam_id = e.id');
        res.json(questions.map(q => ({ ...q, options: q.options ? JSON.parse(q.options) : null })));
    } catch (error) {
        res.status(500).json({ message: 'Erro ao listar questões.', error: error.message });
    }
});

questionsRouter.get('/:id', authenticateToken, authorizeRole(['admin', 'staff']), async (req, res) => {
    try {
        const question = await dbGet('SELECT * FROM questions WHERE id = ?', [req.params.id]);
        if (!question) return res.status(404).json({ message: 'Questão não encontrada.' });
        res.json({ ...question, options: question.options ? JSON.parse(question.options) : null });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar questão.', error: error.message });
    }
});

questionsRouter.put('/:id', authenticateToken, authorizeRole(['admin', 'staff']), async (req, res) => {
    const { text, type, options, correct_answer, score } = req.body;
    if (!text || !type || !correct_answer || !score) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }
    try {
        const result = await dbRun(
            'UPDATE questions SET text = ?, type = ?, options = ?, correct_answer = ?, score = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [text, type, options ? JSON.stringify(options) : null, correct_answer, score, req.params.id]
        );
        if (result.changes === 0) return res.status(404).json({ message: 'Questão não encontrada.' });
        res.json({ message: 'Questão atualizada com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar questão.', error: error.message });
    }
});

questionsRouter.delete('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try {
        const result = await dbRun('DELETE FROM questions WHERE id = ?', [req.params.id]);
        if (result.changes === 0) return res.status(404).json({ message: 'Questão não encontrada.' });
        res.json({ message: 'Questão deletada com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao deletar questão.', error: error.message });
    }
});

app.use(`${API_PREFIX}/questions`, questionsRouter);

// **Rotas para Student Answers**
const studentAnswersRouter = express.Router();

studentAnswersRouter.get('/', authenticateToken, authorizeRole(['admin', 'staff']), async (req, res) => {
    try {
        const answers = await dbAll(
            'SELECT sa.*, u.first_name, u.last_name, e.name as exam_name FROM student_answers sa JOIN enrollments en ON sa.enrollment_id = en.id JOIN users u ON en.user_id = u.id JOIN exams e ON sa.exam_id = e.id'
        );
        res.json(answers);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao listar respostas.', error: error.message });
    }
});

studentAnswersRouter.get('/:id', authenticateToken, authorizeRole(['admin', 'staff']), async (req, res) => {
    try {
        const answer = await dbGet('SELECT * FROM student_answers WHERE id = ?', [req.params.id]);
        if (!answer) return res.status(404).json({ message: 'Resposta não encontrada.' });
        res.json(answer);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar resposta.', error: error.message });
    }
});

studentAnswersRouter.delete('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try {
        const result = await dbRun('DELETE FROM student_answers WHERE id = ?', [req.params.id]);
        if (result.changes === 0) return res.status(404).json({ message: 'Resposta não encontrada.' });
        res.json({ message: 'Resposta deletada com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao deletar resposta.', error: error.message });
    }
});

app.use(`${API_PREFIX}/student_answers`, studentAnswersRouter);

// **Rotas para Exam Results**
const examResultsRouter = express.Router();

examResultsRouter.post('/:examId/grade', authenticateToken, authorizeRole(['admin', 'staff']), async (req, res) => {
    const { examId } = req.params;
    const questions = await dbAll('SELECT id, score FROM questions WHERE exam_id = ?', [examId]);
    if (questions.length === 0) return res.status(404).json({ message: 'Nenhuma questão encontrada.' });
    const maxScore = questions.reduce((sum, q) => sum + q.score, 0);
    const submissions = await dbAll(
        'SELECT enrollment_id, SUM(score_awarded) as total_raw_score FROM student_answers WHERE exam_id = ? GROUP BY enrollment_id',
        [examId]
    );
    if (submissions.length === 0) return res.json({ message: 'Nenhuma submissão para avaliar.', results: [] });
    await dbRun('BEGIN TRANSACTION');
    for (const sub of submissions) {
        const score = (sub.total_raw_score / maxScore) * 20;
        let grade;
        if (score >= 14) grade = 'approved';
        else if (score >= 10) grade = 'second_call';
        else grade = 'failed';
        await dbRun(
            'INSERT INTO exam_results (enrollment_id, exam_id, total_score_obtained, max_score_possible, grade) VALUES (?, ?, ?, ?, ?)',
            [sub.enrollment_id, examId, score, 20, grade]
        );
        if (grade === 'approved') {
            await dbRun(
                'UPDATE users SET role = ? WHERE id = (SELECT user_id FROM enrollments WHERE id = ?)',
                ['student', sub.enrollment_id]
            );
        }
    }
    await dbRun('COMMIT');
    res.json({ message: 'Exame corrigido com sucesso.' });
});

examResultsRouter.get('/', authenticateToken, authorizeRole(['admin', 'staff']), async (req, res) => {
    try {
        const results = await dbAll(
            'SELECT er.*, u.first_name, u.last_name, e.name as exam_name FROM exam_results er JOIN enrollments en ON er.enrollment_id = en.id JOIN users u ON en.user_id = u.id JOIN exams e ON er.exam_id = e.id'
        );
        res.json(results);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao listar resultados.', error: error.message });
    }
});

examResultsRouter.get('/:id', authenticateToken, authorizeRole(['admin', 'staff']), async (req, res) => {
    try {
        const result = await dbGet('SELECT * FROM exam_results WHERE id = ?', [req.params.id]);
        if (!result) return res.status(404).json({ message: 'Resultado não encontrado.' });
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar resultado.', error: error.message });
    }
});

examResultsRouter.put('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const { total_score_obtained, grade } = req.body;
    if (!total_score_obtained || !grade) return res.status(400).json({ message: 'total_score_obtained e grade são obrigatórios.' });
    try {
        const result = await dbRun(
            'UPDATE exam_results SET total_score_obtained = ?, grade = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [total_score_obtained, grade, req.params.id]
        );
        if (result.changes === 0) return res.status(404).json({ message: 'Resultado não encontrado.' });
        res.json({ message: 'Resultado atualizado com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar resultado.', error: error.message });
    }
});

examResultsRouter.delete('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try {
        const result = await dbRun('DELETE FROM exam_results WHERE id = ?', [req.params.id]);
        if (result.changes === 0) return res.status(404).json({ message: 'Resultado não encontrado.' });
        res.json({ message: 'Resultado deletado com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao deletar resultado.', error: error.message });
    }
});

app.use(`${API_PREFIX}/exam_results`, examResultsRouter);

// **Rota de Admissão**
app.get(`${API_PREFIX}/admission/list`, authenticateToken, authorizeRole(['admin', 'staff']), async (req, res) => {
    const { status } = req.query;
    if (!['approved', 'second_call', 'failed'].includes(status)) return res.status(400).json({ message: 'Status inválido.' });
    const list = await dbAll(
        'SELECT u.*, er.total_score_obtained FROM exam_results er JOIN enrollments e ON er.enrollment_id = e.id JOIN users u ON e.user_id = u.id WHERE er.grade = ?',
        [status]
    );
    res.json(list);
});

// **Servir Arquivos Estáticos**
app.use('/static', express.static(path.join(__dirname, 'static')));

// **Iniciar o Servidor**
app.listen(PORT, () => {
    console.log(`Servidor a correr na porta ${PORT}`);
});

// **Fechar Conexão ao Encerrar**
process.on('SIGINT', () => {
    db.close(() => {
        console.log('Conexão com a base de dados SQLite fechada.');
        process.exit(0);
    });
});