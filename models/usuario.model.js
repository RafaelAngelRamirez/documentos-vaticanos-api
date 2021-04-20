const mongoose = require("mongoose")
const Schema = mongoose.Schema

var validateEmail = function (email) {
  var re = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/
  return re.test(email)
}

const UsuarioSchema = new Schema({
  usuario: {
    type: String,
    required: [true, "Debes definir el usuario"],
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    unique: [true, "{VALUE} ya esta registrado"],
    required: "Debes ingresar un correo",
    validate: [validateEmail, "No es un correo valido {VALUE}"],
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      "No es un correo valido {VALUE}",
    ],
  },

  password: {
    type: String,
    required: [true, "Debes proporcionar una contraseña"],
    min: [8],
  },
})

module.exports = mongoose.model("usuario", UsuarioSchema)
