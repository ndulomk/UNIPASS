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

// Configuração da App
const app = express();
const PORT = 3001;
const API_PREFIX = process.env.API_PREFIX || '/api';
const SECRET_KEY = process.env.SECRET_KEY || 'your-fallback-secret-key';
const ACCESS_TOKEN_EXPIRE_MINUTES = parseInt(process.env.ACCESS_TOKEN_EXPIRE_MINUTES || '30', 10);

// Middlewares
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', "PATCH"],
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

async function closeDb() {
    if (db) {
        await db.close();
        db = null;
        console.log('Conexão com a base de dados SQLite fechada.');
    }
}

async function initializeDb() {
    try {
        await dbRun('BEGIN TRANSACTION');
        await dbRun('PRAGMA foreign_keys = ON');

        const tables = [
            // 1. Cursos
            `CREATE TABLE IF NOT EXISTS courses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                description TEXT,
                duration_months INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
            )`,

            // 2. Períodos letivos
            `CREATE TABLE IF NOT EXISTS academic_periods (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                is_active BOOLEAN DEFAULT FALSE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                UNIQUE(name, start_date)
            )`,

            // 3. Usuários
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                hashed_password TEXT,
                role TEXT NOT NULL CHECK(role IN ('admin', 'staff', 'student', 'candidate')),
                phone TEXT,
                course_id INTEGER,
                status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL
            )`,

            // 4. Disciplinas
            `CREATE TABLE IF NOT EXISTS disciplines (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                course_id INTEGER NOT NULL,
                academic_period_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                code TEXT,
                credits INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
                FOREIGN KEY (academic_period_id) REFERENCES academic_periods(id) ON DELETE CASCADE
            )`,

            // 5. Matrículas
            `CREATE TABLE IF NOT EXISTS enrollments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                course_id INTEGER NOT NULL,
                academic_period_id INTEGER NOT NULL,
                code TEXT NOT NULL UNIQUE,
                status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected', 'completed', 'canceled')),
                enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
                FOREIGN KEY (academic_period_id) REFERENCES academic_periods(id) ON DELETE CASCADE
            )`,

            // 6. Documentos de matrícula
            `CREATE TABLE IF NOT EXISTS enrollment_docs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                enrollment_id INTEGER NOT NULL,
                type TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_size INTEGER,
                file_type TEXT,
                validation_status TEXT CHECK(validation_status IN ('pending', 'approved', 'rejected')),
                validation_comments TEXT,
                validated_at DATETIME,
                uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE
            )`,

            // 7. Pagamentos
            `CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                enrollment_id INTEGER NOT NULL,
                amount REAL NOT NULL CHECK(amount > 0),
                type TEXT NOT NULL CHECK(type IN ('tuition', 'registration', 'exam_fee', 'other')),
                status TEXT NOT NULL CHECK(status IN ('pending', 'paid', 'failed', 'refunded')),
                payment_date DATETIME,
                reference TEXT UNIQUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE
            )`,

            // 8. Matrizes de conteúdo
            `CREATE TABLE IF NOT EXISTS content_matrices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                discipline_id INTEGER NOT NULL,
                theme TEXT NOT NULL,
                competencies TEXT NOT NULL,
                skills TEXT NOT NULL,
                syllabus TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                FOREIGN KEY (discipline_id) REFERENCES disciplines(id) ON DELETE CASCADE
            )`,

            // 9. Exames
            `CREATE TABLE IF NOT EXISTS exams (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                exam_date DATETIME NOT NULL,
                duration_minutes INTEGER NOT NULL CHECK(duration_minutes > 0),
                type TEXT NOT NULL CHECK(type IN ('objective', 'discursive', 'mixed')),
                max_score INTEGER NOT NULL CHECK(max_score > 0),
                second_call_eligible BOOLEAN DEFAULT FALSE,
                second_call_date DATETIME,
                publication_date DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                course_id INTEGER NOT NULL,
                content_matrix_id INTEGER,
                FOREIGN KEY (content_matrix_id) REFERENCES content_matrices(id) ON DELETE SET NULL,
                FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
            )`,
            
            // 10. Questões
            `CREATE TABLE IF NOT EXISTS questions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                exam_id INTEGER NOT NULL,
                text TEXT NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('multiple_choice', 'true_false', 'essay')),
                options TEXT,
                correct_answer TEXT CHECK(correct_answer IN ('true', 'false') OR type != 'true_false'),
                score REAL NOT NULL CHECK(score > 0),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
            )`,

            // 11. Notas
            `CREATE TABLE IF NOT EXISTS grades (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                enrollment_id INTEGER NOT NULL,
                academic_period_id INTEGER NOT NULL,
                exam_id INTEGER,
                score REAL NOT NULL CHECK(score >= 0),
                max_score REAL NOT NULL CHECK(max_score > 0),
                evaluation_type TEXT NOT NULL CHECK(evaluation_type IN ('midterm', 'final', 'makeup', 'continuous')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
                FOREIGN KEY (academic_period_id) REFERENCES academic_periods(id) ON DELETE CASCADE,
                FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE SET NULL
            )`,

            // 12. Respostas dos alunos
            `CREATE TABLE IF NOT EXISTS student_answers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                enrollment_id INTEGER NOT NULL,
                exam_id INTEGER NOT NULL,
                question_id INTEGER NOT NULL,
                answer TEXT,
                is_correct BOOLEAN,
                score_awarded REAL DEFAULT 0 CHECK(score_awarded >= 0),
                answered_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
                FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
                FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
                UNIQUE (enrollment_id, exam_id, question_id)
            )`,
           // Remover tabela antiga se existir

            // 13. Logs de auditoria
            `CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                action TEXT NOT NULL,
                entity_type TEXT NOT NULL,
                entity_id INTEGER,
                details TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )`
        ];

        for (const tableQuery of tables) {
            await dbRun(tableQuery);
        }

        // Índices para melhor desempenho
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
            'CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_enrollment_docs_enrollment_id ON enrollment_docs(enrollment_id)',
            'CREATE INDEX IF NOT EXISTS idx_exams_date ON exams(exam_date)',
            'CREATE INDEX IF NOT EXISTS idx_grades_enrollment_id ON grades(enrollment_id)',
            'CREATE INDEX IF NOT EXISTS idx_student_answers_exam_id ON student_answers(exam_id)',
            'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_payments_enrollment_id ON payments(enrollment_id)',
            'CREATE INDEX IF NOT EXISTS idx_content_matrices_discipline_id ON content_matrices(discipline_id)'
        ];

        for (const indexQuery of indexes) {
            await dbRun(indexQuery);
        }

        await dbRun('COMMIT');
        console.log('Banco de dados inicializado com sucesso.');
    } catch (error) {
        await dbRun('ROLLBACK');
        console.error('Erro na inicialização do banco:', error);
        throw new Error(`Falha na inicialização: ${error.message}`);
    }
}
// await dbRun(
// `CREATE TABLE IF NOT EXISTS student_answers (
//                 id INTEGER PRIMARY KEY AUTOINCREMENT,
//                 enrollment_id INTEGER NOT NULL,
//                 exam_id INTEGER NOT NULL,
//                 question_id INTEGER NOT NULL,
//                 answer TEXT,
//                 is_correct BOOLEAN,
//                 score_awarded REAL DEFAULT 0 CHECK(score_awarded >= 0),
//                 answered_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
//                 created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
//                 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
//                 FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
//                 FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
//                 FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
//                 UNIQUE (enrollment_id, exam_id, question_id)
//             )`
// ).then((err)=>{
//   console.log(err)
  
// })

async function insertInitialData() {
    try {
        // Insere usuário administrador
        await dbRun(
            `INSERT OR IGNORE INTO users (email, first_name, last_name, hashed_password, role, status)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                'admin@test.com',
                'António',
                'dos Santos',
                await bcrypt.hash('admin123', 10), // Hash dinâmico
                'admin',
                'active'
            ]
        );

        // Insere período letivo inicial
        await dbRun(
            `INSERT OR IGNORE INTO academic_periods (name, start_date, end_date, is_active)
             VALUES (?, ?, ?, ?)`,
            ['2025/1', '2025-01-01', '2025-06-30', 1]
        );

        // Insere cursos
        const courses = [
            { name: 'Engenharia Informática', description: 'Curso de tecnologia e sistemas', duration_months: 48 },
            { name: 'Medicina', description: 'Formação em saúde e cuidados médicos', duration_months: 72 },
            { name: 'Direito', description: 'Estudo das leis e justiça', duration_months: 48 },
            { name: 'Psicologia', description: 'Análise do comportamento humano', duration_months: 48 }
        ];

        for (const course of courses) {
            await dbRun(
                `INSERT OR IGNORE INTO courses (name, description, duration_months) VALUES (?, ?, ?)`,
                [course.name, course.description, course.duration_months]
            );
        }

        // Insere disciplinas
        const disciplines = [
            { course_id: 1, academic_period_id: 1, name: 'Programação I', code: 'INF001', credits: 4 },
            { course_id: 1, academic_period_id: 1, name: 'Base de Dados', code: 'INF002', credits: 4 },
            { course_id: 2, academic_period_id: 1, name: 'Anatomia Humana', code: 'MED001', credits: 6 },
            { course_id: 3, academic_period_id: 1, name: 'Direito Civil', code: 'DIR001', credits: 5 }
        ];

        for (const disc of disciplines) {
            await dbRun(
                `INSERT OR IGNORE INTO disciplines (course_id, academic_period_id, name, code, credits) 
                 VALUES (?, ?, ?, ?, ?)`,
                [disc.course_id, disc.academic_period_id, disc.name, disc.code, disc.credits]
            );
        }

        console.log('Dados iniciais inseridos com sucesso.');
    } catch (error) {
        console.error('Erro ao inserir dados iniciais:', error.message);
        throw error;
    }
}

async function populateMoreMockData(numUsers = 10, numEnrollments = 20, numExams = 5) {
    console.log('Populando dados mock...');
    try {
        const firstNames = [
            'João', 'Maria', 'José', 'Ana', 'Manuel', 'Isabel', 'António', 'Sofia', 'Domingos', 'Lúcia'
        ];
        const lastNames = [
            'dos Santos', 'Silva', 'Mendes', 'Ferreira', 'Almeida', 'Gomes', 'Lopes', 'Nhantumbo', 'Cumbane', 'Machel'
        ];

        // Busca cursos e período letivo
        const courses = await dbAll('SELECT id FROM courses');
        const academicPeriod = await dbGet('SELECT id FROM academic_periods WHERE is_active = 1');
        if (courses.length === 0 || !academicPeriod) {
            console.log('Cursos ou período letivo ativo não encontrados.');
            return;
        }

        // Cria usuários
        for (let i = 0; i < numUsers; i++) {
            const firstName = firstNames[i % firstNames.length];
            const lastName = lastNames[i % lastNames.length];
            const email = `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(' ', '')}${i}@test.com`;
            const role = i % 5 === 0 ? 'candidate' : 'student';
            const phone = `+2449${Math.floor(10000000 + Math.random() * 90000000)}`;

            await dbRun(
                `INSERT OR IGNORE INTO users (first_name, last_name, email, role, phone, status)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [firstName, lastName, email, role, phone, 'active']
            );
        }

        const allUsers = await dbAll("SELECT id, role FROM users WHERE role IN ('candidate', 'student')");

        // Cria matrículas
        for (let i = 0; i < numEnrollments; i++) {
            const user = allUsers[i % allUsers.length];
            const course = courses[i % courses.length];
            const year = new Date().getFullYear();
            const code = `${course.id}-${year}-${String(i + 1).padStart(4, '0')}`;
            const statusOptions = ['pending', 'approved', 'rejected', 'completed', 'canceled'];
            const status = statusOptions[Math.floor(Math.random() * statusOptions.length)];
            const enrollmentDate = new Date();
            enrollmentDate.setDate(enrollmentDate.getDate() - Math.floor(Math.random() * 90));

            await dbRun(
                `INSERT OR IGNORE INTO enrollments (user_id, course_id, academic_period_id, code, status, enrolled_at)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [user.id, course.id, academicPeriod.id, code, status, enrollmentDate.toISOString()]
            );
        }

        // Cria matrizes de conteúdo
        const disciplines = await dbAll('SELECT id, course_id FROM disciplines');
        for (const discipline of disciplines) {
            await dbRun(
                `INSERT OR IGNORE INTO content_matrices (discipline_id, theme, competencies, skills, syllabus)
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    discipline.id,
                    `Tema ${discipline.id}`,
                    'Competências básicas',
                    'Habilidades práticas',
                    'Conteúdo programático'
                ]
            );
        }

        // Cria exames
        const contentMatrices = await dbAll('SELECT id, discipline_id FROM content_matrices');
        for (let i = 0; i < numExams; i++) {
            const discipline = disciplines[i % disciplines.length];
            const contentMatrix = contentMatrices.find(cm => cm.discipline_id === discipline.id);
            const examDate = new Date();
            examDate.setDate(examDate.getDate() + (Math.floor(Math.random() * 60) - 30));

            const result = await dbRun(
                `INSERT OR IGNORE INTO exams (name, exam_date, duration_minutes, type, max_score, course_id, content_matrix_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    `Exame ${i + 1}`,
                    examDate.toISOString(),
                    [60, 90, 120][Math.floor(Math.random() * 3)],
                    ['objective', 'discursive', 'mixed'][Math.floor(Math.random() * 3)],
                    100,
                    discipline.course_id,
                    contentMatrix ? contentMatrix.id : null
                ]
            );

            // Cria questões
            if (result.lastID) {
                const numQuestions = Math.floor(Math.random() * 5) + 3;
                for (let j = 0; j < numQuestions; j++) {
                    await dbRun(
                        `INSERT OR IGNORE INTO questions (exam_id, text, type, options, correct_answer, score)
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [
                            result.lastID,
                            `Questão ${j + 1}`,
                            'multiple_choice',
                            JSON.stringify(['A', 'B', 'C', 'D']),
                            ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)],
                            (Math.random() * 4 + 1).toFixed(1)
                        ]
                    );
                }
            }
        }

        // Cria notas
        const allEnrollments = await dbAll('SELECT id FROM enrollments');
        const allExams = await dbAll('SELECT id, exam_date FROM exams');
        for (let i = 0; i < Math.min(allEnrollments.length, numExams); i++) {
            const enrollment = allEnrollments[i % allEnrollments.length];
            const exam = allExams[i % allExams.length];
            const score = Math.random() * 20;
            const evaluationType = ['midterm', 'final', 'makeup', 'continuous'][Math.floor(Math.random() * 4)];

            await dbRun(
                `INSERT OR IGNORE INTO grades (enrollment_id, academic_period_id, exam_id, score, max_score, evaluation_type)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [enrollment.id, academicPeriod.id, exam.id, score.toFixed(1), 20, evaluationType]
            );
        }

        console.log(`População de dados mock concluída: ${numUsers} usuários, ${numEnrollments} matrículas, ${numExams} exames.`);
    } catch (error) {
        console.error('Erro ao popular dados mock:', error.message);
        throw error;
    }
}

async function setupAndSeedDatabase() {
    try {
        await openDb();
        await initializeDb();
        await insertInitialData();
        await populateMoreMockData(10, 20, 5);
        console.log('Banco de dados configurado e populado com sucesso.');
    } catch (error) {
        console.error('Erro ao configurar e popular o banco de dados:', error.message);
        throw error;
    } finally {
        await closeDb();
    }
}

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
        try {
            const user = await dbGet('SELECT id, first_name, last_name, email, role FROM users WHERE email = ?', [decoded.sub]);
            if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });
            req.user = user;
            next();
        } catch (dbError) {
            res.status(500).json({ message: 'Erro ao verificar usuário.', error: dbError.message });
        }
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

// --- Funções de Upload ---
function saveUploadFileRelative(file, enrollmentId) {
    const uploadDirForEnrollment = path.join(DOC_UPLOAD_DIR, String(enrollmentId));
    if (!fs.existsSync(uploadDirForEnrollment)) {
        fs.mkdirSync(uploadDirForEnrollment, { recursive: true });
    }
    const safeFilename = path.basename(file.originalname); // Basic safety
    const newPath = path.join(uploadDirForEnrollment, `${Date.now()}_${safeFilename}`);
    const relativePath = path.relative(path.join(__dirname, 'static'), file.path);
    return relativePath.replace(/\\/g, '/'); 
}


// --- Rotas de Autenticação ---
app.post(`${API_PREFIX}/auth/login`, async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }
    try {
        const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
        if (!user || !user.hashed_password) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }
        const isValid = await verifyPassword(password, user.hashed_password);
        if (!isValid) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }
        const accessToken = createAccessToken(user);
        await dbRun(
            'INSERT INTO audit_logs (user_id, action, entity_type, details) VALUES (?, ?, ?, ?)',
            [user.id, 'login', 'user', JSON.stringify({ email })]
        );
        res.json({ access_token: accessToken, token_type: 'bearer' });
    } catch (error) {
        res.status(500).json({ message: 'Erro no login.', error: error.message });
    }
});

const registrationUploadFields = [
    { name: 'comprovativo', maxCount: 1 },
    { name: 'bilhete', maxCount: 1 },
    { name: 'vacine_card', maxCount: 1 },
    { name: 'foto', maxCount: 1 }
];

app.post(`${API_PREFIX}/auth/register`, upload.fields(registrationUploadFields), async (req, res) => {
    const { first_name, last_name, email, password, course_id } = req.body;

    if (!first_name || !last_name || !email || !password || !course_id) {
        if (req.files) {
            Object.values(req.files).forEach(fileArray => fileArray.forEach(f => fs.unlinkSync(f.path)));
        }
        return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }

    if (!req.files || Object.keys(req.files).length !== registrationUploadFields.length) {
        if (req.files) {
            Object.values(req.files).forEach(fileArray => fileArray.forEach(f => fs.unlinkSync(f.path)));
        }
        return res.status(400).json({ message: 'Todos os documentos são obrigatórios.' });
    }

    try {
        await dbRun('BEGIN TRANSACTION');

        const existingUser = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUser) {
            await dbRun('ROLLBACK');
            if (req.files) {
                Object.values(req.files).forEach(fileArray => fileArray.forEach(f => fs.unlinkSync(f.path)));
            }
            return res.status(409).json({ message: 'Email já registrado.' });
        }

        const hashedPassword = await hashPassword(password);
        const userResult = await dbRun(
            'INSERT INTO users (first_name, last_name, email, hashed_password, role, course_id) VALUES (?, ?, ?, ?, ?, ?)',
            [first_name, last_name, email, hashedPassword, 'student', course_id]
        );
        const userId = userResult.lastID;

        const academicPeriod = await dbGet('SELECT id FROM academic_periods WHERE is_active = 1');
        if (!academicPeriod) {
            throw new Error('Nenhum período letivo ativo encontrado.');
        }

        const currentYear = new Date().getFullYear();
        const codPrefix = `${course_id}-${currentYear}`;
        const lastCod = await dbGet(
            'SELECT code FROM enrollments WHERE code LIKE ? ORDER BY code DESC LIMIT 1',
            [`${codPrefix}%`]
        );
        let newSeq = 1;
        if (lastCod && lastCod.code) {
            const lastSeqPart = lastCod.code.split('-').pop();
            newSeq = parseInt(lastSeqPart, 10) + 1;
        }
        const generatedCode = `${codPrefix}-${String(newSeq).padStart(4, '0')}`;

        const enrollmentResult = await dbRun(
            'INSERT INTO enrollments (user_id, course_id, academic_period_id, code, status) VALUES (?, ?, ?, ?, ?)',
            [userId, course_id, academicPeriod.id, generatedCode, 'pending']
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
                'INSERT INTO enrollment_docs (enrollment_id, type, file_path, file_size, file_type, validation_status) VALUES (?, ?, ?, ?, ?, ?)',
                [enrollmentId, fieldName, relativeFilePath, file.size, file.mimetype, 'pending']
            );
        }

        await dbRun(
            'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
            [userId, 'register', 'user', userId, JSON.stringify({ email, course_id })]
        );

        await dbRun('COMMIT');
        res.status(201).json({ statusCode: 201, status: 'success', code: generatedCode, message: 'Registro bem-sucedido.' });
    } catch (error) {
        await dbRun('ROLLBACK');
        if (req.files) {
            Object.values(req.files).forEach(fileArray => fileArray.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path)));
        }
        const enrollmentPath = path.join(DOC_UPLOAD_DIR, String(enrollmentId || 'temp'));
        if (fs.existsSync(enrollmentPath)) {
            fs.rmSync(enrollmentPath, { recursive: true, force: true });
        }
        res.status(500).json({ message: 'Erro no registro.', error: error.message });
    }
});

app.get(`${API_PREFIX}/users/me`, authenticateToken, async (req, res) => {
    try {
        const user = await dbGet(
            'SELECT id, first_name, last_name, email, role, phone, course_id, status FROM users WHERE id = ?',
            [req.user.id]
        );
        const enrollment = await dbGet(`SELECT id AS enrollment_id FROM enrollments WHERE user_id = ?`, [user.id])
        res.json({
          ...user,
          enrollment_id:enrollment.enrollment_id
        });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar usuário.', error: error.message });
    }
});


// --- Rotas de Cursos (Courses) ---
const coursesRouter = express.Router();
coursesRouter.post('/', async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Nome do curso é obrigatório." });
    try {
        const result = await dbRun('INSERT INTO courses (name) VALUES (?)', [name]);
  
        res.status(201).json({
          status:"success",
          message:"created successfully"
        });
    } catch (e) {
        if (e.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ message: "Curso com este nome já existe." });
        }
        res.status(500).json({ message: "Erro ao criar curso.", error: e.message });
    }
});
coursesRouter.get('/', async (req, res) => {
    try {
        const courses = await dbAll('SELECT * FROM courses ORDER BY name');
        res.json(courses);
    } catch (e) { res.status(500).json({ message: "Erro ao listar cursos.", error: e.message }); }
});
coursesRouter.get('/:id', async (req, res) => {
    try {
        const course = await dbGet('SELECT * FROM courses WHERE id = ?', [req.params.id]);
        if (!course) return res.status(404).json({ message: "Curso não encontrado." });
        res.json(course);
    } catch (e) { res.status(500).json({ message: "Erro ao buscar curso.", error: e.message }); }
});
coursesRouter.put(
  '/:id',
  async (req, res) => {
    const { name, description, duration_months } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Nome é obrigatório.' });
    }

    try {
      // Valida duration_months, se fornecido
      if (duration_months !== undefined && (typeof duration_months !== 'number' || duration_months <= 0)) {
        return res.status(400).json({ message: 'Duração deve ser um número positivo.' });
      }

      // Monta query de atualização
      const fields = ['name = ?', 'updated_at = CURRENT_TIMESTAMP'];
      const params = [name];

      if (description !== undefined) {
        fields.push('description = ?');
        params.push(description || null);
      }
      if (duration_months !== undefined) {
        fields.push('duration_months = ?');
        params.push(duration_months || null);
      }

      params.push(req.params.id);

      await dbRun(`UPDATE courses SET ${fields.join(', ')} WHERE id = ?`, params);

      // Busca o curso atualizado
      const course = await dbGet('SELECT * FROM courses WHERE id = ?', [req.params.id]);
      if (!course) {
        return res.status(404).json({ message: 'Curso não encontrado para atualizar.' });
      }

      // Registra no log de auditoria
      await dbRun(
        'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
        [
          req.user.id,
          'update_course',
          'course',
          req.params.id,
          JSON.stringify({ name, description, duration_months }),
        ]
      );

      res.json(course);
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ message: 'Outro curso já existe com este nome.' });
      }
      res.status(500).json({ message: 'Erro ao atualizar curso.', error: error.message });
    }
  }
);
coursesRouter.delete('/:id',  async (req, res) => {
    try {
        const result = await dbRun('DELETE FROM courses WHERE id = ?', [req.params.id]);
        if (result.changes === 0) return res.status(404).json({ message: "Curso não encontrado para eliminar." });
        res.status(204).send();
    } catch (e) { res.status(500).json({ message: "Erro ao eliminar curso.", error: e.message }); }
});
app.use(`${API_PREFIX}/courses`, coursesRouter);


// --- Rotas de Disciplinas (Disciplines) ---
const disciplinesRouter = express.Router();

// Cria uma nova disciplina (POST /api/disciplines)
disciplinesRouter.post(
  '/',
  async (req, res) => {
    const { course_id, academic_period_id, name, code, credits } = req.body;

    if (!course_id || !academic_period_id || !name || !code) {
      return res.status(400).json({ message: 'course_id, academic_period_id, name e code são obrigatórios.' });
    }

    try {
      // Verifica se o curso existe
      const courseExists = await dbGet('SELECT id FROM courses WHERE id = ?', [course_id]);
      if (!courseExists) {
        return res.status(404).json({ message: 'Curso associado não encontrado.' });
      }

      // Verifica se o período letivo existe
      const periodExists = await dbGet('SELECT id FROM academic_periods WHERE id = ?', [academic_period_id]);
      if (!periodExists) {
        return res.status(404).json({ message: 'Período letivo associado não encontrado.' });
      }

      // Cria a disciplina
      const result = await dbRun(
        'INSERT INTO disciplines (course_id, academic_period_id, name, code, credits) VALUES (?, ?, ?, ?, ?)',
        [course_id, academic_period_id, name, code, credits || null]
      );

      // Busca a disciplina criada
      const discipline = await dbGet('SELECT * FROM disciplines WHERE id = ?', [result.lastID]);
      if (!discipline) {
        return res.status(500).json({ message: 'Erro ao recuperar disciplina criada.' });
      }

      // Registra no log de auditoria
      await dbRun(
        'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
        [
          req.user.id,
          'create_discipline',
          'discipline',
          result.lastID,
          JSON.stringify({ name, code, course_id, academic_period_id }),
        ]
      );

      res.status(201).json(discipline);
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ message: 'Disciplina com este código já existe.' });
      }
      res.status(500).json({ message: 'Erro ao criar disciplina.', error: error.message });
    }
  }
);

// Lista todas as disciplinas (GET /api/disciplines)
disciplinesRouter.get('/',authenticateToken ,async (req, res) => {
  try {
    let query = `
      SELECT d.*, c.name AS course_name, ap.name AS academic_period_name
      FROM disciplines d
      JOIN courses c ON d.course_id = c.id
      JOIN academic_periods ap ON d.academic_period_id = ap.id
    `;
    let params = [];

    // Filtra disciplinas do curso do estudante, se aplicável
    if (req.user.role === 'student') {
      query += ' WHERE d.course_id IN (SELECT course_id FROM enrollments WHERE user_id = ?)';
      params.push(req.user.id);
    }

    query += ' ORDER BY d.name';

    const disciplines = await dbAll(query, params);
    res.json(disciplines);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao listar disciplinas.', error: error.message });
  }
});

// Lista disciplinas por curso (GET /api/disciplines/by-course/:courseId)
disciplinesRouter.get('/by-course/:courseId', async (req, res) => {
  const { courseId } = req.params;

  try {
    // Verifica se o curso existe
    const courseExists = await dbGet('SELECT id FROM courses WHERE id = ?', [courseId]);
    if (!courseExists) {
      return res.status(404).json({ message: 'Curso não encontrado.' });
    }

    // Verifica permissão do estudante
    if (req.user.role === 'student') {
      const enrollment = await dbGet(
        'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?',
        [req.user.id, courseId]
      );
      if (!enrollment) {
        return res.status(403).json({ message: 'Acesso negado: você não está matriculado neste curso.' });
      }
    }

    const disciplines = await dbAll(
      `
      SELECT d.*, c.name AS course_name, ap.name AS academic_period_name
      FROM disciplines d
      JOIN courses c ON d.course_id = c.id
      JOIN academic_periods ap ON d.academic_period_id = ap.id
      WHERE d.course_id = ?
      ORDER BY d.name
      `,
      [courseId]
    );

    res.json(disciplines);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao listar disciplinas do curso.', error: error.message });
  }
});

// Busca uma disciplina por ID (GET /api/disciplines/:id)
// disciplinesRouter.get('/:id', async (req, res) => {
//   try {
//     const discipline = await dbGet(
//       `
//       SELECT d.*, c.name AS course_name, ap.name AS academic_period_name
//       FROM disciplines d
//       JOIN courses c ON d.course_id = c.id
//       JOIN academic_periods ap ON d.academic_period_id = ap.id
//       WHERE d.id = ?
//       `,
//       [req.params.id]
//     );

//     if (!discipline) {
//       return res.status(404).json({ message: 'Disciplina não encontrada.' });
//     }

//     // Verifica permissão do estudante
//     if (req.user.role === 'student') {
//       const enrollment = await dbGet(
//         'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?',
//         [req.user.id, discipline.course_id]
//       );
//       if (!enrollment) {
//         return res.status(403).json({ message: 'Acesso negado: você não está matriculado no curso desta disciplina.' });
//       }
//     }

//     res.json(discipline);
//   } catch (error) {
//     res.status(500).json({ message: 'Erro ao buscar disciplina.', error: error.message });
//   }
// });
// Busca uma disciplina por ID (GET /api/disciplines/:id)
disciplinesRouter.get('/:id', async (req, res) => {
  try {
    const discipline = await dbGet(
      `
      SELECT * FROM disciplines WHERE course_id = ?
      `,
      [req.params.id]
    );
    res.json(discipline);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar disciplina.', error: error.message });
  }
});

// Atualiza uma disciplina (PUT /api/disciplines/:id)
disciplinesRouter.put(
  '/:id',
  async (req, res) => {
    const { name, code, course_id, academic_period_id, credits } = req.body;

    if (!name || !code) {
      return res.status(400).json({ message: 'name e code são obrigatórios.' });
    }

    try {
      const disciplineExists = await dbGet('SELECT id, course_id FROM disciplines WHERE id = ?', [req.params.id]);
      if (!disciplineExists) {
        return res.status(404).json({ message: 'Disciplina não encontrada.' });
      }

      // Verifica curso, se fornecido
      if (course_id) {
        const courseExists = await dbGet('SELECT id FROM courses WHERE id = ?', [course_id]);
        if (!courseExists) {
          return res.status(404).json({ message: 'Curso associado não encontrado.' });
        }
      }

      // Verifica período letivo, se fornecido
      if (academic_period_id) {
        const periodExists = await dbGet('SELECT id FROM academic_periods WHERE id = ?', [academic_period_id]);
        if (!periodExists) {
          return res.status(404).json({ message: 'Período letivo associado não encontrado.' });
        }
      }

      // Monta query de atualização
      const fields = ['name = ?', 'code = ?', 'updated_at = CURRENT_TIMESTAMP'];
      const params = [name, code];

      if (course_id) {
        fields.push('course_id = ?');
        params.push(course_id);
      }
      if (academic_period_id) {
        fields.push('academic_period_id = ?');
        params.push(academic_period_id);
      }
      if (credits !== undefined) {
        fields.push('credits = ?');
        params.push(credits || null);
      }

      params.push(req.params.id);

      await dbRun(`UPDATE disciplines SET ${fields.join(', ')} WHERE id = ?`, params);

      // Busca a disciplina atualizada
      const discipline = await dbGet('SELECT * FROM disciplines WHERE id = ?', [req.params.id]);
      if (!discipline) {
        return res.status(404).json({ message: 'Disciplina não encontrada após atualização.' });
      }

      // Registra no log de auditoria
      await dbRun(
        'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
        [
          req.user.id,
          'update_discipline',
          'discipline',
          req.params.id,
          JSON.stringify({ name, code, course_id, academic_period_id, credits }),
        ]
      );

      res.json(discipline);
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ message: 'Outra disciplina já existe com este código.' });
      }
      res.status(500).json({ message: 'Erro ao atualizar disciplina.', error: error.message });
    }
  }
);

