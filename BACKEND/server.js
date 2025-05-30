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
const API_PREFIX = process.env.API_PREFIX || '/api'; // Usado onde 'settings' aparecia
const SECRET_KEY = process.env.SECRET_KEY || 'your-fallback-secret-key';
const ACCESS_TOKEN_EXPIRE_MINUTES = parseInt(process.env.ACCESS_TOKEN_EXPIRE_MINUTES || '30', 10);

// Middlewares
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

// Servir ficheiros estáticos (ex: uploads)
app.use('/static', express.static(path.join(__dirname, 'static')));
const UPLOAD_DIR = path.join(__dirname, 'static', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
const DOC_UPLOAD_DIR = path.join(UPLOAD_DIR, 'docs');
if (!fs.existsSync(DOC_UPLOAD_DIR)) {
    fs.mkdirSync(DOC_UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
       
        const enrollmentId = req.params.enrollmentId || req.body.enrollment_id || 'temp_enrollment';
        let uploadPath = path.join(DOC_UPLOAD_DIR, String(enrollmentId));

        if (req.isRegistration) { // Flag para rota de registo
             uploadPath = path.join(DOC_UPLOAD_DIR, 'registrations', String(enrollmentId));
        }


        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const originalName = path.parse(file.originalname).name;
        const extension = path.extname(file.originalname);
        cb(null, `${originalName}_${timestamp}${extension}`);
    }
});
const upload = multer({ storage: storage });


const dbPath = process.env.DB_PATH || path.join(__dirname, 'unipass.sqlite3');

let db = null;

export async function openDb() {
    if (db) return db;
    db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });
    return db;
}

export async function dbRun(sql, params = []) {
    const instance = await openDb();
    return instance.run(sql, params);
}

export async function dbGet(sql, params = []) {
    const instance = await openDb();
    return instance.get(sql, params);
}

export async function dbAll(sql, params = []) {
    const instance = await openDb();
    return instance.all(sql, params);
}

export async function closeDb() {
    if (db) {
        await db.close();
        db = null;
        console.log('Conexão com a base de dados SQLite fechada.');
    }
}

