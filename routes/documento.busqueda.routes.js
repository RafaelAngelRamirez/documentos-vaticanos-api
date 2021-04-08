const app = require("express")()
const Documento = require("../models/documento.model")
const ObjectId = require("mongoose").Types.ObjectId
const utilidades = require("../utilidades/utilidades")

app.get("/", async (req, res, next) => {
  try {
    req.query.termino = utilidades
      .limpiarDiacriticos(decodeURIComponent(req.query.termino))
      .trim()

    const documentos = await busquedaDocumentos(req)
    const resultado = { documentos }

    for (const key of Object.keys(parametrosRegex)) {
      resultado[key] = await Documento.aggregate(
        query({ ...parametrosRegex[key], termino: req.query.termino })
      ).exec()
    }

    //Busqueda parcial
    res.send(resultado)
  } catch (error) {
    next(error)
  }
})

async function busquedaDocumentos(req) {
  return await Documento.find(obtenerBusqueda(req.query.termino))
    .select("nombre indice descripcion url")
    .exec()
}

const parametrosRegex = {
  palabraCompleta: {
    tipo: "or",
    completo: true,
  },
  palabraParcial: {
    tipo: "or",
    completo: false,
  },
  todosLosTerminosParcial: {
    tipo: "and",
    completo: false,
  },
  todosLosTerminosExactos: {
    tipo: "and",
    completo: true,
  },
}

const query = opciones => {
  return [
    {
      $project: {
        _id: 1,
        puntos: 1,
      },
    },
    regex(opciones),

    {
      $unwind: "$puntos",
    },

    regex(opciones),
    {
      $unset: "puntos._contenido",
    },

    {
      $limit: opciones.limit,
    },
    {
      $skip: opciones.skip,
    },
  ]
}

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

function regex(op = { tipo: "or", termino: "", completo: false }) {
  //Construimos el match por tipo. AND || OR
  const d = { $match: { [`$${op.tipo}`]: [] } }

  //Si es completo buscamos coincidencia exacta con la palabra
  const completo = termino => "(?:\\W|^)(\\Q" + termino + "\\E)(?:\\W|$)"
  //Si es incompleto buscamos coincidencia parcial con la palabra
  const incompleto = termino => termino

  //Construimos la estructura dentro del AND | OR
  const estructura = termino => {
    return {
      //Buscamos dentro del contenido sin diacriticos
      "puntos._contenido": {
        //Distiguimos si quiere completo o no
        $regex: op.completo ? completo(termino) : incompleto(termino),
        $options: "i",
      },
    }
  }

  //Creamos una query por cada termino según el tipo.
  op.termino
    .split(",")
    .forEach(x => d.$match[`$${op.tipo}`].push(estructura(x)))
  return d
}

module.exports = app