// Deleta uma disciplina (DELETE /api/disciplines/:id)
disciplinesRouter.delete(
  '/:id',
  async (req, res) => {
    try {
      const disciplineExists = await dbGet('SELECT id FROM disciplines WHERE id = ?', [req.params.id]);
      if (!disciplineExists) {
        return res.status(404).json({ message: 'Disciplina não encontrada.' });
      }

      const result = await dbRun('DELETE FROM disciplines WHERE id = ?', [req.params.id]);
      if (result.changes === 0) {
        return res.status(404).json({ message: 'Disciplina não encontrada para exclusão.' });
      }

      // Registra no log de auditoria
      await dbRun(
        'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'delete_discipline', 'discipline', req.params.id, JSON.stringify({ id: req.params.id })]
      );

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Erro ao excluir disciplina.', error: error.message });
    }
  }
);

app.use(`${API_PREFIX}/disciplines`, disciplinesRouter);

// --- Rotas de Candidatos (Candidates) ---
const usersRouter = express.Router();
usersRouter.post(
  '/',
  async (req, res) => {
    const { first_name, last_name, email, phone, role, course_id } = req.body;

    if (!first_name || !last_name || !email || !role) {
      return res.status(400).json({ message: 'first_name, last_name, email e role são obrigatórios.' });
    }

    if (!['admin', 'staff', 'student', 'candidate'].includes(role)) {
      return res.status(400).json({ message: 'Role inválido.' });
    }

    try {
      // Valida course_id, se fornecido
      if (course_id) {
        const courseExists = await dbGet('SELECT id FROM courses WHERE id = ?', [course_id]);
        if (!courseExists) {
          return res.status(404).json({ message: 'Curso associado não encontrado.' });
        }
      }

      const result = await dbRun(
        'INSERT INTO users (first_name, last_name, email, phone, role, course_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [first_name, last_name, email, phone || null, role, course_id || null, 'active']
      );

      const user = await dbGet('SELECT id, first_name, last_name, email, phone, role, course_id, status, created_at, updated_at FROM users WHERE id = ?', [result.lastID]);

      // Registra no log de auditoria
      await dbRun(
        'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
        [
          req.user.id,
          'create_user',
          'user',
          result.lastID,
          JSON.stringify({ first_name, last_name, email, role, course_id }),
        ]
      );

      res.status(201).json(user);
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ message: 'Usuário com este email já existe.' });
      }
      res.status(500).json({ message: 'Erro ao criar usuário.', error: error.message });
    }
  }
);