async function initializeDb() {
    try {
        await dbRun('BEGIN TRANSACTION');

        // Enable foreign key support
        await dbRun('PRAGMA foreign_keys = ON');

        // Create tables in correct order (dependencies first)
        const tables = [
            // 1. Independent tables first
            `CREATE TABLE IF NOT EXISTS courses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                UNIQUE(name)
            )`,

            // 2. Tables that depend on courses
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('admin', 'staff', 'student')),
                course TEXT,
                course_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                FOREIGN KEY (course_id) REFERENCES courses(id) ON UPDATE NO ACTION ON DELETE NO ACTION
            )`,

            `CREATE TABLE IF NOT EXISTS disciplines (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                course_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                code TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                FOREIGN KEY (course_id) REFERENCES courses(id) ON UPDATE NO ACTION ON DELETE NO ACTION
            )`,

            `CREATE TABLE IF NOT EXISTS candidates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                phone TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
            )`,

            // 3. Tables that depend on other tables
            `CREATE TABLE IF NOT EXISTS enrollments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                candidate_id INTEGER NOT NULL,
                course_id INTEGER NOT NULL,
                "COD" TEXT UNIQUE,
                status TEXT CHECK(status IN ('pending', 'approved', 'rejected', 'completed')),
                enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
                FOREIGN KEY (course_id) REFERENCES courses(id) ON UPDATE NO ACTION ON DELETE NO ACTION
            )`,

            `CREATE TABLE IF NOT EXISTS enrollment_docs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                enrollment_id INTEGER NOT NULL,
                type TEXT NOT NULL,
                file_path TEXT NOT NULL,
                uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON UPDATE NO ACTION ON DELETE CASCADE
            )`,

            `CREATE TABLE IF NOT EXISTS content_matrices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                discipline_id INTEGER NOT NULL,
                theme TEXT NOT NULL,
                competencies TEXT NOT NULL,
                skills TEXT NOT NULL,
                syllabus TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                FOREIGN KEY (discipline_id) REFERENCES disciplines(id) ON UPDATE NO ACTION ON DELETE NO ACTION
            )`,

            `CREATE TABLE IF NOT EXISTS exams (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                course_id INTEGER NOT NULL,
                discipline_id INTEGER NOT NULL,
                exam_name TEXT NOT NULL,
                exam_date DATETIME NOT NULL,
                duration INTEGER NOT NULL,
                exam_type TEXT NOT NULL CHECK(exam_type IN ('Objective', 'Discursive', 'Mixed')),
                second_call_eligible BOOLEAN DEFAULT FALSE,
                second_call_date DATETIME,
                publication_date DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (course_id) REFERENCES courses(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
                FOREIGN KEY (discipline_id) REFERENCES disciplines(id) ON UPDATE NO ACTION ON DELETE NO ACTION
            )`,

            `CREATE TABLE IF NOT EXISTS grades (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                enrollment_id INTEGER NOT NULL,
                discipline_id INTEGER NOT NULL,
                grade REAL CHECK(grade >= 0 AND grade <= 20),
                evaluation_type TEXT NOT NULL DEFAULT 'final' CHECK(evaluation_type IN ('midterm', 'final', 'makeup')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON UPDATE NO ACTION ON DELETE CASCADE,
                FOREIGN KEY (discipline_id) REFERENCES disciplines(id) ON UPDATE NO ACTION ON DELETE CASCADE
            )`,

            `CREATE TABLE IF NOT EXISTS exam_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                enrollment_id INTEGER NOT NULL,
                exam_id INTEGER NOT NULL,
                total_score_obtained INTEGER NOT NULL CHECK(total_score_obtained >= 0),
                max_score_possible INTEGER NOT NULL CHECK(max_score_possible > 0),
                grade TEXT,
                graded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON UPDATE NO ACTION ON DELETE CASCADE,
                FOREIGN KEY (exam_id) REFERENCES exams(id) ON UPDATE NO ACTION ON DELETE CASCADE,
                UNIQUE (enrollment_id, exam_id)
            )`,

            `CREATE TABLE IF NOT EXISTS questions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                exam_id INTEGER NOT NULL,
                question_text TEXT NOT NULL,
                correct_answer TEXT,
                question_type TEXT NOT NULL CHECK(question_type IN ('multiple_choice', 'true_false', 'essay')),
                score INTEGER DEFAULT 1 CHECK(score > 0),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (exam_id) REFERENCES exams(id) ON UPDATE NO ACTION ON DELETE CASCADE
            )`,

            `CREATE TABLE IF NOT EXISTS student_answers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                enrollment_id INTEGER NOT NULL,
                exam_id INTEGER NOT NULL,
                question_id INTEGER NOT NULL,
                answer TEXT,
                is_correct BOOLEAN,
                score_awarded INTEGER DEFAULT 0 CHECK(score_awarded >= 0),
                answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
                FOREIGN KEY (exam_id) REFERENCES exams(id) ON UPDATE NO ACTION ON DELETE CASCADE,
                FOREIGN KEY (question_id) REFERENCES questions(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
                UNIQUE (enrollment_id, question_id)
            )`,

            `CREATE TABLE IF NOT EXISTS exam_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                exam_id INTEGER NOT NULL,
                changed_field TEXT NOT NULL,
                old_value TEXT,
                new_value TEXT,
                changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                changed_by INTEGER,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (exam_id) REFERENCES exams(id) ON UPDATE NO ACTION ON DELETE CASCADE,
                FOREIGN KEY (changed_by) REFERENCES users(id) ON UPDATE NO ACTION ON DELETE NO ACTION
            )`
        ];

        // Create all tables
        for (const tableQuery of tables) {
            await dbRun(tableQuery);
        }

        // Create indexes for better performance
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
            'CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email)',
            'CREATE INDEX IF NOT EXISTS idx_enrollments_cod ON enrollments(COD)',
            'CREATE INDEX IF NOT EXISTS idx_exams_date ON exams(exam_date)',
            'CREATE INDEX IF NOT EXISTS idx_exam_results_enrollment ON exam_results(enrollment_id)',
            'CREATE INDEX IF NOT EXISTS idx_student_answers_exam ON student_answers(exam_id, enrollment_id)'
        ];

        for (const indexQuery of indexes) {
            await dbRun(indexQuery);
        }

        await dbRun('COMMIT');
        console.log('Database tables and indexes initialized successfully');

    } catch (error) {
        await dbRun('ROLLBACK');
        console.error('Error initializing database:', error);
        throw new Error(`Database initialization failed: ${error.message}`);
    }
}

async function insertInitialData() {
    try {
        await dbRun(`
            INSERT OR IGNORE INTO users (email, name, hashed_password, role) 
            VALUES ('admin@test.com', 'Admin User', '$2b$10$eMf6plagHGJXIPCgjXNIyOZ0DNB3nHnaNHLvT9IWY7o2X6IIUX5Lu', 'admin')
        `);

        const courses = [
            { id: 1, name: 'Engenharia Informática' },
            { id: 2, name: 'Medicina' },
            { id: 3, name: 'Direito' },
            { id: 4, name: 'Psicologia' }
        ];
        for (const course of courses) {
            await dbRun(`INSERT OR IGNORE INTO courses (id, name) VALUES (?, ?)`, [course.id, course.name]);
        }

        const disciplines = [
            { course_id: 1, name: 'Programação I', code: 'INF001' },
            { course_id: 1, name: 'Base de Dados', code: 'INF002' },
            { course_id: 2, name: 'Anatomia', code: 'MED001' },
            { course_id: 3, name: 'Direito Civil', code: 'DIR001' }
        ];
        for (const disc of disciplines) {
            await dbRun(`INSERT OR IGNORE INTO disciplines (course_id, name, code) VALUES (?, ?, ?)`, 
                [disc.course_id, disc.name, disc.code]);
        }
        console.log('Dados iniciais (admin, courses, disciplines) inseridos com sucesso ou já existentes.');
    } catch (e) {
        console.error("Erro ao inserir dados iniciais:", e.message);
    }
}


async function populateMoreMockData(numEnrollments = 150, numCandidates = 50, numExams = 20) {
    console.log("A iniciar a população de mais dados mock...");
    try {
        const courses = await dbAll('SELECT id FROM courses');
        if (courses.length === 0) {
            console.log("Nenhum curso encontrado. Adicione cursos primeiro.");
            return;
        }

        // Create candidates
        for (let i = 0; i < numCandidates; i++) {
            const firstName = `Candidato${i}`;
            const lastName = `Apelido${i}`;
            const email = `candidate${i}@test.com`;
            await dbRun(
                `INSERT OR IGNORE INTO candidates (first_name, last_name, email) VALUES (?, ?, ?)`,
                [firstName, lastName, email]
            );
        }
        const allCandidates = await dbAll('SELECT id FROM candidates');

        // Create enrollments
        for (let i = 0; i < numEnrollments; i++) {
            const candidate = allCandidates[i % allCandidates.length];
            const course = courses[i % courses.length];
            const year = new Date().getFullYear();
            const randomDaysAgo = Math.floor(Math.random() * 90); 
            const enrollmentDate = new Date();
            enrollmentDate.setDate(enrollmentDate.getDate() - randomDaysAgo);
            
            // Ensure the date is valid before converting to ISO string
            if (isNaN(enrollmentDate.getTime())) {
                console.error(`Invalid enrollment date for enrollment ${i}`);
                continue;
            }
            
            const cod = `${course.id}-${year}-${String(i + 1).padStart(4, '0')}`;
            const statusOptions = ['pending', 'approved', 'rejected', 'completed'];
            const status = statusOptions[Math.floor(Math.random() * statusOptions.length)];

            await dbRun(
                `INSERT OR IGNORE INTO enrollments (candidate_id, course_id, COD, status, enrolled_at) 
                 VALUES (?, ?, ?, ?, ?)`,
                [candidate.id, course.id, cod, status, enrollmentDate.toISOString()]
            );
        }

        // Create exams
        const disciplines = await dbAll('SELECT id, course_id FROM disciplines');
        if (disciplines.length > 0) {
            for (let i = 0; i < numExams; i++) {
                const discipline = disciplines[i % disciplines.length];
                const examDate = new Date();
                const randomDaysOffset = Math.floor(Math.random() * 60) - 30; // -30 to +29 days from now
                examDate.setDate(examDate.getDate() + randomDaysOffset);
                
                // Ensure the exam date is valid
                if (isNaN(examDate.getTime())) {
                    console.error(`Invalid exam date for exam ${i}`);
                    continue;
                }
                
                const examTypes = ['Objective', 'Discursive', 'Mixed']; // Fixed: removed invalid 'Teste' and 'Exame Final'

                await dbRun(
                    `INSERT OR IGNORE INTO exams (course_id, discipline_id, exam_name, exam_date, duration, exam_type)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        discipline.course_id,
                        discipline.id,
                        `Exame de ${discipline.id} #${i + 1}`,
                        examDate.toISOString(),
                        [60, 90, 120][Math.floor(Math.random() * 3)],
                        examTypes[Math.floor(Math.random() * examTypes.length)]
                    ]
                );
            }
        }
        
        // Create exam results for past exams
        const allEnrollments = await dbAll('SELECT id FROM enrollments');
        const allExams = await dbAll('SELECT id, exam_date FROM exams WHERE DATE(exam_date) < DATE(\'now\')'); // Get exam_date too

        if (allEnrollments.length > 0 && allExams.length > 0) {
            for (let i = 0; i < Math.min(allEnrollments.length * 0.5, 100); i++) { // Limit to avoid too many operations
                const enrollment = allEnrollments[i % allEnrollments.length];
                const exam = allExams[i % allExams.length];
                const score = Math.floor(Math.random() * 21); // Integer score from 0-20
                const grade = score >= 10 ? 'Aprovado' : 'Reprovado';
                
                // Create graded date safely
                const examDate = new Date(exam.exam_date);
                if (isNaN(examDate.getTime())) {
                    console.error(`Invalid exam date: ${exam.exam_date}`);
                    continue;
                }
                
                const gradedDate = new Date(examDate);
                gradedDate.setDate(gradedDate.getDate() + 2); // Graded 2 days after exam
                
                if (isNaN(gradedDate.getTime())) {
                    console.error(`Invalid graded date for exam ${exam.id}`);
                    continue;
                }

                await dbRun(
                    `INSERT OR IGNORE INTO exam_results (enrollment_id, exam_id, total_score_obtained, max_score_possible, grade, graded_at)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [enrollment.id, exam.id, score, 20, grade, gradedDate.toISOString()]
                );
            }
        }

        console.log(`População de dados mock concluída: ${numEnrollments} matrículas, ${numCandidates} candidatos, ${numExams} exames.`);
    } catch (e) {
        console.error("Erro ao popular mais dados mock:", e.message);
        throw e; // Re-throw to see the full stack trace
    }
}


export async function setupAndSeedDatabase() {
    await openDb();
    await initializeDb();
    await insertInitialData();
    const enrollmentsCount = await dbGet('SELECT COUNT(*) as count FROM enrollments');
    if (enrollmentsCount.count < 50) { 
        await populateMoreMockData();
    }

}

await setupAndSeedDatabase()

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

    if (token == null) return res.status(401).json({ message: "Token não fornecido." });

    jwt.verify(token, SECRET_KEY, async (err, decoded) => {
        if (err) return res.status(403).json({ message: "Token inválido ou expirado." });
        try {
            const user = await dbGet('SELECT id, name, email, role FROM users WHERE email = ?', [decoded.sub]);
            if (!user) {
                return res.status(404).json({ message: "Utilizador não encontrado." });
            }
            req.user = user;
            next();
        } catch (dbError) {
            res.status(500).json({ message: "Erro ao verificar utilizador.", error: dbError.message });
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
app.post(`${API_PREFIX}/auth/token`, async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: "Email e password são obrigatórios." });
    }
    try {
        const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) {
            return res.status(401).json({ detail: "Email ou password incorretos." });
        }
        const isValidPassword = await verifyPassword(password, user.hashed_password);
        if (!isValidPassword) {
            return res.status(401).json({ detail: "Email ou password incorretos." });
        }
        const accessToken = createAccessToken(user);
        res.json({ access_token: accessToken, token_type: "bearer" });
    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({ message: "Erro interno do servidor.", error: error.message });
    }
});

const registrationUploadFields = [
    { name: 'comprovativo', maxCount: 1 },
    { name: 'bilhete', maxCount: 1 },
    { name: 'vacine_card', maxCount: 1 },
    { name: 'foto', maxCount: 1 }
];

app.post(`${API_PREFIX}/auth/register`, (req, res, next) => {
    req.isRegistration = true;
    next();
}, upload.fields(registrationUploadFields), async (req, res) => {
    const { name, email, password, course_id } = req.body;
    let candidateId;

    if (!name || !email || !password || !course_id) {
        return res.status(400).json({ message: "Todos os campos (name, email, password, course_id) são obrigatórios." });
    }

    if (!req.files || Object.keys(req.files).length !== registrationUploadFields.length) {
        if (req.files && Object.keys(req.files).length > 0) {
             Object.values(req.files).forEach(fileArray => fileArray.forEach(f => {
                if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
             }));
        }
        const tempEnrollmentPath = path.join(DOC_UPLOAD_DIR, 'registrations', 'temp_enrollment');
        if (fs.existsSync(tempEnrollmentPath)) {
            fs.readdirSync(tempEnrollmentPath).forEach(f => fs.unlinkSync(path.join(tempEnrollmentPath, f)));
            fs.rmdirSync(tempEnrollmentPath, { recursive: true });
        }
        return res.status(400).json({ message: "Todos os documentos são obrigatórios." });
    }


    try {
        await dbRun('BEGIN TRANSACTION');

        const existingUser = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUser) {
            await dbRun('ROLLBACK');
            Object.values(req.files).forEach(fileArray => fileArray.forEach(f => {
                if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
            }));
            const tempEnrollmentPath = path.join(DOC_UPLOAD_DIR, 'registrations', 'temp_enrollment');
            if (fs.existsSync(tempEnrollmentPath)) {
                 fs.readdirSync(tempEnrollmentPath).forEach(f => fs.unlinkSync(path.join(tempEnrollmentPath, f)));
                 fs.rmdirSync(tempEnrollmentPath, { recursive: true });
            }
            return res.status(409).json({ message: "Email já registado." });
        }

        const hashedPassword = await hashPassword(password);
        await dbRun(
            "INSERT INTO users (name, email, hashed_password, role) VALUES (?, ?, ?, 'student')",
            [name, email, hashedPassword]
        );

        const nameParts = name.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');
        const candidateResult = await dbRun(
            "INSERT INTO candidates (first_name, last_name, email) VALUES (?, ?, ?)",
            [firstName, lastName || '', email]
        );
        candidateId = candidateResult.lastID;

        const currentYear = new Date().getFullYear();
        const codPrefix = `${course_id}-${currentYear}`;
        const lastCodRow = await dbGet(
            'SELECT COD FROM enrollments WHERE COD LIKE ? ORDER BY COD DESC LIMIT 1',
            [`${codPrefix}%`]
        );

        let newSeq = 1;
        if (lastCodRow && lastCodRow.COD) {
            try {
                const lastSeqPart = lastCodRow.COD.split('-').pop();
                newSeq = parseInt(lastSeqPart, 10) + 1;
            } catch (e) {
                newSeq = 1;
            }
        }
        const generatedCod = `${codPrefix}-${String(newSeq).padStart(4, '0')}`;

        await dbRun(
            'INSERT INTO enrollments (candidate_id, course_id, COD, status) VALUES (?, ?, ?, ?)',
            [candidateId, course_id, generatedCod, 'pending']
        );
        const enrollmentId = candidateId;

        const tempUploadPath = path.join(DOC_UPLOAD_DIR, 'registrations', 'temp_enrollment');
        const finalUploadPathForEnrollment = path.join(DOC_UPLOAD_DIR, 'registrations', String(enrollmentId));

        if (fs.existsSync(tempUploadPath)) {
            fs.mkdirSync(finalUploadPathForEnrollment, { recursive: true });
            fs.readdirSync(tempUploadPath).forEach(fileName => {
                fs.renameSync(path.join(tempUploadPath, fileName), path.join(finalUploadPathForEnrollment, fileName));
            });
            fs.rmdirSync(tempUploadPath);
        } else {
             console.warn(`Caminho temporário de upload não encontrado: ${tempUploadPath}. Os ficheiros podem não ter sido movidos.`);
        }

        for (const fieldName in req.files) {
            const file = req.files[fieldName][0];
            const finalFileLocation = path.join(finalUploadPathForEnrollment, file.filename);
            const relativeFilePath = path.relative(path.join(__dirname, 'static'), finalFileLocation).replace(/\\/g, '/');
            await dbRun(
                "INSERT INTO enrollment_docs (enrollment_id, type, file_path) VALUES (?, ?, ?)",
                [enrollmentId, fieldName, relativeFilePath]
            );
        }

        await dbRun('COMMIT');
        res.status(201).json({ statusCode: 201, status: "success", COD: generatedCod, message: "Registo bem-sucedido." });

    } catch (error) {
        await dbRun('ROLLBACK').catch(e => console.error("Erro no rollback:", e));
        console.error("Erro no registo:", error);

        const tempUploadPath = path.join(DOC_UPLOAD_DIR, 'registrations', 'temp_enrollment');
        if (fs.existsSync(tempUploadPath)) {
            try {
                if (fs.lstatSync(tempUploadPath).isDirectory()) {
                    fs.readdirSync(tempUploadPath).forEach(fileName => fs.unlinkSync(path.join(tempUploadPath, fileName)));
                    fs.rmdirSync(tempUploadPath);
                }
            } catch (tempCleanupError) {
                console.error("Erro ao limpar pasta temporária de upload no catch principal:", tempCleanupError);
            }
        }
        
        if (candidateId) {
            const finalUploadPathForEnrollment = path.join(DOC_UPLOAD_DIR, 'registrations', String(candidateId));
            if (fs.existsSync(finalUploadPathForEnrollment)) {
                try {
                    fs.readdirSync(finalUploadPathForEnrollment).forEach(f => fs.unlinkSync(path.join(finalUploadPathForEnrollment, f)));
                    fs.rmdirSync(finalUploadPathForEnrollment);
                } catch (cleanupError) {
                    console.error("Erro ao limpar pasta final de upload no catch principal:", cleanupError);
                }
            }
        }
        
        if (req.files) {
            Object.values(req.files).forEach(fileArray => fileArray.forEach(f => {
                if (fs.existsSync(f.path) && f.path.includes(tempUploadPath)) {
                } else if (fs.existsSync(f.path)) {
                   fs.unlinkSync(f.path);
                }
            }));
        }
        res.status(500).json({ message: "Erro interno do servidor durante o registo.", error: error.message });
    }
});

app.get(`${API_PREFIX}/users/getUsers`, async (req, res) => {
    try {
        const users = await dbAll('SELECT id, name, email, role FROM users');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "Erro ao buscar utilizadores.", error: error.message });
    }
})

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
coursesRouter.put('/:id', async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Nome é obrigatório." });
    try {
        await dbRun('UPDATE courses SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [name, req.params.id]);
        const course = await dbGet('SELECT * FROM courses WHERE id = ?', [req.params.id]);
        if (!course) return res.status(404).json({ message: "Curso não encontrado para atualizar." });
        res.json(course);
    } catch (e) {
         if (e.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ message: "Outro curso já existe com este nome." });
        }
        res.status(500).json({ message: "Erro ao atualizar curso.", error: e.message });
    }
});
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
disciplinesRouter.post('/',  async (req, res) => {
    const { course_id, name, code } = req.body;
    if (!course_id || !name || !code) {
        return res.status(400).json({ message: "course_id, name, e code são obrigatórios." });
    }
    try {
        const courseExists = await dbGet('SELECT id FROM courses WHERE id = ?', [course_id]);
        if (!courseExists) {
            return res.status(404).json({ message: "Curso associado não encontrado." });
        }
        const result = await dbRun('INSERT INTO disciplines (course_id, name, code) VALUES (?, ?, ?)', [course_id, name, code]);
        const discipline = await dbGet('SELECT * FROM disciplines WHERE id = ?', [result.lastID]);
        res.status(201).json(discipline);
    } catch (e) {
        if (e.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ message: "Disciplina com este código já existe." });
        }
        res.status(500).json({ message: "Erro ao criar disciplina.", error: e.message });
    }
});
disciplinesRouter.get('/', async (req, res) => { // Todas as disciplinas
    try {
        const disciplines = await dbAll('SELECT d.*, c.name as course_name FROM disciplines d JOIN courses c ON d.course_id = c.id ORDER BY d.name');
        res.json(disciplines);
    } catch (e) { res.status(500).json({ message: "Erro ao listar disciplinas.", error: e.message }); }
});
disciplinesRouter.get('/by-course/:courseId', async (req, res) => { // Disciplinas por curso
    try {
        const disciplines = await dbAll('SELECT * FROM disciplines WHERE course_id = ? ORDER BY name', [req.params.courseId]);
        res.json(disciplines);
    } catch (e) { res.status(500).json({ message: "Erro ao listar disciplinas do curso.", error: e.message }); }
});
disciplinesRouter.get('/:id', async (req, res) => {
    try {
        const discipline = await dbGet('SELECT d.*, c.name as course_name FROM disciplines d JOIN courses c ON d.course_id = c.id WHERE d.id = ?', [req.params.id]);
        if (!discipline) return res.status(404).json({ message: "Disciplina não encontrada." });
        res.json(discipline);
    } catch (e) { res.status(500).json({ message: "Erro ao buscar disciplina.", error: e.message }); }
});
disciplinesRouter.put('/:id',  async (req, res) => {
    const { name, code, course_id } = req.body; // course_id opcional na atualização, mas se fornecido, deve existir
    if (!name || !code) return res.status(400).json({ message: "Nome e código são obrigatórios." });
    try {
        if (course_id) {
            const courseExists = await dbGet('SELECT id FROM courses WHERE id = ?', [course_id]);
            if (!courseExists) return res.status(404).json({ message: "Curso associado não encontrado." });
            await dbRun('UPDATE disciplines SET name = ?, code = ?, course_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [name, code, course_id, req.params.id]);
        } else {
            await dbRun('UPDATE disciplines SET name = ?, code = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [name, code, req.params.id]);
        }
        const discipline = await dbGet('SELECT * FROM disciplines WHERE id = ?', [req.params.id]);
        if (!discipline) return res.status(404).json({ message: "Disciplina não encontrada para atualizar." });
        res.json(discipline);
    } catch (e) {
        if (e.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ message: "Outra disciplina já existe com este código." });
        }
        res.status(500).json({ message: "Erro ao atualizar disciplina.", error: e.message });
    }
});
disciplinesRouter.delete('/:id',  async (req, res) => {
    try {
        const result = await dbRun('DELETE FROM disciplines WHERE id = ?', [req.params.id]);
        if (result.changes === 0) return res.status(404).json({ message: "Disciplina não encontrada para eliminar." });
        res.status(204).send();
    } catch (e) { res.status(500).json({ message: "Erro ao eliminar disciplina.", error: e.message }); }
});
app.use(`${API_PREFIX}/disciplines`, disciplinesRouter);

// --- Rotas de Candidatos (Candidates) ---
const candidatesRouter = express.Router();
candidatesRouter.post('/', async (req, res) => {
    const { first_name, last_name, email, phone } = req.body;
    if (!first_name || !email) return res.status(400).json({ message: "Nome e email são obrigatórios." });
    try {
        const result = await dbRun(
            'INSERT INTO candidates (first_name, last_name, email, phone) VALUES (?, ?, ?, ?)',
            [first_name, last_name || '', email, phone || null]
        );
        const candidate = await dbGet('SELECT * FROM candidates WHERE id = ?', [result.lastID]);
        res.status(201).json(candidate);
    } catch (e) {
        if (e.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ message: "Candidato com este email já existe." });
        }
        res.status(500).json({ message: "Erro ao criar candidato.", error: e.message });
    }
});
candidatesRouter.get('/', async (req, res) => {
    try {
        const candidates = await dbAll(`
            SELECT c.id, c.first_name, c.last_name, c.email, c.phone, c.created_at,
                   GROUP_CONCAT(co.name) as courses_applied, 
                   e.status as latest_enrollment_status,
                   MAX(e.enrolled_at) as latest_enrollment_date
            FROM candidates c
            LEFT JOIN enrollments e ON c.id = e.candidate_id
            LEFT JOIN courses co ON e.course_id = co.id
            GROUP BY c.id
            ORDER BY c.last_name, c.first_name
        `);
        res.json(candidates.map(cand => ({
            ...cand,
            courses_applied: cand.courses_applied ? cand.courses_applied.split(',') : []
        })));
    } catch (e) { res.status(500).json({ message: "Erro ao listar candidatos.", error: e.message }); }
});
// Exemplo: Rota para candidatos recentes (similar a get_recent_candidates_with_details_db)
candidatesRouter.get('/recent',  async (req, res) => {
    const limit = parseInt(req.query.limit) || 5;
    try {
        const rows = await dbAll(`
            SELECT
                c.id, c.first_name, c.last_name, c.email, c.phone, c.created_at AS candidate_created_at,
                co.name as course_name,
                e.status as enrollment_status,
                e.enrolled_at
            FROM candidates c
            LEFT JOIN enrollments e ON c.id = e.candidate_id
            LEFT JOIN courses co ON e.course_id = co.id
            ORDER BY e.enrolled_at DESC, c.created_at DESC
            LIMIT ?
        `, [limit]);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ message: "Erro ao buscar candidatos recentes.", error: e.message });
    }
});
app.use(`${API_PREFIX}/candidates`, candidatesRouter);


// --- Rotas de Inscrições (Enrollments) ---
const enrollmentsRouter = express.Router();
// CRUD para inscrições
enrollmentsRouter.post('/',  async (req, res) => {
    const { candidate_id, course_id, status } = req.body;
    if (!candidate_id || !course_id || !status) {
        return res.status(400).json({ message: "candidate_id, course_id e status são obrigatórios." });
    }
    try {
        // Gerar COD (lógica simplificada aqui, adapte se precisar de mais complexidade)
        const currentYear = new Date().getFullYear();
        const codPrefix = `${course_id}-${currentYear}`;
        const lastCodRow = await dbGet('SELECT COD FROM enrollments WHERE COD LIKE ? ORDER BY COD DESC LIMIT 1', [`${codPrefix}%`]);
        let newSeq = 1;
        if (lastCodRow && lastCodRow.COD) {
            try { newSeq = parseInt(lastCodRow.COD.split('-').pop()) + 1; } catch(e){ /* usa 1 */ }
        }
        const COD = `${codPrefix}-${String(newSeq).padStart(4, '0')}`;

        const result = await dbRun(
            'INSERT INTO enrollments (candidate_id, course_id, status, COD) VALUES (?, ?, ?, ?)',
            [candidate_id, course_id, status, COD]
        );
        const enrollment = await dbGet('SELECT * FROM enrollments WHERE id = ?', [result.lastID]);
        res.status(201).json(enrollment);
    } catch (e) {
        if(e.message.includes('UNIQUE constraint failed') && e.message.includes('enrollments.COD')) {
             return res.status(409).json({ message: "Conflito ao gerar COD da inscrição. Tente novamente." });
        }
        if(e.message.includes('FOREIGN KEY constraint failed')) {
             return res.status(400).json({ message: "Candidato ou Curso inválido." });
        }
        res.status(500).json({ message: "Erro ao criar inscrição.", error: e.message });
    }
});
enrollmentsRouter.get('/',  async (req, res) => {
    try {
        const enrollments = await dbAll(`
            SELECT e.id, e.COD, e.status, e.enrolled_at,
                   c.first_name || ' ' || c.last_name as candidate_name, c.email as candidate_email,
                   co.name as course_name
            FROM enrollments e
            JOIN candidates c ON e.candidate_id = c.id
            JOIN courses co ON e.course_id = co.id
            ORDER BY e.enrolled_at DESC
        `);
        res.json(enrollments);
    } catch (e) { res.status(500).json({ message: "Erro ao listar inscrições.", error: e.message }); }
});
// Rota para obter detalhes de uma inscrição (similar a get_enrollment_details_with_candidate_course_db)
enrollmentsRouter.get('/:id/details',  async (req, res) => {
    try {
        const enrollmentDetail = await dbGet(`
            SELECT
                e.id, e.candidate_id, e.course_id, e.enrolled_at, e.updated_at AS enrollment_updated_at, e.status, e.cod,
                cand.first_name, cand.last_name, cand.email, cand.phone, 
                cand.created_at as candidate_created_at, cand.updated_at as candidate_updated_at,
                crs.name as course_name, crs.created_at as course_created_at, crs.updated_at as course_updated_at
            FROM enrollments e
            JOIN candidates cand ON e.candidate_id = cand.id
            JOIN courses crs ON e.course_id = crs.id
            WHERE e.id = ?;
        `, [req.params.id]);

        if (!enrollmentDetail) {
            return res.status(404).json({ message: "Inscrição não encontrada." });
        }
        // Estruturar a resposta como no schema FastAPI
        const response = {
            id: enrollmentDetail.id,
            candidate_id: enrollmentDetail.candidate_id,
            course_id: enrollmentDetail.course_id,
            enrolled_at: enrollmentDetail.enrolled_at,
            updated_at: enrollmentDetail.enrollment_updated_at,
            status: enrollmentDetail.status,
            cod: enrollmentDetail.cod,
            candidate: {
                id: enrollmentDetail.candidate_id, // Assumindo que o ID do candidato é o mesmo que e.candidate_id
                first_name: enrollmentDetail.first_name,
                last_name: enrollmentDetail.last_name,
                email: enrollmentDetail.email,
                phone: enrollmentDetail.phone,
                created_at: enrollmentDetail.candidate_created_at,
                updated_at: enrollmentDetail.candidate_updated_at
            },
            course: {
                id: enrollmentDetail.course_id, // Assumindo que o ID do curso é o mesmo que e.course_id
                name: enrollmentDetail.course_name,
                created_at: enrollmentDetail.course_created_at,
                updated_at: enrollmentDetail.course_updated_at
            }
        };
        res.json(response);
    } catch (e) {
        res.status(500).json({ message: "Erro ao buscar detalhes da inscrição.", error: e.message });
    }
});

app.use(`${API_PREFIX}/enrollments`, enrollmentsRouter);

// --- Rotas de Documentos (Enrollment Documents) ---
const documentsRouter = express.Router();
// Upload de um documento para uma inscrição existente
documentsRouter.post('/:enrollmentId/upload',  (req, res, next) => { req.params.enrollmentId = req.params.enrollmentId; next(); }, upload.single('documentFile'), async (req, res) => {
    const { enrollmentId } = req.params;
    const { type } = req.body; // Ex: 'bilhete_adicional', 'certificado_secundario'

    if (!req.file) {
        return res.status(400).json({ message: "Nenhum ficheiro enviado." });
    }
    if (!type) {
        fs.unlinkSync(req.file.path); // Remover ficheiro se o tipo não for especificado
        return res.status(400).json({ message: "O tipo de documento é obrigatório." });
    }

    try {
        const enrollmentExists = await dbGet('SELECT id FROM enrollments WHERE id = ?', [enrollmentId]);
        if (!enrollmentExists) {
            fs.unlinkSync(req.file.path);
            return res.status(404).json({ message: "Inscrição não encontrada." });
        }

        const relativeFilePath = path.relative(path.join(__dirname, 'static'), req.file.path).replace(/\\/g, '/');

        const result = await dbRun(
            'INSERT INTO enrollment_docs (enrollment_id, type, file_path) VALUES (?, ?, ?)',
            [enrollmentId, type, relativeFilePath]
        );
        const doc = await dbGet('SELECT * FROM enrollment_docs WHERE id = ?', [result.lastID]);

        res.status(201).json({ message: "Documento carregado com sucesso.", document: doc });
    } catch (error) {
        console.error("Erro ao carregar documento:", error);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); // Limpar em caso de erro na BD
        res.status(500).json({ message: "Erro interno do servidor ao guardar documento.", error: error.message });
    }
});
documentsRouter.get('/by-enrollment/:enrollmentId',  async (req, res) => {
    try {
        const docs = await dbAll('SELECT * FROM enrollment_docs WHERE enrollment_id = ? ORDER BY uploaded_at DESC', [req.params.enrollmentId]);
        res.json(docs.map(d => ({...d, file_url: `/static/${d.file_path}`})));
    } catch (e) { res.status(500).json({ message: "Erro ao listar documentos da inscrição.", error: e.message }); }
});
documentsRouter.delete('/:docId',  async (req, res) => {
    try {
        const doc = await dbGet('SELECT id, file_path FROM enrollment_docs WHERE id = ?', [req.params.docId]);
        if (!doc) return res.status(404).json({ message: "Documento não encontrado." });

        const result = await dbRun('DELETE FROM enrollment_docs WHERE id = ?', [req.params.docId]);
        if (result.changes > 0) {
            const fullFilePath = path.join(__dirname, 'static', doc.file_path);
            if (fs.existsSync(fullFilePath)) {
                fs.unlinkSync(fullFilePath);
            }
        } else {
             return res.status(404).json({ message: "Documento não encontrado para eliminar." });
        }
        res.status(204).send();
    } catch (e) { res.status(500).json({ message: "Erro ao eliminar documento.", error: e.message }); }
});
app.use(`${API_PREFIX}/documents`, documentsRouter);

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

// --- Rotas de Exames (Exams) e Questões (Questions) ---
const examsRouter = express.Router(); // FastAPI usa f"{settings}/exams"
examsRouter.post('/',  async (req, res) => {
    const {
        course_id, discipline_id, exam_name, exam_date, duration, exam_type,
        second_call_eligible, second_call_date, publication_date, questions
    } = req.body;

    if (!course_id || !discipline_id || !exam_name || !exam_date || !questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ message: "Campos obrigatórios em falta ou 'questions' inválido." });
    }

    try {
        await dbRun('BEGIN TRANSACTION');
        const examResult = await dbRun(
            `INSERT INTO exams (course_id, discipline_id, exam_name, exam_date, duration, exam_type,
                                second_call_eligible, second_call_date, publication_date)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [course_id, discipline_id, exam_name, exam_date, duration, exam_type,
             second_call_eligible || false, second_call_date || null, publication_date || null]
        );
        const examId = examResult.lastID;
        const createdQuestions = [];
        for (const q of questions) {
            const qResult = await dbRun(
                'INSERT INTO questions (exam_id, question_text, correct_answer, question_type, score) VALUES (?, ?, ?, ?, ?)',
                [examId, q.question_text, q.correct_answer || null, q.question_type, q.score || 0]
            );
            createdQuestions.push({ id: qResult.lastID, ...q });
        }
        await dbRun('COMMIT');
        const examDetails = await dbGet('SELECT * FROM exams WHERE id = ?', [examId]);
        res.status(201).json({ ...examDetails, questions: createdQuestions });
    } catch (e) {
        await dbRun('ROLLBACK').catch(err => console.error("Erro no rollback do exame:", err));
        res.status(500).json({ message: "Erro ao criar exame.", error: e.message });
    }
});
examsRouter.get('/:examId', async (req, res) => {
    try {
        const exam = await dbGet('SELECT * FROM exams WHERE id = ?', [req.params.examId]);
        if (!exam) return res.status(404).json({ message: "Exame não encontrado." });
        const questions = await dbAll('SELECT * FROM questions WHERE exam_id = ? ORDER BY id', [req.params.examId]);
        res.json({ ...exam, questions });
    } catch (e) { res.status(500).json({ message: "Erro ao buscar exame.", error: e.message }); }
});
examsRouter.get('/', async (req, res) => { // Listar todos os exames
    try {
        const examRows = await dbAll("SELECT * FROM exams ORDER BY exam_date DESC, exam_name");
        const examsList = [];
        for (const exam_row_data of examRows) {
            const questions = await dbAll("SELECT * FROM questions WHERE exam_id = ? ORDER BY id", [exam_row_data.id]);
            examsList.push({ ...exam_row_data, questions });
        }
        res.json(examsList);
    } catch (e) { res.status(500).json({ message: "Erro ao listar exames.", error: e.message }); }
});


