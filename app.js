require("dotenv").config()
const express = require("express")
const app = express()
const port = process.env.PORT
const mongoose = require("mongoose")
const RUTAS = require("./routes/routes")
const cors = require("cors")

app.use(cors())
app.use(express.json({limit: '10mb'}));
app.use(express.urlencoded({limit: '10mb'}));
mongoose
  .connect(process.env.URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(x => {
    app.use(RUTAS)
    app.use((req, res, next) => res.status(404).send("No existe la pagina"))
    app.use((err, req, res, next) => {
      console.log("[ ERROR ]", err)
      res.status(500).send(err.message ?? err)
    })
    app.listen(port, () => {
      console.log(`[+] En linea {NODE_ENV:${process.env.NODE_ENV}}`)
    })
  })
  .catch(error => console.log("[ ERROR BD ] ", error))