usersRouter.get('/', async (req, res) => {
  try {
    // Fetch all users with their enrollments using JOIN
    const enrollments = await dbAll(`
      SELECT 
        u.id as user_id, u.first_name, u.last_name, u.email, u.phone, u.role, 
        u.status as user_status, u.created_at as user_created_at,
        e.*,
        c.id AS course_id, c.name AS course_name
      FROM users u
      LEFT JOIN enrollments e ON u.id = e.user_id
      LEFT JOIN courses c ON e.course_id = c.id
      ORDER BY u.last_name, u.first_name, e.enrolled_at DESC
    `);

    // Group by user and collect all their enrollments
    const usersMap = new Map();
    
    enrollments.forEach(row => {
      if (!usersMap.has(row.user_id)) {
        usersMap.set(row.user_id, {
          id: row.user_id,
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email,
          phone: row.phone,
          role: row.role,
          status: row.user_status,
          created_at: row.user_created_at,
          enrollments: [],
          courses_applied: [],
          latest_enrollment_status: null,
          latest_enrollment_date: null
        });
      }
      
      const user = usersMap.get(row.user_id);
      
      if (row.id && row.user_id) {
        const enrollmentData = { ...row };
        delete enrollmentData.user_id;
        delete enrollmentData.first_name;
        delete enrollmentData.last_name;
        delete enrollmentData.email;
        delete enrollmentData.phone;
        delete enrollmentData.role;
        delete enrollmentData.user_status;
        delete enrollmentData.user_created_at;
        delete enrollmentData.course_id;
        delete enrollmentData.course_name;
        
        enrollmentData.course_name = row.course_name;
        
        user.enrollments.push(enrollmentData);
        
        if (row.course_name && !user.courses_applied.includes(row.course_name)) {
          user.courses_applied.push(row.course_name);
        }
        if (!user.latest_enrollment_status) {
          user.latest_enrollment_status = row.status;
          user.latest_enrollment_date = row.enrolled_at;
        }
      }
    });

    const result = Array.from(usersMap.values());
    res.json(result);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

// Lista usuários recentes (GET /api/users/recent)
usersRouter.get(
  '/recent',
  async (req, res) => {
    const limit = parseInt(req.query.limit) || 5;

    try {
      const users = await dbAll(
        `
        SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.role, u.status, u.created_at AS user_created_at,
               c.name as course_name,
               e.status as enrollment_status,
               e.enrolled_at
        FROM users u
        LEFT JOIN enrollments e ON u.id = e.user_id
        LEFT JOIN courses c ON e.course_id = c.id
        ORDER BY e.enrolled_at DESC, u.created_at DESC
        LIMIT ?
        `,
        [limit]
      );

      res.json(users);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao buscar usuários recentes.', error: error.message });
    }
  }
);

// Busca usuário por email (GET /api/users/:email)
usersRouter.get(
  '/:email',
  async (req, res) => {
    const { email } = req.params;

    try {
      const users = await dbAll(
        `
        SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.role, u.status, u.created_at,
               GROUP_CONCAT(c.name) as courses_applied,
               e.status as latest_enrollment_status,
               MAX(e.enrolled_at) as latest_enrollment_date
        FROM users u
        LEFT JOIN enrollments e ON u.id = e.user_id
        LEFT JOIN courses c ON e.course_id = c.id
        WHERE u.email = ?
        GROUP BY u.id
        ORDER BY u.last_name, u.first_name
        `,
        [email]
      );

      if (!users.length) {
        return res.status(404).json({ message: 'Usuário não encontrado.' });
      }

      res.json(
        users.map((user) => ({
          ...user,
          courses_applied: user.courses_applied ? user.courses_applied.split(',') : [],
        }))
      );
    } catch (error) {
      res.status(500).json({ message: 'Erro ao buscar usuário.', error: error.message });
    }
  }
);

// Deleta um usuário (DELETE /api/users/:id)
usersRouter.delete(
  '/:id',
  async (req, res) => {
    try {
      const userExists = await dbGet('SELECT id FROM users WHERE id = ?', [req.params.id]);
      if (!userExists) {
        return res.status(404).json({ message: 'Usuário não encontrado.' });
      }

      const result = await dbRun('DELETE FROM users WHERE id = ?', [req.params.id]);
      if (result.changes === 0) {
        return res.status(404).json({ message: 'Usuário não encontrado para exclusão.' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Erro ao excluir usuário.', error: error.message });
    }
  }
);
app.use(`${API_PREFIX}/users`, usersRouter);

const enrollmentsRouter = express.Router();

// Cria uma nova matrícula (POST /api/enrollments)
enrollmentsRouter.post(
  '/',
  async (req, res) => {
    const { user_id, course_id, academic_period_id, status } = req.body;

    if (!user_id || !course_id || !academic_period_id || !status) {
      return res.status(400).json({ message: 'user_id, course_id, academic_period_id e status são obrigatórios.' });
    }

    if (!['pending', 'approved', 'rejected', 'completed', 'canceled'].includes(status)) {
      return res.status(400).json({ message: 'Status inválido.' });
    }

    try {
      // Valida user_id
      const userExists = await dbGet('SELECT id FROM users WHERE id = ?', [user_id]);
      if (!userExists) {
        return res.status(404).json({ message: 'Usuário não encontrado.' });
      }

      // Valida course_id
      const courseExists = await dbGet('SELECT id FROM courses WHERE id = ?', [course_id]);
      if (!courseExists) {
        return res.status(404).json({ message: 'Curso não encontrado.' });
      }

      // Valida academic_period_id
      const periodExists = await dbGet('SELECT id FROM academic_periods WHERE id = ?', [academic_period_id]);
      if (!periodExists) {
        return res.status(404).json({ message: 'Período letivo não encontrado.' });
      }

      // Gera código único
      const currentYear = new Date().getFullYear();
      const codPrefix = `${course_id}-${currentYear}`;
      const lastCodRow = await dbGet('SELECT code FROM enrollments WHERE code LIKE ? ORDER BY code DESC LIMIT 1', [
        `${codPrefix}%`,
      ]);
      let newSeq = 1;
      if (lastCodRow && lastCodRow.code) {
        try {
          newSeq = parseInt(lastCodRow.code.split('-').pop()) + 1;
        } catch (e) {
          /* usa 1 */
        }
      }
      const code = `${codPrefix}-${String(newSeq).padStart(4, '0')}`;

      const result = await dbRun(
        'INSERT INTO enrollments (user_id, course_id, academic_period_id, status, code) VALUES (?, ?, ?, ?, ?)',
        [user_id, course_id, academic_period_id, status, code]
      );

      const enrollment = await dbGet('SELECT * FROM enrollments WHERE id = ?', [result.lastID]);

      // Registra no log de auditoria
      await dbRun(
        'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
        [
          req.user.id,
          'create_enrollment',
          'enrollment',
          result.lastID,
          JSON.stringify({ user_id, course_id, academic_period_id, status, code }),
        ]
      );

      res.status(201).json(enrollment);
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ message: 'Conflito ao gerar código da matrícula. Tente novamente.' });
      }
      if (error.message.includes('FOREIGN KEY constraint failed')) {
        return res.status(400).json({ message: 'Usuário, curso ou período letivo inválido.' });
      }
      res.status(500).json({ message: 'Erro ao criar matrícula.', error: error.message });
    }
  }
);
enrollmentsRouter.patch('/:id',async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['approved', 'rejected', 'canceled'].includes(status)) {
      return res.status(400).json({ message: 'Status inválido.' });
    }

    const result = await dbRun(
      `UPDATE enrollments SET status = ?, updated_at = datetime('now') WHERE id = ?`,
      [status, id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Matrícula não encontrada.' });
    }

    // Atualizar status do usuário, se necessário
    if (status === 'approved') {
      await dbRun(
        `UPDATE users SET status = 'active', role = 'student' WHERE id = (SELECT user_id FROM enrollments WHERE id = ?)`,
        [id]
      );
    }
    res.json({ message: 'Matrícula atualizada com sucesso.' });
  } catch (error) {
    console.error('Erro ao aprovar matrícula:', error);
    res.status(500).json({ message: 'Erro ao aprovar matrícula.', error: error.message });
  }
});
// Lista todas as matrículas (GET /api/enrollments)
enrollmentsRouter.get('/',async (req, res) => {
  try {
    let query = `
      SELECT e.id, e.code, e.status, e.enrolled_at,
             u.first_name || ' ' || u.last_name as user_name, u.email as user_email,
             c.name as course_name,
             ap.name as academic_period_name
      FROM enrollments e
      JOIN users u ON e.user_id = u.id
      JOIN courses c ON e.course_id = c.id
      JOIN academic_periods ap ON e.academic_period_id = ap.id
    `;
    let params = [];

    query += ' ORDER BY e.enrolled_at DESC';

    const enrollments = await dbAll(query, params);
    res.json(enrollments);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao listar matrículas.', error: error.message });
  }
});

// Detalhes de uma matrícula (GET /api/enrollments/:id/details)
enrollmentsRouter.get(
  '/:id/details'
  ,
  async (req, res) => {
    try {
      const enrollmentDetail = await dbGet(
        `
        SELECT e.id, e.user_id, e.course_id, e.academic_period_id, e.enrolled_at, e.updated_at, e.status, e.code,
               u.first_name, u.last_name, u.email, u.phone, u.created_at as user_created_at, u.updated_at as user_updated_at,
               c.name as course_name, c.created_at as course_created_at, c.updated_at as course_updated_at,
               ap.name as academic_period_name
        FROM enrollments e
        JOIN users u ON e.user_id = u.id
        JOIN courses c ON e.course_id = c.id
        JOIN academic_periods ap ON e.academic_period_id = ap.id
        WHERE e.id = ?
        `,
        [req.params.id]
      );

      if (!enrollmentDetail) {
        return res.status(404).json({ message: 'Matrícula não encontrada.' });
      }


      const response = {
        id: enrollmentDetail.id,
        user_id: enrollmentDetail.user_id,
        course_id: enrollmentDetail.course_id,
        academic_period_id: enrollmentDetail.academic_period_id,
        enrolled_at: enrollmentDetail.enrolled_at,
        updated_at: enrollmentDetail.updated_at,
        status: enrollmentDetail.status,
        code: enrollmentDetail.code,
        user: {
          id: enrollmentDetail.user_id,
          first_name: enrollmentDetail.first_name,
          last_name: enrollmentDetail.last_name,
          email: enrollmentDetail.email,
          phone: enrollmentDetail.phone,
          created_at: enrollmentDetail.user_created_at,
          updated_at: enrollmentDetail.user_updated_at,
        },
        course: {
          id: enrollmentDetail.course_id,
          name: enrollmentDetail.course_name,
          created_at: enrollmentDetail.course_created_at,
          updated_at: enrollmentDetail.course_updated_at,
        },
        academic_period: {
          id: enrollmentDetail.academic_period_id,
          name: enrollmentDetail.academic_period_name,
        },
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao buscar detalhes da matrícula.', error: error.message });
    }
  }
);

// GET /api/v1/enrollments/by-user
enrollmentsRouter.get('/by-user', authenticateToken, async (req, res) => {
  try {
    const enrollments = await dbAll(
      `
      SELECT e.id, e.user_id, e.course_id, e.academic_period_id, e.enrolled_at, e.updated_at, e.status, e.code,
             u.first_name, u.last_name, u.email, u.phone, u.created_at as user_created_at, u.updated_at as user_updated_at,
             c.name as course_name, c.created_at as course_created_at, c.updated_at as course_updated_at,
             ap.name as academic_period_name
      FROM enrollments e
      JOIN users u ON e.user_id = u.id
      JOIN courses c ON e.course_id = c.id
      JOIN academic_periods ap ON e.academic_period_id = ap.id
      WHERE e.user_id = ? AND e.status = 'approved'
      ORDER BY e.enrolled_at DESC
      `,
      [req.user.id]
    );

    if (!enrollments.length) {
      return res.status(404).json({ message: 'Nenhuma matrícula aprovada encontrada para este usuário.' });
    }

    const response = enrollments.map((enrollment) => ({
      id: enrollment.id,
      user_id: enrollment.user_id,
      course_id: enrollment.course_id,
      academic_period_id: enrollment.academic_period_id,
      enrolled_at: enrollment.enrolled_at,
      updated_at: enrollment.updated_at,
      status: enrollment.status,
      code: enrollment.code,
      user: {
        id: enrollment.user_id,
        first_name: enrollment.first_name,
        last_name: enrollment.last_name,
        email: enrollment.email,
        phone: enrollment.phone,
        created_at: enrollment.user_created_at,
        updated_at: enrollment.user_updated_at,
      },
      course: {
        id: enrollment.course_id,
        name: enrollment.course_name,
        created_at: enrollment.course_created_at,
        updated_at: enrollment.course_updated_at,
      },
      academic_period: {
        id: enrollment.academic_period_id,
        name: enrollment.academic_period_name,
      },
    }));

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar matrículas do usuário.', error: error.message });
  }
});
// Busca matrícula por ID (GET /api/enrollments/:id)
enrollmentsRouter.get('/:id', async (req, res) => {
  try {
    const enrollmentDetail = await dbGet(
      `
      SELECT e.id, e.user_id, e.course_id, e.academic_period_id, e.enrolled_at, e.updated_at, e.status, e.code,
             u.first_name, u.last_name, u.email, u.phone, u.created_at as user_created_at, u.updated_at as user_updated_at,
             c.name as course_name, c.created_at as course_created_at, c.updated_at as course_updated_at,
             ap.name as academic_period_name
      FROM enrollments e
      JOIN users u ON e.user_id = u.id
      JOIN courses c ON e.course_id = c.id
      JOIN academic_periods ap ON e.academic_period_id = ap.id
      WHERE e.id = ?
      `,
      [req.params.id]
    );

    if (!enrollmentDetail) {
      return res.status(404).json({ message: 'Matrícula não encontrada.' });
    }

    // Verifica permissão do estudante
    if (req.user.role === 'student' && req.user.id !== enrollmentDetail.user_id) {
      return res.status(403).json({ message: 'Acesso negado.' });
    }

    const response = {
      id: enrollmentDetail.id,
      user_id: enrollmentDetail.user_id,
      course_id: enrollmentDetail.course_id,
      academic_period_id: enrollmentDetail.academic_period_id,
      enrolled_at: enrollmentDetail.enrolled_at,
      updated_at: enrollmentDetail.updated_at,
      status: enrollmentDetail.status,
      code: enrollmentDetail.code,
      user: {
        id: enrollmentDetail.user_id,
        first_name: enrollmentDetail.first_name,
        last_name: enrollmentDetail.last_name,
        email: enrollmentDetail.email,
        phone: enrollmentDetail.phone,
        created_at: enrollmentDetail.user_created_at,
        updated_at: enrollmentDetail.user_updated_at,
      },
      course: {
        id: enrollmentDetail.course_id,
        name: enrollmentDetail.course_name,
        created_at: enrollmentDetail.course_created_at,
        updated_at: enrollmentDetail.course_updated_at,
      },
      academic_period: {
        id: enrollmentDetail.academic_period_id,
        name: enrollmentDetail.academic_period_name,
      },
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar matrícula.', error: error.message });
  }
});

// Lista documentos de uma matrícula (GET /api/enrollments/:enrollmentId/documents)
enrollmentsRouter.get('/:enrollmentId/documents' , async (req, res) => {
  try {
    const enrollment = await dbGet('SELECT user_id FROM enrollments WHERE id = ?', [req.params.enrollmentId]);
    if (!enrollment) {
      return res.status(404).json({ message: 'Matrícula não encontrada.' });
    }
    const docs = await dbAll(
      'SELECT id, type, file_path, file_size, file_type, validation_status, validation_comments, uploaded_at FROM enrollment_docs WHERE enrollment_id = ?',
      [req.params.enrollmentId]
    );
    res.json(docs.map((d) => ({ ...d, file_url: `/static/${d.file_path}` })));
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar documentos.', error: error.message });
  }
});

app.use(`${API_PREFIX}/enrollments`, enrollmentsRouter);



// --- Rotas de Matrizes de Conteúdo (Content Matrix) ---
const contentMatrixRouter = express.Router();
contentMatrixRouter.post('/',  async (req, res) => {
    const { discipline_id, theme, competencies, skills, syllabus } = req.body;
    if (!discipline_id || !theme) {
        return res.status(400).json({ message: "discipline_id e theme são obrigatórios." });
    }
    try {
        const result = await dbRun(
            'INSERT INTO content_matrices (discipline_id, theme, competencies, skills, syllabus) VALUES (?, ?, ?, ?, ?)',
            [discipline_id, theme, JSON.stringify(competencies || []), JSON.stringify(skills || []), syllabus || null]
        );
        const matrix = await dbGet('SELECT cm.*, d.name as discipline_name FROM content_matrices cm JOIN disciplines d ON cm.discipline_id = d.id WHERE cm.id = ?', [result.lastID]);
        res.status(201).json({...matrix, competencies: JSON.parse(matrix.competencies), skills: JSON.parse(matrix.skills)});
    } catch (e) {
        if (e.message.includes('FOREIGN KEY constraint failed')) {
            return res.status(400).json({ message: "Disciplina inválida." });
        }
        res.status(500).json({ message: "Erro ao criar matriz de conteúdo.", error: e.message });
    }
});
contentMatrixRouter.get('/by-discipline/:disciplineId', async (req, res) => {
    try {
        const matrices = await dbAll(
            'SELECT cm.*, d.name as discipline_name FROM content_matrices cm JOIN disciplines d ON cm.discipline_id = d.id WHERE cm.discipline_id = ?',
            [req.params.disciplineId]
        );
        res.json(matrices.map(m => ({...m, competencies: JSON.parse(m.competencies), skills: JSON.parse(m.skills)})));
    } catch (e) { res.status(500).json({ message: "Erro ao listar matrizes da disciplina.", error: e.message }); }
});
app.use(`${API_PREFIX}/content-matrices`, contentMatrixRouter); // Note o prefixo diferente do FastAPI para simplificar

// --- Rotas de Documentos (Enrollment Documents) ---
// --- Rotas de Documentos (Enrollment Documents) ---
const documentsRouter = express.Router();


documentsRouter.get(
  '/debug/:enrollmentId',
  async (req, res) => {
    const { enrollmentId } = req.params;

    try {
      const enrollment = await dbGet('SELECT * FROM enrollments WHERE id = ?', [enrollmentId]);
      const docs = await dbAll('SELECT * FROM enrollment_docs WHERE enrollment_id = ?', [enrollmentId]);
      const totalDocs = await dbGet('SELECT COUNT(*) as count FROM enrollment_docs');
      const recentDocs = await dbAll('SELECT * FROM enrollment_docs ORDER BY uploaded_at DESC LIMIT 5');

      res.json({
        enrollmentId,
        enrollment,
        documents: docs,
        totalDocuments: totalDocs,
        recentDocuments: recentDocs,
      });
    } catch (error) {
      console.error('Erro no debug:', error);
      res.status(500).json({ message: 'Erro ao buscar informações de debug.', error: error.message });
    }
  }
);

// Upload de documento (POST /api/v1/documents/:enrollmentId/upload)
documentsRouter.post(
  '/:enrollmentId/upload',
  upload.single('documentFile'),
  async (req, res) => {
    const { enrollmentId } = req.params;
    const { type } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
    }
    if (!type) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'O tipo de documento é obrigatório.' });
    }

    try {
      const enrollment = await dbGet('SELECT id, user_id FROM enrollments WHERE id = ?', [enrollmentId]);
      if (!enrollment) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ message: 'Matrícula não encontrada.' });
      }

      // Verifica permissão do estudante
      if (req.user.role === 'student' && req.user.id !== enrollment.user_id) {
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ message: 'Acesso negado.' });
      }

      const relativeFilePath = path.relative(path.join(__dirname, 'static'), req.file.path).replace(/\\/g, '/');

      const result = await dbRun(
        'INSERT INTO enrollment_docs (enrollment_id, type, file_path, file_size, file_type, validation_status) VALUES (?, ?, ?, ?, ?, ?)',
        [enrollmentId, type, relativeFilePath, req.file.size, req.file.mimetype, 'pending']
      );

      const doc = await dbGet('SELECT * FROM enrollment_docs WHERE id = ?', [result.lastID]);

      // Registra no log de auditoria
      await dbRun(
        'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
        [
          req.user.id,
          'upload_document',
          'enrollment_doc',
          result.lastID,
          JSON.stringify({ enrollmentId, type, file_path: relativeFilePath }),
        ]
      );

      res.status(201).json({ message: 'Documento carregado com sucesso.', document: { ...doc, file_url: `/static/${doc.file_path}` } });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(500).json({ message: 'Erro ao carregar documento.', error: error.message });
    }
  }
);