examsRouter.get('/upcoming/details', async (req, res) => {
    const limit = parseInt(req.query.limit) || 3;
    try {
        const rows = await dbAll(`
            SELECT
                e.id, e.course_id, e.discipline_id, e.exam_name, e.exam_date, e.duration, e.exam_type,
                e.second_call_eligible, e.second_call_date, e.publication_date, e.created_at AS exam_created_at,
                c.name as course_name,
                d.name as discipline_name
            FROM exams e
            JOIN courses c ON e.course_id = c.id
            JOIN disciplines d ON e.discipline_id = d.id
            WHERE DATE(e.exam_date) >= DATE('now')
            ORDER BY e.exam_date ASC
            LIMIT ?
        `, [limit]);
        // Para cada exame, buscar as questões (se necessário)
        const results = [];
        for (const row_data of rows) {
            const questions = await dbAll("SELECT * FROM questions WHERE exam_id = ? ORDER BY id", [row_data.id]);
            results.push({ ...row_data, questions });
        }
        res.json(results);
    } catch (e) {
        res.status(500).json({ message: "Erro ao buscar próximos exames.", error: e.message });
    }
});
examsRouter.post('/submit-answers', async (req, res) => {
    const { enrollment_id, exam_id, answers } = req.body; 
    const studentEnrollmentId = req.user.role === 'student' ? (await dbGet('SELECT id FROM enrollments WHERE candidate_id = (SELECT candidate_id FROM users u JOIN candidates c ON u.email = c.email WHERE u.id = ?)', [req.user.id]))?.id : enrollment_id;


    if (!studentEnrollmentId || !exam_id || !Array.isArray(answers) || answers.length === 0) {
        return res.status(400).json({ message: "enrollment_id, exam_id e answers são obrigatórios." });
    }

    try {
        await dbRun('BEGIN TRANSACTION');
        const submittedAnswers = [];
        for (const ans of answers) {
            const question = await dbGet('SELECT id, correct_answer, score, exam_id as question_exam_id FROM questions WHERE id = ?', [ans.question_id]);
            if (!question || question.question_exam_id !== parseInt(exam_id, 10)) { // Verificar se a questão pertence ao exame
                await dbRun('ROLLBACK');
                return res.status(400).json({ message: `Questão ID ${ans.question_id} inválida ou não pertence ao exame ID ${exam_id}.` });
            }

            let isCorrect = false;
            let scoreAwarded = 0;
            if (question.correct_answer && ans.answer) {
                isCorrect = ans.answer.trim().toLowerCase() === question.correct_answer.trim().toLowerCase();
            }
            if (isCorrect) {
                scoreAwarded = question.score;
            }

            const result = await dbRun(
                `INSERT INTO student_answers (enrollment_id, exam_id, question_id, answer, is_correct, score_awarded)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON CONFLICT (enrollment_id, question_id) DO UPDATE SET
                    answer = excluded.answer,
                    is_correct = excluded.is_correct,
                    score_awarded = excluded.score_awarded,
                    updated_at = CURRENT_TIMESTAMP`,
                [studentEnrollmentId, exam_id, ans.question_id, ans.answer, isCorrect, scoreAwarded]
            );
            submittedAnswers.push({ answer_id: result.lastID || (await dbGet('SELECT id FROM student_answers WHERE enrollment_id=? AND question_id=?',[studentEnrollmentId, ans.question_id])).id , ...ans, is_correct: isCorrect, score_awarded: scoreAwarded });
        }
        await dbRun('COMMIT');
        res.status(201).json({ message: "Respostas submetidas com sucesso.", submitted_answers: submittedAnswers });
    } catch (e) {
        await dbRun('ROLLBACK').catch(err => console.error("Erro no rollback das respostas:", err));
        res.status(500).json({ message: "Erro ao submeter respostas.", error: e.message });
    }
});
app.use(`${API_PREFIX}/exams`, examsRouter); 

