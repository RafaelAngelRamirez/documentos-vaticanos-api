const documentoRoutes = require("./documento.routes")
const app = require("express")()
const utilidades = require("../utilidades/utilidades")
app.use("/documento", documentoRoutes)

app.post("/ingresar-documentos", (req, res, next) => {
  console.log(process.env.NODE_ENV)
  if (process.env.NODE_ENV !== "development")
    return res.status(500).send("NO MODO DESARROLLO")

  const mongoose = require("mongoose")

  const coleccion = mongoose.connection.collections["documentos"]

  if (coleccion)
    coleccion.drop(function (err) {
      if (err) return next(err)
      console.log("collection dropped")
      agregarDatos(req, res, next)
    })
  else agregarDatos(req, res, next)
})

function agregarDatos(req, res, next) {
  // Cargamos los ficheros
  const Documento = require("../models/documento.model")
  let nombre = i => `../docs-json/documento-${i}.json`
  let puntos = []

  for (let i = 1; i <= 6; i++) {
    const datos = require(nombre(i)).map(x => {
      x["_contenido"] = utilidades.limpiarDiacriticos(x.contenido)
      return x
    })
    puntos.push(...datos)
  }

  let doc = new Documento({
    nombre: "Catecismo de la Iglesia Católica",
    puntos,
    descripcion:
      'El Catecismo de la Iglesia católica (en latín Catechismus Catholicæ Ecclesiæ, representado como "CCE" en las citas bibliográficas), o catecismo universal, cuya versión oficial fue publicada en latín en 1997 contiene la exposición de la fe, doctrina y moral de la Iglesia católica, atestiguadas o iluminadas por la Sagrada Escritura, la Tradición apostólica y el Magisterio eclesiástico. Es uno de los dos catecismos de la Iglesia universal que han sido redactados en toda la historia, por lo que es considerado como la fuente más confiable sobre aspectos doctrinales básicos de la Iglesia católica. La redacción de este catecismo, junto con la elaboración del nuevo Código de Derecho Canónico, el Código de Derecho de las Iglesias Orientales católicas y el Compendio de Doctrina Social de la Iglesia católica representan algunos de los documentos más importantes resultado de la renovación iniciada en el Concilio Vaticano II y que se han convertido en textos de referencia sobre la Iglesia católica y en documentos transcendentales para la historia de la Iglesia contemporánea. El Catecismo de la Iglesia católica es un documento que puede ser consultado, citado y estudiado con plena libertad por todos los integrantes de la Iglesia católica para aumentar el conocimiento con respecto a los aspectos fundamentales de la fe. De la misma manera es el texto de referencia oficial para la redacción de los catecismos católicos en todo el mundo.',
  })

  doc
    .save()
    .then(r => {
      res.send(r)
    })
    .catch(_ => next(_))
}

module.exports = app