// Lista documentos por matrícula (GET /api/v1/documents/by-enrollment/:enrollmentId)
documentsRouter.get(
  '/by-enrollment/:enrollmentId',
  authenticateToken
  ,
  async (req, res) => {
    try {
      const enrollment = await dbGet('SELECT id, user_id FROM enrollments WHERE id = ?', [req.params.enrollmentId]);
      if (!enrollment) {
        return res.status(404).json({ message: 'Matrícula não encontrada.' });
      }

      // Verifica permissão do estudante
      if (req.user.role === 'student' && req.user.id !== enrollment.user_id) {
        return res.status(403).json({ message: 'Acesso negado.' });
      }

      const docs = await dbAll('SELECT * FROM enrollment_docs WHERE enrollment_id = ? ORDER BY uploaded_at DESC', [req.params.enrollmentId]);
      res.json(docs.map((d) => ({ ...d, file_url: `/static/${d.file_path}` })));
    } catch (error) {
      res.status(500).json({ message: 'Erro ao listar documentos da matrícula.', error: error.message });
    }
  }
);

// Deleta documento (DELETE /api/v1/documents/:docId)
documentsRouter.delete(
  '/:docId',
  async (req, res) => {
    try {
      const doc = await dbGet('SELECT id, file_path, enrollment_id FROM enrollment_docs WHERE id = ?', [req.params.docId]);
      if (!doc) {
        return res.status(404).json({ message: 'Documento não encontrado.' });
      }

      const enrollment = await dbGet('SELECT user_id FROM enrollments WHERE id = ?', [doc.enrollment_id]);
      if (!enrollment) {
        return res.status(404).json({ message: 'Matrícula associada não encontrada.' });
      }

      const result = await dbRun('DELETE FROM enrollment_docs WHERE id = ?', [req.params.docId]);
      if (result.changes > 0) {
        const fullFilePath = path.join(__dirname, 'static', doc.file_path);
        if (fs.existsSync(fullFilePath)) {
          fs.unlinkSync(fullFilePath);
        }

        // Registra no log de auditoria
        await dbRun(
          'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
          [req.user.id, 'delete_document', 'enrollment_doc', req.params.docId, JSON.stringify({ docId: req.params.docId })]
        );
      } else {
        return res.status(404).json({ message: 'Documento não encontrado para exclusão.' });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Erro ao excluir documento.', error: error.message });
    }
  }
);

// Lista todos os documentos para admin (GET /api/v1/documents/admin/all-student-documents)
documentsRouter.get(
  '/admin/all-student-documents',
  async (req, res) => {
    try {
      const query = `
        SELECT
            ed.id AS document_id,
            ed.type AS document_type,
            ed.file_path,
            ed.file_size,
            ed.file_type,
            ed.validation_status,
            ed.validation_comments,
            ed.uploaded_at,
            e.id AS enrollment_id,
            e.code AS enrollment_code,
            e.status AS enrollment_status,
            u.id AS user_id,
            u.first_name AS user_first_name,
            u.last_name AS user_last_name,
            u.email AS user_email,
            c.id AS course_id,
            c.name AS course_name
        FROM enrollment_docs ed
        JOIN enrollments e ON ed.enrollment_id = e.id
        JOIN users u ON e.user_id = u.id
        JOIN courses c ON e.course_id = c.id
        ORDER BY u.last_name, u.first_name, ed.uploaded_at DESC
      `;
      const docs = await dbAll(query);
      res.json(docs.map((d) => ({ ...d, file_url: `${API_PREFIX}/static/${d.file_path}` })));
    } catch (error) {
      console.error('Erro ao buscar documentos para admin:', error);
      res.status(500).json({ message: 'Erro ao buscar documentos.', error: error.message });
    }
  }
);

app.use(`${API_PREFIX}/documents`, documentsRouter);

// --- Rotas de Exames (Exams) ---
const examsRouter = express.Router();
// Add to examsRouter

// Create a new exam with questions
// Add to examsRouter

examsRouter.post(
  '/',
  async (req, res) => {
    const {
      name,
      course_id,
      discipline_id,
      academic_period_id,
      exam_date,
      duration_minutes,
      type,
      max_score,
      questions,
      second_call_eligible = false,
      content_matrix_id,
    } = req.body;

    // Validate required fields
    if (
      !name ||
      !course_id ||
      !exam_date ||
      !duration_minutes ||
      !type ||
      !max_score ||
      !Array.isArray(questions) ||
      questions.length === 0
    ) {
      return res.status(400).json({ message: 'Name, course_id, exam_date, duration_minutes, type, max_score, and at least one question are required.' });
    }

    // Validate exam type
    if (!['objective', 'discursive', 'mixed'].includes(type)) {
      return res.status(400).json({ message: 'Invalid exam type. Must be objective, discursive, or mixed.' });
    }

    // Validate questions
    for (const question of questions) {
      if (
        !question.text ||
        !question.type ||
        !question.correct_answer ||
        !question.score ||
        question.score <= 0
      ) {
        return res.status(400).json({ message: 'Each question must have text, type, correct_answer, and a positive score.' });
      }
      if (!['true_false', 'multiple_choice', 'essay'].includes(question.type)) {
        return res.status(400).json({ message: 'Invalid question type.' });
      }
      if (question.type === 'true_false' && !['true', 'false'].includes(question.correct_answer)) {
        return res.status(400).json({ message: 'True/false questions must have "true" or "false" as correct_answer.' });
      }
      if (question.type === 'multiple_choice' && (!question.options || !Array.isArray(question.options) || question.options.length < 2)) {
        return res.status(400).json({ message: 'Multiple choice questions must have at least 2 options.' });
      }
    }

    // Verify max_score matches sum of question scores
    const calculatedMaxScore = questions.reduce((sum, q) => sum + q.score, 0);
    if (calculatedMaxScore !== max_score) {
      return res.status(400).json({ message: 'Max score must equal the sum of all question scores.' });
    }

    try {
      await dbRun('BEGIN TRANSACTION');

      // Validate course
      const course = await dbGet('SELECT id FROM courses WHERE id = ?', [course_id]);
      if (!course) {
        await dbRun('ROLLBACK');
        return res.status(404).json({ message: 'Course not found.' });
      }

   

      // Insert exam
      const examResult = await dbRun(
        `INSERT INTO exams (
          name, course_id, type, exam_date,
          duration_minutes, max_score, second_call_eligible, content_matrix_id,
          publication_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name,
          course_id,
          type,
          exam_date,
          duration_minutes,
          max_score,
          second_call_eligible,
          new Date().toISOString(),
        ]
      );

      const examId = examResult.lastID;

      // Insert questions
      for (const question of questions) {
        await dbRun(
          `INSERT INTO questions (exam_id, text, type, options, correct_answer, score)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            examId,
            question.text,
            question.type,
            question.options ? JSON.stringify(question.options) : null,
            question.correct_answer,
            question.score,
          ]
        );
      }

      await dbRun('COMMIT');

      // Fetch created exam with details
      const createdExam = await dbGet(
        `SELECT e.*, c.name as course_name
         FROM exams e
         JOIN courses c ON e.course_id = c.id
         WHERE e.id = ?`,
        [examId]
      );

      const createdQuestions = await dbAll(
        `SELECT * FROM questions WHERE exam_id = ?`,
        [examId]
      );


      res.status(201).json({
        ...createdExam,
        questions: createdQuestions.map(q => ({
          ...q,
          options: q.options ? JSON.parse(q.options) : null,
        })),
      });
    } catch (error) {
      console.error(error);
      await dbRun('ROLLBACK').catch((err) => console.error('Rollback error:', err));
      res.status(500).json({ message: 'Error creating exam.', error: error.message });
    }
  }
);
// Cria um exame (POST /api/v1/exams)
// Add to examsRouter (around line 2200)

