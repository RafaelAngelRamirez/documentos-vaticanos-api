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
        //Este solo se utiliza para guardar los datos sin
        // diacriticos. Por defecto no se selecciona
        _contenido: { type: String, required: true, select: false },

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
  //Para buscar el documento con una url simple
  url: String,
  descripcion: String,
})

DocumentoSchema.index({ "puntos.contenido": "text" })

module.exports = mongoose.model("documento", DocumentoSchema)
