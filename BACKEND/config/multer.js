const path = require('path');
const multer = require('multer');
const fs = require('fs');

const uploadsPath = path.join(process.cwd(), "uploads")
if(!fs.existsSync(uploadsPath)){
  fs.mkdirSync(uploadsPath, {recursive:true})
}
// const upload = multer({ storage: multer.memoryStorage() }); // Armazena a imagem em memória como Buffer
const storage = multer.diskStorage({
  destination: (req, file, cb)=>{
    cb(null, uploadsPath)
  },
  filename:(req, file, cb)=>{
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`)
  }
})
const fileFilter = (req, file, cb) =>{
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"]
  if(allowedTypes.includes(file.mimetype)){
    cb(null, true)
  }else{
    cb(new Error("invalid file type, only JPEG, PNG, WEBP are allowed"), false)
  }
}
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024}
})

module.exports = upload