// Create a true/false question
examsRouter.post('/:examId/questions/true-false', authenticateToken,  async (req, res) => {
    const { examId } = req.params;
    const { text, correct_answer, score } = req.body;

    if (!text || !correct_answer || !score) {
        return res.status(400).json({ message: 'Text, correct_answer, and score are required.' });
    }

    if (correct_answer !== 'true' && correct_answer !== 'false') {
        return res.status(400).json({ message: 'Correct answer must be "true" or "false".' });
    }

    if (typeof score !== 'number' || score <= 0) {
        return res.status(400).json({ message: 'Score must be a positive number.' });
    }

    try {
        const exam = await dbGet('SELECT id FROM exams WHERE id = ?', [examId]);
        if (!exam) {
            return res.status(404).json({ message: 'Exam not found.' });
        }

        const result = await dbRun(
            `INSERT INTO questions (exam_id, text, type, correct_answer, score)
             VALUES (?, ?, ?, ?, ?)`,
            [examId, text, 'true_false', correct_answer, score]
        );

        const question = await dbGet('SELECT * FROM questions WHERE id = ?', [result.lastID]);

        await dbRun(
            'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
            [
                req.user.id,
                'create_true_false_question',
                'question',
                result.lastID,
                JSON.stringify({ examId, text, score })
            ]
        );

        res.status(201).json(question);
    } catch (error) {
        res.status(500).json({ message: 'Error creating true/false question.', error: error.message });
    }
});

