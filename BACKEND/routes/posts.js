const db = require('../config/db.js')
const express = require('express');
const cors = require('cors');
const upload = require('../config/multer.js');
const app = express()
app.use(cors())
app.use(express.json())
const router = express.Router()


/* - --- -------------------------- API PARA LAPIZZA ------------------------*/


router.get("/getuser", (req, res)=>{
  const query = `SELECT id_user, nome, email FROM user`
  db.all(query, (err, rows)=>{
    if(err){
      console.log(err.message)
      return res.status(500).json({err:err.message})
    }
    return res.status(200).json({rows})
  })
})
router.delete("/deleteuser/:id_user", (req, res)=>{
  const id_user = req.params.id_user
  const query = `DELETE FROM user WHERE id_user = ?`
  db.all(query, [id_user], (err)=>{
    if(err){
      console.log(err.message)
      return res.status(500).json({err:err.message})
    }
    return res.status(200).json({message:"Usuario deletado com sucesso"})
  })
})
router.put("/edituser/:id_user", (req, res)=>{
  const id_user = req.params.id_user
  const {nome, email} = req.body
  const query = `UPDATE user SET nome = ?, email = ? WHERE id_user = ?`
  db.all(query, [nome, email], (err)=>{
    if(err){
      console.log(err.message)
      return res.status(500).json({err:err.message})
    }
    return res.status(200).json({message:"Usuario editado com sucesso"})
  })
})

// Cruds para os produtos e as suas endpoints
router.post("/upload", upload.single("image") ,(req, res)=>{
  if (!req.file) {
    return res.status(400).json({ err: "Nenhuma imagem foi enviada." });
  }
  const image_path = `/upload/${req.file.filename}`
  const { id_user, nome_produto, preco_produto, quantidade_produto, info_produto } = req.body
  const query = `INSERT INTO produtos (id_user, nome_produto, preco_produto, quantidade_produto, info_produto, image_path) VALUES (?, ?, ?, ? , ?, ?)`
  db.all(query, [id_user, nome_produto, preco_produto, quantidade_produto, info_produto, image_path], (err)=>{
    if(err){
      console.log(err.message) 
      return res.status(500).json({err:err.message})
    }
    return res.status(200).json({id:this.lastID, image_path,message:"Produto cadastrado com sucesso"})
  })
})
router.get("/getproduto", (req, res)=>{
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 6
  const offset = (page - 1) * limit 
  db.get("SELECT COUNT(*) as total FROM produtos", (err, row)=>{
    if(err) return res.status(500).json({error: "database error"})
      const total = row.total;
      db.all(
        "SELECT * FROM produtos LIMIT ? OFFSET ?",
        [limit, offset],(err, rows)=>{
          if(err) return res.status(500).json({error: "Database error"})
          res.status(200).json({rows, total})
        }
      )
  })
})

router.get("/getsome", (req, res)=>{
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 6
  const offset = (page - 1) * limit
  db.get("SELECT COUNT(*) as total FROM produtos", (err, row)=>{
    if(err) return res.status(500).json({error:"database error"})
    const total = row.total
    db.all(
      "SELECT id_user, nome_produto, preco_produto, quantidade_produto FROM produtos LIMIT ? OFFSET ?",
      [limit, offset],(err, rows)=>{
        if(err) return res.status(500).json({error:"Database error"})
          res.status(200).json({rows, total})
      }
    )
  })
})

router.put("/editproduto/:id_produto", (req, res)=>{
  const {nome_produto, preco_produto, quantidade_produto, info_produto} = req.body
  const {id_produto} = req.params
  const image_path = req.file ? `/upload/${req.file.filename}`: null;
  let query = `UPDATE produtos SET nome_produto = ?, preco_produto = ?, quantidade_produto = ?, info_produto = ?, updated_at = CURRENT_TIMESTAMP`
  let params = [nome_produto, preco_produto, quantidade_produto, info_produto]
  if(image_path){
    query += ", image_path = ?"
    params.push(image_path)
  }
  query += " WHERE id_produto = ?"
  params.push(id_produto)
  db.run(query, params , (err)=>{
    if(err){
      console.log(err.message)
      return res.status(500).json({err:err.message})
    }
    if(this.changes === 0){
      return res.status(404).json("nenhum produto encontrado")
    }
    return res.status(200).json({message:"Produto editado com sucesso"})
  })
})

router.delete("/deleteproduto/:id_produto", (req, res)=>{
  const {id_produto} = req.params
  db.get("SELECT image_path FROM produtos id_produto = ?", [id_produto], (err, row)=>{
    if(err){
      console.log(err.message)
      return res.status(500).json({error:err.message})
    }
    if(!row){
      return res.json(404).json({error: "Produto not found"})
    }
    const imagePath = row.image_path ? path.join(process.cwd(), row.image_path):null
    db.run("DELETE FROM produtos WHERE id_produto = ?", [id], (err)=>{
      if(err){
        console.log(err.message)
        return res.status(500).json({error:err.message})
      }
      else if(this.changes === 0){
        return res.status(404).json({error: "Post not found"})
      }
      if(imagePath && fs.existsSync(imagePath)){
        fs.unlink(imagePath, (err)=>{
          if(err) console.log("failed to delete image", err.message)
        })
      }
      res.status(200).json({message:"Produto deletado com sucesso"})
    })
  })
})

// Crud empresas e a sua endpoints

router.post("/setempresa", (req, res)=>{
  const {nome_empresa, telefone_empresa, email_empresa, endereco_empresa, sobre_empresa} = req.body
  const query = `INSERT INTO empresa (nome_empresa, telefone_empresa, email_empresa, endereco_empresa, sobre_empresa)`
  db.all(query, [nome_empresa, telefone_empresa, email_empresa, endereco_empresa, sobre_empresa], (err)=>{
    if(err){
      console.log(err.message)
      return res.status(500).json({err:err.message})
    }
    return res.status(200).json({message:"Empresa cadastrada com sucesso"})
  })
})
router.get("/getempresa", (req, res)=>{
  const query = `SELECT * FROM empresa`
  db.all(query, (err, rows)=>{
    if(err){
      return res.status(500).json({err:err.message})
    }
    return res.status(200).json({rows})
  })
})
router.put("/editempresa/:id_empresa",(req, res)=>{
  const id_empresa = req.params.id_empresa
  const {nome_empresa, telefone_empresa, email_empresa, endereco_empresa, sobre_empresa} = req.body
  const query = `UPDATE empresa SET nome_empresa = ?, telefone_empresa = ?, email_empresa = ?, endereco_empresa = ?, sobre_empresa = ? WHERE id_empresa = ?`
  db.all(query, [nome_empresa, telefone_empresa, email_empresa, endereco_empresa, sobre_empresa], (err)=>{
    if(err){
      console.log(err.message)
      return res.status(500).json({err:err.message})
    }
    return res.status(200).json({message:"Empresa editada com sucesso"})
  })
})
router.delete("/deleteempresa/:id_empresa", (req,res)=>{
  const id_empresa = req.params.id_empresa
  const query = `DELETE FROM empresa WHERE id_empresa = ?`
  db.all(query, [id_empresa], (err)=>{
    if(err){
      console.log(err.message)
      return res.status(500).json({err:err.message})
    }
    return res.status(200).json({message:"Empresa deletada com sucesso"})
  })
})

module.exports = router;