const app = require("express")()
const Documento = require("../models/documento.model")
const ObjectId = require("mongoose").Types.ObjectId

function obtenerBusqueda(termino) {
  const terminoLimpio = termino?.trim()
  if (!terminoLimpio) return {}
  const campos = ["nombre", "indice.nombre", "descripcion"]
  const busqueda = {
    $or: campos.map(x => {
      return { [x]: { $regex: terminoLimpio, $options: "gi" } }
    }),
  }
  return busqueda
}

// function eliminarDiacriticos(texto) {
//   // https://es.stackoverflow.com/questions/62031/eliminar-signos-diacr%C3%ADticos-en-javascript-eliminar-tildes-acentos-ortogr%C3%A1ficos
//   return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
// }

function prettyURL(texto) {
  // Reemplaza los carácteres especiales | simbolos con un espacio
  texto = texto
    .replace(/[`~!@#$%^&*()_\-+=\[\]{};:'"\\|\/,.<>?\s]/g, " ")
    .toLowerCase()

  // Corta los espacios al inicio y al final del textoing
  texto = texto.replace(/^\s+|\s+$/gm, "")

  // Reemplaza el espacio con guión
  texto = texto.replace(/\s+/g, "-")

  return texto
}
app.get("/", (req, res, next) => {
  Documento.find(obtenerBusqueda(req.query.termino))
    .select("nombre indice descripcion url")
    .exec()
    .then(docs => res.send(docs))
    .catch(_ => next(_))
})

app.get("/url/:url", (req, res, next) => {
  Documento.findOne({ url: decodeURIComponent(req.params.url) })
    .select("nombre indice descripcion url")
    .exec()
    .then(docs => res.send(docs))
    .catch(_ => next(_))
})

app.get("/id/:id/punto?/:idPunto?", (req, res, next) => {
  const id = req.params.id
  const idPunto = req.params.idPunto

  const operacion = req.params.idPunto
    ? obtenerSoloUnPunto(id, idPunto)
    : obtenerTodosLosPuntos(id)

  operacion.then(r => res.send(r)).catch(_ => next(_))
})

// Me aorre una operación. //La h es el chiste.
app.put("/", (req, res, next) => {
  // Si no viene un id, creamos el nuevo documento.
  req.body["_id"] = req.body?._id ?? ObjectId()

  const query = { _id: req.body._id }
  const update = {
    nombre: req.body.nombre,
    descripcion: req.body.descripcion,
    url: prettyURL(req.body.nombre),
  }
  const options = {
    //   Si no existe el elemento crea uno nuevo.
    upsert: true,
    // Retorna el nuevo elemento creado
    new: true,
    // Define los valores por default del schema al crear un nuevo doc
    setDefaultsOnInsert: true,
    // Dispara los validadores siempre.
    runValidators: true,
  }

  // Find the document
  Documento.findOneAndUpdate(query, update, options)
    .exec()
    .then(r => res.send(r))
    .catch(_ => next(_))
})

const objeto = {
  descripcion: "SIN DEFINIR",
}

app.delete("/eliminar/:id", (req, res, next) => {
  Documento.findOneAndRemove({ _id: req.params.id })
    .exec()
    .then(d => res.send())
    .catch(_ => next(_))
})

app.put("/punto/nuevo", (req, res, next) => {
  Documento.findById(req.body._id)
    .select("+puntos")
    .exec()
    .then(documento => {
      if (!documento) throw "No existe el documento"
      const punto = req.body.punto
      // Buscamos dentro del texto para encontrar las referencias.
      if (!punto.contenido) throw "No se ha definido el contenido"
      const totalRef = punto.contenido.match(/(\[\+REF\+])/gm)?.length
  

      punto.referencias = new Array(!totalRef ? 0 : totalRef).fill(objeto)
      documento.puntos.push(punto)
      return documento.save()
    })
    .then(r => res.send(r))
    .catch(_ => next(_))
})

app.put("/punto/modificar", (req, res, next) => {
  Documento.findById(req.body._id)
    .select("+puntos")
    .exec()
    .then(documento => {
      if (!documento) throw "No existe el documento"
      const punto = documento.puntos.id(req.body.punto._id)
      if (!punto) throw "No existe el contenido"

      // Validamos que siga habiendo la misma cantidad de referencias
      let totalRef = req.body.punto.contenido.match(/(\[\+REF\+])/gm)?.length
      totalRef = !totalRef ? 0 : totalRef
      const refExistentes = punto.referencias.length
  

      if (totalRef < refExistentes)
        throw "Hay menos referencias en el nuevo contenido que el actual. Eliminalas manualmente si quieres guardar menos referencias."

      punto.consecutivo = req.body.punto.consecutivo
      punto.contenido = req.body.punto.contenido

      // Nuevas referencias

      const nuevasReferencias = totalRef - refExistentes
      for (let i = 0; i < nuevasReferencias; i++) punto.referencias.push(objeto)
      return documento.save()
    })
    .then(d => res.send(d))
    .catch(_ => next(_))
})
app.put("/punto/eliminar", (req, res, next) => {
  Documento.findById(req.body._id)
    .select("+puntos")
    .exec()
    .then(documento => {
      if (!documento) throw "No existe el documento"
      const a = documento.puntos.pull(req.body.punto._id)
      return documento.save()
    })
    .then(d => res.send(d))
    .catch(_ => next(_))
})

app.put("/referencia/nueva", (req, res, next) => {
  Documento.findById(req.body._id)
    .select("+puntos")
    .exec()
    .then(documento => {
      if (!documento) throw "No existe el documento"
      const punto = documento.puntos.id(req.body.punto._id)
      if (!punto) throw "No existe el contenido"
      punto.referencias.push(req.body.punto.referencia)
      return documento.save()
    })
    .then(r => res.send(r))
    .catch(_ => next(_))
})

app.put("/referencia/modificar", (req, res, next) => {
  Documento.findById(req.body._id)
    .select("+puntos")
    .exec()
    .then(documento => {
      const referencia = documento.puntos
        .id(req.body.punto._id)
        .referencias.id(req.body.punto.referencia._id)
      if (!referencia) throw "No existe la referencia"
      referencia.descripcion = req.body.punto.referencia.descripcion
      referencia.url = req.body.punto.referencia.url
      referencia.local = req.body.punto.referencia.local
      return documento.save()
    })
    .then(r => res.send(r))
    .catch(_ => next(_))
})

app.put("/referencia/eliminar", (req, res, next) => {
  Documento.findById(req.body._id)
    .select("+puntos")
    .exec()
    .then(documento => {
      documento.puntos
        .id(req.body.punto._id)
        .referencias.pull(req.body.punto.referencia._id)
      return documento.save()
    })
    .then(d => res.send(d))
    .catch(_ => next(_))
})

app.put("/indice/nuevo", (req, res, next) => {
  Documento.findById(req.body._id)
    .exec()
    .then(doc => {
      if (!doc) throw "No existe el documento"
      //   Debe ser un solo elemento del indice
      doc.indice.push(req.body.indice)

      return doc.save()
    })
    .then(r => res.send(r))
    .catch(_ => next(_))
})

app.put("/indice/modificar", (req, res, next) => {
  Documento.findById(req.body._id)
    .exec()
    .then(doc => {
      if (!doc) throw "No existe el documento"
      const indice = doc.indice.id(req.body.indice._id)
      if (!indice) throw "No existe el indice"
      //Eliminamos los puntos exitentes
      while (indice.puntos.length > 0) indice.puntos.pop()

      indice.nombre = req.body.indice.nombre
      req.body.indice.puntos.forEach(x => indice.puntos.push(x))

      return doc.save()
    })
    .then(r => res.send(r))
    .catch(_ => next(_))
})

app.put("/indice/eliminar", (req, res, next) => {
  Documento.findById(req.body._id)
    .exec()
    .then(doc => {
      doc.indice.pull(req.body.indice._id)
      return doc.save()
    })
    .then(doc => res.send(doc))
    .catch(_ => next(_))
})

function obtenerSoloUnPunto(id, idPunto) {
  return Documento.aggregate([
    { $match: { _id: ObjectId(id) } },
    {
      $project: {
        puntos: 1,
      },
    },
    {
      $unwind: {
        path: "$puntos",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $replaceRoot: { newRoot: "$puntos" },
    },
    { $match: { _id: ObjectId(idPunto) } },
  ]).exec()
}

function obtenerTodosLosPuntos(id) {
  return Documento.findById(id)
    .select("puntos")
    .exec()
    .then(x => x?.puntos ?? [])
}

module.exports = app