// Update true/false question
examsRouter.put('/:examId/questions/:questionId', authenticateToken, authorizeRole(['admin', 'staff']), async (req, res) => {
    const { examId, questionId } = req.params;
    const { text, correct_answer, score } = req.body;

    try {
        const question = await dbGet('SELECT * FROM questions WHERE id = ? AND exam_id = ?', [questionId, examId]);
        if (!question) {
            return res.status(404).json({ message: 'Question not found.' });
        }

        if (question.type !== 'true_false') {
            return res.status(400).json({ message: 'This endpoint is for true/false questions only.' });
        }

        const updates = {};
        if (text) updates.text = text;
        if (correct_answer && ['true', 'false'].includes(correct_answer)) updates.correct_answer = correct_answer;
        if (score && typeof score === 'number' && score > 0) updates.score = score;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: 'No valid fields to update.' });
        }

        const fields = Object.keys(updates).map(field => `${field} = ?`).join(', ');
        const values = [...Object.values(updates), questionId];

        await dbRun(`UPDATE questions SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);

        const updatedQuestion = await dbGet('SELECT * FROM questions WHERE id = ?', [questionId]);

        await dbRun(
            'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
            [
                req.user.id,
                'update_true_false_question',
                'question',
                questionId,
                JSON.stringify(updates)
            ]
        );

        res.json(updatedQuestion);
    } catch (error) {
        res.status(500).json({ message: 'Error updating true/false question.', error: error.message });
    }
});

// Lista todos os exames (GET /api/v1/exams)
examsRouter.get('/', async (req, res) => {
  try {
    let query = `
      SELECT 
        e.id, 
        e.name as exam_name, 
        e.exam_date, 
        e.type as exam_type,
        e.duration_minutes,
        e.max_score,
        c.name as course_name
      FROM exams e
      JOIN courses c ON e.course_id = c.id
    `;
    let params = [];

    query += ' ORDER BY e.exam_date DESC';

    const exams = await dbAll(query, params);
    
    // If you need to include questions
    if (req.query.includeQuestions === 'true') {
      for (const exam of exams) {
        const questions = await dbAll(
          `SELECT id, text, type, options, score FROM questions WHERE exam_id = ?`,
          [exam.id]
        );
        exam.questions = questions.map(q => ({
          ...q,
          options: q.options ? JSON.parse(q.options) : []
        }));
      }
    }

    res.json(exams);
  } catch (error) {
    console.error('Error fetching exams:', error);
    res.status(500).json({ 
      message: 'Erro ao listar exames.', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});
// Busca exame por ID (GET /api/v1/exams/:id)
examsRouter.get('/:id', async (req, res) => {
  try {
    const exam = await dbGet(
      `
      SELECT e.*, c.name as course_name
      FROM exams e
      JOIN courses c ON e.course_id = c.id
      WHERE e.id = ?
      `,
      [req.params.id]
    );

    if (!exam) {
      return res.status(404).json({ message: 'Exame não encontrado.' });
    }

    const questions = await dbAll('SELECT * FROM questions WHERE exam_id = ? ORDER BY id', [req.params.id]);
    res.json({ ...exam, questions });
  } catch (error) {
    console.error('Error fetching exam:', error);
    res.status(500).json({ message: 'Erro ao buscar exame.', error: error.message });
  }
});
// Lista exames futuros (GET /api/v1/exams/upcoming/details)

examsRouter.get(`/upcoming/details`, async (req, res) => {
  try {
    const { limit, course_id } = req.query;

    // Validate parameters
    const parsedLimit = parseInt(limit);
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      return res.status(400).json({ message: 'Limit must be a positive integer.' });
    }

    const parsedCourseId = course_id ? parseInt(course_id) : undefined;
    if (course_id && isNaN(parsedCourseId)) {
      return res.status(400).json({ message: 'Course ID must be a valid integer.' });
    }

    console.log('Query Parameters:', { limit: parsedLimit, course_id: parsedCourseId });

    let query = `
      SELECT e.id, e.name, c.name as course_name, e.exam_date, e.type
      FROM exams e
      JOIN courses c ON e.course_id = c.id
      WHERE e.exam_date >= datetime('now')
    `;
    const params = [];

    if (parsedCourseId) {
      query += ' AND e.course_id = ?';
      params.push(parsedCourseId);
    }

    query += ' ORDER BY e.exam_date ASC LIMIT ?';
    params.push(parsedLimit);

    console.log('Executing Query:', query, 'with params:', params);

    const exams = await dbAll(query, params);
    console.log('Query Result:', exams);

    res.json(exams);
  } catch (error) {
    console.error('Error in /upcoming/details:', error);
    res.status(500).json({ message: 'Error fetching upcoming exams.', error: error.message });
  }
});

examsRouter.post('/submit-answers', authenticateToken, authorizeRole(['student']), async (req, res) => {
    const { enrollment_id, exam_id, answers } = req.body;

    if (!enrollment_id || !exam_id || !Array.isArray(answers) || answers.length === 0) {
        return res.status(400).json({ message: 'enrollment_id, exam_id, and answers are required.' });
    }

    try {
        // Validate enrollment
        const enrollment = await dbGet('SELECT id, user_id FROM enrollments WHERE id = ?', [enrollment_id]);
        if (!enrollment) {
            return res.status(404).json({ message: 'Enrollment not found.' });
        }

        if (req.user.id !== enrollment.user_id) {
            return res.status(403).json({ message: 'Access denied.' });
        }

        // Validate exam
        const exam = await dbGet('SELECT id FROM exams WHERE id = ?', [exam_id]);
        if (!exam) {
            return res.status(404).json({ message: 'Exam not found.' });
        }

        await dbRun('BEGIN TRANSACTION');
        const submittedAnswers = [];

        for (const ans of answers) {
            const question = await dbGet('SELECT id, correct_answer, score, type FROM questions WHERE id = ? AND exam_id = ?', [
                ans.question_id,
                exam_id
            ]);

            if (!question) {
                await dbRun('ROLLBACK');
                return res.status(400).json({ message: `Invalid question ID ${ans.question_id}.` });
            }

            if (question.type === 'true_false' && !['true', 'false'].includes(ans.answer)) {
                await dbRun('ROLLBACK');
                return res.status(400).json({ message: `Answer for question ${ans.question_id} must be "true" or "false".` });
            }

            let isCorrect = false;
            let scoreAwarded = 0;

            if (question.type === 'true_false') {
                isCorrect = ans.answer === question.correct_answer;
                scoreAwarded = isCorrect ? question.score : 0;
            }

            const result = await dbRun(
                `INSERT INTO student_answers (enrollment_id, exam_id, question_id, answer, is_correct, score_awarded)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON CONFLICT (enrollment_id, exam_id, question_id) DO UPDATE SET
                    answer = excluded.answer,
                    is_correct = excluded.is_correct,
                    score_awarded = excluded.score_awarded,
                    updated_at = CURRENT_TIMESTAMP`,
                [enrollment_id, exam_id, ans.question_id, ans.answer, isCorrect, scoreAwarded]
            );

            const answerId = result.lastID || (await dbGet('SELECT id FROM student_answers WHERE enrollment_id = ? AND exam_id = ? AND question_id = ?', [
                enrollment_id, exam_id, ans.question_id
            ])).id;

            submittedAnswers.push({
                answer_id: answerId,
                question_id: ans.question_id,
                answer: ans.answer,
                is_correct: isCorrect,
                score_awarded: scoreAwarded
            });
        }

        await dbRun('COMMIT');

        await dbRun(
            'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
            [
                req.user.id,
                'submit_exam_answers',
                'student_answers',
                enrollment_id,
                JSON.stringify({ exam_id, answers_count: answers.length })
            ]
        );

        res.status(201).json({ message: 'Answers submitted successfully.', submitted_answers: submittedAnswers });
    } catch (error) {
        await dbRun('ROLLBACK');
        res.status(500).json({ message: 'Error submitting answers.', error: error.message });
    }
});

app.use(`${API_PREFIX}/exams`, examsRouter);


// Grades Routes


// Add to examResultsRouter (around line 2500)

// Automated grading for true/false exam
// Comentário Estratégico: Esta função centraliza toda a lógica de correção de uma prova
// para uma matrícula específica. Pode ser chamada após a submissão ou por um admin.


app.post(`${API_PREFIX}/grades`, async (req, res) => {
  try {
    const {
      enrollment_id,
      exam_id,
      academic_period_id,
      score,
      max_score,
      evaluation_type,
    } = req.body;

    // Validação
    if (!enrollment_id || !academic_period_id || score === undefined || !max_score || !evaluation_type) {
      return res.status(400).json({ message: 'Todos os campos obrigatórios devem ser preenchidos.' });
    }

    // Inserir nota
    const result = await dbRun(
      `INSERT INTO grades (enrollment_id, exam_id, academic_period_id, score, max_score, evaluation_type, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [enrollment_id, exam_id, academic_period_id, score, max_score, evaluation_type]
    );

    await dbRun(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [req.user.id, 'create_grade', 'grade', result.lastID, JSON.stringify({ enrollment_id, exam_id, score })]
    );

    res.status(201).json({ message: 'Nota registrada com sucesso.', gradeId: result.lastID });
  } catch (error) {
    console.error('Erro ao corrigir prova:', error);
    res.status(500).json({ message: 'Erro ao corrigir prova.', error: error.message });
  }
});


app.get(`${API_PREFIX}/grades/student/:enrollmentId`, async (req, res) => {
  try {
    const grades = await dbAll(
      `SELECT g.*, e.name as exam_name, e.exam_date, c.name as course_name
       FROM grades g
       LEFT JOIN exams e ON g.exam_id = e.id
       JOIN enrollments en ON g.enrollment_id = en.id
       JOIN courses c ON en.course_id = c.id
       WHERE g.enrollment_id = ?`,
      [req.params.enrollmentId]
    );
    res.json(grades);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error fetching student grades.', error: error.message });
  }
});

app.get(`${API_PREFIX}/grades/student/:enrollmentId/performance`,async (req, res) => {
  try {
    const performance = await dbAll(
      `SELECT e.name as exam_name, e.exam_date, g.score, g.max_score, g.evaluation_type
       FROM grades g
       LEFT JOIN exams e ON g.exam_id = e.id
       WHERE g.enrollment_id = ?`,
      [req.params.enrollmentId]
    );
    res.json(performance);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching student performance.', error: error.message });
  }
});

app.get(`${API_PREFIX}/grades/admin/all-details`, async (req, res) => {
  try {
    const grades = await dbAll(
      `SELECT g.*, u.first_name, u.last_name, u.email, e.name as exam_name, e.exam_date, c.name as course_name
       FROM grades g
       JOIN enrollments en ON g.enrollment_id = en.id
       JOIN users u ON en.user_id = u.id
       LEFT JOIN exams e ON g.exam_id = e.id
       JOIN courses c ON en.course_id = c.id`
    );
    res.json(grades);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching all grades.', error: error.message });
  }
});

// async function gradeExamForEnrollment(examId, enrollmentId) {
//   console.log(`Iniciando correção automática para Prova ID: ${examId}, Matrícula ID: ${enrollmentId}`);
//   try {
//     await dbRun('BEGIN TRANSACTION');

//     // 1. Obter detalhes da matrícula, incluindo o período académico
//     const enrollment = await dbGet('SELECT id, academic_period_id FROM enrollments WHERE id = ?', [enrollmentId]);
//     if (!enrollment) {
//       throw new Error(`Matrícula ${enrollmentId} não encontrada.`);
//     }

//     // 2. Obter as questões corrigíveis automaticamente (ex: verdadeiro/falso) e a sua pontuação total
//     const questions = await dbAll(
//       'SELECT id, correct_answer, score FROM questions WHERE exam_id = ? AND type = "true_false"',
//       [examId]
//     );

