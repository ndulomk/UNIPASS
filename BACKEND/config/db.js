import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = process.env.DB_PATH || path.join(__dirname, 'academic_management.sqlite3');

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
        await dbRun(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'student', /* admin, staff, student */
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await dbRun(`
            CREATE TABLE IF NOT EXISTS candidates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                first_name TEXT NOT NULL,
                last_name TEXT,
                email TEXT UNIQUE NOT NULL,
                phone TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await dbRun(`
            CREATE TABLE IF NOT EXISTS courses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await dbRun(`
            CREATE TABLE IF NOT EXISTS disciplines (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                course_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                code TEXT UNIQUE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
            )
        `);
        await dbRun(`
            CREATE TABLE IF NOT EXISTS enrollments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                candidate_id INTEGER NOT NULL,
                course_id INTEGER NOT NULL,
                COD TEXT UNIQUE NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending', /* pending, approved, rejected, completed */
                enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
                FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
            )
        `);
        await dbRun(`
            CREATE TABLE IF NOT EXISTS enrollment_docs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                enrollment_id INTEGER NOT NULL, /* Should reference enrollments.id */
                type TEXT NOT NULL, /* comprovativo, bilhete, vacine_card, foto */
                file_path TEXT NOT NULL,
                uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE
            )
        `);
        await dbRun(`
            CREATE TABLE IF NOT EXISTS content_matrices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                discipline_id INTEGER NOT NULL,
                theme TEXT NOT NULL,
                competencies TEXT, 
                skills TEXT, 
                syllabus TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (discipline_id) REFERENCES disciplines(id) ON DELETE CASCADE
            )
        `);
        await dbRun(`
            CREATE TABLE IF NOT EXISTS exams (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                course_id INTEGER NOT NULL,
                discipline_id INTEGER NOT NULL,
                exam_name TEXT NOT NULL,
                exam_date DATETIME NOT NULL,
                duration INTEGER, 
                exam_type TEXT, /* Objective, Discursive, Teste, Exame Final */
                second_call_eligible BOOLEAN DEFAULT FALSE,
                second_call_date DATETIME,
                publication_date DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (course_id) REFERENCES courses(id),
                FOREIGN KEY (discipline_id) REFERENCES disciplines(id)
            )
        `);
        await dbRun(`
            CREATE TABLE IF NOT EXISTS questions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                exam_id INTEGER NOT NULL,
                question_text TEXT NOT NULL,
                correct_answer TEXT,
                question_type TEXT, /* multipla_escolha, dissertativa */
                score REAL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
            )
        `);
        await dbRun(`
            CREATE TABLE IF NOT EXISTS student_answers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                enrollment_id INTEGER NOT NULL,
                exam_id INTEGER NOT NULL,
                question_id INTEGER NOT NULL,
                answer TEXT,
                is_correct BOOLEAN DEFAULT FALSE,
                score_awarded REAL DEFAULT 0,
                answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (enrollment_id) REFERENCES enrollments(id),
                FOREIGN KEY (exam_id) REFERENCES exams(id),
                FOREIGN KEY (question_id) REFERENCES questions(id),
                UNIQUE (enrollment_id, question_id)
            )
        `);
        await dbRun(`
            CREATE TABLE IF NOT EXISTS exam_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                enrollment_id INTEGER NOT NULL,
                exam_id INTEGER NOT NULL,
                total_score_obtained REAL,
                max_score_possible REAL,
                grade TEXT, /* Aprovado, Reprovado */
                graded_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (enrollment_id) REFERENCES enrollments(id),
                FOREIGN KEY (exam_id) REFERENCES exams(id),
                UNIQUE (enrollment_id, exam_id)
            )
        `);
        console.log('Tabelas da base de dados inicializadas/verificadas.');
    } catch (e) {
        console.error("Erro ao inicializar tabelas:", e.message);
        throw e;
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


        for (let i = 0; i < numEnrollments; i++) {
            const candidate = allCandidates[i % allCandidates.length];
            const course = courses[i % courses.length];
            const year = new Date().getFullYear();
            const randomDaysAgo = Math.floor(Math.random() * 90); 
            const enrollmentDate = new Date();
            enrollmentDate.setDate(enrollmentDate.getDate() - randomDaysAgo);
            
            const cod = `${course.id}-${year}-${String(i + 1).padStart(4, '0')}`;
            const statusOptions = ['pending', 'approved', 'rejected', 'completed'];
            const status = statusOptions[Math.floor(Math.random() * statusOptions.length)];

            await dbRun(
                `INSERT OR IGNORE INTO enrollments (candidate_id, course_id, COD, status, enrolled_at) 
                 VALUES (?, ?, ?, ?, ?)`,
                [candidate.id, course.id, cod, status, enrollmentDate.toISOString()]
            );
        }

        const disciplines = await dbAll('SELECT id, course_id FROM disciplines');
        if (disciplines.length > 0) {
            for (let i = 0; i < numExams; i++) {
                const discipline = disciplines[i % disciplines.length];
                const examDate = new Date();
                const randomDaysOffset = Math.floor(Math.random() * 60) - 30; // -30 to +29 days from now
                examDate.setDate(examDate.getDate() + randomDaysOffset);
                const examTypes = ['Objective', 'Discursive', 'Teste', 'Exame Final'];

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
        
        const allEnrollments = await dbAll('SELECT id FROM enrollments');
        const allExams = await dbAll('SELECT id FROM exams WHERE DATE(exam_date) < DATE(\'now\')'); // Past exams

        if (allEnrollments.length > 0 && allExams.length > 0) {
            for (let i = 0; i < allEnrollments.length * 0.5; i++) { // Some students took some exams
                const enrollment = allEnrollments[i % allEnrollments.length];
                const exam = allExams[i % allExams.length];
                const score = parseFloat((Math.random() * 20).toFixed(2));
                const grade = score >= 9.5 ? 'Aprovado' : 'Reprovado';
                const gradedDate = new Date(exam.exam_date);
                gradedDate.setDate(gradedDate.getDate() + 2); // Graded 2 days after exam

                await dbRun(
                    `INSERT OR IGNORE INTO exam_results (enrollment_id, exam_id, total_score_obtained, max_score_possible, grade, graded_at)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [enrollment.id, exam.id, score, 20, grade, gradedDate.toISOString()]
                );
            }
        }

        console.log(`População de dados mock concluída: ${numEnrollments} matrículas, ${numCandidates} candidatos, etc.`);
    } catch (e) {
        console.error("Erro ao popular mais dados mock:", e.message);
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