// --- Rotas de Resultados de Exames (Exam Results) ---
const examResultsRouter = express.Router(); 
// Rota para classificar um exame (atribuir notas)
examResultsRouter.post('/:examId/grade',  async (req, res) => {
    const { examId } = req.params;
    try {
        await dbRun('BEGIN TRANSACTION');
        const questions = await dbAll('SELECT id, score FROM questions WHERE exam_id = ?', [examId]);
        if (questions.length === 0) {
            await dbRun('ROLLBACK');
            return res.status(404).json({ message: `Nenhuma questão encontrada para o exame ID ${examId}.` });
        }
        const maxExamScorePossibleRaw = questions.reduce((sum, q) => sum + (q.score || 0), 0);

        // Obter todos os estudantes que submeteram respostas para este exame
        const studentSubmissions = await dbAll(
            `SELECT enrollment_id, SUM(score_awarded) as total_raw_score_obtained
             FROM student_answers
             WHERE exam_id = ?
             GROUP BY enrollment_id`,
            [examId]
        );

        if (studentSubmissions.length === 0) {
             await dbRun('ROLLBACK');
            return res.json({ message: "Nenhuma submissão de estudante para classificar neste exame.", graded_results: [] });
        }

        const gradedResults = [];
        for (const submission of studentSubmissions) {
            const enrollmentId = submission.enrollment_id;
            const totalRawScoreObtained = submission.total_raw_score_obtained || 0;

            let finalScore20Scale = 0.0;
            if (maxExamScorePossibleRaw > 0) {
                finalScore20Scale = parseFloat(((totalRawScoreObtained / maxExamScorePossibleRaw) * 20).toFixed(2));
            }
            finalScore20Scale = Math.min(finalScore20Scale, 20.0); // Limitar a 20

            const gradeStatus = finalScore20Scale >= 9.5 ? "Aprovado" : "Reprovado";

            const result = await dbRun(
                `INSERT INTO exam_results (enrollment_id, exam_id, total_score_obtained, max_score_possible, grade, graded_at)
                 VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                 ON CONFLICT (enrollment_id, exam_id) DO UPDATE SET
                    total_score_obtained = excluded.total_score_obtained,
                    max_score_possible = excluded.max_score_possible,
                    grade = excluded.grade,
                    graded_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP`,
                [enrollmentId, examId, finalScore20Scale, 20, gradeStatus] // max_score_possible é sempre 20 na escala de 0-20
            );
             const currentResultId = result.lastID || (await dbGet('SELECT id FROM exam_results WHERE enrollment_id = ? AND exam_id = ?', [enrollmentId, examId])).id;
            gradedResults.push({ id: currentResultId, enrollment_id: enrollmentId, exam_id: parseInt(examId), total_score_obtained: finalScore20Scale, max_score_possible: 20, grade: gradeStatus });
        }
        await dbRun('COMMIT');
        res.json({ message: "Exame classificado com sucesso.", graded_results: gradedResults });
    } catch (e) {
        await dbRun('ROLLBACK').catch(err => console.error("Erro no rollback da classificação:", err));
        res.status(500).json({ message: "Erro ao classificar exame.", error: e.message });
    }
});
// Obter resultados de um exame específico
examResultsRouter.get('/by-exam/:examId', async (req, res) => {
    try {
        const results = await dbAll(
            `SELECT er.*, c.first_name || ' ' || c.last_name as student_name
             FROM exam_results er
             JOIN enrollments e ON er.enrollment_id = e.id
             JOIN candidates c ON e.candidate_id = c.id
             WHERE er.exam_id = ? ORDER BY student_name`,
            [req.params.examId]
        );
        res.json(results);
    } catch (e) { res.status(500).json({ message: "Erro ao buscar resultados do exame.", error: e.message }); }
});
// Obter resultados de todos os exames para um estudante específico
examResultsRouter.get('/by-student/:enrollmentId', async (req, res) => {
    // Verificar se o utilizador que pede é o próprio estudante ou um admin/staff
    const { enrollmentId } = req.params;
    const studentEnrollment = await dbGet('SELECT e.id, cand.email FROM enrollments e JOIN candidates cand ON e.candidate_id = cand.id WHERE e.id = ?', [enrollmentId]);

    if (!studentEnrollment) return res.status(404).json({message: "Inscrição não encontrada."});

    if (req.user.role !== 'admin' && req.user.role !== 'staff' && req.user.email !== studentEnrollment.email) {
        return res.status(403).json({message: "Acesso negado para ver resultados deste estudante."});
    }

    try {
        const results = await dbAll(`
            SELECT
                er.id, er.enrollment_id, er.exam_id, er.total_score_obtained, er.max_score_possible, er.grade,
                er.graded_at,
                ex.exam_name, ex.exam_date,
                crs.name as course_name,
                d.name as discipline_name
            FROM exam_results er
            JOIN exams ex ON er.exam_id = ex.id
            JOIN courses crs ON ex.course_id = crs.id
            JOIN disciplines d ON ex.discipline_id = d.id
            WHERE er.enrollment_id = ?
            ORDER BY ex.exam_date DESC;
        `, [enrollmentId]);
        res.json(results);
    } catch (e) { res.status(500).json({ message: "Erro ao buscar resultados do estudante.", error: e.message }); }
});
// Rota para Administrador ver todos os resultados (get_all_exam_results_details_admin)
examResultsRouter.get('/admin/all-details', async (req, res) => {
    try {
        const results = await dbAll(`
            SELECT
                er.id as result_id, er.enrollment_id, er.exam_id, 
                er.total_score_obtained, er.max_score_possible, er.grade, er.graded_at,
                cand.first_name as candidate_first_name, cand.last_name as candidate_last_name, cand.email as candidate_email,
                ex.exam_name, ex.exam_date,
                crs.name as course_name,
                disc.name as discipline_name
            FROM exam_results er
            JOIN enrollments enr ON er.enrollment_id = enr.id
            JOIN candidates cand ON enr.candidate_id = cand.id
            JOIN exams ex ON er.exam_id = ex.id
            JOIN courses crs ON ex.course_id = crs.id
            JOIN disciplines disc ON ex.discipline_id = disc.id
            ORDER BY er.graded_at DESC, cand.last_name, cand.first_name;
        `);
        res.json(results);
    } catch (e) {
        res.status(500).json({ message: "Erro ao buscar todos os detalhes dos resultados para admin.", error: e.message });
    }
});
app.use(`${API_PREFIX}/exam_results`, examResultsRouter); 