//     // Se não houver questões de V/F, não há nada a corrigir automaticamente
//     if (questions.length === 0) {
//       console.log(`Prova ${examId} não tem questões de correção automática.`);
//       await dbRun('ROLLBACK');
//       return;
//     }

//     const maxScorePossible = questions.reduce((sum, q) => sum + q.score, 0);

//     // 3. Obter as respostas do aluno para esta prova
//     const studentAnswers = await dbAll(
//       'SELECT question_id, answer FROM student_answers WHERE exam_id = ? AND enrollment_id = ?',
//       [examId, enrollmentId]
//     );

//     // 4. Calcular a pontuação
//     let totalScoreObtainedRaw = 0;
//     for (const sAnswer of studentAnswers) {
//       const question = questions.find(q => q.id === sAnswer.question_id);
//       if (question) {
//         const isCorrect = sAnswer.answer === question.correct_answer;
//         const scoreAwarded = isCorrect ? question.score : 0;
//         totalScoreObtainedRaw += scoreAwarded;

//         // Atualiza a resposta do aluno com o status da correção
//         await dbRun(
//           `UPDATE student_answers SET is_correct = ?, score_awarded = ?
//            WHERE enrollment_id = ? AND exam_id = ? AND question_id = ?`,
//           [isCorrect, scoreAwarded, enrollmentId, examId, sAnswer.question_id]
//         );
//       }
//     }

//     // 5. Converter a pontuação para a escala de 0-20
//     const finalScore = maxScorePossible > 0 ? (totalScoreObtainedRaw / maxScorePossible) * 20 : 0;
//     const roundedScore = Math.round(finalScore * 100) / 100; // Arredonda para 2 casas decimais
//     const gradeStatus = roundedScore >= 9.5 ? 'Aprovado' : 'Reprovado'; // Critério de aprovação

//     // 6. Determinar o evaluation_type
//     // Como exams.type ('objective', 'discursive', 'mixed') não corresponde a grades.evaluation_type,
//     // usamos um valor padrão ou mapeamos de outra forma. Aqui, usamos 'continuous' como padrão.
//     const evaluationType = 'continuous'; // Alternativa: consultar outra tabela ou lógica de negócio

//     // 7. Verificar se a nota já existe na tabela 'grades'
//     const existingGrade = await dbGet(
//       'SELECT id FROM grades WHERE enrollment_id = ? AND exam_id = ?',
//       [enrollmentId, examId]
//     );

//     if (existingGrade) {
//       // Atualizar a nota existente
//       await dbRun(
//         `UPDATE grades SET
//            score = ?,
//            max_score = ?,
//            evaluation_type = ?,
//            updated_at = CURRENT_TIMESTAMP
//          WHERE enrollment_id = ? AND exam_id = ?`,
//         [roundedScore, 20, evaluationType, enrollmentId, examId]
//       );
//     } else {
//       // Inserir uma nova nota
//       await dbRun(
//         `INSERT INTO grades (enrollment_id, exam_id, academic_period_id, score, max_score, evaluation_type)
//          VALUES (?, ?, ?, ?, ?, ?)`,
//         [enrollmentId, examId, enrollment.academic_period_id, roundedScore, 20, evaluationType]
//       );
//     }

//     await dbRun('COMMIT');
//     console.log(`Correção para Prova ID: ${examId}, Matrícula ID: ${enrollmentId} concluída. Nota: ${roundedScore}`);
//   } catch (error) {
//     await dbRun('ROLLBACK');
//     console.error(`Erro ao corrigir prova ${examId} para matrícula ${enrollmentId}:`, error);
//     throw error; // Re-throw para permitir captura no chamador
//   }
// }

// 

