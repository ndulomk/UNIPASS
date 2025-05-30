const config = require('../config.json');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const express = require("express")
const router = express.Router()
const db = require("../config/db")
//endpoint para fazer login
router.post("/login", async(req, res)=>{
  const {email, senha} = req.body
  const query = `SELECT * FROM user WHERE email = ?`
  try {
    db.get(query, [email], (err, user)=>{
      if(err) return res.status(500).send("erro no servidor")
  
      if(!user) return res.status(500).send("Nenhum usuario encontrado")
      
      //comparando as passwords
      const passwordIsValid = bcrypt.compareSync(senha, user.senha)
      if(!passwordIsValid){
        return res.status(500).send({auth: false, token:null})
      }
      //criando token
      const token = jwt.sign({id: user.id}, config.jwtSecret, {
        expiresIn: 86400 //expira em um dia
      })
      // retorna o token para ser possivel o login
      res.status(200).send({auth: true, token: token, tokenid:user.id, un: user.nome, tokentypo: user.status})
    })
  } catch (error) {
    console.log(error)
  }

})


// CRUDS para usuario endpoints

router.post("/setuser", (req, res) => {
  try {
    const { nome, email, senha } = req.body;
    if (!nome || !email || !senha) {
      return res.status(400).json({ message: "Nome, email e senha são obrigatórios!" });
    }

    const query = `INSERT INTO user(nome, email, senha) VALUES (? , ? , ?)`;
    if (!senha) {
      return res.status(400).json({ message: "Senha não pode estar vazia!" });
    }
    bcrypt.hash(senha, 10, function (bcryptErr, hashedPassword) {
      if (bcryptErr) {
        console.error(bcryptErr);
        return res.status(500).json({ message: "Falha ao encriptar senha" });
      } else {
        db.run(query, [nome, email, hashedPassword], (err) => {
          if (err) {
            console.log(err.message);
            return res.status(500).json({ err: err.message });
          }
          return res.status(200).json({ message: "Usuário adicionado com sucesso" });
        });
      }
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

module.exports = router;