// --- Rotas de Desempenho (Performance) ---
const performanceRouter = express.Router();
// Exemplo: desempenho de um estudante (get_student_performance)
performanceRouter.get('/student/:enrollmentId',  async (req, res) => {
    const { enrollmentId } = req.params;
     // Adicionar verificação de permissão aqui se necessário
    try {
        const performanceData = await dbAll(`
            SELECT 
                d.name as discipline_name,
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
        `, [enrollmentId]);
        res.json(performanceData);
    } catch (e) {
        res.status(500).json({ message: "Erro ao buscar desempenho do estudante.", error: e.message });
    }
});
app.use(`${API_PREFIX}/performance`, performanceRouter);

// --- Rotas de Admin Dashboard (placeholders) ---
const adminRouter = express.Router();
adminRouter.get('/stats', async (req, res) => {
    try {
        const [
            totalStudents,
            totalCourses,
            totalEnrollments,
            upcomingExamsCount,
            correctedExamsCount
        ] = await Promise.all([
            dbGet("SELECT COUNT(*) as count FROM users WHERE role = 'student'"),
            dbGet("SELECT COUNT(*) as count FROM courses"),
            dbGet("SELECT COUNT(*) as count FROM enrollments"),
            dbGet("SELECT COUNT(*) as count FROM exams WHERE DATE(exam_date) >= DATE('now')"),
            dbGet("SELECT COUNT(DISTINCT exam_id) as count FROM exam_results")
        ]);

        res.json({
            registrations: totalEnrollments.count,
            exams_scheduled: upcomingExamsCount.count,
            exams_corrected: correctedExamsCount.count,
            pending_reviews: Math.floor(correctedExamsCount.count * 0.3) // Mock 30% of corrected exams need review
        });
    } catch (e) {
        console.error("Error in admin stats:", e);
        res.status(500).json({ 
            message: "Erro ao buscar estatísticas do admin.", 
            error: e.message 
        });
    }
});
app.use(`${API_PREFIX}/admin/dashboard`, adminRouter); 