async function gradeExamForEnrollment(examId, enrollmentId) {
  console.log(`Iniciando correção automática para Prova ID: ${examId}, Matrícula ID: ${enrollmentId}`);
  try {
    await dbRun('BEGIN TRANSACTION');

    // 1. Obter detalhes da matrícula, incluindo o período acadêmico
    const enrollment = await dbGet('SELECT id, academic_period_id FROM enrollments WHERE id = ?', [enrollmentId]);
    if (!enrollment) {
      throw new Error(`Matrícula ${enrollmentId} não encontrada.`);
    }

    // 2. Obter as questões corrigíveis automaticamente (verdadeiro/falso e múltipla escolha)
    const questions = await dbAll(
      'SELECT id, correct_answer, score, type, options FROM questions WHERE exam_id = ? AND type IN ("true_false", "multiple_choice")',
      [examId]
    );

    if (questions.length === 0) {
      console.log(`Prova ${examId} não tem questões de correção automática.`);
      await dbRun('ROLLBACK');
      return;
    }

    const maxScorePossible = questions.reduce((sum, q) => sum + q.score, 0);

    // 3. Obter as respostas do aluno para esta prova
    const studentAnswers = await dbAll(
      'SELECT question_id, answer FROM student_answers WHERE exam_id = ? AND enrollment_id = ?',
      [examId, enrollmentId]
    );

    // 4. Calcular a pontuação
    let totalScoreObtainedRaw = 0;
    for (const sAnswer of studentAnswers) {
      const question = questions.find((q) => q.id === sAnswer.question_id);
      if (question) {
        let isCorrect = false;

        // Validate JSON data
        if (!question.correct_answer || !sAnswer.answer) {
          console.warn(`Dados inválidos: correct_answer=${question.correct_answer}, student_answer=${sAnswer.answer} para question_id=${sAnswer.question_id}`);
          continue; // Skip invalid answers
        }

        let correctAnswers, studentAnswer;
        try {
          correctAnswers = JSON.parse(question.correct_answer);
          studentAnswer = JSON.parse(sAnswer.answer);
        } catch (parseError) {
          console.error(`Erro ao parsear JSON para question_id=${sAnswer.question_id}:`, parseError);
          continue; // Skip invalid JSON
        }

        if (question.type === 'true_false') {
          isCorrect = studentAnswer.length === 1 && studentAnswer[0] === correctAnswers[0];
        } else if (question.type === 'multiple_choice') {
          isCorrect =
            studentAnswer.length === correctAnswers.length &&
            studentAnswer.every((ans) => correctAnswers.includes(ans)) &&
            correctAnswers.every((ans) => studentAnswer.includes(ans));
        }

        const scoreAwarded = isCorrect ? question.score : 0;
        totalScoreObtainedRaw += scoreAwarded;

        // Atualiza a resposta do aluno com o status da correção
        await dbRun(
          `UPDATE student_answers SET is_correct = ?, score_awarded = ?
           WHERE enrollment_id = ? AND exam_id = ? AND question_id = ?`,
          [isCorrect, scoreAwarded, enrollmentId, examId, sAnswer.question_id]
        );
      }
    }

    // 5. Converter a pontuação para a escala de 0-20
    const finalScore = maxScorePossible > 0 ? (totalScoreObtainedRaw / maxScorePossible) * 20 : 0;
    const roundedScore = Math.round(finalScore * 100) / 100; // Arredonda para 2 casas decimais
    const gradeStatus = roundedScore >= 9.5 ? 'Aprovado' : 'Reprovado';

    // 6. Determinar o evaluation_type
    const evaluationType = 'continuous';

    // 7. Verificar se a nota já existe na tabela 'grades'
    const existingGrade = await dbGet(
      'SELECT id FROM grades WHERE enrollment_id = ? AND exam_id = ?',
      [enrollmentId, examId]
    );

    if (existingGrade) {
      // Atualizar a nota existente
      await dbRun(
        `UPDATE grades SET
           score = ?,
           max_score = ?,
           evaluation_type = ?,
           updated_at = CURRENT_TIMESTAMP
         WHERE enrollment_id = ? AND exam_id = ?`,
        [roundedScore, 20, evaluationType, enrollmentId, examId]
      );
    } else {
      // Inserir uma nova nota
      await dbRun(
        `INSERT INTO grades (enrollment_id, exam_id, academic_period_id, score, max_score, evaluation_type)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [enrollmentId, examId, enrollment.academic_period_id, roundedScore, 20, evaluationType]
      );
    }

    await dbRun('COMMIT');
    console.log(`Correção para Prova ID: ${examId}, Matrícula ID: ${enrollmentId} concluída. Nota: ${roundedScore}`);
  } catch (error) {
    await dbRun('ROLLBACK');
    console.error(`Erro ao corrigir prova ${examId} para matrícula ${enrollmentId}:`, error);
    throw error;
  }
}
// 




// POST /api/v1/student_answers/submit_bulk
const studentAnswersRouter = express.Router();

studentAnswersRouter.post('/submit_bulk', async (req, res) => {
  const { enrollment_id, exam_id, answers } = req.body;
  console.log('Received payload:', req.body);

  try {
    // Validate payload
    if (!enrollment_id || !exam_id || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'Payload inválido: enrollment_id, exam_id e answers são obrigatórios.' });
    }

    await dbRun('BEGIN TRANSACTION');

    const enrollment = await dbGet('SELECT id, user_id FROM enrollments WHERE id = ?', [enrollment_id]);
    if (!enrollment) {
       await dbRun('ROLLBACK');
      return res.status(404).json({ message: 'Matrícula não encontrada.' });
    }

    const exam = await dbGet('SELECT id FROM exams WHERE id = ?', [exam_id]);
    if (!exam) {
      await dbRun('ROLLBACK');
      return res.status(404).json({ message: 'Prova não encontrada.' });
    }

    // Insere/Atualiza as respostas do aluno
    for (const answer of answers) {
      if (!answer.question_id || !answer.answer) {
        console.warn(`Resposta inválida para question_id=${answer.question_id}`);
        continue;
      }

      // Ensure answer is a valid JSON string
      let answerJson;
      try {
        // If answer is already a string, validate it; otherwise, stringify it
        answerJson = typeof answer.answer === 'string' ? answer.answer : JSON.stringify(answer.answer);
        JSON.parse(answerJson); // Validate JSON
      } catch (e) {
        console.warn(`Formato de resposta inválido para question_id=${answer.question_id}:`, e);
        answerJson = JSON.stringify(['Não respondida']); // Fallback to valid JSON
      }

      await dbRun(
        `INSERT INTO student_answers (enrollment_id, exam_id, question_id, answer)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (enrollment_id, exam_id, question_id) DO UPDATE SET
           answer = excluded.answer, updated_at = CURRENT_TIMESTAMP`,
        [enrollment_id, exam_id, answer.question_id, answerJson]
      );
    }

    await dbRun('COMMIT');

    // Chama a função de correção em background
    gradeExamForEnrollment(exam_id, enrollment_id);

    res.json({ message: 'Respostas submetidas com sucesso. A sua nota será processada.' });
  } catch (error) {
    await dbRun('ROLLBACK');
    console.error('Erro ao submeter respostas:', error);
    res.status(500).json({ message: 'Erro ao submeter respostas.', error: error.message });
  }
});
app.use(`${API_PREFIX}/student_answers`, studentAnswersRouter);
// --- Rotas de Resultados de Exames (Exam Results) ---
const examResultsRouter = express.Router();
// GET /api/v1/exam_results/by-student/:enrollmentId/answers/:examId
examResultsRouter.get('/by-student/:enrollmentId/answers/:examId', authenticateToken, async (req, res) => {
  const { enrollmentId, examId } = req.params;

  try {
    const enrollment = await dbGet('SELECT id, user_id FROM enrollments WHERE id = ?', [enrollmentId]);
    if (!enrollment) {
      return res.status(404).json({ message: 'Matrícula não encontrada.' });
    }

    // Verifica permissão
    if (req.user.role === 'student' && req.user.id !== enrollment.user_id) {
      return res.status(403).json({ message: 'Acesso negado.' });
    }

    const answers = await dbAll(
      `
      SELECT sa.question_id, sa.answer, sa.is_correct, sa.score_awarded,
             q.text as question_text, q.correct_answer
      FROM student_answers sa
      JOIN questions q ON sa.question_id = q.id
      WHERE sa.enrollment_id = ? AND sa.exam_id = ?
      ORDER BY sa.question_id
      `,
      [enrollmentId, examId]
    );

    res.json(answers);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar respostas do estudante.', error: error.message });
  }
});
// Classifica um exame (POST /api/v1/exam_results/:examId/grade)
examResultsRouter.post('/:examId/grade-auto', async (req, res) => {
    const { examId } = req.params;

    try {
        await dbRun('BEGIN TRANSACTION');

        // Verify exam exists and get questions
        const exam = await dbGet('SELECT id FROM exams WHERE id = ?', [examId]);
        if (!exam) {
            await dbRun('ROLLBACK');
            return res.status(404).json({ message: 'Exam not found.' });
        }

        const questions = await dbAll('SELECT id, correct_answer, score FROM questions WHERE exam_id = ? AND type = "true_false"', [examId]);
        if (questions.length === 0) {
            await dbRun('ROLLBACK');
            return res.status(404).json({ message: 'No true/false questions found for this exam.' });
        }

        const maxScorePossible = questions.reduce((sum, q) => sum + q.score, 0);

        // Get student submissions
        const submissions = await dbAll(
            `SELECT sa.enrollment_id, sa.question_id, sa.answer, sa.is_correct, sa.score_awarded
             FROM student_answers sa
             WHERE sa.exam_id = ?`,
            [examId]
        );

        const gradesByEnrollment = new Map();

        for (const submission of submissions) {
            if (!gradesByEnrollment.has(submission.enrollment_id)) {
                gradesByEnrollment.set(submission.enrollment_id, { score: 0, answers: [] });
            }

            const question = questions.find(q => q.id === submission.question_id);
            if (!question) continue;

            const isCorrect = submission.answer === question.correct_answer;
            const scoreAwarded = isCorrect ? question.score : 0;

            // Update student answer
            await dbRun(
                `UPDATE student_answers
                 SET is_correct = ?, score_awarded = ?
                 WHERE enrollment_id = ? AND question_id = ? AND exam_id = ?`,
                [isCorrect, scoreAwarded, submission.enrollment_id, submission.question_id, examId]
            );

            gradesByEnrollment.get(submission.enrollment_id).score += scoreAwarded;
            gradesByEnrollment.get(submission.enrollment_id).answers.push({
                question_id: submission.question_id,
                answer: submission.answer,
                is_correct: isCorrect,
                score_awarded: scoreAwarded
            });
        }

        const gradedResults = [];

        // Calculate final grades (0-20 scale)
        for (const [enrollmentId, data] of gradesByEnrollment) {
            const rawScore = data.score;
            const finalScore = (rawScore / maxScorePossible) * 20;
            const roundedScore = Math.round(finalScore * 100) / 100; // 2 decimal places
            const gradeStatus = roundedScore >= 10 ? 'Aprovado' : 'Reprovado';

            // Insert or update exam result
            const result = await dbRun(
                `INSERT INTO exam_results (enrollment_id, exam_id, total_score_obtained, max_score_possible, grade)
                 VALUES (?, ?, ?, ?, ?)
                 ON CONFLICT (enrollment_id, exam_id) DO UPDATE SET
                    total_score_obtained = excluded.total_score_obtained,
                    max_score_possible = excluded.max_score_possible,
                    grade = excluded.grade,
                    graded_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP`,
                [enrollmentId, examId, roundedScore, 20, gradeStatus]
            );

            const resultId = result.lastID || (await dbGet('SELECT id FROM exam_results WHERE enrollment_id = ? AND exam_id = ?', [enrollmentId, examId])).id;

            // Insert into grades table
            await dbRun(
                `INSERT INTO grades (enrollment_id, exam_id, academic_period_id, score, max_score, evaluation_type)
                 VALUES (?, ?, (SELECT academic_period_id FROM exams WHERE id = ?), ?, ?, 'final')`,
                [enrollmentId, examId, examId, examId, roundedScore, 20]
            );

            gradedResults.push({
                result_id: resultId,
                enrollment_id: enrollmentId,
                exam_id: parseInt(examId),
                total_score_obtained: roundedScore,
                max_score_possible: 20,
                grade: gradeStatus,
                answers: data.answers
            });
        }

        await dbRun('COMMIT');

        res.json({
            message: 'Exam automatically graded successfully.',
            graded_results: gradedResults,
            max_score_possible: maxScorePossible
        });
    } catch (error) {
        await dbRun('ROLLBACK');
        res.status(500).json({ message: 'Error automatically grading exam.', error: error.message });
    }
});
// Lista resultados por exame (GET /api/v1/exam_results/by-exam/:examId)
examResultsRouter.get('/by-exam/:examId', authenticateToken, async (req, res) => {
  try {
    const examExists = await dbGet('SELECT id FROM exams WHERE id = ?', [req.params.examId]);
    if (!examExists) {
      return res.status(404).json({ message: 'Exame não encontrado.' });
    }

    const results = await dbAll(
      `
      SELECT er.*, u.first_name || ' ' || u.last_name as student_name
      FROM exam_results er
      JOIN enrollments e ON er.enrollment_id = e.id
      JOIN users u ON e.user_id = u.id
      WHERE er.exam_id = ?
      ORDER BY student_name
      `,
      [req.params.examId]
    );

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar resultados do exame.', error: error.message });
  }
});

// Lista resultados por estudante (GET /api/v1/exam_results/by-student/:enrollmentId)
examResultsRouter.get('/by-student/:enrollmentId', authenticateToken, async (req, res) => {
  const { enrollmentId } = req.params;

  try {
    const enrollment = await dbGet('SELECT id, user_id FROM enrollments WHERE id = ?', [enrollmentId]);
    if (!enrollment) {
      return res.status(404).json({ message: 'Matrícula não encontrada.' });
    }

    // Verifica permissão
    if (req.user.role === 'student' && req.user.id !== enrollment.user_id) {
      return res.status(403).json({ message: 'Acesso negado.' });
    }

    const results = await dbAll(
      `
      SELECT er.id, er.enrollment_id, er.exam_id, er.total_score_obtained, er.max_score_possible, er.grade, er.graded_at,
             ex.exam_name, ex.exam_date,
             c.name as course_name,
      FROM exam_results er
      JOIN exams ex ON er.exam_id = ex.id
      JOIN courses c ON ex.course_id = c.id
      WHERE er.enrollment_id = ?
      ORDER BY ex.exam_date DESC
      `,
      [enrollmentId]
    );

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar resultados do estudante.', error: error.message });
  }
});

// Lista todos os resultados para admin (GET /api/v1/exam_results/admin/all-details)
examResultsRouter.get(
  '/admin/all-details',
  authenticateToken,
  async (req, res) => {
    try {
      const results = await dbAll(
        `
        SELECT er.id as result_id, er.enrollment_id, er.exam_id, er.total_score_obtained, er.max_score_possible, er.grade, er.graded_at,
               u.first_name as user_first_name, u.last_name as user_last_name, u.email as user_email,
               ex.exam_name, ex.exam_date,
               c.name as course_name,
        FROM exam_results er
        JOIN enrollments e ON er.enrollment_id = e.id
        JOIN users u ON e.user_id = u.id
        JOIN exams ex ON er.exam_id = ex.id
        JOIN courses c ON ex.course_id = c.id
        ORDER BY er.graded_at DESC, u.last_name, u.first_name
        `
      );

      res.json(results);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao buscar resultados para admin.', error: error.message });
    }
  }
);

app.use(`${API_PREFIX}/exam_results`, examResultsRouter);

// --- Rotas de Desempenho (Performance) ---
const performanceRouter = express.Router();
performanceRouter.get('/student/:enrollmentId', authenticateToken, async (req, res) => {
  const { enrollmentId } = req.params;

  try {
    const enrollment = await dbGet('SELECT id, user_id FROM enrollments WHERE id = ?', [enrollmentId]);
    if (!enrollment) {
      return res.status(404).json({ message: 'Matrícula não encontrada.' });
    }

    // Verifica permissão
    if (req.user.role === 'student' && req.user.id !== enrollment.user_id) {
      return res.status(403).json({ message: 'Acesso negado.' });
    }

    const performanceData = await dbAll(
      `
      SELECT d.name as discipline_name,
             ex.exam_name,
             ex.exam_date,
             er.total_score_obtained as score,
             er.max_score_possible as max_score,
             er.grade
      FROM exam_results er
      JOIN exams ex ON er.exam_id = ex.id
      JOIN disciplines d ON ex.discipline_id = d.id
      WHERE er.enrollment_id = ?
      ORDER BY d.name, ex.exam_date
      `,
      [enrollmentId]
    );

    res.json(performanceData);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar desempenho do estudante.', error: error.message });
  }
});

app.use(`${API_PREFIX}/performance`, performanceRouter);

// --- Rotas de Admin Dashboard ---
const adminRouter = express.Router();

// Estatísticas do dashboard (GET /api/v1/admin/dashboard/stats)
adminRouter.get('/stats', async (req, res) => {
  try {
    const stats = {
      registrations: await dbGet(`SELECT COUNT(*) as count FROM enrollments WHERE status = 'pending'`),
      exams_scheduled: await dbGet(`SELECT COUNT(*) as count FROM exams WHERE exam_date >= datetime('now')`),
      exams_corrected: await dbGet(`SELECT COUNT(*) as count FROM grades WHERE created_at >= date('now', '-30 days')`),
      pending_reviews: await dbGet(`SELECT COUNT(*) as count FROM enrollment_docs WHERE validation_status = 'pending'`),
    };

    res.json({
      registrations: stats.registrations.count,
      exams_scheduled: stats.exams_scheduled.count,
      exams_corrected: stats.exams_corrected.count,
      pending_reviews: stats.pending_reviews.count,
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ message: 'Erro ao buscar estatísticas.', error: error.message });
  }
});

app.use(`${API_PREFIX}/admin/dashboard`, adminRouter);

// --- Rotas de Estatísticas ---
const statsRouter = express.Router();

// Matrículas por mês (GET /api/v1/stats/enrollments-by-month)
statsRouter.get(
  '/enrollments-by-month',
  async (req, res) => {
    try {
      const enrollments = await dbAll(
        `
        SELECT strftime('%Y-%m', enrolled_at) as month, COUNT(id) as count
        FROM enrollments
        WHERE strftime('%Y', enrolled_at) = strftime('%Y', 'now')
        GROUP BY month
        ORDER BY month ASC
        `
      );

      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const dataMap = new Map(enrollments.map((e) => [e.month.split('-')[1], e.count]));

      const chartData = monthNames.map((name, index) => {
        const monthKey = String(index + 1).padStart(2, '0');
        return {
          name,
          total: dataMap.get(monthKey) || 0,
        };
      });

      res.json(chartData);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao gerar estatísticas de matrículas.', error: error.message });
    }
  }
);

app.use(`${API_PREFIX}/stats`, statsRouter);

// Enrollment Docs Routes
app.post(`${API_PREFIX}/enrollment_docs/upload/:enrollmentId`, authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const enrollment = await dbGet('SELECT id FROM enrollments WHERE id = ?', [req.params.enrollmentId]);
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found.' });
    }

    const { type } = req.body;
    if (!type) {
      return res.status(400).json({ message: 'Document type is required.' });
    }

    const filePath = path.relative(__dirname, req.file.path).replace(/\\/g, '/');

    const result = await dbRun(
      `INSERT INTO enrollment_docs (enrollment_id, type, file_path, file_size, file_type, validation_status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.params.enrollmentId, type, filePath, req.file.size, req.file.mimetype, 'pending']
    );

    await dbRun(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, 'upload_doc', 'enrollment_doc', result.lastID, JSON.stringify({ type, enrollment_id: req.params.enrollmentId })]
    );

    res.status(201).json({
      id: result.lastID,
      enrollment_id: req.params.enrollmentId,
      type,
      file_path: filePath,
      file_url: `/static/registrations/${req.params.enrollmentId}/${req.file.filename}`,
      uploaded_at: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error uploading document.', error: error.message });
  }
});

app.get(`${API_PREFIX}/enrollment_docs/by-enrollment/:enrollmentId`, async (req, res) => {
  try {
    const docs = await dbAll(
      `SELECT id, enrollment_id, type, file_path, file_size, file_type, validation_status, validation_comments, validated_at, uploaded_at, updated_at,
              file_path as file_url
       FROM enrollment_docs
       WHERE enrollment_id = ?`,
      [req.params.enrollmentId]
    );
    res.json(docs.map(doc => ({
      ...doc,
      file_url: `/static/registrations/${req.params.enrollmentId}/${path.basename(doc.file_path)}`,
    })));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching documents.', error: error.message });
  }
});


app.use('/static', express.static(path.join(__dirname, 'static')));

// --- Rota de Health Check ---
app.get(`${API_PREFIX}/health`, (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// --- Rota Raiz ---
app.get('/', (req, res) => {
  res.send('Bem-vindo à API Académica! (Node.js/Express/SQLite)');
});

// --- Middleware de Erro ---
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err.stack);
  res.status(500).send('Algo correu mal no servidor!');
});

// --- Inicialização do Servidor ---
app.listen(PORT, () => {
  console.log(`Servidor a correr na porta ${PORT}`);
  console.log(`API Prefix: ${API_PREFIX}`);
  console.log(`Database: ${dbPath}`);
});

// --- Fechamento do Banco ---
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log('Conexão com a base de dados SQLite fechada.');
    process.exit(0);
  });
});