const mongoose = require("mongoose")
const Schema = mongoose.Schema
const DocumentoSchema = new Schema({
  nombre: { type: String, required: [true, "El nombre es necesario"] },
  puntos: {
    select: false,
    type: [
      {
        consecutivo: {
          type: String,
          required: [true, "Debes definir el numero de punto o el consecutivo"],
        },
        contenido: { type: String, required: true },

        // Debe respetar el orden de aparicion en el texto.
        referencias: [
          {
            descripcion: String,
            url: { type: String, default: null },
            local: {
              idDocumento: String,
              idPunto: String,
            },
          },
        ],
      },
    ],
  },
  indice: [
    {
      nombre: {
        type: String,
        required: [true, "Debes definir el nombre del indice"],
      },
      // Aqui debe de ir referenciado cada id de punto que esta relacionado.
      puntos: [String],
    },
  ],
  url:String,
  descripcion: String,
})

module.exports = mongoose.model("documento", DocumentoSchema)