examsRouter.get('/', async (req, res) => {
    try {
        const exams = await dbAll(`
            SELECT 
                e.id, e.exam_name, e.exam_date, e.exam_type,
                c.name as course_name,
                d.name as discipline_name
            FROM exams e
            JOIN courses c ON e.course_id = c.id
            JOIN disciplines d ON e.discipline_id = d.id
            ORDER BY e.exam_date DESC
        `);
        res.json(exams);
    } catch (e) {
        res.status(500).json({ message: "Erro ao listar exames.", error: e.message });
    }
});

examsRouter.get('/:id', async (req, res) => {
    try {
        const exam = await dbGet('SELECT * FROM exams WHERE id = ?', [req.params.id]);
        if (!exam) {
            return res.status(404).json({ message: "Exame não encontrado." });
        }
        const questions = await dbAll('SELECT * FROM questions WHERE exam_id = ?', [req.params.id]);
        res.json({ ...exam, questions });
    } catch (e) {
        res.status(500).json({ message: "Erro ao buscar detalhes do exame.", error: e.message });
    }
});
app.use(`${API_PREFIX}/exams`, examsRouter);


candidatesRouter.get('/:id', async (req, res) => {
    try {
        const candidate = await dbGet('SELECT * FROM candidates WHERE id = ?', [req.params.id]);
        if (!candidate) {
            return res.status(404).json({ message: "Candidato não encontrado." });
        }
        const enrollments = await dbAll(`
            SELECT e.id, e.status, e.enrolled_at, e.COD, c.name as course_name
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            WHERE e.candidate_id = ?
            ORDER BY e.enrolled_at DESC
        `, [req.params.id]);

        res.json({ ...candidate, enrollments });
    } catch (e) {
        res.status(500).json({ message: "Erro ao buscar detalhes do candidato.", error: e.message });
    }
});


const statsRouter = express.Router();

statsRouter.get('/enrollments-by-month', async (req, res) => {
    try {
        const enrollments = await dbAll(`
            SELECT strftime('%Y-%m', enrolled_at) as month, COUNT(id) as count
            FROM enrollments
            WHERE strftime('%Y', enrolled_at) = strftime('%Y', 'now')
            GROUP BY month
            ORDER BY month ASC
        `);
        
        const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const dataMap = new Map(enrollments.map(e => [e.month.split('-')[1], e.count]));
        
        const chartData = monthNames.map((name, index) => {
            const monthKey = String(index + 1).padStart(2, '0');
            return {
                name: name,
                total: dataMap.get(monthKey) || 0
            };
        });

        res.json(chartData);
    } catch (e) {
        res.status(500).json({ message: "Erro ao gerar estatísticas de matrículas.", error: e.message });
    }
});
app.use(`${API_PREFIX}/stats`, statsRouter);



// Rota de Health Check
app.get(`${API_PREFIX}/health`, (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
    res.send('Bem-vindo à API Académica! (Node.js/Express/SQLite)');
});
app.use((err, req, res, next) => {
    console.error("Erro não tratado:", err.stack);
    res.status(500).send('Algo correu mal no servidor!');
});

app.listen(PORT, () => {
    console.log(`Servidor a correr na porta ${PORT}`);
    console.log(`API Prefix: ${API_PREFIX}`);
    console.log(`Database: ${dbPath}`);
});

process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            return console.error(err.message);
        }
        console.log('Conexão com a base de dados SQLite fechada.');
        process.exit(0);
    });
});